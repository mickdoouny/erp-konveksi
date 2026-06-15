/** Kode bagian garment yang bisa dipilih saat request print ulang / rework. */
export const REWORK_GARMENT_PART_CODES = [
  "TANGAN_KIRI",
  "TANGAN_KANAN",
  "BADAN_DEPAN",
  "BADAN_BELAKANG",
  "KERAH",
  "RIB",
  "CELANA_DEPAN",
  "CELANA_BELAKANG",
  "KAKI_KIRI",
  "KAKI_KANAN",
] as const

export type ReworkGarmentPartCode = (typeof REWORK_GARMENT_PART_CODES)[number]

export const REWORK_GARMENT_PART_LABELS: Record<ReworkGarmentPartCode, string> = {
  TANGAN_KIRI: "Tangan kiri",
  TANGAN_KANAN: "Tangan kanan",
  BADAN_DEPAN: "Badan depan",
  BADAN_BELAKANG: "Badan belakang",
  KERAH: "Kerah",
  RIB: "Rib",
  CELANA_DEPAN: "Celana depan",
  CELANA_BELAKANG: "Celana belakang",
  KAKI_KIRI: "Kaki kiri",
  KAKI_KANAN: "Kaki kanan",
}

/** Bagian atasan (kaos/jersey). */
const ATASAN_PARTS: ReworkGarmentPartCode[] = [
  "TANGAN_KIRI",
  "TANGAN_KANAN",
  "BADAN_DEPAN",
  "BADAN_BELAKANG",
  "KERAH",
  "RIB",
]

/** Bagian bawahan (celana/rok). */
const BAWAHAN_PARTS: ReworkGarmentPartCode[] = [
  "CELANA_DEPAN",
  "CELANA_BELAKANG",
  "KAKI_KIRI",
  "KAKI_KANAN",
]

/** Stelan = atasan + bawahan. */
const STELAN_PARTS: ReworkGarmentPartCode[] = [...ATASAN_PARTS, ...BAWAHAN_PARTS]

export type ReworkProductType = "STELAN" | "ATASAN" | "BAWAHAN"

/** Minimum parts when jenis order tidak diketahui. */
const DEFAULT_PARTS: ReworkGarmentPartCode[] = [
  "TANGAN_KIRI",
  "TANGAN_KANAN",
  "BADAN_DEPAN",
  "BADAN_BELAKANG",
]

export function resolveReworkProductType(
  jenisOrder?: string | null
): ReworkProductType {
  const raw = (jenisOrder ?? "").trim().toLowerCase()
  if (raw === "stelan") return "STELAN"
  if (raw === "atasan") return "ATASAN"
  if (raw === "celana" || raw === "bawahan") return "BAWAHAN"
  return "ATASAN"
}

export function getReworkPartsForProductType(
  productType: ReworkProductType
): ReworkGarmentPartCode[] {
  switch (productType) {
    case "STELAN":
      return STELAN_PARTS
    case "BAWAHAN":
      return BAWAHAN_PARTS
    case "ATASAN":
    default:
      return ATASAN_PARTS
  }
}

export function getReworkPartsForOrder(
  jenisOrder?: string | null
): ReworkGarmentPartCode[] {
  const type = resolveReworkProductType(jenisOrder)
  const parts = getReworkPartsForProductType(type)
  if (!jenisOrder?.trim()) return DEFAULT_PARTS
  return parts
}

export function isValidReworkGarmentPartCode(
  code: string
): code is ReworkGarmentPartCode {
  return (REWORK_GARMENT_PART_CODES as readonly string[]).includes(code)
}

export function formatReworkParts(codes: string[]): string {
  return codes
    .filter(isValidReworkGarmentPartCode)
    .map((code) => REWORK_GARMENT_PART_LABELS[code])
    .join(", ")
}

export function validateReworkParts(
  codes: string[],
  jenisOrder?: string | null
): string | null {
  if (!codes.length) {
    return "Pilih minimal satu bagian yang perlu di-print ulang"
  }

  const allowed = new Set(getReworkPartsForOrder(jenisOrder))
  const invalid = codes.filter((code) => !allowed.has(code as ReworkGarmentPartCode))
  if (invalid.length) {
    return "Ada bagian yang tidak valid untuk jenis order ini"
  }

  return null
}

export function normalizeReworkParts(
  codes: string[],
  jenisOrder?: string | null
): ReworkGarmentPartCode[] {
  const allowed = new Set(getReworkPartsForOrder(jenisOrder))
  return codes.filter(
    (code): code is ReworkGarmentPartCode =>
      isValidReworkGarmentPartCode(code) && allowed.has(code)
  )
}
