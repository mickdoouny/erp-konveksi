import {
  isCsAntrianDesainItem,
  isCsAntrianProduksiItem,
  type CsAntrianProduksiItem as CsAntrianProduksiItemBase,
} from "@/lib/cs-queue-guards"
import {
  productionProgressBadgeClass,
  resolveProductionProgressLabel,
  type ProductionProgressLabel,
  type ProductionProgressTone,
} from "@/lib/production-status-display"

export type CsAntrianProduksiFinalOrder = {
  id: string
  orderNumber: string
  submittedAt?: string | Date | null
  createdAt?: string | Date | null
  deliveryStatus?: string
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
    kancingCompletedAt?: string | Date | null
    dtfCompletedAt?: string | Date | null
    shipReleaseStatus?: string
    updatedAt?: string | Date | null
    settingResultFiles?: string | null
    settingSubmittedAt?: string | Date | null
    settingSubmittedBy?: string | null
    settingRejectNote?: string | null
    settingSentToConsumerAt?: string | Date | null
    settingSentToConsumerBy?: string | null
    settingSubmitCount?: number | null
  } | null
}

export type CsAntrianProduksiItem = CsAntrianProduksiItemBase & {
  FinalOrder?: CsAntrianProduksiFinalOrder | null
}

export { isCsAntrianDesainItem, isCsAntrianProduksiItem }

export type CsProduksiProgressLabel = ProductionProgressLabel
export type CsProduksiProgressTone = ProductionProgressTone

export function csAntrianProduksiProgressLabel(
  item: CsAntrianProduksiItem
): CsProduksiProgressLabel {
  return resolveProductionProgressLabel({
    paymentStatus: item.FinalOrder?.AccountingTransaction?.paymentStatus ?? null,
    deliveryStatus: item.FinalOrder?.deliveryStatus ?? null,
    pipeline: item.FinalOrder?.ProductionPipeline ?? null,
  })
}

export function csProduksiProgressBadgeClass(
  tone: CsProduksiProgressLabel["tone"]
): string {
  return productionProgressBadgeClass(tone)
}
