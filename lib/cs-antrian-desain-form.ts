import {
  INVALID_PHONE_MESSAGE,
  isValidIndonesianPhone,
} from "./phone-normalize"
import {
  hasShippingAddressErrors,
  validateShippingAddress,
  type ShippingAddressFieldErrors,
} from "./shipping-address"

export type CsTambahDesainArtikelInput = {
  namaArtikel: string
  catatanDesain: string
  perluDtf: boolean
  catatanDtf: string
  desainUtama: unknown[]
  logoSponsor: unknown[]
}

export type CsTambahDesainFormInput = {
  namaKonsumen: string
  telepon: string
  alamat: string
  provinsi: string
  kotaKabupaten: string
  kecamatan: string
  kodePos: string
  artikels: CsTambahDesainArtikelInput[]
}

export type CsTambahDesainFieldErrors = ShippingAddressFieldErrors & {
  namaKonsumen?: string
  telepon?: string
  artikelNama?: Record<number, string>
  artikelCatatanDesain?: Record<number, string>
  artikelCatatanDtf?: Record<number, string>
  artikelDesainUtama?: Record<number, string>
  artikelLogoSponsor?: Record<number, string>
  summary?: string
}

function hasArtikelFieldErrors(errors: CsTambahDesainFieldErrors): boolean {
  return Boolean(
    errors.namaKonsumen ||
      errors.telepon ||
      errors.alamat ||
      errors.provinsi ||
      errors.kotaKabupaten ||
      errors.kecamatan ||
      errors.kodePos ||
      (errors.artikelNama && Object.keys(errors.artikelNama).length > 0) ||
      (errors.artikelCatatanDesain &&
        Object.keys(errors.artikelCatatanDesain).length > 0) ||
      (errors.artikelCatatanDtf &&
        Object.keys(errors.artikelCatatanDtf).length > 0) ||
      (errors.artikelDesainUtama &&
        Object.keys(errors.artikelDesainUtama).length > 0) ||
      (errors.artikelLogoSponsor &&
        Object.keys(errors.artikelLogoSponsor).length > 0)
  )
}

export function validateCsTambahDesainForm(
  input: CsTambahDesainFormInput
): CsTambahDesainFieldErrors | null {
  const errors: CsTambahDesainFieldErrors = {}
  const namaKonsumen = input.namaKonsumen.trim()
  const telepon = input.telepon.trim()

  if (!namaKonsumen) {
    errors.namaKonsumen = "Nama konsumen wajib diisi"
  }

  if (!telepon) {
    errors.telepon = "No. telepon wajib diisi"
  } else if (!isValidIndonesianPhone(telepon)) {
    errors.telepon = INVALID_PHONE_MESSAGE
  }

  const addressErrors = validateShippingAddress({
    alamat: input.alamat,
    provinsi: input.provinsi,
    kotaKabupaten: input.kotaKabupaten,
    kecamatan: input.kecamatan,
    kodePos: input.kodePos,
  })
  if (hasShippingAddressErrors(addressErrors)) {
    Object.assign(errors, addressErrors)
  }

  const artikelNama: Record<number, string> = {}
  const artikelCatatanDesain: Record<number, string> = {}
  const artikelCatatanDtf: Record<number, string> = {}
  const artikelDesainUtama: Record<number, string> = {}
  const artikelLogoSponsor: Record<number, string> = {}

  input.artikels.forEach((artikel, index) => {
    const label = `Artikel ${index + 1}`

    if (!artikel.namaArtikel.trim()) {
      artikelNama[index] = `Nama artikel ${index + 1} wajib diisi`
    }

    if (!artikel.catatanDesain.trim()) {
      artikelCatatanDesain[index] = `Catatan desain ${label} wajib diisi`
    }

    if (artikel.perluDtf && !artikel.catatanDtf.trim()) {
      artikelCatatanDtf[index] = `Catatan DTF ${label} wajib diisi`
    }

    if (!artikel.desainUtama.length) {
      artikelDesainUtama[index] = `Desain utama ${label} wajib diunggah`
    }

    if (!artikel.logoSponsor.length) {
      artikelLogoSponsor[index] = `Logo sponsor ${label} wajib diunggah`
    }
  })

  if (Object.keys(artikelNama).length > 0) {
    errors.artikelNama = artikelNama
  }
  if (Object.keys(artikelCatatanDesain).length > 0) {
    errors.artikelCatatanDesain = artikelCatatanDesain
  }
  if (Object.keys(artikelCatatanDtf).length > 0) {
    errors.artikelCatatanDtf = artikelCatatanDtf
  }
  if (Object.keys(artikelDesainUtama).length > 0) {
    errors.artikelDesainUtama = artikelDesainUtama
  }
  if (Object.keys(artikelLogoSponsor).length > 0) {
    errors.artikelLogoSponsor = artikelLogoSponsor
  }

  if (!hasArtikelFieldErrors(errors)) {
    return null
  }

  errors.summary = "Lengkapi semua kolom wajib sebelum menyimpan"
  return errors
}

export function hasCsTambahDesainFieldErrors(
  errors: CsTambahDesainFieldErrors | null
): errors is CsTambahDesainFieldErrors {
  return errors !== null
}
