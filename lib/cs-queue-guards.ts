/** Client-safe CS queue helpers — no @prisma/client value imports. */

export type CsAntrianProduksiItem = {
  id: string
  statusDesain: string
  readyForAdmin?: boolean | null
  perluDtf?: boolean
  statusDtf?: string
  jenisProduksi?: string
  expressPriority?: number | null
  tanggalDeadline?: string | Date | null
  createdAt?: string | Date
  FinalOrder?: { id: string } | null
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

/** Includes legacy FILE_DISETUJUI_UPLOADED (same workflow phase). */
export function isMenungguDp(status: string): boolean {
  const key = status.trim().toUpperCase()
  return key === "MENUNGGU_DP" || key === "FILE_DISETUJUI_UPLOADED"
}
