import { NextResponse } from "next/server"
import {
  AdminProduksiStatus,
  DeliveryStatus,
  FinalOrderStatus,
  PaymentStatus,
  ProductionStatus,
  type Prisma,
} from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { isFinalOrderWorkflowEnabled } from "@/lib/feature-flags"
import { sortProductionQueue } from "@/lib/production-queue-sort"

export async function GET(request: Request) {
  try {
    if (!isFinalOrderWorkflowEnabled()) {
      return NextResponse.json({ success: true, data: [], workflowEnabled: false })
    }

    const { searchParams } = new URL(request.url)
    const queue = searchParams.get("queue")
    const status = searchParams.get("status")

    const where: Prisma.FinalOrderWhereInput =
      queue === "admin_produksi"
        ? {
            ProductionPipeline: {
              is: {
                currentStatus: ProductionStatus.ADMIN_PRODUKSI,
                adminProduksiStatus: AdminProduksiStatus.PENDING,
              },
            },
            AccountingTransaction: {
              is: {
                paymentStatus: { not: PaymentStatus.MENUNGGU_DP },
              },
            },
          }
        : queue === "post_jahit"
          ? {
              ProductionPipeline: {
                is: {
                  currentStatus: ProductionStatus.ADMIN_PRODUKSI,
                  adminProduksiStatus: AdminProduksiStatus.APPROVED,
                },
              },
            }
        : queue === "packing"
          ? {
              ProductionPipeline: {
                is: {
                  currentStatus: ProductionStatus.PACKING,
                },
              },
            }
        : queue === "dtf_stage"
          ? {
              needsDTF: true,
              ProductionPipeline: {
                is: { currentStatus: ProductionStatus.DTF },
              },
            }
        : queue === "siap_kirim"
          ? {
              ProductionPipeline: {
                is: {
                  currentStatus: ProductionStatus.SIAP_KIRIM,
                },
              },
            }
        : queue === "in_production"
          ? {
              ProductionPipeline: { isNot: null },
              deliveryStatus: { not: DeliveryStatus.TERKIRIM },
            }
          : status
            ? { status: status as FinalOrderStatus }
            : {}

    const items = await prisma.finalOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        DesignQueueItem: {
          select: {
            sppGroupId: true,
            designId: true,
            artikelId: true,
            id: true,
            perluDtf: true,
            statusDtf: true,
            dtfVendorId: true,
            fileDtfVendor: true,
            catatanDtf: true,
            DtfVendor: { select: { name: true } },
          },
        },
        AccountingTransaction: true,
        ProductionPipeline: true,
        FinalOrderRosterLine: { orderBy: { sortOrder: "asc" } },
      },
    })

    const sorted = sortProductionQueue(items)

    return NextResponse.json({ success: true, data: sorted, workflowEnabled: true })
  } catch (error) {
    console.error("GET FINAL ORDERS:", error)
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data order" },
      { status: 500 }
    )
  }
}
