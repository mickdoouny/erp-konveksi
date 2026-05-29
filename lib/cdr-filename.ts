/** Validasi nama file CDR harus {artikelId}.cdr */
export function validateCdrFilename(
  artikelId: string,
  filename: string
): { ok: true } | { ok: false; message: string } {
  const base = filename.replace(/\.[^.]+$/, "").trim()
  const expected = artikelId.trim()

  if (base.toUpperCase() !== expected.toUpperCase()) {
    return {
      ok: false,
      message: `Nama file harus ${expected}.cdr (tanpa ekstensi = ID artikel).`,
    }
  }

  if (!filename.toLowerCase().endsWith(".cdr")) {
    return {
      ok: false,
      message: "File produksi harus berformat .cdr",
    }
  }

  return { ok: true }
}
