"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import CsShell from "@/components/layout/cs-shell"
import { homePathByRole } from "@/lib/auth-redirect"
import {
  csAntrianDesainListRowAction,
  labelCsAntrianDesainStatus,
  statusBadgeClass,
  type DesignQueueItemRecord,
} from "@/lib/cs-antrian-desain"

type AntrianRow = DesignQueueItemRecord & {
  FinalOrder?: {
    AccountingTransaction?: { paymentStatus: string } | null
  } | null
}

export default function CsAntrianDesainPage() {
  const router = useRouter()
  const [items, setItems] = useState<AntrianRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")

  async function loadItems() {
    try {
      setLoading(true)
      const res = await fetch("/api/cs/antrian-desain", { cache: "no-store" })
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const raw = localStorage.getItem("user")
    if (!raw) {
      router.push("/login")
      return
    }

    const user = JSON.parse(raw)
    if (!["cs", "owner"].includes(user.role)) {
      router.push(homePathByRole(user.role))
      return
    }

    loadItems()
  }, [router])

  const filtered = items.filter((item) => {
    if (!filter.trim()) return true
    const q = filter.toLowerCase()
    return (
      item.namaKonsumen.toLowerCase().includes(q) ||
      item.artikelId.toLowerCase().includes(q) ||
      item.designId.toLowerCase().includes(q) ||
      item.namaArtikel.toLowerCase().includes(q) ||
      (item.sppGroupId?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <CsShell
      title="Antrian desain"
      description="Kelola permintaan desain dari konsumen — kirim ke desainer, ACC, dan revisi."
      actions={
        <Link href="/cs/antrian-desain/tambah" className="neo-btn-primary text-sm">
          + Tambah desain
        </Link>
      }
    >
      <div className="neo-card p-5 md:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            placeholder="Cari konsumen, artikel, DSN, grup SPP…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="neo-input max-w-md"
          />
          <button
            type="button"
            onClick={loadItems}
            className="rounded-lg border border-orange-500/50 bg-orange-950/40 px-4 py-2 text-sm font-semibold text-orange-300 transition hover:border-orange-400"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center text-zinc-500">
            Memuat antrian…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center text-zinc-500">
            Belum ada desain di antrian. Klik &quot;Tambah desain&quot; untuk
            memulai.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-left text-zinc-500">
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    DSN / ART
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Grup SPP
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Konsumen
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Artikel
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    CS
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Status
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Tanggal
                  </th>
                  <th className="p-3 text-center font-semibold uppercase tracking-wide">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const paymentStatus =
                    item.FinalOrder?.AccountingTransaction?.paymentStatus ??
                    null
                  const rowAction = csAntrianDesainListRowAction(item)
                  const actionClass =
                    rowAction.variant === "primary"
                      ? "neo-btn-primary text-xs"
                      : rowAction.variant === "muted"
                        ? "rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 text-xs font-semibold text-amber-200"
                        : "rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-orange-500/50 hover:text-orange-400"

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-zinc-800/80 hover:bg-zinc-900/40"
                    >
                      <td className="p-3">
                        <p className="font-medium text-orange-400">
                          {item.designId}
                        </p>
                        <p className="text-xs text-zinc-500">{item.artikelId}</p>
                      </td>
                      <td className="p-3 font-mono text-xs text-zinc-400">
                        {item.sppGroupId ?? "—"}
                      </td>
                      <td className="p-3 text-zinc-200">{item.namaKonsumen}</td>
                      <td className="p-3 text-zinc-300">{item.namaArtikel}</td>
                      <td className="p-3 text-zinc-400">{item.csNama}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(item.statusDesain, paymentStatus)}`}
                        >
                          {labelCsAntrianDesainStatus(
                            item.statusDesain,
                            item.revisionCount,
                            paymentStatus
                          )}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-500">
                        {new Date(item.createdAt).toLocaleDateString("id-ID")}
                      </td>
                      <td className="p-3 text-center">
                        <Link href={rowAction.href} className={actionClass}>
                          {rowAction.label}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CsShell>
  )
}
