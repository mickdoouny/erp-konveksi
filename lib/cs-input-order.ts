import type { DesignQueueItem } from "@prisma/client"
import { isMenungguDp } from "@/lib/cs-antrian-desain"

export const CS_JENIS_ORDER_OPTIONS = ["Atasan", "Stelan", "Celana"] as const

export const CS_JENIS_KERAH_OPTIONS = [
  "V Neck",
  "O Neck",
  "Wangki",
  "V Neck Tumpang",
  "V Neck Variasi",
] as const

export const CS_LENGAN_OPTIONS = [
  "Lengan Panjang",
  "Lengan Pendek",
  "3/4",
  "Singlet",
] as const

function parseOptionalChoice(
  value: unknown,
  allowed: readonly string[]
): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return allowed.includes(trimmed) ? trimmed : undefined
}

export type CsInputOrderBody = {
  jenisOrder?: string
  jenisBahan?: string
  jenisKerah?: string
  lengan?: string
  totalOrder?: number
  hargaSatuan?: number
  dpAmount?: number
  ongkosKirim?: number
  tanggalDeadline?: string
  buktiDp?: string | null
  catatanFinishing?: string
  needsKancing?: boolean
  needsDTF?: boolean
  rosterLines?: Array<{
    nama: string
    nomorPunggung?: string
    ukuran?: string
    catatan?: string
  }>
}

export function parseCsInputOrderBody(body: unknown): CsInputOrderBody {
  const raw = body as Record<string, unknown>
  return {
    jenisOrder: parseOptionalChoice(raw.jenisOrder, CS_JENIS_ORDER_OPTIONS),
    jenisBahan: typeof raw.jenisBahan === "string" ? raw.jenisBahan : undefined,
    jenisKerah: parseOptionalChoice(raw.jenisKerah, CS_JENIS_KERAH_OPTIONS),
    lengan: parseOptionalChoice(raw.lengan, CS_LENGAN_OPTIONS),
    totalOrder:
      typeof raw.totalOrder === "number" ? raw.totalOrder : Number(raw.totalOrder),
    hargaSatuan:
      typeof raw.hargaSatuan === "number"
        ? raw.hargaSatuan
        : Number(raw.hargaSatuan),
    dpAmount:
      typeof raw.dpAmount === "number" ? raw.dpAmount : Number(raw.dpAmount),
    ongkosKirim:
      typeof raw.ongkosKirim === "number"
        ? raw.ongkosKirim
        : Number(raw.ongkosKirim) || 0,
    tanggalDeadline:
      typeof raw.tanggalDeadline === "string" ? raw.tanggalDeadline : undefined,
    buktiDp: typeof raw.buktiDp === "string" ? raw.buktiDp : null,
    catatanFinishing:
      typeof raw.catatanFinishing === "string" ? raw.catatanFinishing : undefined,
    needsKancing: Boolean(raw.needsKancing),
    needsDTF: Boolean(raw.needsDTF),
    rosterLines: Array.isArray(raw.rosterLines)
      ? (raw.rosterLines as CsInputOrderBody["rosterLines"])
      : [],
  }
}

export function resolveLockedKonsumenFields(item: DesignQueueItem) {
  return {
    namaKonsumen: item.namaKonsumen,
    noTelepon: item.noTelepon ?? "",
    alamatPengiriman: item.alamatPengiriman ?? "",
  }
}

export function canCsSubmitInputOrder(status: string, fileDesainProduksi?: string | null) {
  if (!isMenungguDp(status)) return false
  return Boolean(fileDesainProduksi?.trim())
}

/** Minimum DP as a fraction of order total (20%). */
export const DP_LOW_THRESHOLD = 0.2

export function calculateOrderTotal(
  qty: number,
  hargaSatuan: number,
  ongkosKirim = 0
): number {
  return qty * hargaSatuan + ongkosKirim
}

export function calculateDpPercentage(dp: number, totalHarga: number): number {
  if (totalHarga <= 0) return 0
  return dp / totalHarga
}

export function isDpBelowThreshold(
  dp: number,
  totalHarga: number,
  threshold = DP_LOW_THRESHOLD
): boolean {
  return totalHarga > 0 && calculateDpPercentage(dp, totalHarga) < threshold
}

export function formatDpPercentage(dp: number, totalHarga: number): string {
  const pct = calculateDpPercentage(dp, totalHarga) * 100
  return pct.toLocaleString("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}
