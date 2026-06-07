import {
  INVALID_PHONE_MESSAGE,
  isValidIndonesianPhone,
} from "./phone-normalize"
export type CsTambahDesainFormInput = {
  namaKonsumen: string
  telepon: string
  alamat: string
  artikels: Array<{ namaArtikel: string }>
}

export type CsTambahDesainFieldErrors = {
  namaKonsumen?: string
  telepon?: string
  alamat?: string
  artikelNama?: Record<number, string>
  summary?: string
}

export function validateCsTambahDesainForm(
  input: CsTambahDesainFormInput
): CsTambahDesainFieldErrors | null {
  const errors: CsTambahDesainFieldErrors = {}
  const namaKonsumen = input.namaKonsumen.trim()
  const telepon = input.telepon.trim()
  const alamat = input.alamat.trim()

  if (!namaKonsumen) {
    errors.namaKonsumen = "Nama konsumen wajib diisi"
  }

  if (!telepon) {
    errors.telepon = "No. telepon wajib diisi"
  } else if (!isValidIndonesianPhone(telepon)) {
    errors.telepon = INVALID_PHONE_MESSAGE
  }

  if (!alamat) {
    errors.alamat = "Alamat pengiriman wajib diisi"
  }

  const artikelNama: Record<number, string> = {}
  input.artikels.forEach((artikel, index) => {
    if (!artikel.namaArtikel.trim()) {
      artikelNama[index] = `Nama artikel ${index + 1} wajib diisi`
    }
  })

  if (Object.keys(artikelNama).length > 0) {
    errors.artikelNama = artikelNama
  }

  if (Object.keys(errors).length === 0) {
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
