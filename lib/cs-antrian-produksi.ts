import { isAccountingDpValidated } from "@/lib/cs-antrian-desain"
import {
  isCsAntrianDesainItem,
  isCsAntrianProduksiItem,
  type CsAntrianProduksiItem as CsAntrianProduksiItemBase,
} from "@/lib/cs-queue-guards"
import {
  labelPaymentStatus,
  labelProductionStatus,
} from "@/lib/status-labels"

export type CsAntrianProduksiFinalOrder = {
  id: string
  orderNumber: string
  submittedAt?: string | Date | null
  createdAt?: string | Date | null
  jenisProduksi?: string
  expressPriority?: number | null
  deadline?: string | Date | null
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
    needsKancing?: boolean
    needsDTF?: boolean
    dtfCompletedAt?: string | Date | null
  } | null
}

export type CsAntrianProduksiItem = CsAntrianProduksiItemBase & {
  FinalOrder?: CsAntrianProduksiFinalOrder | null
}

export { isCsAntrianDesainItem, isCsAntrianProduksiItem }

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
    pipeline.adminProduksiStatus === "PENDING"
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

