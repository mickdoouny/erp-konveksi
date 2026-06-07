import {
  AdminProduksiStatus,
  DesignQueueNoteSenderRole,
  DesignQueueStatusDesain,
  PaymentStatus,
  ProductionStatus,
  ShipReleaseStatus,
} from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  CATEGORY_CLEAR_PATHS,
  CATEGORY_LABELS,
  type NotificationCategory,
  type NotificationItem,
  type NotificationPayload,
} from "@/lib/design-queue-notifications-shared"
import {
  DESIGNER_ACTIVE_STATUSES,
  DESIGNER_APPROVED_STATUSES,
} from "@/lib/designer-antrian"
import { hasProductionDesignFile } from "@/lib/cs-antrian-desain"
import {
  formatDpPercentage,
  isDpBelowThreshold,
} from "@/lib/cs-input-order"
import { isFinalOrderWorkflowEnabled } from "@/lib/feature-flags"
import { formatRupiahDisplay } from "@/lib/format-rupiah"

export type {
  NotificationCategory,
  NotificationItem,
  NotificationPayload,
} from "@/lib/design-queue-notifications-shared"
export {
  CATEGORY_CLEAR_PATHS,
  CATEGORY_LABELS,
} from "@/lib/design-queue-notifications-shared"

const CS_ACTION_STATUSES: DesignQueueStatusDesain[] = [
  "DIKEMBALIKAN_CS",
  "SUDAH_DI_REVISI",
  "MENUNGGU_ACC_KONSUMEN",
  "SELESAI",
  "SUDAH_DI_DESAIN",
  "MENUNGGU_DP",
  "FILE_DISETUJUI_UPLOADED",
]

function csActionLabel(status: DesignQueueStatusDesain, hasCdr: boolean): string {
  switch (status) {
    case "DIKEMBALIKAN_CS":
    case "SUDAH_DI_REVISI":
      return "Revisi dari desainer"
    case "MENUNGGU_ACC_KONSUMEN":
      return "Hasil desain siap ACC konsumen"
    case "MENUNGGU_DP":
    case "FILE_DISETUJUI_UPLOADED":
      return hasCdr ? "Siap input order" : "Menunggu CDR produksi"
    case "SELESAI":
    case "SUDAH_DI_DESAIN":
      return "Desain selesai — perlu tindakan"
    default:
      return "Perlu tindakan CS"
  }
}

function designerKerjaLabel(status: DesignQueueStatusDesain): string {
  switch (status) {
    case "MENUNGGU":
      return "Antrian desain baru"
    case "DIKEMBALIKAN_CS":
    case "SUDAH_DI_REVISI":
      return "Permintaan revisi dari CS"
    default:
      return "Pekerjaan desain menunggu"
  }
}

function designerDisetujuiLabel(status: DesignQueueStatusDesain): string {
  if (status === "MENUNGGU_DP") return "Unggah file CDR produksi"
  if (status === "FILE_DISETUJUI_UPLOADED") return "CDR diunggah — menunggu CS input order"
  if (status === "DISETUJUI_CS") return "Unggah CDR — order disetujui CS"
  return "Antrian disetujui — perlu CDR"
}

