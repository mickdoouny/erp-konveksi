import type { DesignQueueItem } from "@prisma/client"

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
    jenisOrder: typeof raw.jenisOrder === "string" ? raw.jenisOrder : undefined,
    jenisBahan: typeof raw.jenisBahan === "string" ? raw.jenisBahan : undefined,
    jenisKerah: typeof raw.jenisKerah === "string" ? raw.jenisKerah : undefined,
    lengan: typeof raw.lengan === "string" ? raw.lengan : undefined,
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
  if (status !== "MENUNGGU_DP") return false
  return Boolean(fileDesainProduksi?.trim())
}
