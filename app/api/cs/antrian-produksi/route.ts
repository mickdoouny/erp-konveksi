import { NextResponse } from "next/server"
import { apiErrorPayload } from "@/lib/api-error"
import { prisma } from "@/lib/prisma"
import { isCsAntrianProduksiItem } from "@/lib/cs-antrian-produksi"
import {
  csDesignQueueOwnershipWhere,
  parseCsRequestScope,
} from "@/lib/cs-design-queue-access"

const finalOrderInclude = {
  select: {
    id: true,
    orderNumber: true,
    submittedAt: true,
    AccountingTransaction: {
      select: {
        paymentStatus: true,
        totalHarga: true,
        dp: true,
        sisaPelunasan: true,
      },
    },
    ProductionPipeline: {
      select: {
        id: true,
        productionNumber: true,
        currentStatus: true,
        adminProduksiStatus: true,
        needsDTF: true,
        dtfCompletedAt: true,
      },
    },
  },
} as const

export async function GET(request: Request) {
  try {
    const scope = parseCsRequestScope(request)
    const ownershipWhere = csDesignQueueOwnershipWhere(scope)

    const rows = await prisma.designQueueItem.findMany({
      where: ownershipWhere,
      orderBy: { updatedAt: "desc" },
      include: {
        FinalOrder: finalOrderInclude,
      },
    })

    const items = rows.filter(isCsAntrianProduksiItem)

    return NextResponse.json(items)
  } catch (error) {
    console.error("GET CS ANTRIAN PRODUKSI:", error)
    return NextResponse.json(
      apiErrorPayload(error, "Gagal mengambil antrian produksi"),
      { status: 500 }
    )
  }
}
