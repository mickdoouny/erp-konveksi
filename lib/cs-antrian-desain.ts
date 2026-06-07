import { isMenungguDp } from "@/lib/cs-queue-guards"
import {
  INVALID_PHONE_MESSAGE,
  isValidIndonesianPhone,
  normalizeIndonesianPhone,
} from "@/lib/phone-normalize"
import { isDpValidatedPaymentStatus } from "@/lib/status-labels"

export { isMenungguDp }

export type DesignFile = {
  name: string
  url: string
}

export type DesignQueueItemRecord = {
  id: string
  designId: string
  artikelId: string
  sppGroupId?: string | null
  csNama: string
  csId?: string | null
  namaKonsumen: string
  noTelepon?: string | null
  alamatPengiriman?: string | null
  namaArtikel: string
  sppNumber?: string | null
  materiDesain?: string | null
  desainUtama?: string | null
  logoSponsor?: string | null
  hasilDesain?: string | null
  catatanRevisi?: string | null
  revisionCount: number
  statusDesain: string
  fileDesainProduksi?: string | null
  perluDtf?: boolean
  catatanDtf?: string | null
  statusDtf?: string
  fileDtfVendor?: string | null
  fileDtfProof?: string | null
  dtfVendorId?: string | null
  DtfVendor?: {
    id: string
    name: string
    contact?: string | null
    phone?: string | null
    bankAccount?: string | null
  } | null
  DtfPaymentRequest?: Array<{
    id: string
    nominal: number
    status: string
    requestedAt: string | Date
    approvedAt?: string | Date | null
    buktiBayarUrl?: string | null
  }>
  leadCode?: string | null
  jenisProduksi?: string
  expressPriority?: number | null
  tanggalDeadline?: string | Date | null
  createdAt: string | Date
  updatedAt: string | Date
}

export const STATUS_LABELS: Record<string, string> = {
  MENUNGGU: "Menunggu desainer",
  SEDANG_DIPROSES: "Sedang diproses",
  SELESAI: "Selesai",
  DIKEMBALIKAN_CS: "Dikembalikan ke CS",
  DISETUJUI_CS: "Disetujui CS",
  FILE_DISETUJUI_UPLOADED: "File disetujui diunggah",
  SUDAH_DI_DESAIN: "Sudah di desain",
  SUDAH_DI_REVISI: "Sudah di revisi",
  MENUNGGU_ACC_KONSUMEN: "Menunggu ACC konsumen",
  MENUNGGU_DP: "Menunggu DP",
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ").toLowerCase()
}

export function parseDesignFiles(raw: string | null | undefined): DesignFile[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function serializeDesignFiles(files: DesignFile[]): string {
  return JSON.stringify(files)
}

/** Ekstensi gambar yang didukung untuk unggah/preview (Windows sering kosongkan MIME). */
export const DESIGN_IMAGE_EXT =
  /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif|jfif|avif|tiff?)$/i

export function isDesignImageFilename(name: string): boolean {
  return DESIGN_IMAGE_EXT.test(name)
}

export function isDesignImageFile(file: File): boolean {
  const mime = (file.type ?? "").trim().toLowerCase()
  if (mime.startsWith("image/")) return true
  const name = (file.name ?? "").trim()
  if (name && isDesignImageFilename(name)) return true
  return false
}

/** Ambil FileList dari drag event — beberapa browser/mobile hanya mengisi items, bukan files. */
export function filesFromDataTransfer(dataTransfer: DataTransfer): FileList | null {
  if (dataTransfer.files?.length) return dataTransfer.files

  const transfer = new DataTransfer()
  for (const item of Array.from(dataTransfer.items)) {
    if (item.kind !== "file") continue
    const file = item.getAsFile()
    if (file) transfer.items.add(file)
  }

  return transfer.files.length ? transfer.files : null
}

export function isDesignImageUrl(url: string): boolean {
  const path = url.split("?")[0]?.split("#")[0] ?? url
  return DESIGN_IMAGE_EXT.test(path)
}

