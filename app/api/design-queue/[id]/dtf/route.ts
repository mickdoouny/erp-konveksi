import { NextResponse } from "next/server"
import {
  assignDtfVendor,
  submitDtfPaymentRequest,
  updateDtfFiles,
} from "@/lib/dtf-service"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const item = await prisma.designQueueItem.findUnique({
      where: { id },
      include: {
        DtfVendor: true,
        DtfPaymentRequest: { orderBy: { requestedAt: "desc" }, take: 5 },
      },
    })

    if (!item) {
      return NextResponse.json(
        { message: "Item tidak ditemukan" },
        { status: 404 }
      )
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error("GET DTF:", error)
    return NextResponse.json(
      { message: "Gagal mengambil data DTF" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const action = String(body.action ?? "")

    if (action === "assign_vendor") {
      const vendorId = String(body.vendorId ?? "")
      const item = await assignDtfVendor(id, vendorId)
      return NextResponse.json(item)
    }

    if (action === "update_files") {
      const item = await updateDtfFiles(id, {
        fileDtfVendor:
          typeof body.fileDtfVendor === "string"
            ? body.fileDtfVendor
            : undefined,
        fileDtfProof:
          typeof body.fileDtfProof === "string" ? body.fileDtfProof : undefined,
      })
      return NextResponse.json(item)
    }

    if (action === "submit_payment") {
      const nominal =
        typeof body.nominal === "number" ? body.nominal : Number(body.nominal)
      const item = await submitDtfPaymentRequest({
        designQueueItemId: id,
        nominal,
        requestedBy: String(body.requestedBy ?? "Desainer"),
        notes: typeof body.notes === "string" ? body.notes : undefined,
      })
      return NextResponse.json(item)
    }

    return NextResponse.json(
      { message: "Aksi tidak dikenali" },
      { status: 400 }
    )
  } catch (error) {
    console.error("PATCH DTF:", error)
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui alur DTF"
    return NextResponse.json({ message }, { status: 400 })
  }
}
