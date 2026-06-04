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
  if (isDesignerActiveStatus(key)) return true
  return key === "SUDAH_DI_DESAIN"
}

type DesignerUploadContext = {
  returnedToCsAt?: string | Date | null
  messages?: { senderRole: string; createdAt: string | Date }[]
}

/** Izinkan unggah ulang saat menunggu ACC jika CS sudah kirim pesan setelah hasil dikirim. */
export function canDesignerUploadHasilDesainWithContext(
  status: string,
  context?: DesignerUploadContext
): boolean {
  if (canDesignerUploadHasilDesain(status)) return true
  if (!isDesignerAwaitingCsAcc(status)) return false

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
