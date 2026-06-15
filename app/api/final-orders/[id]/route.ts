import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const order = await prisma.finalOrder.findUnique({
      where: { id },
      include: {
        DesignQueueItem: {
          select: {
            sppGroupId: true,
            designId: true,
            artikelId: true,
            desainUtama: true,
            hasilDesain: true,
            materiDesain: true,
            catatanDtf: true,
          },
        },
        FinalOrderRosterLine: { orderBy: { sortOrder: "asc" } },
        AccountingTransaction: true,
        ProductionPipeline: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order tidak ditemukan" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: order })
  } catch (error) {
    console.error("GET FINAL ORDER:", error)
    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail order" },
      { status: 500 }
    )
  }
}
