import { isAccountingDpValidated } from "@/lib/cs-antrian-desain"
import {
  labelDeliveryStatus,
  labelPaymentStatus,
  labelProductionStatus,
  labelShipReleaseStatus,
} from "@/lib/status-labels"

export type ProductionProgressTone = "muted" | "warning" | "info" | "success"

export type ProductionProgressLabel = {
  primary: string
  secondary?: string
  tone: ProductionProgressTone
}

export type ProductionPipelineSnapshot = {
  currentStatus: string
  adminProduksiStatus?: string
  needsKancing?: boolean
  needsDTF?: boolean
  kancingCompletedAt?: string | Date | null
  dtfCompletedAt?: string | Date | null
  shipReleaseStatus?: string
  updatedAt?: string | Date | null
  settingSentToConsumerAt?: string | Date | null
  settingRejectNote?: string | null
}

export type ProductionProgressInput = {
  paymentStatus?: string | null
  deliveryStatus?: string | null
  pipeline?: ProductionPipelineSnapshot | null
}

export function resolveProductionProgressLabel(
  input: ProductionProgressInput
): ProductionProgressLabel {
  const payment = input.paymentStatus ?? null
  const pipeline = input.pipeline
  const delivery = (input.deliveryStatus ?? "").trim().toUpperCase()

  if (delivery === "TERKIRIM") {
    return {
      primary: labelDeliveryStatus("TERKIRIM"),
      secondary: payment ? labelPaymentStatus(payment) : undefined,
      tone: "success",
    }
  }

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

  if (pipeline?.currentStatus === "SIAP_KIRIM") {
    const ship = (pipeline.shipReleaseStatus ?? "NONE").trim().toUpperCase()
    if (ship === "MENUNGGU_VALIDASI") {
      return {
        primary: "Menunggu izin kirim",
        secondary: "Admin Keuangan memvalidasi pelunasan",
        tone: "warning",
      }
    }
    if (ship === "DISETUJUI") {
      return {
        primary: labelDeliveryStatus("TERKIRIM"),
        secondary: labelPaymentStatus(payment ?? ""),
        tone: "success",
      }
    }
    if (ship === "DITOLAK") {
      return {
        primary: labelShipReleaseStatus("DITOLAK"),
        secondary: "Siap kirim — ajukan ulang setelah pelunasan",
        tone: "warning",
      }
    }
    return {
      primary: labelProductionStatus("SIAP_KIRIM"),
      secondary: labelPaymentStatus(payment ?? ""),
      tone: "success",
    }
  }

  if (
    pipeline?.currentStatus === "ADMIN_PRODUKSI" &&
    pipeline.adminProduksiStatus === "APPROVED"
  ) {
    const pending: string[] = []
    if (pipeline.needsKancing && !pipeline.kancingCompletedAt) {
      pending.push("Kancing")
    }
    if (pipeline.needsDTF && !pipeline.dtfCompletedAt) {
      pending.push("DTF")
    }

    return {
      primary: "Admin Produksi (pasca-jahit)",
      secondary:
        pending.length > 0
          ? `Menunggu: ${pending.join(", ")}`
          : labelPaymentStatus(payment ?? ""),
      tone: pending.length > 0 ? "warning" : "info",
    }
  }

  if (pipeline?.currentStatus === "MENUNGGU_ACC_SETTING") {
    const secondary = pipeline.settingSentToConsumerAt
      ? "Menunggu jawaban konsumen"
      : "CS menyiapkan konfirmasi ke konsumen"
    return {
      primary: labelProductionStatus("MENUNGGU_ACC_SETTING"),
      secondary: pipeline.settingRejectNote
        ? `Revisi sebelumnya — ${secondary}`
        : secondary,
      tone: "warning",
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

export function productionProgressBadgeClass(
  tone: ProductionProgressTone
): string {
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

export function productionStageBadgeClass(status: string): string {
  if (status === "SIAP_KIRIM") {
    return "border-violet-500/40 bg-violet-950/40 text-violet-200"
  }
  if (status === "ADMIN_PRODUKSI") {
    return "border-amber-500/40 bg-amber-950/40 text-amber-300"
  }
  if (status === "MENUNGGU_ACC_SETTING") {
    return "border-amber-500/40 bg-amber-950/40 text-amber-300"
  }
  return "border-sky-500/40 bg-sky-950/40 text-sky-200"
}

export function resolveProductionUpdatedAt(
  designQueueUpdatedAt?: string | Date | null,
  pipelineUpdatedAt?: string | Date | null
): Date | null {
  const candidates = [designQueueUpdatedAt, pipelineUpdatedAt]
    .map((value) => (value ? new Date(value) : null))
    .filter((date): date is Date => date !== null && !Number.isNaN(date.getTime()))

  if (candidates.length === 0) return null
  return new Date(Math.max(...candidates.map((date) => date.getTime())))
}
