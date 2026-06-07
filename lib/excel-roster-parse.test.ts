import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  countRosterByJenisItem,
  countRosterByKerahLenganSize,
  normalizeJenisItem,
  parseExcelRows,
} from "./excel-roster-parse"
import {
  calculateMixedOrderSubtotal,
  calculateOrderTotalFromInput,
  countRosterByJenisItemFromLines,
} from "./cs-input-order"

describe("normalizeJenisItem", () => {
  it("accepts Stelan, Atasan, Bawahan, Celana", () => {
    assert.equal(normalizeJenisItem("Stelan"), "Stelan")
    assert.equal(normalizeJenisItem("atasan"), "Atasan")
    assert.equal(normalizeJenisItem("Bawahan"), "Bawahan")
    assert.equal(normalizeJenisItem("celana"), "Bawahan")
    assert.equal(normalizeJenisItem("invalid"), null)
  })
})

describe("parseExcelRows", () => {
  it("parses valid mixed order rows", () => {
    const result = parseExcelRows([
      {
        No: "1",
        Nama: "Budi",
        Ukuran: "L",
        "No.Punggung": "10",
        JenisItem: "Stelan",
        JenisKerah: "V Neck",
        Lengan: "Lengan Pendek",
        Bahan: "Dryfit",
        Warna: "Merah",
        Keterangan: "Logo",
        Grup: "A",
      },
      {
        No: "2",
        Nama: "Andi",
        Ukuran: "M",
        "No.Punggung": "",
        JenisItem: "Bawahan",
        JenisKerah: "",
        Lengan: "",
        Bahan: "Dryfit",
        Warna: "Hitam",
        Keterangan: "",
        Grup: "A",
      },
    ])

    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.data.rowCount, 2)
    assert.equal(result.data.lines[0].nama, "Budi")
    assert.equal(result.data.lines[0].jenisItem, "Stelan")
    assert.equal(result.data.lines[1].jenisItem, "Bawahan")
    assert.equal(result.data.countsByJenis.Stelan, 1)
    assert.equal(result.data.countsByJenis.Bawahan, 1)
  })

  it("rejects Stelan without kerah and lengan", () => {
    const result = parseExcelRows([
      {
        No: "1",
        Nama: "Budi",
        Ukuran: "L",
        "No.Punggung": "",
        JenisItem: "Stelan",
        JenisKerah: "",
        Lengan: "",
        Bahan: "",
        Warna: "",
        Keterangan: "",
        Grup: "",
      },
    ])

    assert.equal(result.ok, false)
    if (result.ok) return
    assert.ok(result.errors.some((e) => e.includes("JenisKerah")))
  })

  it("skips empty rows", () => {
    const result = parseExcelRows([
      {
        No: "1",
        Nama: "Solo",
        Ukuran: "M",
        "No.Punggung": "",
        JenisItem: "Atasan",
        JenisKerah: "O Neck",
        Lengan: "Lengan Panjang",
        Bahan: "",
        Warna: "",
        Keterangan: "",
        Grup: "",
      },
      {
        No: "2",
        Nama: "",
        Ukuran: "",
        "No.Punggung": "",
        JenisItem: "",
        JenisKerah: "",
        Lengan: "",
        Bahan: "",
        Warna: "",
        Keterangan: "",
        Grup: "",
      },
    ])

    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.data.rowCount, 1)
  })
})

describe("mixed order pricing", () => {
  const lines = [
    { jenisItem: "Stelan" },
    { jenisItem: "Stelan" },
    { jenisItem: "Atasan" },
    { jenisItem: "Bawahan" },
  ]

  it("counts by jenis item", () => {
    const counts = countRosterByJenisItemFromLines(lines)
    assert.equal(counts.Stelan, 2)
    assert.equal(counts.Atasan, 1)
    assert.equal(counts.Bawahan, 1)
  })

  it("calculates subtotal from per-jenis prices", () => {
    const subtotal = calculateMixedOrderSubtotal(lines, {
      hargaStelan: 150_000,
      hargaAtasan: 80_000,
      hargaBawahan: 70_000,
    })
    assert.equal(subtotal, 2 * 150_000 + 80_000 + 70_000)
  })

  it("includes ongkir in total", () => {
    const { totalHarga } = calculateOrderTotalFromInput({
      totalOrder: 4,
      hargaStelan: 150_000,
      hargaAtasan: 80_000,
      hargaBawahan: 70_000,
      ongkosKirim: 25_000,
      rosterLines: lines.map((l, i) => ({
        nama: `P${i}`,
        ukuran: "M",
        ...l,
      })),
    })
    assert.equal(totalHarga, 2 * 150_000 + 80_000 + 70_000 + 25_000)
  })
})

describe("countRosterByKerahLenganSize", () => {
  it("groups by kerah, lengan, ukuran", () => {
    const breakdown = countRosterByKerahLenganSize([
      { jenisKerah: "V Neck", lengan: "Pendek", ukuran: "L" },
      { jenisKerah: "V Neck", lengan: "Pendek", ukuran: "L" },
      { jenisKerah: "O Neck", lengan: "Panjang", ukuran: "M" },
    ])
    assert.equal(breakdown["V Neck · Pendek · L"], 2)
    assert.equal(breakdown["O Neck · Panjang · M"], 1)
  })
})

describe("countRosterByJenisItem", () => {
  it("normalizes celana to Bawahan", () => {
    const counts = countRosterByJenisItem([{ jenisItem: "Celana" }])
    assert.equal(counts.Bawahan, 1)
  })
})
