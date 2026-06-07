"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { readStoredUser } from "@/lib/auth"
import { homePathForUser } from "@/lib/auth-redirect"
import { canAccessAdminProduksiRoutes } from "@/lib/roles"
import { formatDateIdShort } from "@/lib/deadline-warning"

type JahitPaymentRow = {
  id: string
  orderNumber: string
  qty: number
  operatorName: string
  completedAt: string
  FinalOrder: {
    namaArtikel: string
    namaKonsumen: string
  }
}

export default function AdminJahitPembayaranPage() {
  const router = useRouter()
  const [items, setItems] = useState<JahitPaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      const qs = params.toString()
      const res = await fetch(`/api/jahit-payments${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
      })
      const json = await res.json()
      setItems(json.success ? json.data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const user = readStoredUser()
    if (!user) {
      router.replace("/login")
      return
    }
    if (!canAccessAdminProduksiRoutes(user.role)) {
      router.push(homePathForUser(user))
      return
    }
    queueMicrotask(() => {
      void load()
    })
  }, [router])

  return (
    <AppShell>
      <PageHeader
        badge="Produksi"
        title="Pengajuan"
        titleAccent="pembayaran jahit"
        description="Daftar selesai jahit untuk closing Sabtu — filter periode tanggal."
      />

      <div className="neo-card mb-6 flex flex-wrap items-end gap-4 p-4">
        <label className="text-sm text-zinc-400">
          Dari
          <input
            type="date"
            className="neo-input mt-1 block"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-sm text-zinc-400">
          Sampai
          <input
            type="date"
            className="neo-input mt-1 block"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="neo-btn-primary px-4 py-2 text-sm"
          onClick={() => void load()}
        >
          Terapkan filter
        </button>
      </div>

      {loading ? (
        <AppShellLoading />
      ) : items.length === 0 ? (
        <div className="neo-card p-8 text-center text-zinc-500">
          Belum ada rekam selesai jahit untuk periode ini.
        </div>
      ) : (
        <div className="neo-card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Artikel</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Operator</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-zinc-800/60">
                  <td className="px-4 py-3 text-zinc-300">
                    {formatDateIdShort(row.completedAt)}
                  </td>
                  <td className="px-4 py-3 font-medium text-orange-400">
                    {row.orderNumber}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {row.FinalOrder.namaArtikel}
                    <span className="block text-xs text-zinc-500">
                      {row.FinalOrder.namaKonsumen}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-200">{row.qty}</td>
                  <td className="px-4 py-3 text-zinc-300">{row.operatorName}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
            Total {items.length} rekam · qty{" "}
            {items.reduce((sum, r) => sum + r.qty, 0)} pcs
          </p>
        </div>
      )}
    </AppShell>
  )
}
