/** Client-safe notification types & constants — no @prisma/client or prisma imports. */

export type NotificationCategory =
  | "cs_action"
  | "cs_message"
  | "desainer_kerja"
  | "desainer_disetujui"
  | "desainer_message"
  | "keuangan_validasi"
  | "produksi_antrian"
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
  produksi_antrian: (p) => p.startsWith("/admin/final-orders"),
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
  produksi_antrian: "Antrian produksi",
  owner_dp_rendah: "DP rendah",
}
