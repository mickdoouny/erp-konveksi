"use client"

import Sidebar from "@/components/Sidebar"

export function AppShellLoading() {
  return (
    <div className="neo-card p-10 text-center text-zinc-500">Memuat…</div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen min-h-[100vh] w-full flex-col md:flex-row">
      <Sidebar />
      <main className="neo-main min-w-0 flex-1 w-full">
        <div className="min-w-0 w-full">{children}</div>
      </main>
    </div>
  )
}
