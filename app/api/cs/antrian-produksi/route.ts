import { NextResponse } from "next/server"
import { apiErrorPayload } from "@/lib/api-error"
import { prisma } from "@/lib/prisma"
import { isCsAntrianProduksiItem } from "@/lib/cs-antrian-produksi"
import {
  csDesignQueueOwnershipWhere,
  parseCsRequestScope,
} from "@/lib/cs-design-queue-access"
import { sortProductionQueue } from "@/lib/production-queue-sort"

const finalOrderInclude = {
  select: {
    id: true,
    orderNumber: true,
    submittedAt: true,
    createdAt: true,
    jenisProduksi: true,
    expressPriority: true,
    deadline: true,
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

    const items = sortProductionQueue(
      rows.filter(isCsAntrianProduksiItem).map((row) => ({
        ...row,
        jenisProduksi: row.FinalOrder?.jenisProduksi ?? row.jenisProduksi,
        expressPriority: row.FinalOrder?.expressPriority ?? row.expressPriority,
        deadline: row.FinalOrder?.deadline ?? row.tanggalDeadline,
        submittedAt: row.FinalOrder?.submittedAt ?? null,
      }))
    )

    return NextResponse.json(items)
  } catch (error) {
    console.error("GET CS ANTRIAN PRODUKSI:", error)
    return NextResponse.json(
      apiErrorPayload(error, "Gagal mengambil antrian produksi"),
      { status: 500 }
    )
  }
}
