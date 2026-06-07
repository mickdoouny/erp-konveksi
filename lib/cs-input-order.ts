import type { DesignQueueItem, JenisProduksi, Prisma } from "@prisma/client"
import { isMenungguDp } from "@/lib/cs-queue-guards"

export const CS_JENIS_ORDER_OPTIONS = ["Atasan", "Stelan", "Celana"] as const

export const CS_JENIS_ITEM_OPTIONS = ["Stelan", "Atasan", "Bawahan"] as const

export type CsJenisItem = (typeof CS_JENIS_ITEM_OPTIONS)[number]

/** Max PCS for manual roster grid without Excel. */
export const MANUAL_ROSTER_MAX_PCS = 5

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

export const CS_JENIS_PRODUKSI_OPTIONS = ["REGULER", "EXPRESS"] as const

export type CsJenisProduksi = (typeof CS_JENIS_PRODUKSI_OPTIONS)[number]

export const CS_JENIS_PRODUKSI_LABELS: Record<CsJenisProduksi, string> = {
  REGULER: "Reguler",
  EXPRESS: "Express",
}

function parseOptionalChoice(
  value: unknown,
  allowed: readonly string[]
): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return allowed.includes(trimmed) ? trimmed : undefined
}

export type CsRosterLineInput = {
  nama: string
  nomorPunggung?: string
  ukuran?: string
  catatan?: string
  jenisItem?: CsJenisItem | string
  jenisKerah?: string
  lengan?: string
  bahan?: string
  warna?: string
  grup?: string
}

export type CsPriceBreakdown = {
  hargaStelan?: number
  hargaAtasan?: number
  hargaBawahan?: number
  /** Legacy single price — used when per-jenis prices are not set. */
  hargaSatuan?: number
}

export type CsInputOrderBody = {
  jenisOrder?: string
  jenisBahan?: string
  jenisKerah?: string
  lengan?: string
  jenisProduksi?: CsJenisProduksi
  totalOrder?: number
  hargaSatuan?: number
  hargaStelan?: number
  hargaAtasan?: number
  hargaBawahan?: number
  dpAmount?: number
  ongkosKirim?: number
  tanggalDeadline?: string
  buktiDp?: string | null
  catatanFinishing?: string
  needsKancing?: boolean
  needsDTF?: boolean
  rosterLines?: CsRosterLineInput[]
  excelSource?: boolean
}

export function parseJenisProduksi(value: unknown): CsJenisProduksi {
  if (value === "EXPRESS") return "EXPRESS"
  return "REGULER"
}

export function validateCsInputOrderForSubmit(
  input: CsInputOrderBody
): { ok: boolean; message?: string } {
  if (!input.tanggalDeadline?.trim()) {
    return { ok: false, message: "Deadline wajib diisi." }
  }
  return { ok: true }
}

export async function nextExpressPriority(
  tx: Prisma.TransactionClient,
  target: "finalOrder" | "designQueueItem" = "finalOrder"
): Promise<number> {
  if (target === "designQueueItem") {
    const result = await tx.designQueueItem.aggregate({
      where: { jenisProduksi: "EXPRESS", expressPriority: { not: null } },
      _max: { expressPriority: true },
    })
    return (result._max.expressPriority ?? 0) + 1
  }

  const result = await tx.finalOrder.aggregate({
    where: { jenisProduksi: "EXPRESS", expressPriority: { not: null } },
    _max: { expressPriority: true },
  })
  return (result._max.expressPriority ?? 0) + 1
}

export function resolveExpressPriorityFields(
  jenisProduksi: JenisProduksi,
  expressPriority: number | null
): { jenisProduksi: JenisProduksi; expressPriority: number | null } {
  if (jenisProduksi === "EXPRESS") {
    return { jenisProduksi, expressPriority }
  }
  return { jenisProduksi: "REGULER", expressPriority: null }
}

export function emptyRosterLine(): CsRosterLineInput {
  return {
    nama: "",
    nomorPunggung: "",
    ukuran: "",
    catatan: "",
    jenisItem: "",
    jenisKerah: "",
    lengan: "",
    bahan: "",
    warna: "",
    grup: "",
  }
}

export function sanitizeRosterLines(
  lines: CsRosterLineInput[] | undefined
): CsRosterLineInput[] {
  if (!lines?.length) return []
  return lines
    .map((line) => ({
      nama: String(line.nama ?? "").trim(),
      nomorPunggung: line.nomorPunggung?.trim() || undefined,
      ukuran: line.ukuran?.trim() || undefined,
      catatan: line.catatan?.trim() || undefined,
      jenisItem: line.jenisItem?.toString().trim() || undefined,
      jenisKerah: line.jenisKerah?.trim() || undefined,
      lengan: line.lengan?.trim() || undefined,
      bahan: line.bahan?.trim() || undefined,
      warna: line.warna?.trim() || undefined,
      grup: line.grup?.trim() || undefined,
    }))
    .filter((line) => line.nama.length > 0)
}

