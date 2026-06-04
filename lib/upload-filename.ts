/** Nama file disimpan di disk — pola sama dengan CDR desainer ({artikelId}.cdr). */

export function sanitizeUploadFilename(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".")
  if (dot <= 0) return ""
  return filename.slice(dot + 1).toLowerCase()
}

export function buildCdrUploadFilename(artikelId: string): string {
  return `${artikelId.trim()}.cdr`
}

export function buildBuktiDpUploadFilename(
  artikelId: string,
  ext: string
): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "") || "jpg"
  return `${artikelId.trim()}-bukti-dp.${safeExt}`
}

export function buildBuktiPelunasanUploadFilename(
  artikelId: string,
  ext: string
): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "") || "jpg"
  return `${artikelId.trim()}-bukti-pelunasan.${safeExt}`
}

export function buildDtfVendorUploadFilename(
  artikelId: string,
  ext: string
): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "") || "pdf"
  return `${artikelId.trim()}-dtf-vendor.${safeExt}`
}

export function buildDtfProofUploadFilename(
  artikelId: string,
  ext: string
): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "") || "jpg"
  return `${artikelId.trim()}-dtf-proof.${safeExt}`
}

export function buildBuktiDtfVendorUploadFilename(
  artikelId: string,
  ext: string
): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "") || "jpg"
  return `${artikelId.trim()}-bukti-dtf-vendor.${safeExt}`
}
