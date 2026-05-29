"use client"

import Sidebar from "@/components/Sidebar"

type CsShellProps = {
  children: React.ReactNode
  title?: string
  description?: string
  actions?: React.ReactNode
}

export default function CsShell({
  children,
  title,
  description,
  actions,
}: CsShellProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="neo-main flex-1">
        {(title || actions) && (
          <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              {title ? (
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  {title}
                </h1>
              ) : null}
              {description ? (
                <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </header>
        )}

        {children}
      </div>
    </div>
  )
}
