import { NextResponse } from "next/server"
import { PaymentStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { isFinalOrderWorkflowEnabled } from "@/lib/feature-flags"

export async function GET() {
  try {
    if (!isFinalOrderWorkflowEnabled()) {
      return NextResponse.json({ success: true, data: [] })
    }

    const items = await prisma.accountingTransaction.findMany({
      where: {
        OR: [
          { paymentStatus: PaymentStatus.MENUNGGU_DP },
          {
            FinalOrder: {
              ProductionPipeline: {
                is: { shipReleaseStatus: "MENUNGGU_VALIDASI" },
              },
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        FinalOrder: {
          include: {
            ProductionPipeline: true,
            DesignQueueItem: {
              select: { artikelId: true, designId: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error("GET ACCOUNTING:", error)
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data keuangan" },
      { status: 500 }
    )
  }
}