export function validateRosterForSubmit(
  qty: number,
  lines: CsRosterLineInput[]
): { ok: boolean; error?: string; warning?: string } {
  const filled = sanitizeRosterLines(lines)
  if (qty > 0 && filled.length === 0) {
    return {
      ok: false,
      error: "Jumlah PCS > 0: isi minimal 1 baris daftar item (roster).",
    }
  }
  if (filled.length > 0 && filled.length !== qty) {
    return {
      ok: true,
      warning: `Baris roster terisi (${filled.length}) tidak sama dengan jumlah PCS (${qty}). Lanjutkan?`,
    }
  }
  return { ok: true }
}

export function countRosterBySize(
  lines: Array<{ ukuran?: string | null }>
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const line of lines) {
    const size = (line.ukuran ?? "").trim() || "—"
    counts[size] = (counts[size] ?? 0) + 1
  }
  return counts
}

export function parseCsInputOrderBody(body: unknown): CsInputOrderBody {
  const raw = body as Record<string, unknown>
  const num = (v: unknown) =>
    typeof v === "number" ? v : v != null && v !== "" ? Number(v) : undefined

  return {
    jenisOrder: parseOptionalChoice(raw.jenisOrder, CS_JENIS_ORDER_OPTIONS),
    jenisBahan: typeof raw.jenisBahan === "string" ? raw.jenisBahan : undefined,
    jenisKerah: parseOptionalChoice(raw.jenisKerah, CS_JENIS_KERAH_OPTIONS),
    lengan: parseOptionalChoice(raw.lengan, CS_LENGAN_OPTIONS),
    totalOrder: num(raw.totalOrder),
    hargaSatuan: num(raw.hargaSatuan),
    hargaStelan: num(raw.hargaStelan),
    hargaAtasan: num(raw.hargaAtasan),
    hargaBawahan: num(raw.hargaBawahan),
    dpAmount: num(raw.dpAmount),
    ongkosKirim: num(raw.ongkosKirim) ?? 0,
    tanggalDeadline:
      typeof raw.tanggalDeadline === "string" ? raw.tanggalDeadline : undefined,
    jenisProduksi: parseJenisProduksi(raw.jenisProduksi),
    buktiDp: typeof raw.buktiDp === "string" ? raw.buktiDp : null,
    catatanFinishing:
      typeof raw.catatanFinishing === "string" ? raw.catatanFinishing : undefined,
    needsKancing: Boolean(raw.needsKancing),
    needsDTF: Boolean(raw.needsDTF),
    excelSource: Boolean(raw.excelSource),
    rosterLines: sanitizeRosterLines(
      Array.isArray(raw.rosterLines)
        ? (raw.rosterLines as CsRosterLineInput[])
        : undefined
    ),
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

export function countRosterByJenisItemFromLines(
  lines: Array<{ jenisItem?: string | null }>
): Record<CsJenisItem, number> {
  const counts: Record<CsJenisItem, number> = {
    Stelan: 0,
    Atasan: 0,
    Bawahan: 0,
  }
  for (const line of lines) {
    const raw = (line.jenisItem ?? "").trim().toLowerCase()
    if (raw === "stelan") counts.Stelan += 1
    else if (raw === "atasan") counts.Atasan += 1
    else if (raw === "bawahan" || raw === "celana") counts.Bawahan += 1
  }
  return counts
}

export function usesPerJenisPricing(prices: CsPriceBreakdown): boolean {
  return (
    (prices.hargaStelan ?? 0) > 0 ||
    (prices.hargaAtasan ?? 0) > 0 ||
    (prices.hargaBawahan ?? 0) > 0
  )
}

export function calculateMixedOrderSubtotal(
  lines: Array<{ jenisItem?: string | null }>,
  prices: CsPriceBreakdown
): number {
  const counts = countRosterByJenisItemFromLines(lines)
  const stelan = (prices.hargaStelan ?? 0) * counts.Stelan
  const atasan = (prices.hargaAtasan ?? 0) * counts.Atasan
  const bawahan = (prices.hargaBawahan ?? 0) * counts.Bawahan
  return stelan + atasan + bawahan
}

export function calculateOrderTotal(
  qty: number,
  hargaSatuan: number,
  ongkosKirim = 0
): number {
  return qty * hargaSatuan + ongkosKirim
}

export function calculateOrderTotalFromInput(
  input: CsInputOrderBody
): { subtotal: number; totalHarga: number; qty: number } {
  const lines = input.rosterLines ?? []
  const qty = input.totalOrder ?? lines.length
  const ongkir = input.ongkosKirim ?? 0

  const prices: CsPriceBreakdown = {
    hargaStelan: input.hargaStelan,
    hargaAtasan: input.hargaAtasan,
    hargaBawahan: input.hargaBawahan,
    hargaSatuan: input.hargaSatuan,
  }

  let subtotal = 0
  if (usesPerJenisPricing(prices) && lines.length > 0) {
    subtotal = calculateMixedOrderSubtotal(lines, prices)
  } else {
    const unit = input.hargaSatuan ?? 0
    subtotal = qty * unit
  }

  return { subtotal, totalHarga: subtotal + ongkir, qty }
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
