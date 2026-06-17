export type ShippingAddressInput = {
  alamat: string
  provinsi: string
  kotaKabupaten: string
  kecamatan: string
  kodePos: string
}

export type ShippingAddressFieldErrors = {
  alamat?: string
  provinsi?: string
  kotaKabupaten?: string
  kecamatan?: string
  kodePos?: string
}

export function validateShippingAddress(
  input: ShippingAddressInput
): ShippingAddressFieldErrors {
  const errors: ShippingAddressFieldErrors = {}
  const alamat = input.alamat.trim()
  const provinsi = input.provinsi.trim()
  const kotaKabupaten = input.kotaKabupaten.trim()
  const kecamatan = input.kecamatan.trim()
  const kodePos = input.kodePos.trim()

  if (!alamat) {
    errors.alamat = "Detail alamat wajib diisi"
  }
  if (!provinsi) {
    errors.provinsi = "Provinsi wajib diisi"
  }
  if (!kotaKabupaten) {
    errors.kotaKabupaten = "Kota/Kabupaten wajib diisi"
  }
  if (!kecamatan) {
    errors.kecamatan = "Kecamatan wajib diisi"
  }
  if (!kodePos) {
    errors.kodePos = "Kode pos wajib diisi"
  } else if (!/^\d{5}$/.test(kodePos)) {
    errors.kodePos = "Kode pos harus 5 digit angka"
  }

  return errors
}

export function hasShippingAddressErrors(
  errors: ShippingAddressFieldErrors
): boolean {
  return Object.keys(errors).length > 0
}

export function isShippingAddressComplete(input: ShippingAddressInput): boolean {
  return !hasShippingAddressErrors(validateShippingAddress(input))
}
