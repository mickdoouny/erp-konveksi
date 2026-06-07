import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { validateCsTambahDesainForm } from "./cs-antrian-desain-form"

describe("validateCsTambahDesainForm", () => {
  it("rejects empty required fields with per-field messages", () => {
    const errors = validateCsTambahDesainForm({
      namaKonsumen: "",
      telepon: "",
      alamat: "",
      artikels: [{ namaArtikel: "" }],
    })

    assert.ok(errors)
    assert.equal(errors.namaKonsumen, "Nama konsumen wajib diisi")
    assert.equal(errors.telepon, "No. telepon wajib diisi")
    assert.equal(errors.alamat, "Alamat pengiriman wajib diisi")
    assert.equal(errors.artikelNama?.[0], "Nama artikel 1 wajib diisi")
    assert.equal(errors.summary, "Lengkapi semua kolom wajib sebelum menyimpan")
  })

  it("accepts complete valid form", () => {
    const errors = validateCsTambahDesainForm({
      namaKonsumen: "Budi",
      telepon: "082112341234",
      alamat: "Jl. Merdeka 1",
      artikels: [{ namaArtikel: "Kaos komunitas" }],
    })

    assert.equal(errors, null)
  })
})
