import { NextResponse } from "next/server"
import { apiErrorPayload } from "@/lib/api-error"
import { prisma } from "@/lib/prisma"
import { isCsAntrianProduksiItem } from "@/lib/cs-antrian-produksi"
import {
  csOwnsDesignQueueItem,
  parseCsRequestScope,
} from "@/lib/cs-design-queue-access"
import {
  attachDesignQueueMessages,
  designQueueMessagesInclude,
} from "@/lib/design-queue-notes"

const finalOrderInclude = {
  select: {
    id: true,
    orderNumber: true,
    submittedAt: true,
    createdAt: true,
    deliveryStatus: true,
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
        needsKancing: true,
        needsDTF: true,
        kancingCompletedAt: true,
        dtfCompletedAt: true,
        shipReleaseStatus: true,
        updatedAt: true,
      },
    },
  },
} as const

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const scope = parseCsRequestScope(request)

    const item = await prisma.designQueueItem.findUnique({
      where: { id },
      include: {
        ...designQueueMessagesInclude,
        FinalOrder: finalOrderInclude,
      },
    })

    if (
      !item ||
      !csOwnsDesignQueueItem(scope, item) ||
      !isCsAntrianProduksiItem(item)
    ) {
      return NextResponse.json(
        { message: "Item antrian produksi tidak ditemukan" },
        { status: 404 }
      )
    }

    return NextResponse.json(attachDesignQueueMessages(item))
  } catch (error) {
    console.error("GET CS ANTRIAN PRODUKSI ITEM:", error)
    return NextResponse.json(
      apiErrorPayload(error, "Gagal mengambil detail antrian produksi"),
      { status: 500 }
    )
  }
}
