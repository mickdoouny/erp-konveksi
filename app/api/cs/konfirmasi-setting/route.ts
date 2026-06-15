import { NextResponse } from "next/server"
import { ProductionStatus } from "@prisma/client"
import { apiErrorPayload } from "@/lib/api-error"
import { prisma } from "@/lib/prisma"
import { isCsAntrianProduksiItem } from "@/lib/cs-antrian-produksi"
import {
  csDesignQueueOwnershipWhere,
  parseCsRequestScope,
} from "@/lib/cs-design-queue-access"
import { sortProductionQueue } from "@/lib/production-queue-sort"

export async function GET(request: Request) {
  try {
    const scope = parseCsRequestScope(request)
    const ownershipWhere = csDesignQueueOwnershipWhere(scope)

    const rows = await prisma.designQueueItem.findMany({
      where: {
        ...ownershipWhere,
        FinalOrder: {
          ProductionPipeline: {
            currentStatus: ProductionStatus.MENUNGGU_ACC_SETTING,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        FinalOrder: {
          select: {
            id: true,
            orderNumber: true,
            submittedAt: true,
            createdAt: true,
            jenisProduksi: true,
            expressPriority: true,
            deadline: true,
            ProductionPipeline: {
              select: {
                id: true,
                productionNumber: true,
                currentStatus: true,
                settingResultFiles: true,
                settingSubmittedAt: true,
                settingSubmittedBy: true,
                settingRejectNote: true,
                settingSentToConsumerAt: true,
                settingSentToConsumerBy: true,
                settingSubmitCount: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    })

    const items = sortProductionQueue(
      rows.filter(isCsAntrianProduksiItem).map((row) => ({
        ...row,
        jenisProduksi: row.FinalOrder?.jenisProduksi ?? row.jenisProduksi,
        expressPriority: row.FinalOrder?.expressPriority ?? row.expressPriority,
        deadline: row.FinalOrder?.deadline ?? row.tanggalDeadline,
      }))
    )

    return NextResponse.json(items)
  } catch (error) {
    console.error("GET CS KONFIRMASI SETTING:", error)
    return NextResponse.json(
      apiErrorPayload(error, "Gagal mengambil antrian konfirmasi setting"),
      { status: 500 }
    )
  }
}
