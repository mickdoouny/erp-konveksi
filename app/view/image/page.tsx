"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"

function ImageViewerBody() {
  const searchParams = useSearchParams()
  const url = searchParams.get("url") ?? ""
  const name = searchParams.get("name") ?? "Gambar desain"

  const safeUrl = useMemo(() => {
    if (!url) return ""
    try {
      const parsed = new URL(url, window.location.origin)
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href
      }
      return ""
    } catch {
      return ""
    }
  }, [url])

  if (!safeUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-center text-zinc-400">
        URL gambar tidak valid.
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <p className="truncate text-sm font-medium text-zinc-200">{name}</p>
        <a
          href={safeUrl}
          download={name}
          target="_blank"
          rel="noreferrer"
          className="neo-btn-primary text-sm"
        >
          Unduh
        </a>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={safeUrl}
          alt={name}
          className="max-h-[calc(100vh-5rem)] max-w-full object-contain"
        />
      </main>
    </div>
  )
}

export default function ViewImagePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">
          Memuat gambar…
        </div>
      }
    >
      <ImageViewerBody />
    </Suspense>
  )
}
