import { AdminProduksiStatus } from "@prisma/client"
import { isAccountingDpValidated } from "@/lib/cs-antrian-desain"
import {
  labelPaymentStatus,
  labelProductionStatus,
} from "@/lib/status-labels"
import { labelDtfStatus } from "@/lib/dtf-status-labels"

export type CsAntrianProduksiFinalOrder = {
  id: string
  orderNumber: string
  submittedAt?: string | Date | null
  AccountingTransaction?: {
    paymentStatus: string
    totalHarga?: number
    dp?: number
    sisaPelunasan?: number
  } | null
  ProductionPipeline?: {
    id: string
    productionNumber: string
    currentStatus: string
    adminProduksiStatus: string
    needsDTF?: boolean
    dtfCompletedAt?: string | Date | null
  } | null
}

export type CsAntrianProduksiItem = {
  id: string
  statusDesain: string
  readyForAdmin?: boolean | null
  perluDtf?: boolean
  statusDtf?: string
  FinalOrder?: CsAntrianProduksiFinalOrder | null
}

/** Item has left antrian desain after CS submitted input order. */
export function isCsAntrianProduksiItem(item: CsAntrianProduksiItem): boolean {
  const status = item.statusDesain.trim().toUpperCase()
  if (status === "DISETUJUI_CS") return true
  if (item.FinalOrder) return true
  if (item.readyForAdmin) return true
  return false
}

export function isCsAntrianDesainItem(item: CsAntrianProduksiItem): boolean {
  return !isCsAntrianProduksiItem(item)
}

export type CsProduksiProgressLabel = {
  primary: string
  secondary?: string
  tone: "muted" | "warning" | "info" | "success"
}

export function csAntrianProduksiProgressLabel(
  item: CsAntrianProduksiItem
): CsProduksiProgressLabel {
  const payment =
    item.FinalOrder?.AccountingTransaction?.paymentStatus ?? null
  const pipeline = item.FinalOrder?.ProductionPipeline

  if (!payment && !pipeline) {
    return {
      primary: "Order tersimpan",
      secondary: "Menunggu Admin Keuangan & Produksi",
      tone: "info",
    }
  }

  if (!isAccountingDpValidated(payment)) {
    return {
      primary: labelPaymentStatus(payment ?? "MENUNGGU_DP"),
      secondary: "Menunggu validasi DP — Admin Keuangan",
      tone: "warning",
    }
  }

  if (
    pipeline?.currentStatus === "ADMIN_PRODUKSI" &&
    pipeline.adminProduksiStatus === AdminProduksiStatus.PENDING
  ) {
    return {
      primary: "Menunggu Admin Produksi",
      secondary: labelPaymentStatus(payment ?? ""),
      tone: "info",
    }
  }

  if (pipeline?.currentStatus) {
    return {
      primary: labelProductionStatus(pipeline.currentStatus),
      secondary: labelPaymentStatus(payment ?? ""),
      tone: "success",
    }
  }

  return {
    primary: labelPaymentStatus(payment ?? ""),
    tone: "success",
  }
}

export function csProduksiProgressBadgeClass(tone: CsProduksiProgressLabel["tone"]): string {
  switch (tone) {
    case "warning":
      return "border-amber-500/40 bg-amber-950/40 text-amber-300"
    case "info":
      return "border-sky-500/40 bg-sky-950/40 text-sky-200"
    case "success":
      return "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
    default:
      return "border-zinc-600 bg-zinc-900/80 text-zinc-300"
  }
}

export function csAntrianProduksiDtfSummary(item: {
  perluDtf?: boolean
  statusDtf?: string
}): string | null {
  if (!item.perluDtf) return null
  return labelDtfStatus(item.statusDtf ?? "MENUNGGU_ORDER")
}
