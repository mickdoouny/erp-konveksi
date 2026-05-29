"use client"

import Link from "next/link"

type CsFullscreenPageProps = {
  title: string
  description?: string
  backHref: string
  backLabel?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export default function CsFullscreenPage({
  title,
  description,
  backHref,
  backLabel = "← Kembali",
  actions,
  children,
}: CsFullscreenPageProps) {
  return (
    <div className="min-h-screen bg-[#030304]">
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div className="min-w-0">
            <Link
              href={backHref}
              className="text-sm text-orange-400 hover:text-orange-300"
            >
              {backLabel}
            </Link>
            <h1 className="mt-1 truncate text-xl font-bold text-white md:text-2xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 text-sm text-zinc-500">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  )
}
