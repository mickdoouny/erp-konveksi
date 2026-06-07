import {
  CS_JENIS_KERAH_OPTIONS,
  CS_LENGAN_OPTIONS,
  type CsJenisItem,
  type CsRosterLineInput,
} from "@/lib/cs-input-order"

/** Template column headers (exact match or alias). */
export const EXCEL_ROSTER_COLUMNS = [
  "No",
  "Nama",
  "Ukuran",
  "No.Punggung",
  "JenisItem",
  "JenisKerah",
  "Lengan",
  "Bahan",
  "Warna",
  "Keterangan",
  "Grup",
] as const

export type ExcelRosterColumn = (typeof EXCEL_ROSTER_COLUMNS)[number]

const HEADER_ALIASES: Record<string, ExcelRosterColumn> = {
  no: "No",
  "#": "No",
  nama: "Nama",
  name: "Nama",
  ukuran: "Ukuran",
  size: "Ukuran",
  "no.punggung": "No.Punggung",
  "no punggung": "No.Punggung",
  nomorpunggung: "No.Punggung",
  "nomor punggung": "No.Punggung",
  jenisitem: "JenisItem",
  "jenis item": "JenisItem",
  jenis: "JenisItem",
  jeniskerah: "JenisKerah",
  "jenis kerah": "JenisKerah",
  kerah: "JenisKerah",
  lengan: "Lengan",
  bahan: "Bahan",
  warna: "Warna",
  color: "Warna",
  keterangan: "Keterangan",
  catatan: "Keterangan",
  note: "Keterangan",
  grup: "Grup",
  group: "Grup",
}

export type ParsedExcelRoster = {
  lines: CsRosterLineInput[]
  rowCount: number
  countsByJenis: Record<CsJenisItem, number>
  warnings: string[]
}

export type ExcelParseResult =
  | { ok: true; data: ParsedExcelRoster }
  | { ok: false; errors: string[] }

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

export function mapHeader(value: unknown): ExcelRosterColumn | null {
  const key = normalizeHeader(value)
  const compact = key.replace(/[\s.]/g, "")
  return HEADER_ALIASES[key] ?? HEADER_ALIASES[compact] ?? null
}

export function normalizeJenisItem(raw: string): CsJenisItem | null {
  const v = raw.trim().toLowerCase()
  if (v === "stelan") return "Stelan"
  if (v === "atasan") return "Atasan"
  if (v === "bawahan" || v === "celana") return "Bawahan"
  return null
}

function buildKeyToColumnMap(
  keys: string[]
): Map<string, ExcelRosterColumn> {
  const map = new Map<string, ExcelRosterColumn>()
  for (const key of keys) {
    const mapped = mapHeader(key)
    if (mapped) map.set(key, mapped)
  }
  return map
}

function getCell(
  row: Record<string, unknown>,
  keyToCol: Map<string, ExcelRosterColumn>,
  col: ExcelRosterColumn
): string {
  for (const [key, mapped] of keyToCol) {
    if (mapped === col) {
      const val = row[key]
      if (val == null) return ""
      return String(val).trim()
    }
  }
  return ""
}

function isEmptyDataRow(
  row: Record<string, unknown>,
  keyToCol: Map<string, ExcelRosterColumn>
): boolean {
  const dataCols = EXCEL_ROSTER_COLUMNS.filter((c) => c !== "No")
  return dataCols.every((col) => !getCell(row, keyToCol, col))
}

/**
 * Parse row objects from XLSX.utils.sheet_to_json (first sheet row = object keys).
 */
