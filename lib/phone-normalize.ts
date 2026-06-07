/**
 * Indonesian phone normalization for konsumen matching.
 *
 * Canonical internal format: digits only with country code 62 (no leading 0).
 * Example: +62 821-1234-1234, 082112341234, 82112341234 → 6282112341234
 */
export const PHONE_CANONICAL_FORMAT =
  "628XXXXXXXXXX (digit only, country code 62, no leading 0)"

const MOBILE_PATTERN = /^62[89]\d{7,11}$/

export function stripPhoneFormatting(raw: string): string {
  return raw
    .trim()
    .replace(/[\s.\-()]/g, "")
    .replace(/^\+/, "")
    .replace(/\D/g, "")
}

/**
 * Normalize to canonical form (628…). Returns null if empty or invalid.
 */
export function normalizeIndonesianPhone(raw: string): string | null {
  const digits = stripPhoneFormatting(raw)
  if (!digits) return null

  let normalized: string
  if (digits.startsWith("0")) {
    normalized = `62${digits.slice(1)}`
  } else if (digits.startsWith("62")) {
    normalized = digits
  } else if (digits.startsWith("8")) {
    normalized = `62${digits}`
  } else {
    return null
  }

  if (!MOBILE_PATTERN.test(normalized)) {
    return null
  }

  return normalized
}

export function phonesMatch(a: string, b: string): boolean {
  const left = normalizeIndonesianPhone(a)
  const right = normalizeIndonesianPhone(b)
  return left !== null && right !== null && left === right
}

export function isValidIndonesianPhone(raw: string): boolean {
  return normalizeIndonesianPhone(raw) !== null
}

export const INVALID_PHONE_MESSAGE =
  "No. telepon tidak valid. Gunakan format Indonesia, contoh: 082112341234 atau +62 821-1234-1234"
