export type PotongBahanWeightForm = {
  beratBahan: string
  beratRib: string
  catatanPotongBahan: string
}

export const EMPTY_POTONG_BAHAN_FORM: PotongBahanWeightForm = {
  beratBahan: "",
  beratRib: "",
  catatanPotongBahan: "",
}

export function validatePotongBahanForm(form: PotongBahanWeightForm): string | null {
  const utama = Number(form.beratBahan)
  if (!form.beratBahan.trim() || !Number.isFinite(utama) || utama <= 0) {
    return "Berat bahan utama wajib diisi (kg, lebih dari 0)"
  }
  if (
    form.beratRib.trim() &&
    (!Number.isFinite(Number(form.beratRib)) || Number(form.beratRib) < 0)
  ) {
    return "Berat rib harus angka valid (kg)"
  }
  return null
}

export function potongBahanFormToPayload(form: PotongBahanWeightForm) {
  return {
    beratBahan: Number(form.beratBahan),
    beratRib: form.beratRib.trim() ? Number(form.beratRib) : null,
    catatanPotongBahan: form.catatanPotongBahan.trim() || null,
  }
}

export function formatPotongBahanSummary(pipeline: {
  beratBahan?: number | null
  beratRib?: number | null
  catatanPotongBahan?: string | null
}): string | null {
  if (pipeline.beratBahan == null) return null
  const parts = [`Bahan ${pipeline.beratBahan} kg`]
  if (pipeline.beratRib != null) parts.push(`rib ${pipeline.beratRib} kg`)
  if (pipeline.catatanPotongBahan?.trim()) {
    parts.push(pipeline.catatanPotongBahan.trim())
  }
  return parts.join(" · ")
}
