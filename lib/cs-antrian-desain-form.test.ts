import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { validateCsTambahDesainForm } from "./cs-antrian-desain-form"

const completeAddress = {
  alamat: "Jl. Merdeka No. 10",
  provinsi: "Jawa Barat",
  kotaKabupaten: "Bandung",
  kecamatan: "Coblong",
  kodePos: "40131",
}

const completeArtikel = {
  namaArtikel: "Kaos komunitas",
  catatanDesain: "Logo depan besar",
  perluDtf: false,
  catatanDtf: "",
  desainUtama: [{ url: "/uploads/test.png" }],
  logoSponsor: [{ url: "/uploads/logo.png" }],
}

describe("validateCsTambahDesainForm", () => {
  it("rejects empty required fields with per-field messages", () => {
    const errors = validateCsTambahDesainForm({
      namaKonsumen: "",
      telepon: "",
      alamat: "",
      provinsi: "",
      kotaKabupaten: "",
      kecamatan: "",
      kodePos: "",
      artikels: [
        {
          namaArtikel: "",
          catatanDesain: "",
          perluDtf: true,
          catatanDtf: "",
          desainUtama: [],
          logoSponsor: [],
        },
      ],
    })

    assert.ok(errors)
    assert.equal(errors.namaKonsumen, "Nama konsumen wajib diisi")
    assert.equal(errors.telepon, "No. telepon wajib diisi")
    assert.equal(errors.alamat, "Detail alamat wajib diisi")
    assert.equal(errors.provinsi, "Provinsi wajib diisi")
    assert.equal(errors.kotaKabupaten, "Kota/Kabupaten wajib diisi")
    assert.equal(errors.kecamatan, "Kecamatan wajib diisi")
    assert.equal(errors.kodePos, "Kode pos wajib diisi")
    assert.equal(errors.artikelNama?.[0], "Nama artikel 1 wajib diisi")
    assert.equal(errors.artikelCatatanDesain?.[0], "Catatan desain Artikel 1 wajib diisi")
    assert.equal(errors.artikelCatatanDtf?.[0], "Catatan DTF Artikel 1 wajib diisi")
    assert.equal(errors.artikelDesainUtama?.[0], "Desain utama Artikel 1 wajib diunggah")
    assert.equal(errors.artikelLogoSponsor?.[0], "Logo sponsor Artikel 1 wajib diunggah")
    assert.equal(errors.summary, "Lengkapi semua kolom wajib sebelum menyimpan")
  })

  it("accepts complete valid form", () => {
    const errors = validateCsTambahDesainForm({
      namaKonsumen: "Budi",
      telepon: "082112341234",
      ...completeAddress,
      artikels: [completeArtikel],
    })

    assert.equal(errors, null)
  })
})