export function mergeDesignFiles(...groups: DesignFile[][]): DesignFile[] {
  const seen = new Set<string>()
  const result: DesignFile[] = []

  for (const group of groups) {
    for (const file of group) {
      const key = file.url || file.name
      if (seen.has(key)) continue
      seen.add(key)
      result.push(file)
    }
  }

  return result
}

export function generateDesignId(sequence: number): string {
  return `DSN-${String(sequence).padStart(5, "0")}`
}

export function generateArtikelId(sequence: number): string {
  return `ART-${String(sequence).padStart(5, "0")}`
}

export function generateSppGroupId(): string {
  return `SPP-${Date.now().toString(36).toUpperCase()}`
}

export type CreateArtikelInput = {
  namaArtikel: string
  spp?: string
  catatanDesain?: string
  perluDtf?: boolean
  catatanDtf?: string
  desainUtama?: DesignFile[]
  logoSponsor?: DesignFile[]
}

export type CreateDesignBatchInput = {
  namaCs: string
  csId?: string
  namaKonsumen: string
  telepon: string
  alamat: string
  artikels: CreateArtikelInput[]
}

export type CsAntrianDesainFieldError = {
  field: string
  message: string
}

export type CsAntrianDesainValidated = {
  namaKonsumen: string
  telepon: string
  noTeleponNormalized: string
  alamat: string
  artikels: CreateArtikelInput[]
}

export function validateCsAntrianDesainBody(
  body: CreateDesignBatchInput
):
  | { ok: true; data: CsAntrianDesainValidated }
  | { ok: false; message: string; errors: CsAntrianDesainFieldError[] } {
  const errors: CsAntrianDesainFieldError[] = []

  const namaKonsumen = body.namaKonsumen?.trim() ?? ""
  const telepon = body.telepon?.trim() ?? ""
  const alamat = body.alamat?.trim() ?? ""

  if (!namaKonsumen) {
    errors.push({ field: "namaKonsumen", message: "Nama konsumen wajib diisi" })
  }

  if (!telepon) {
    errors.push({ field: "telepon", message: "No. telepon wajib diisi" })
  } else if (!isValidIndonesianPhone(telepon)) {
    errors.push({ field: "telepon", message: INVALID_PHONE_MESSAGE })
  }

  if (!alamat) {
    errors.push({ field: "alamat", message: "Alamat pengiriman wajib diisi" })
  }

  if (!Array.isArray(body.artikels) || body.artikels.length === 0) {
    errors.push({
      field: "artikels",
      message: "Minimal satu artikel wajib diisi",
    })
  } else {
    body.artikels.forEach((artikel, index) => {
      if (!artikel.namaArtikel?.trim()) {
        errors.push({
          field: `artikels.${index}.namaArtikel`,
          message: `Nama artikel ${index + 1} wajib diisi`,
        })
      }
    })
  }

  if (errors.length > 0) {
    return {
      ok: false,
      message: "Lengkapi semua kolom wajib sebelum menyimpan",
      errors,
    }
  }

  const noTeleponNormalized = normalizeIndonesianPhone(telepon)
  if (!noTeleponNormalized) {
    return {
      ok: false,
      message: "Lengkapi semua kolom wajib sebelum menyimpan",
      errors: [{ field: "telepon", message: INVALID_PHONE_MESSAGE }],
    }
  }

  return {
    ok: true,
    data: {
      namaKonsumen,
      telepon,
      noTeleponNormalized,
      alamat,
      artikels: body.artikels,
    },
  }
}

/** @deprecated Use validateCsAntrianDesainBody */
export function parseCsAntrianDesainBody(
  body: CreateDesignBatchInput
): { ok: true } | { ok: false; message: string } {
  const result = validateCsAntrianDesainBody(body)
  if (!result.ok) {
    return { ok: false, message: result.message }
  }
  return { ok: true }
}

