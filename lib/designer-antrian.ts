import type { DesignQueueStatusDesain } from "@prisma/client"
import { parseDesignFiles } from "@/lib/cs-antrian-desain"

/** Antrian kerja desainer (belum ACC konsumen). */
export const DESIGNER_ACTIVE_STATUSES: DesignQueueStatusDesain[] = [
  "MENUNGGU",
  "SEDANG_DIPROSES",
  "DIKEMBALIKAN_CS",
  "SUDAH_DI_REVISI",
]

/** Status di mana desainer boleh menekan Kirim ke CS (harus ada hasil desain). */
export const DESIGNER_CAN_SEND_TO_CS_STATUSES: DesignQueueStatusDesain[] = [
  "MENUNGGU",
  "SEDANG_DIPROSES",
  "DIKEMBALIKAN_CS",
  "SUDAH_DI_REVISI",
  "SUDAH_DI_DESAIN",
]

/** Status di mana desainer boleh mengunggah / mengganti / menghapus hasil desain. */
export const DESIGNER_CAN_UPLOAD_HASIL_STATUSES: DesignQueueStatusDesain[] = [
  ...DESIGNER_ACTIVE_STATUSES,
  "MENUNGGU_ACC_KONSUMEN",
  "SUDAH_DI_DESAIN",
]

/** Status terkunci — desain sudah disetujui atau selesai (CDR / produksi). */
export const DESIGNER_UPLOAD_LOCKED_STATUSES: DesignQueueStatusDesain[] = [
  "SELESAI",
  "DISETUJUI_CS",
  "MENUNGGU_DP",
  "FILE_DISETUJUI_UPLOADED",
]

/** Antrian pasca-ACC / menunggu DP — unggah CDR produksi. */
export const DESIGNER_APPROVED_STATUSES: DesignQueueStatusDesain[] = [
  "MENUNGGU_DP",
  "DISETUJUI_CS",
  /** Legacy — new uploads stay on MENUNGGU_DP */
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

export function canDesignerKirimKeCs(
  status: string,
  hasilDesain?: string | null
): boolean {
  const key = status.trim().toUpperCase() as DesignQueueStatusDesain
  if (!DESIGNER_CAN_SEND_TO_CS_STATUSES.includes(key)) return false
  return parseDesignFiles(hasilDesain).length > 0
}

/** Status di mana desainer boleh mengunggah / mengganti hasil desain. */
export function canDesignerUploadHasilDesain(status: string): boolean {
  const key = status.trim().toUpperCase() as DesignQueueStatusDesain
  return DESIGNER_CAN_UPLOAD_HASIL_STATUSES.includes(key)
}

export type DesignerUploadContext = {
  returnedToCsAt?: string | Date | null
  messages?: { senderRole: string; createdAt: string | Date }[]
}

/** Sama dengan canDesignerUploadHasilDesain — context disimpan untuk kompatibilitas UI. */
export function canDesignerUploadHasilDesainWithContext(
  status: string,
  _context?: DesignerUploadContext
): boolean {
  return canDesignerUploadHasilDesain(status)
}

/** CS mengirim catatan setelah desainer kirim ke CS (hint revisi di UI). */
export function hasCsRevisionNoteAfterSend(
  context?: DesignerUploadContext
): boolean {
  const csMessages = (context?.messages ?? []).filter(
    (message) => message.senderRole.toUpperCase() === "CS"
  )
  if (csMessages.length === 0) return false

  const returnedToCsAt = context?.returnedToCsAt
  if (!returnedToCsAt) return true

  const returnedAt = new Date(returnedToCsAt).getTime()
  if (!Number.isFinite(returnedAt)) return true

  return csMessages.some(
    (message) => new Date(message.createdAt).getTime() > returnedAt
  )
}

export function isDesignerAwaitingCsAcc(status: string): boolean {
  return status.trim().toUpperCase() === "MENUNGGU_ACC_KONSUMEN"
}

export function isDesignerRevisionRequested(status: string): boolean {
  const key = status.trim().toUpperCase() as DesignQueueStatusDesain
  return key === "DIKEMBALIKAN_CS" || key === "SUDAH_DI_REVISI"
}

/** Pesan untuk UI saat unggah hasil desain tidak diizinkan. */
export function designerUploadBlockedReason(
  status: string,
  context?: DesignerUploadContext
): string | undefined {
  if (canDesignerUploadHasilDesainWithContext(status, context)) return undefined

  const key = status.trim().toUpperCase() as DesignQueueStatusDesain
  if (key === "SELESAI") {
    return "Unggah tidak tersedia — desain sudah selesai."
  }
  if (DESIGNER_UPLOAD_LOCKED_STATUSES.includes(key)) {
    return "Unggah hasil desain terkunci — desain sudah disetujui. Unggah file CDR di antrian disetujui."
  }
  return "Unggah hasil desain tidak tersedia pada status ini."
}
