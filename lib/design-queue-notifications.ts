import {
  AdminProduksiStatus,
  DesignQueueNoteSenderRole,
  DesignQueueStatusDesain,
  DtfPaymentRequestStatus,
  DtfStatus,
  PaymentStatus,
  ProductionStatus,
  ShipReleaseStatus,
} from "@prisma/client"
import { prisma } from "@/lib/prisma"
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

export type NotificationCategory =
  | "cs_action"
  | "cs_message"
  | "desainer_kerja"
  | "desainer_disetujui"
  | "desainer_message"
  | "keuangan_validasi"
  | "keuangan_dtf"
  | "produksi_antrian"
  | "produksi_dtf_jahit"
  | "owner_dp_rendah"

export type NotificationItem = {
  id: string
  category: NotificationCategory
  title: string
  description: string
  href: string
  occurredAt: string
}

export type NotificationPayload = {
  items: NotificationItem[]
  total: number
  byCategory: Partial<Record<NotificationCategory, number>>
  polledAt: string
}

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

    const pendingDtf = await prisma.dtfPaymentRequest.findMany({
      where: { status: DtfPaymentRequestStatus.MENUNGGU },
      orderBy: { requestedAt: "desc" },
      take: 15,
      include: {
        DesignQueueItem: {
          select: {
            artikelId: true,
            namaKonsumen: true,
            namaArtikel: true,
          },
        },
        DtfVendor: { select: { name: true } },
      },
    })

    for (const req of pendingDtf) {
      items.push({
        id: `keu-dtf-${req.id}`,
        category: "keuangan_dtf",
        title: "Pembayaran DTF menunggu persetujuan",
        description: `${req.DesignQueueItem.artikelId} · ${req.DtfVendor.name} · Rp ${req.nominal.toLocaleString("id-ID")}`,
        href: "/admin/keuangan",
        occurredAt: req.requestedAt.toISOString(),
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

    const jahitDtfOrders = await prisma.finalOrder.findMany({
      where: {
        needsDTF: true,
        ProductionPipeline: {
          is: { currentStatus: ProductionStatus.JAHIT },
        },
        DesignQueueItem: {
          is: {
            perluDtf: true,
            fileDtfVendor: { not: null },
            statusDtf: DtfStatus.MENUNGGU_ORDER,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 15,
      include: {
        DesignQueueItem: { select: { artikelId: true } },
      },
    })

    for (const order of jahitDtfOrders) {
      items.push({
        id: `prod-dtf-jahit-${order.id}`,
        category: "produksi_dtf_jahit",
        title: "Order DTF siap di Jahit",
        description: `${order.orderNumber} · ${order.DesignQueueItem?.artikelId ?? "—"} · ${order.namaKonsumen}`,
        href: "/admin/final-orders",
        occurredAt: order.updatedAt.toISOString(),
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

export const CATEGORY_CLEAR_PATHS: Record<
  NotificationCategory,
  (pathname: string) => boolean
> = {
  cs_action: (p) =>
    p === "/cs/antrian-desain" ||
    p.startsWith("/cs/antrian-desain/") ||
    p === "/cs/antrian-produksi" ||
    p.startsWith("/cs/antrian-produksi/"),
  cs_message: (p) =>
    p.startsWith("/cs/antrian-desain/") || p.startsWith("/cs/antrian-produksi/"),
  desainer_kerja: (p) =>
    p === "/desainer/antrian" || p.startsWith("/desainer/antrian/"),
  desainer_disetujui: (p) =>
    p === "/desainer/antrian-disetujui" ||
    p.startsWith("/desainer/antrian-disetujui/"),
  desainer_message: (p) => p.startsWith("/desainer/antrian/"),
  keuangan_validasi: (p) => p.startsWith("/admin/keuangan"),
  keuangan_dtf: (p) => p.startsWith("/admin/keuangan"),
  produksi_antrian: (p) => p.startsWith("/admin/final-orders"),
  produksi_dtf_jahit: (p) => p.startsWith("/admin/final-orders"),
  owner_dp_rendah: (p) =>
    p === "/owner" || p.startsWith("/admin/keuangan"),
}

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  cs_action: "Antrian desain",
  cs_message: "Pesan desainer",
  desainer_kerja: "Antrian kerja",
  desainer_disetujui: "Antrian disetujui",
  desainer_message: "Pesan CS",
  keuangan_validasi: "Validasi keuangan",
  keuangan_dtf: "Pembayaran DTF",
  produksi_antrian: "Antrian produksi",
  produksi_dtf_jahit: "Order DTF Jahit",
  owner_dp_rendah: "DP rendah",
}
