"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { homePathByRole } from "@/lib/auth-redirect"
import { canAccessDesainerRoutes } from "@/lib/roles"
import { statusBadgeClass, statusLabel } from "@/lib/cs-antrian-desain"
import type { DesignQueueItemRecord } from "@/lib/cs-antrian-desain"

export default function DesainerAntrianPage() {
  const router = useRouter()
  const [items, setItems] = useState<DesignQueueItemRecord[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/design-queue?queue=aktif", { cache: "no-store" })
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    const raw = localStorage.getItem("user")
    if (!raw) {
      router.push("/login")
      return
    }
    const user = JSON.parse(raw)
    if (!canAccessDesainerRoutes(user.role)) {
      router.push(homePathByRole(user.role))
      return
    }
    load()
  }, [router])

  return (
    <AppShell>
      <PageHeader
        badge="Desainer"
        title="Antrian"
        titleAccent="kerja"
        description="Desain menunggu proses atau revisi — unggah hasil lalu kirim ke CS."
      />

      {loading ? (
        <AppShellLoading />
      ) : items.length === 0 ? (
        <div className="neo-card p-8 text-center text-zinc-500">Antrian kosong.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-left text-zinc-500">
                <th className="p-3">DSN / ART</th>
                <th className="p-3">Konsumen</th>
                <th className="p-3">Artikel</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-zinc-900/80">
                  <td className="p-3 font-mono text-xs text-orange-300">
                    {row.designId}
                    <br />
                    {row.artikelId}
                  </td>
                  <td className="p-3 text-zinc-200">{row.namaKonsumen}</td>
                  <td className="p-3 text-zinc-300">{row.namaArtikel}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(row.statusDesain)}`}
                    >
                      {statusLabel(row.statusDesain)}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <Link
                      href={`/desainer/antrian/${row.id}`}
                      className="text-orange-400 hover:text-orange-300"
                    >
                      Buka
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  )
}
