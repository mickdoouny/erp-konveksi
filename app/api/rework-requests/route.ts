import { NextResponse } from "next/server"
import { ReworkRequestStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { createReworkRequest } from "@/lib/rework-request"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get("view") ?? "pending"

    const statusFilter =
      view === "history"
        ? {
            in: [
              ReworkRequestStatus.APPROVED,
              ReworkRequestStatus.REJECTED,
              ReworkRequestStatus.COMPLETED,
            ],
          }
        : ReworkRequestStatus.PENDING

    const items = await prisma.productionReworkRequest.findMany({
      where: { status: statusFilter },
      orderBy: { createdAt: "desc" },
      include: {
        FinalOrder: {
          select: {
            orderNumber: true,
            namaArtikel: true,
            namaKonsumen: true,
            qty: true,
          },
        },
        ProductionPipeline: {
          select: {
            productionNumber: true,
            currentStatus: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error("GET REWORK REQUESTS:", error)
    return NextResponse.json(
      { success: false, message: "Gagal mengambil request rework" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const reason = String(body.reason ?? "")
    const requestType = body.requestType ? String(body.requestType) : undefined

    const affectedParts = Array.isArray(body.affectedParts)
      ? body.affectedParts.map(String)
      : []

    const data = await createReworkRequest({
      productionPipelineId: String(body.productionPipelineId ?? ""),
      requestedByUserId: body.requestedByUserId
        ? String(body.requestedByUserId)
        : undefined,
      requestedByName: String(body.requestedByName ?? "Operator"),
      reason,
      requestType: requestType as
        | "KEKURANGAN"
        | "GAGAL_PRODUKSI"
        | "LAINNYA"
        | undefined,
      affectedParts,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("POST REWORK REQUEST:", error)
    const message =
      error instanceof Error ? error.message : "Gagal mengajukan request"
    return NextResponse.json({ success: false, message }, { status: 400 })
  }
}
