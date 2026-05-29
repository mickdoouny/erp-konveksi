/** Buka gambar di tab viewer internal `/view/image`. */
export function openImageInNewTab(url: string, name?: string) {
  if (typeof window === "undefined") return
  const params = new URLSearchParams({ url })
  if (name?.trim()) params.set("name", name.trim())
  window.open(`/view/image?${params.toString()}`, "_blank", "noopener,noreferrer")
}
