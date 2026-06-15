export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  MENUNGGU_DP: "Menunggu DP",
  DP_TERIMA: "DP diterima",
  SEBAGIAN: "Sebagian",
  LUNAS: "Lunas",
  DP_DIKECUALIKAN: "DP dikecualikan",
}

export const ADMIN_PRODUKSI_STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu setujuan",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
}

export const SHIP_RELEASE_STATUS_LABELS: Record<string, string> = {
  NONE: "Belum diajukan",
  MENUNGGU_VALIDASI: "Menunggu izin kirim",
  DISETUJUI: "Izin kirim disetujui",
  DITOLAK: "Izin kirim ditolak",
}

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  BELUM_KIRIM: "Belum kirim",
  TERKIRIM: "Terkirim",
}

export const PRODUCTION_STATUS_LABELS: Record<string, string> = {
  ADMIN_PRODUKSI: "Admin Produksi",
  SETTING: "Setting",
  MENUNGGU_ACC_SETTING: "Menunggu ACC konsumen",
  LAYOUT_PRINT: "Layout",
  PRINTING: "Printing",
  PREPARE_BAHAN_KAIN: "Potong bahan",
  POTONG_KERTAS: "Potong kertas",
  TIMBANG_HASIL_POTONG: "Timbang potong",
  PRESS: "Press",
  JAHIT: "Jahit",
  FINISHING: "QC",
  KANCING: "Kancing",
  DTF: "DTF",
  PACKING: "Packing",
  BARANG_SELESAI: "Barang selesai",
  SIAP_KIRIM: "Siap kirim",
}

export function labelPaymentStatus(status: string): string {
  return PAYMENT_STATUS_LABELS[status] ?? status.replace(/_/g, " ").toLowerCase()
}

export function labelProductionStatus(status: string): string {
  return (
    PRODUCTION_STATUS_LABELS[status] ??
    status.replace(/_/g, " ").toLowerCase()
  )
}

export function labelAdminProduksiStatus(status: string): string {
  return (
    ADMIN_PRODUKSI_STATUS_LABELS[status] ??
    status.replace(/_/g, " ").toLowerCase()
  )
}

export function labelShipReleaseStatus(status: string): string {
  return (
    SHIP_RELEASE_STATUS_LABELS[status] ??
    status.replace(/_/g, " ").toLowerCase()
  )
}

export function labelDeliveryStatus(status: string): string {
  return (
    DELIVERY_STATUS_LABELS[status] ??
    status.replace(/_/g, " ").toLowerCase()
  )
}

export function isDpValidatedPaymentStatus(status: string): boolean {
  const key = status.trim().toUpperCase()
  return key !== "" && key !== "MENUNGGU_DP"
}
