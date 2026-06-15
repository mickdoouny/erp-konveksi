export type QueueIdentifierFields = {
  orderNumber?: string | null
  sppNumber?: string | null
  artikelId: string
  namaArtikel?: string | null
  designId: string
}

/** Satu baris ringkas untuk subtitle CsShell (mis. halaman detail). */
export function formatQueueItemSubtitle({
  orderNumber,
  sppNumber,
  artikelId,
  namaArtikel,
  designId,
}: QueueIdentifierFields): string {
  const parts: string[] = []

  if (orderNumber?.trim()) {
    parts.push(`Order: ${orderNumber.trim()}`)
  }
  if (sppNumber?.trim()) {
    parts.push(`SPP: ${sppNumber.trim()}`)
  }

  const artikelLabel = namaArtikel?.trim()
    ? `${artikelId} · ${namaArtikel.trim()}`
    : artikelId
  parts.push(`Artikel: ${artikelLabel}`)
  parts.push(`Desain: ${designId}`)

  return parts.join(" · ")
}

/** Teks pencarian tambahan (tanpa menampilkan sppGroupId ke pengguna). */
export function queueIdentifierSearchText(
  item: QueueIdentifierFields & { sppGroupId?: string | null }
): string {
  return [
    item.orderNumber,
    item.sppNumber,
    item.artikelId,
    item.namaArtikel,
    item.designId,
    item.sppGroupId,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase()
}
