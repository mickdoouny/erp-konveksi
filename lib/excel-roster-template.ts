import { EXCEL_ROSTER_COLUMNS } from "@/lib/excel-roster-parse"

const SAMPLE_ROWS = [
  [
    1,
    "Budi Santoso",
    "L",
    "10",
    "Stelan",
    "V Neck",
    "Lengan Pendek",
    "Dryfit",
    "Merah",
    "Logo dada kiri",
    "Tim A",
  ],
  [
    2,
    "Andi Wijaya",
    "M",
    "7",
    "Atasan",
    "O Neck",
    "Lengan Panjang",
    "Dryfit",
    "Biru",
    "",
    "Tim A",
  ],
  [
    3,
    "Citra Dewi",
    "M",
    "",
    "Bawahan",
    "",
    "",
    "Dryfit",
    "Hitam",
    "",
    "Tim A",
  ],
]

export async function buildRosterTemplateBuffer(): Promise<ArrayBuffer> {
  const XLSX = await import("xlsx")
  const wsData = [EXCEL_ROSTER_COLUMNS.slice(), ...SAMPLE_ROWS]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  ws["!cols"] = [
    { wch: 4 },
    { wch: 22 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 20 },
    { wch: 10 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Roster")
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
  return out
}
