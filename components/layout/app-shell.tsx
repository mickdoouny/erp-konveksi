"use client"

import Sidebar from "@/components/Sidebar"

export function AppShellLoading() {
  return (
    <div className="neo-card p-10 text-center text-zinc-500">Memuat…</div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="neo-main flex-1">{children}</div>
    </div>
  )
}
