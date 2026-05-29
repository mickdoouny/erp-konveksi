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

export default function DesainerAntrianDisetujuiPage() {
  const router = useRouter()
  const [items, setItems] = useState<DesignQueueItemRecord[]>([])
  const [loading, setLoading] = useState(true)

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

    fetch("/api/design-queue?queue=disetujui", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [router])

  return (
    <AppShell>
      <PageHeader
        badge="Desainer"
        title="Antrian pasca-ACC"
        titleAccent="konsumen"
        description="Unggah CDR produksi (nama file = ID artikel.cdr) sebelum CS input order."
      />

      {loading ? (
        <AppShellLoading />
      ) : items.length === 0 ? (
        <div className="neo-card p-8 text-center text-zinc-500">
          Belum ada antrian pasca-ACC konsumen.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-left text-zinc-500">
                <th className="p-3">ART</th>
                <th className="p-3">Konsumen</th>
                <th className="p-3">Status</th>
                <th className="p-3">CDR</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-zinc-900/80">
                  <td className="p-3 font-mono text-orange-300">{row.artikelId}</td>
                  <td className="p-3">{row.namaKonsumen}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(row.statusDesain)}`}
                    >
                      {statusLabel(row.statusDesain)}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-400">
                    {row.fileDesainProduksi ? "Sudah" : "Belum"}
                  </td>
                  <td className="p-3 text-center">
                    <Link
                      href={`/desainer/antrian-disetujui/${row.id}`}
                      className="text-orange-400 hover:text-orange-300"
                    >
                      Unggah CDR
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