export function statusBadgeClass(
  status: string,
  accountingPaymentStatus?: string | null
): string {
  if (
    status === "DISETUJUI_CS" &&
    isAccountingDpValidated(accountingPaymentStatus)
  ) {
    return "border-sky-500/40 bg-sky-950/40 text-sky-200"
  }

  switch (status) {
    case "MENUNGGU":
      return "border-zinc-600 bg-zinc-900/80 text-zinc-300"
    case "SEDANG_DIPROSES":
    case "SUDAH_DI_DESAIN":
      return "border-orange-500/40 bg-orange-950/50 text-orange-300"
    case "MENUNGGU_ACC_KONSUMEN":
      return "border-amber-500/40 bg-amber-950/40 text-amber-300"
    case "MENUNGGU_DP":
    case "DISETUJUI_CS":
      return "border-white/25 bg-white/10 text-white"
    case "DIKEMBALIKAN_CS":
    case "SUDAH_DI_REVISI":
      return "border-red-500/40 bg-red-950/50 text-red-400"
    case "SELESAI":
    case "FILE_DISETUJUI_UPLOADED":
      return "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
    default:
      return "border-zinc-600 bg-zinc-900/80 text-zinc-300"
  }
}

export function canAccFromKonsumen(status: string): boolean {
  return status === "MENUNGGU_ACC_KONSUMEN"
}

export function canRequestRevisi(status: string): boolean {
  return ["MENUNGGU_ACC_KONSUMEN", "MENUNGGU_DP", "DISETUJUI_CS"].includes(
    status
  )
}

export function isAccountingDpValidated(paymentStatus?: string | null): boolean {
  return isDpValidatedPaymentStatus(String(paymentStatus ?? ""))
}

export function labelCsAntrianDesainStatus(
  status: string,
  revisionCount?: number | null,
  accountingPaymentStatus?: string | null
): string {
  if (
    status === "DISETUJUI_CS" &&
    isAccountingDpValidated(accountingPaymentStatus)
  ) {
    return "Menunggu Admin Produksi"
  }
  return statusLabel(status)
}

export function hasProductionDesignFile(item: {
  fileDesainProduksi?: string | null
}): boolean {
  return Boolean(item.fileDesainProduksi?.trim())
}

export const DESIGN_QUEUE_KONSUMEN_LOCKED_STATUSES = [
  "DISETUJUI_CS",
  "FILE_DISETUJUI_UPLOADED",
] as const

export function canCsEditKonsumen(status: string): boolean {
  const key = status.trim().toUpperCase()
  return !DESIGN_QUEUE_KONSUMEN_LOCKED_STATUSES.includes(
    key as (typeof DESIGN_QUEUE_KONSUMEN_LOCKED_STATUSES)[number]
  )
}

export type EditKonsumenPrefill = {
  id: string
  namaKonsumen: string
  noTelepon?: string | null
  alamatPengiriman?: string | null
  sppGroupId?: string | null
}

export type CsEditKonsumenInput = {
  namaKonsumen: string
  noTelepon: string
  alamatPengiriman: string
}

export type CsEditKonsumenValidated = CsEditKonsumenInput & {
  noTeleponNormalized: string
}

export function parseCsEditKonsumenBody(
  body: Record<string, unknown>
):
  | { ok: true; data: CsEditKonsumenValidated }
  | { ok: false; message: string } {
  const namaKonsumen = String(body.namaKonsumen ?? "").trim()
  const noTelepon = String(body.noTelepon ?? "").trim()
  const alamatPengiriman = String(body.alamatPengiriman ?? "").trim()

  if (!namaKonsumen) {
    return { ok: false, message: "Nama konsumen wajib diisi" }
  }
  if (!noTelepon) {
    return { ok: false, message: "No. telepon wajib diisi" }
  }
  if (!isValidIndonesianPhone(noTelepon)) {
    return { ok: false, message: INVALID_PHONE_MESSAGE }
  }
  if (!alamatPengiriman) {
    return { ok: false, message: "Alamat pengiriman wajib diisi" }
  }

  const noTeleponNormalized = normalizeIndonesianPhone(noTelepon)
  if (!noTeleponNormalized) {
    return { ok: false, message: INVALID_PHONE_MESSAGE }
  }

  return {
    ok: true,
    data: { namaKonsumen, noTelepon, alamatPengiriman, noTeleponNormalized },
  }
}

export type CsAntrianDesainDetailGuidance = {
  message: string
  variant: "info" | "success" | "warning"
}

