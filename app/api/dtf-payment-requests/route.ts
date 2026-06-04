import { NextResponse } from "next/server"
import { DtfPaymentRequestStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { submitDtfPaymentRequest } from "@/lib/dtf-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") ?? DtfPaymentRequestStatus.MENUNGGU

    const items = await prisma.dtfPaymentRequest.findMany({
      where: { status: status as DtfPaymentRequestStatus },
      orderBy: { requestedAt: "asc" },
      include: {
        DtfVendor: true,
        DesignQueueItem: {
          select: {
            id: true,
            artikelId: true,
            designId: true,
            namaKonsumen: true,
            namaArtikel: true,
            statusDtf: true,
            perluDtf: true,
          },
        },
      },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error("GET DTF PAYMENT REQUESTS:", error)
    return NextResponse.json(
      { message: "Gagal mengambil antrian pembayaran DTF" },
      { status: 400 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const designQueueItemId = String(body.designQueueItemId ?? "")
    const nominal =
      typeof body.nominal === "number" ? body.nominal : Number(body.nominal)
    const requestedBy = String(body.requestedBy ?? "Desainer")

    if (!designQueueItemId) {
      return NextResponse.json(
        { message: "designQueueItemId wajib" },
        { status: 400 }
      )
    }

    const item = await submitDtfPaymentRequest({
      designQueueItemId,
      nominal,
      requestedBy,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error("POST DTF PAYMENT REQUEST:", error)
    const message =
      error instanceof Error ? error.message : "Gagal mengajukan pembayaran DTF"
    return NextResponse.json({ message }, { status: 400 })
  }
}
