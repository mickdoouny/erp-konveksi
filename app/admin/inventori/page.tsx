"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnGhost, BtnPrimary } from "@/components/ui/buttons"
import { readStoredUser } from "@/lib/auth"
import { homePathByRole } from "@/lib/auth-redirect"
import { canAccessAdminProduksiRoutes } from "@/lib/roles"
import { INVENTORY_CATEGORY_LABELS } from "@/lib/inventory-catalog"

type MovementRow = {
  id: string
  type: string
  quantity: number
  quantityBefore: number
  quantityAfter: number
  orderNumber?: string | null
  note?: string | null
  recordedByName: string
  createdAt: string
}

type InventoryRow = {
  id: string
  sku: string
  name: string
  category: keyof typeof INVENTORY_CATEGORY_LABELS
  categoryLabel: string
  unit: string
  quantity: number
  minQuantity?: number | null
  InventoryMovement?: MovementRow[]
}

const emptyAdjust = { delta: "", note: "" }

export default function AdminInventoriPage() {
  const router = useRouter()
  const [items, setItems] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [adjustItemId, setAdjustItemId] = useState<string | null>(null)
  const [adjustForm, setAdjustForm] = useState(emptyAdjust)
  const [actorName, setActorName] = useState("Admin Produksi")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/inventory?movements=true&movementLimit=8", {
        cache: "no-store",
      })
      const json = await res.json()
      setItems(json.success ? json.data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const user = readStoredUser()
    if (!user) {
      router.replace("/login")
      return
    }
    if (!canAccessAdminProduksiRoutes(user.role)) {
      router.push(homePathByRole(user.role))
      return
    }
    setActorName(user.nama ?? "Admin Produksi")
    queueMicrotask(() => {
      void load()
    })
  }, [router, load])

  async function submitAdjust(itemId: string) {
    const delta = Number(adjustForm.delta)
    if (!Number.isFinite(delta) || delta === 0) {
      alert("Masukkan jumlah penyesuaian (positif = tambah, negatif = kurangi)")
      return
    }
    setBusyId(itemId)
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust",
          inventoryItemId: itemId,
          delta,
          note: adjustForm.note,
          actorName,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        alert(json.message ?? "Gagal menyesuaikan stok")
        return
      }
      setAdjustItemId(null)
      setAdjustForm(emptyAdjust)
      await load()
    } finally {
      setBusyId("")
    }
  }

  function formatQty(value: number, unit: string) {
    const rounded = Math.round(value * 100) / 100
    return `${rounded} ${unit}`
  }

  function movementLabel(type: string) {
    if (type === "IN") return "Masuk"
    if (type === "OUT") return "Keluar"
    return "Penyesuaian"
  }

  return (
    <AppShell>
      <PageHeader
        badge="Admin Produksi"
        title="Inventori"
        titleAccent="Bahan Baku"
        description="Kelola stok tinta CMYK, kain bahan utama, rib, dan bahan lain. Stok berkurang otomatis saat operator menyelesaikan tahap Printing dan Potong Bahan."
      />

      {loading ? (
        <AppShellLoading />
      ) : (
        <div className="space-y-6">
          <section className="neo-card p-5">
            <h2 className="text-lg font-semibold text-white">Ringkasan stok</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Pastikan stok cukup sebelum operator menyelesaikan tahap produksi.
              Jika stok tidak mencukupi, penyelesaian tahap akan ditolak.
            </p>
            {items.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">Belum ada item inventori.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {items.map((item) => {
                  const lowStock =
                    item.minQuantity != null && item.quantity <= item.minQuantity
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-white">{item.name}</p>
                            <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                              {item.sku}
                            </span>
                            <span className="rounded-full border border-orange-500/30 bg-orange-950/30 px-2 py-0.5 text-[10px] font-semibold text-orange-300">
                              {item.categoryLabel}
                            </span>
                          </div>
                          <p
                            className={`mt-2 text-2xl font-bold tabular-nums ${
                              lowStock ? "text-amber-400" : "text-emerald-400"
                            }`}
                          >
                            {formatQty(item.quantity, item.unit)}
                          </p>
                          {lowStock ? (
                            <p className="mt-1 text-xs text-amber-400">
                              Stok rendah (minimum {item.minQuantity} {item.unit})
                            </p>
                          ) : null}
                        </div>
                        <BtnGhost
                          onClick={() => {
                            setAdjustItemId(adjustItemId === item.id ? null : item.id)
                            setAdjustForm(emptyAdjust)
                          }}
                        >
                          {adjustItemId === item.id ? "Batal" : "Sesuaikan stok"}
                        </BtnGhost>
                      </div>

                      {adjustItemId === item.id ? (
                        <div className="mt-4 grid gap-3 border-t border-zinc-800 pt-4 md:grid-cols-2">
                          <label className="block text-sm">
                            <span className="text-zinc-400">
                              Jumlah ({item.unit}) — positif tambah, negatif kurangi
                            </span>
                            <input
                              className="neo-input mt-1"
                              type="number"
                              step="any"
                              value={adjustForm.delta}
                              onChange={(e) =>
                                setAdjustForm((f) => ({ ...f, delta: e.target.value }))
                              }
                              placeholder="contoh: 5000 atau -200"
                            />
                          </label>
                          <label className="block text-sm">
                            <span className="text-zinc-400">Catatan</span>
                            <input
                              className="neo-input mt-1"
                              value={adjustForm.note}
                              onChange={(e) =>
                                setAdjustForm((f) => ({ ...f, note: e.target.value }))
                              }
                              placeholder="contoh: Pembelian tinta baru"
                            />
                          </label>
                          <div className="md:col-span-2">
                            <BtnPrimary
                              disabled={busyId === item.id}
                              onClick={() => submitAdjust(item.id)}
                            >
                              Simpan penyesuaian
                            </BtnPrimary>
                          </div>
                        </div>
                      ) : null}

                      {item.InventoryMovement && item.InventoryMovement.length > 0 ? (
                        <div className="mt-4 border-t border-zinc-800 pt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Riwayat terakhir
                          </p>
                          <ul className="mt-2 space-y-1.5">
                            {item.InventoryMovement.map((mv) => (
                              <li
                                key={mv.id}
                                className="flex flex-wrap gap-x-2 text-xs text-zinc-400"
                              >
                                <span className="text-zinc-300">
                                  {new Date(mv.createdAt).toLocaleString("id-ID")}
                                </span>
                                <span>·</span>
                                <span>{movementLabel(mv.type)}</span>
                                <span>·</span>
                                <span>
                                  {mv.quantity} {item.unit}
                                </span>
                                <span>·</span>
                                <span>
                                  {mv.quantityBefore} → {mv.quantityAfter}
                                </span>
                                {mv.orderNumber ? (
                                  <>
                                    <span>·</span>
                                    <span>{mv.orderNumber}</span>
                                  </>
                                ) : null}
                                {mv.note ? (
                                  <>
                                    <span>·</span>
                                    <span className="text-zinc-500">{mv.note}</span>
                                  </>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <p className="text-sm text-zinc-500">
            <Link href="/admin/final-orders" className="text-orange-400 hover:underline">
              ← Kembali ke Admin Produksi
            </Link>
          </p>
        </div>
      )}
    </AppShell>
  )
}
