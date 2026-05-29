import type { DesignQueueStatusDesain } from "@prisma/client"

/** Antrian kerja desainer (belum ACC konsumen). */
export const DESIGNER_ACTIVE_STATUSES: DesignQueueStatusDesain[] = [
  "MENUNGGU",
  "SEDANG_DIPROSES",
  "DIKEMBALIKAN_CS",
  "SUDAH_DI_REVISI",
]

/** Antrian pasca-ACC / menunggu DP — unggah CDR produksi. */
export const DESIGNER_APPROVED_STATUSES: DesignQueueStatusDesain[] = [
  "MENUNGGU_DP",
  "DISETUJUI_CS",
  "FILE_DISETUJUI_UPLOADED",
]

export function isDesignerActiveStatus(status: string) {
  return DESIGNER_ACTIVE_STATUSES.includes(
    status as DesignQueueStatusDesain
  )
}

export function isDesignerApprovedStatus(status: string) {
  return DESIGNER_APPROVED_STATUSES.includes(
    status as DesignQueueStatusDesain
  )
}
