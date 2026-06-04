import type { DesignQueueItemRecord } from "@/lib/cs-antrian-desain"
import { isAccountingDpValidated } from "@/lib/cs-antrian-desain"

export type DesignQueueFilterState = {
  search: string
  status: string
  paymentStatus: string
  csNama: string
  dateFrom: string
  dateTo: string
  cdrStatus: string
}

export const EMPTY_DESIGN_QUEUE_FILTERS: DesignQueueFilterState = {
  search: "",
  status: "",
  paymentStatus: "",
  csNama: "",
  dateFrom: "",
  dateTo: "",
  cdrStatus: "",
}

export type DesignQueueFilterableItem = DesignQueueItemRecord & {
  FinalOrder?: {
    orderNumber?: string
    AccountingTransaction?: { paymentStatus: string } | null
    ProductionPipeline?: { currentStatus: string } | null
  } | null
}

export type CsProduksiFilterState = DesignQueueFilterState & {
  pipelineStatus: string
  dtfStatus: string
}

export const EMPTY_CS_PRODUKSI_FILTERS: CsProduksiFilterState = {
  ...EMPTY_DESIGN_QUEUE_FILTERS,
  pipelineStatus: "",
  dtfStatus: "",
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase()
}

export function matchesDesignQueueSearch(
  item: DesignQueueFilterableItem,
  search: string
): boolean {
  const q = normalizeSearch(search)
  if (!q) return true

  return (
    item.namaKonsumen.toLowerCase().includes(q) ||
    item.artikelId.toLowerCase().includes(q) ||
    item.designId.toLowerCase().includes(q) ||
    item.namaArtikel.toLowerCase().includes(q) ||
    (item.sppGroupId?.toLowerCase().includes(q) ?? false) ||
    item.csNama.toLowerCase().includes(q) ||
    (item.FinalOrder?.orderNumber?.toLowerCase().includes(q) ?? false)
  )
}

export function matchesDesignQueueStatus(
  item: DesignQueueFilterableItem,
  status: string
): boolean {
  if (!status) return true
  return item.statusDesain.trim().toUpperCase() === status.toUpperCase()
}

export function getDesignQueuePaymentStatus(
  item: DesignQueueFilterableItem
): string | null {
  return item.FinalOrder?.AccountingTransaction?.paymentStatus ?? null
}

export function matchesDesignQueuePaymentStatus(
  item: DesignQueueFilterableItem,
  paymentStatus: string
): boolean {
  if (!paymentStatus) return true

  const current = getDesignQueuePaymentStatus(item)

  if (paymentStatus === "NONE") {
    return !current
  }

  if (paymentStatus === "MENUNGGU_ADMIN_PRODUKSI") {
    return (
      item.statusDesain.trim().toUpperCase() === "DISETUJUI_CS" &&
      isAccountingDpValidated(current)
    )
  }

  return (current ?? "").toUpperCase() === paymentStatus.toUpperCase()
}

export function matchesDesignQueueCsNama(
  item: DesignQueueFilterableItem,
  csNama: string
): boolean {
  if (!csNama) return true
  return item.csNama === csNama
}

export function matchesDesignQueueDateRange(
  item: DesignQueueFilterableItem,
  dateFrom: string,
  dateTo: string
): boolean {
  const created = new Date(item.createdAt)
  if (Number.isNaN(created.getTime())) return true

  if (dateFrom) {
    const from = new Date(`${dateFrom}T00:00:00`)
    if (created < from) return false
  }

  if (dateTo) {
    const to = new Date(`${dateTo}T23:59:59.999`)
    if (created > to) return false
  }

  return true
}

export function matchesDesignQueueCdrStatus(
  item: DesignQueueFilterableItem,
  cdrStatus: string
): boolean {
  if (!cdrStatus) return true
  const hasCdr = Boolean(item.fileDesainProduksi?.trim())
  if (cdrStatus === "sudah") return hasCdr
  if (cdrStatus === "belum") return !hasCdr
  return true
}

export function matchesDesignQueuePipelineStatus(
  item: DesignQueueFilterableItem,
  pipelineStatus: string
): boolean {
  if (!pipelineStatus) return true
  const current =
    item.FinalOrder?.ProductionPipeline?.currentStatus ?? ""
  return current.toUpperCase() === pipelineStatus.toUpperCase()
}

export function matchesDesignQueueDtfStatusFilter(
  item: DesignQueueFilterableItem,
  dtfStatus: string
): boolean {
  if (!dtfStatus) return true
  if (dtfStatus === "perlu") return Boolean(item.perluDtf)
  if (dtfStatus === "tidak") return !item.perluDtf
  return (item.statusDtf ?? "").toUpperCase() === dtfStatus.toUpperCase()
}

export function filterDesignQueueItems<T extends DesignQueueFilterableItem>(
  items: T[],
  filters: DesignQueueFilterState
): T[] {
  return items.filter(
    (item) =>
      matchesDesignQueueSearch(item, filters.search) &&
      matchesDesignQueueStatus(item, filters.status) &&
      matchesDesignQueuePaymentStatus(item, filters.paymentStatus) &&
      matchesDesignQueueCsNama(item, filters.csNama) &&
      matchesDesignQueueDateRange(item, filters.dateFrom, filters.dateTo) &&
      matchesDesignQueueCdrStatus(item, filters.cdrStatus)
  )
}

export function filterCsProduksiItems<T extends DesignQueueFilterableItem>(
  items: T[],
  filters: CsProduksiFilterState
): T[] {
  return items.filter(
    (item) =>
      matchesDesignQueueSearch(item, filters.search) &&
      matchesDesignQueuePaymentStatus(item, filters.paymentStatus) &&
      matchesDesignQueueCsNama(item, filters.csNama) &&
      matchesDesignQueueDateRange(item, filters.dateFrom, filters.dateTo) &&
      matchesDesignQueuePipelineStatus(item, filters.pipelineStatus) &&
      matchesDesignQueueDtfStatusFilter(item, filters.dtfStatus)
  )
}

export function hasActiveCsProduksiFilters(filters: CsProduksiFilterState): boolean {
  return Object.values(filters).some((value) => value.trim() !== "")
}

export function hasActiveDesignQueueFilters(
  filters: DesignQueueFilterState
): boolean {
  return Object.values(filters).some((value) => value.trim() !== "")
}

export function uniqueCsNames(items: DesignQueueFilterableItem[]): string[] {
  return [...new Set(items.map((item) => item.csNama).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "id")
  )
}
