import type { JenisProduksi } from "@prisma/client"

export type ProductionQueueSortFields = {
  jenisProduksi?: JenisProduksi | string | null
  expressPriority?: number | null
  deadline?: Date | string | null
  tanggalDeadline?: Date | string | null
  createdAt?: Date | string | null
  submittedAt?: Date | string | null
}

export function isExpressProduction(
  item: Pick<ProductionQueueSortFields, "jenisProduksi">
): boolean {
  return item.jenisProduksi === "EXPRESS"
}

function toTime(value: Date | string | null | undefined): number | null {
  if (value == null) return null
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
}

function deadlineTime(item: ProductionQueueSortFields): number | null {
  return toTime(item.deadline ?? item.tanggalDeadline)
}

function fallbackTime(item: ProductionQueueSortFields): number {
  return (
    toTime(item.submittedAt) ??
    toTime(item.createdAt) ??
    Number.MAX_SAFE_INTEGER
  )
}

/** Express first (expressPriority ASC), then Reguler by deadline ASC, then submitted/created. */
export function compareProductionQueueOrder(
  a: ProductionQueueSortFields,
  b: ProductionQueueSortFields
): number {
  const aExpress = isExpressProduction(a)
  const bExpress = isExpressProduction(b)

  if (aExpress !== bExpress) {
    return aExpress ? -1 : 1
  }

  if (aExpress && bExpress) {
    const ap = a.expressPriority ?? Number.MAX_SAFE_INTEGER
    const bp = b.expressPriority ?? Number.MAX_SAFE_INTEGER
    if (ap !== bp) return ap - bp
  }

  const ad = deadlineTime(a)
  const bd = deadlineTime(b)
  if (ad !== bd) {
    if (ad == null) return 1
    if (bd == null) return -1
    return ad - bd
  }

  return fallbackTime(a) - fallbackTime(b)
}

export function sortProductionQueue<T extends ProductionQueueSortFields>(
  items: T[]
): T[] {
  return [...items].sort(compareProductionQueueOrder)
}

export function labelJenisProduksi(
  jenis?: JenisProduksi | string | null
): string {
  return jenis === "EXPRESS" ? "Express" : "Reguler"
}

export function expressBadgeLabel(
  jenisProduksi?: JenisProduksi | string | null,
  expressPriority?: number | null
): string | null {
  if (jenisProduksi !== "EXPRESS") return null
  if (expressPriority == null) return "Express"
  return `Express #${expressPriority}`
}

export function expressBadgeClassName(): string {
  return "border-orange-500/50 bg-orange-950/50 text-orange-200"
}
