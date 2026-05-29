/** Format angka rupiah untuk tampilan (pemisah ribuan: titik). */

export function formatRupiahDisplay(n: number): string {
  if (!Number.isFinite(n) || n < 0) return ""
  return n.toLocaleString("id-ID")
}

/** Parse input rupiah (strip titik/non-digit) ke integer. Kosong → NaN. */
export function parseRupiahInput(s: string): number {
  const stripped = s.replace(/\./g, "").replace(/\D/g, "").trim()
  if (!stripped) return NaN
  const n = parseInt(stripped, 10)
  return Number.isNaN(n) ? NaN : n
}

/** Parse opsional: kosong → undefined, invalid → undefined. */
export function parseRupiahInputOptional(s: string): number | undefined {
  const trimmed = s.trim()
  if (!trimmed) return undefined
  const n = parseRupiahInput(trimmed)
  return Number.isNaN(n) ? undefined : n
}
