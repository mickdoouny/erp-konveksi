import { DtfPaymentRequestStatus, DtfStatus } from "@prisma/client"

export const DTF_STATUS_LABELS: Record<string, string> = {
  TIDAK_PERLU: "Tidak perlu DTF",
  MENUNGGU_ORDER: "Menunggu order vendor (Jahit)",
  DI_VENDOR: "Di vendor DTF",
  MENUNGGU_BAYAR: "Menunggu pembayaran",
  DIBAYAR: "DTF dibayar",
  SIAP_PRODUKSI: "Siap diambil produksi",
}

export const DTF_PAYMENT_STATUS_LABELS: Record<string, string> = {
  MENUNGGU: "Menunggu persetujuan",
  DISETUJUI: "Disetujui",
  DITOLAK: "Ditolak",
}

export function labelDtfStatus(status: string): string {
  return DTF_STATUS_LABELS[status] ?? status.replace(/_/g, " ").toLowerCase()
}

export function labelDtfPaymentStatus(status: string): string {
  return (
    DTF_PAYMENT_STATUS_LABELS[status] ??
    status.replace(/_/g, " ").toLowerCase()
  )
}

export function dtfStatusBadgeClass(status: string): string {
  switch (status) {
    case "DIBAYAR":
    case "SIAP_PRODUKSI":
      return "bg-emerald-500/15 text-emerald-300"
    case "MENUNGGU_BAYAR":
      return "bg-amber-500/15 text-amber-300"
    case "DI_VENDOR":
      return "bg-sky-500/15 text-sky-300"
    case "MENUNGGU_ORDER":
      return "bg-orange-500/15 text-orange-300"
    default:
      return "bg-zinc-700/50 text-zinc-400"
  }
}

export function isDtfPaymentApprovedForProduction(status: string): boolean {
  return (
    status === DtfStatus.DIBAYAR || status === DtfStatus.SIAP_PRODUKSI
  )
}

export function isDtfPaymentPending(status: string): boolean {
  return status === DtfPaymentRequestStatus.MENUNGGU
}
