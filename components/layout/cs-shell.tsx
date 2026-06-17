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
    <div className="flex min-h-screen min-h-[100vh] w-full flex-col md:flex-row">
      <Sidebar />

      <main className="neo-main min-w-0 flex-1 w-full">
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
      </main>
    </div>
  )
}