export function parseExcelRows(
  rows: Record<string, unknown>[]
): ExcelParseResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!rows.length) {
    return { ok: false, errors: ["File Excel kosong atau tidak ada baris data."] }
  }

  const keyToCol = buildKeyToColumnMap(Object.keys(rows[0]))
  const mappedColumns = new Set(keyToCol.values())

  const requiredHeaders: ExcelRosterColumn[] = ["Nama", "Ukuran", "JenisItem"]
  for (const col of requiredHeaders) {
    if (!mappedColumns.has(col)) {
      errors.push(
        `Kolom wajib "${col}" tidak ditemukan. Pastikan baris pertama template: ${EXCEL_ROSTER_COLUMNS.join(", ")}`
      )
    }
  }
  if (errors.length) return { ok: false, errors }

  const lines: CsRosterLineInput[] = []

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]
    const rowNum = i + 2

    if (isEmptyDataRow(raw, keyToCol)) continue

    const nama = getCell(raw, keyToCol, "Nama")
    const ukuran = getCell(raw, keyToCol, "Ukuran")
    const jenisItemRaw = getCell(raw, keyToCol, "JenisItem")
    const jenisItem = normalizeJenisItem(jenisItemRaw)
    const jenisKerah = getCell(raw, keyToCol, "JenisKerah")
    const lengan = getCell(raw, keyToCol, "Lengan")

    if (!nama) {
      errors.push(`Baris ${rowNum}: Nama wajib diisi.`)
      continue
    }
    if (!ukuran) {
      errors.push(`Baris ${rowNum}: Ukuran wajib diisi.`)
      continue
    }
    if (!jenisItem) {
      errors.push(
        `Baris ${rowNum}: JenisItem "${jenisItemRaw || "(kosong)"}" tidak valid. Gunakan Stelan, Atasan, atau Bawahan.`
      )
      continue
    }

    if (jenisItem === "Stelan" || jenisItem === "Atasan") {
      if (!jenisKerah) {
        errors.push(`Baris ${rowNum}: JenisKerah wajib untuk ${jenisItem}.`)
      } else if (
        !CS_JENIS_KERAH_OPTIONS.includes(
          jenisKerah as (typeof CS_JENIS_KERAH_OPTIONS)[number]
        )
      ) {
        warnings.push(
          `Baris ${rowNum}: JenisKerah "${jenisKerah}" tidak standar — tetap disimpan.`
        )
      }
      if (!lengan) {
        errors.push(`Baris ${rowNum}: Lengan wajib untuk ${jenisItem}.`)
      } else if (
        !CS_LENGAN_OPTIONS.includes(lengan as (typeof CS_LENGAN_OPTIONS)[number])
      ) {
        warnings.push(
          `Baris ${rowNum}: Lengan "${lengan}" tidak standar — tetap disimpan.`
        )
      }
    }

    lines.push({
      nama,
      ukuran,
      nomorPunggung: getCell(raw, keyToCol, "No.Punggung") || undefined,
      jenisItem,
      jenisKerah: jenisKerah || undefined,
      lengan: lengan || undefined,
      bahan: getCell(raw, keyToCol, "Bahan") || undefined,
      warna: getCell(raw, keyToCol, "Warna") || undefined,
      catatan: getCell(raw, keyToCol, "Keterangan") || undefined,
      grup: getCell(raw, keyToCol, "Grup") || undefined,
    })
  }

  if (errors.length) return { ok: false, errors }
  if (lines.length === 0) {
    return { ok: false, errors: ["Tidak ada baris data valid di file Excel."] }
  }

  return {
    ok: true,
    data: {
      lines,
      rowCount: lines.length,
      countsByJenis: countRosterByJenisItem(lines),
      warnings,
    },
  }
}

export function countRosterByJenisItem(
  lines: Array<{ jenisItem?: string | null }>
): Record<CsJenisItem, number> {
  const counts: Record<CsJenisItem, number> = {
    Stelan: 0,
    Atasan: 0,
    Bawahan: 0,
  }
  for (const line of lines) {
    const jenis = normalizeJenisItem(line.jenisItem ?? "")
    if (jenis) counts[jenis] += 1
  }
  return counts
}

export function countRosterByKerahLenganSize(
  lines: Array<{
    jenisKerah?: string | null
    lengan?: string | null
    ukuran?: string | null
  }>
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const line of lines) {
    const kerah = (line.jenisKerah ?? "—").trim() || "—"
    const lengan = (line.lengan ?? "—").trim() || "—"
    const ukuran = (line.ukuran ?? "—").trim() || "—"
    const key = `${kerah} · ${lengan} · ${ukuran}`
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

export function formatBreakdownRecord(
  breakdown: Record<string, number>
): string {
  const entries = Object.entries(breakdown).sort(([a], [b]) =>
    a.localeCompare(b, "id-ID")
  )
  if (entries.length === 0) return "—"
  return entries.map(([key, count]) => `${key}: ${count}`).join(" · ")
}

/** Parse workbook buffer (Node or browser ArrayBuffer). */
export async function parseExcelRosterBuffer(
  buffer: ArrayBuffer
): Promise<ExcelParseResult> {
  const XLSX = await import("xlsx")
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { ok: false, errors: ["File Excel tidak memiliki sheet."] }
  }
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  })
  return parseExcelRows(rows)
}

export function validateExcelRosterForSubmit(
  lines: CsRosterLineInput[],
  manualQty?: number
): { ok: boolean; errors?: string[]; warning?: string } {
  if (lines.length === 0) {
    return {
      ok: false,
      errors: ["Daftar item kosong. Unggah Excel atau isi roster manual."],
    }
  }

  const reparse = parseExcelRows(
    lines.map((line, i) => ({
      No: String(i + 1),
      Nama: line.nama,
      Ukuran: line.ukuran ?? "",
      "No.Punggung": line.nomorPunggung ?? "",
      JenisItem: line.jenisItem ?? "",
      JenisKerah: line.jenisKerah ?? "",
      Lengan: line.lengan ?? "",
      Bahan: line.bahan ?? "",
      Warna: line.warna ?? "",
      Keterangan: line.catatan ?? "",
      Grup: line.grup ?? "",
    }))
  )

  if (!reparse.ok) {
    return { ok: false, errors: reparse.errors }
  }

  if (manualQty != null && manualQty > 0 && lines.length !== manualQty) {
    return {
      ok: true,
      warning: `Jumlah PCS (${manualQty}) tidak sama dengan baris roster (${lines.length}). Lanjutkan?`,
    }
  }

  return {
    ok: true,
    warning: reparse.data.warnings.join(" ") || undefined,
  }
}