export function csAntrianDesainDetailGuidance(
  status: string,
  revisionCount?: number | null,
  fileDesainProduksi?: string | null,
  accountingPaymentStatus?: string | null
): CsAntrianDesainDetailGuidance | null {
  const key = status.trim().toUpperCase()
  const rev =
    typeof revisionCount === "number" && revisionCount > 0 ? revisionCount : 0

  switch (key) {
    case "MENUNGGU":
      return {
        variant: "info",
        message:
          "Antrian menunggu desainer. Tandai proses atau tunggu hasil desain di kolom kanan.",
      }
    case "SEDANG_DIPROSES":
    case "SUDAH_DI_DESAIN":
      return {
        variant: "info",
        message:
          "Desainer sedang mengerjakan. Setelah selesai, kirim ke konsumen untuk ACC.",
      }
    case "MENUNGGU_ACC_KONSUMEN":
      return {
        variant: "warning",
        message:
          "Tunjukkan hasil desain ke konsumen. Jika setuju, klik ACC dari konsumen.",
      }
    case "MENUNGGU_DP":
    case "FILE_DISETUJUI_UPLOADED":
      if (!hasProductionDesignFile({ fileDesainProduksi })) {
        return {
          variant: "warning",
          message:
            "Menunggu desainer mengunggah file CDR produksi (nama file = ID artikel). Setelah itu Anda bisa input order.",
        }
      }
      return {
        variant: "success",
        message:
          "CDR produksi sudah ada. Lengkapi data order (harga, DP, bukti transfer) lalu simpan.",
      }
    case "DISETUJUI_CS":
      if (isAccountingDpValidated(accountingPaymentStatus)) {
        return {
          variant: "success",
          message:
            "DP sudah divalidasi Admin Keuangan. Order menunggu persetujuan Admin Produksi (cetak SPP).",
        }
      }
      return {
        variant: "success",
        message:
          "Order tersimpan. Menunggu Admin Keuangan validasi DP, lalu Admin Produksi.",
      }
    case "DIKEMBALIKAN_CS":
    case "SUDAH_DI_REVISI":
      return {
        variant: "warning",
        message: rev
          ? `Revisi ke-${rev}: perbaiki catatan lalu kirim ulang ke desainer.`
          : "Perbaiki catatan revisi lalu kirim ulang ke desainer.",
      }
    default:
      return null
  }
}

export type CsAntrianDesainRowActions = {
  showTandaiProses: boolean
  showAccKonsumen: boolean
  showRevisi: boolean
  showKirimUlangDesainer: boolean
  showInputOrder: boolean
  showMenungguCdr: boolean
}

export function csAntrianDesainRowActions(
  status: string,
  fileDesainProduksi?: string | null
): CsAntrianDesainRowActions {
  const key = status.trim().toUpperCase()
  const hasCdr = hasProductionDesignFile({ fileDesainProduksi })

  return {
    showTandaiProses: key === "MENUNGGU",
    showAccKonsumen: canAccFromKonsumen(key),
    showRevisi: canRequestRevisi(key),
    showKirimUlangDesainer: ["DIKEMBALIKAN_CS", "SUDAH_DI_REVISI"].includes(key),
    showInputOrder: isMenungguDp(key) && hasCdr,
    showMenungguCdr: isMenungguDp(key) && !hasCdr,
  }
}

export type CsListRowAction = {
  href: string
  label: string
  variant: "primary" | "muted" | "default"
}

export function csAntrianDesainListRowAction(item: {
  id: string
  statusDesain: string
  fileDesainProduksi?: string | null
}): CsListRowAction {
  const actions = csAntrianDesainRowActions(
    item.statusDesain,
    item.fileDesainProduksi
  )

  if (actions.showInputOrder) {
    return {
      href: `/cs/antrian-desain/${item.id}/input-order`,
      label: "Input order",
      variant: "primary",
    }
  }

  if (actions.showMenungguCdr) {
    return {
      href: `/cs/antrian-desain/${item.id}`,
      label: "Menunggu CDR",
      variant: "muted",
    }
  }

  return {
    href: `/cs/antrian-desain/${item.id}`,
    label: "Detail",
    variant: "default",
  }
}
