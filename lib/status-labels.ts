import { PaymentStatus, ProductionStatus } from "@prisma/client"

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  MENUNGGU_DP: "Menunggu DP",
  DP_TERIMA: "DP diterima",
  SEBAGIAN: "Sebagian",
  LUNAS: "Lunas",
  DP_DIKECUALIKAN: "DP dikecualikan",
}

export const PRODUCTION_STATUS_LABELS: Record<string, string> = {
  ADMIN_PRODUKSI: "Admin Produksi",
  SETTING: "Setting",
  LAYOUT_PRINT: "Layout",
  PRINTING: "Printing",
  PREPARE_BAHAN_KAIN: "Prepare bahan",
  POTONG_KERTAS: "Potong kertas",
  TIMBANG_HASIL_POTONG: "Timbang potong",
  PRESS: "Press",
  JAHIT: "Jahit",
  FINISHING: "Finishing",
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

export function isDpValidatedPaymentStatus(status: string): boolean {
  const key = status.trim().toUpperCase()
  return key !== "" && key !== PaymentStatus.MENUNGGU_DP
}

export { ProductionStatus, PaymentStatus }