export async function fetchNotificationsForRole(
  role: string
): Promise<NotificationPayload> {
  const items: NotificationItem[] = []
  const polledAt = new Date().toISOString()

  if (role === "cs" || role === "owner") {
    const csItems = await prisma.designQueueItem.findMany({
      where: { statusDesain: { in: CS_ACTION_STATUSES } },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        artikelId: true,
        namaKonsumen: true,
        namaArtikel: true,
        statusDesain: true,
        fileDesainProduksi: true,
        updatedAt: true,
      },
    })

    for (const row of csItems) {
      const hasCdr = hasProductionDesignFile(row)
      if (
        (row.statusDesain === "MENUNGGU_DP" ||
          row.statusDesain === "FILE_DISETUJUI_UPLOADED") &&
        !hasCdr
      ) {
        continue
      }

      items.push({
        id: `cs-action-${row.id}`,
        category: "cs_action",
        title: csActionLabel(row.statusDesain, hasCdr),
        description: `${row.artikelId} · ${row.namaKonsumen} — ${row.namaArtikel}`,
        href: `/cs/antrian-desain/${row.id}`,
        occurredAt: row.updatedAt.toISOString(),
      })
    }

    const csMessages = await prisma.designQueueMessage.findMany({
      where: { senderRole: DesignQueueNoteSenderRole.DESAINER },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        DesignQueueItem: {
          select: {
            id: true,
            artikelId: true,
            namaKonsumen: true,
          },
        },
      },
    })

    for (const msg of csMessages) {
      items.push({
        id: `cs-msg-${msg.id}`,
        category: "cs_message",
        title: "Pesan baru dari desainer",
        description: `${msg.DesignQueueItem.artikelId} · ${msg.senderName}: ${msg.message.slice(0, 80)}`,
        href: `/cs/antrian-desain/${msg.designQueueItemId}`,
        occurredAt: msg.createdAt.toISOString(),
      })
    }
  }

  if (role === "desainer" || role === "owner") {
    const kerjaItems = await prisma.designQueueItem.findMany({
      where: { statusDesain: { in: DESIGNER_ACTIVE_STATUSES } },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        artikelId: true,
        namaKonsumen: true,
        namaArtikel: true,
        statusDesain: true,
        updatedAt: true,
      },
    })

    for (const row of kerjaItems) {
      items.push({
        id: `ds-kerja-${row.id}`,
        category: "desainer_kerja",
        title: designerKerjaLabel(row.statusDesain),
        description: `${row.artikelId} · ${row.namaKonsumen} — ${row.namaArtikel}`,
        href: `/desainer/antrian/${row.id}`,
        occurredAt: row.updatedAt.toISOString(),
      })
    }

    const disetujuiItems = await prisma.designQueueItem.findMany({
      where: {
        statusDesain: { in: DESIGNER_APPROVED_STATUSES },
        fileDesainProduksi: null,
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        artikelId: true,
        namaKonsumen: true,
        namaArtikel: true,
        statusDesain: true,
        updatedAt: true,
      },
    })

    for (const row of disetujuiItems) {
      items.push({
        id: `ds-disetujui-${row.id}`,
        category: "desainer_disetujui",
        title: designerDisetujuiLabel(row.statusDesain),
        description: `${row.artikelId} · ${row.namaKonsumen} — ${row.namaArtikel}`,
        href: `/desainer/antrian-disetujui/${row.id}`,
        occurredAt: row.updatedAt.toISOString(),
      })
    }

    const dsMessages = await prisma.designQueueMessage.findMany({
      where: { senderRole: DesignQueueNoteSenderRole.CS },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        DesignQueueItem: {
          select: {
            id: true,
            artikelId: true,
            namaKonsumen: true,
          },
        },
      },
    })

    for (const msg of dsMessages) {
      items.push({
        id: `ds-msg-${msg.id}`,
        category: "desainer_message",
        title: "Pesan baru dari CS",
        description: `${msg.DesignQueueItem.artikelId} · ${msg.senderName}: ${msg.message.slice(0, 80)}`,
        href: `/desainer/antrian/${msg.designQueueItemId}`,
        occurredAt: msg.createdAt.toISOString(),
      })
    }
  }

  if (
    (role === "admin_keuangan" || role === "owner") &&
    isFinalOrderWorkflowEnabled()
  ) {
    const pendingDp = await prisma.accountingTransaction.findMany({
      where: { paymentStatus: PaymentStatus.MENUNGGU_DP },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        FinalOrder: {
          select: {
            orderNumber: true,
            namaKonsumen: true,
            namaArtikel: true,
          },
        },
      },
    })

    for (const tx of pendingDp) {
      items.push({
        id: `keu-dp-${tx.id}`,
        category: "keuangan_validasi",
        title: "Validasi DP diperlukan",
        description: `${tx.invoiceNumber} · ${tx.FinalOrder.namaKonsumen} — ${tx.FinalOrder.namaArtikel}`,
        href: "/admin/keuangan",
        occurredAt: tx.createdAt.toISOString(),
      })
    }

    const pendingShip = await prisma.accountingTransaction.findMany({
      where: {
        FinalOrder: {
          ProductionPipeline: {
            is: { shipReleaseStatus: ShipReleaseStatus.MENUNGGU_VALIDASI },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        FinalOrder: {
          select: {
            orderNumber: true,
            namaKonsumen: true,
          },
        },
      },
    })

    for (const tx of pendingShip) {
      items.push({
        id: `keu-ship-${tx.id}`,
        category: "keuangan_validasi",
        title: "Validasi siap kirim",
        description: `${tx.FinalOrder.orderNumber} · ${tx.FinalOrder.namaKonsumen}`,
        href: "/admin/keuangan",
        occurredAt: tx.updatedAt.toISOString(),
      })
    }
  }

  if (
    (role === "admin_produksi" || role === "owner") &&
    isFinalOrderWorkflowEnabled()
  ) {
    const pendingOrders = await prisma.finalOrder.findMany({
      where: {
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
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        DesignQueueItem: {
          select: { artikelId: true },
        },
      },
    })

    for (const order of pendingOrders) {
      items.push({
        id: `prod-order-${order.id}`,
        category: "produksi_antrian",
        title: "Order baru menunggu persetujuan",
        description: `${order.orderNumber} · ${order.namaKonsumen} — ${order.namaArtikel}`,
        href: "/admin/final-orders",
        occurredAt: order.createdAt.toISOString(),
      })
    }
  }

  if (role === "owner" && isFinalOrderWorkflowEnabled()) {
    const pendingLowDp = await prisma.finalOrder.findMany({
      where: {
        totalHarga: { gt: 0 },
        AccountingTransaction: {
          is: { paymentStatus: PaymentStatus.MENUNGGU_DP },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: 30,
      select: {
        id: true,
        orderNumber: true,
        namaKonsumen: true,
        totalHarga: true,
        dp: true,
        submittedAt: true,
        createdAt: true,
        DesignQueueItem: {
          select: { designId: true, artikelId: true },
        },
      },
    })

    for (const order of pendingLowDp) {
      if (!isDpBelowThreshold(order.dp, order.totalHarga)) continue

      const dsn = order.DesignQueueItem?.designId ?? order.orderNumber
      const art = order.DesignQueueItem?.artikelId ?? "—"
      const pct = formatDpPercentage(order.dp, order.totalHarga)
      const dpFormatted = formatRupiahDisplay(order.dp)
      const totalFormatted = formatRupiahDisplay(order.totalHarga)

      items.push({
        id: `owner-dp-rendah-${order.id}`,
        category: "owner_dp_rendah",
        title: "DP di bawah 20%",
        description: `${dsn} · ${art} · ${order.namaKonsumen} — DP Rp ${dpFormatted} (${pct}% dari total Rp ${totalFormatted})`,
        href: "/admin/keuangan",
        occurredAt: (order.submittedAt ?? order.createdAt).toISOString(),
      })
    }
  }

  items.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  )

  const byCategory: Partial<Record<NotificationCategory, number>> = {}
  for (const item of items) {
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1
  }

  return {
    items,
    total: items.length,
    byCategory,
    polledAt,
  }
}
