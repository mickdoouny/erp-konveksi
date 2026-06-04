"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnGhost, BtnPrimary } from "@/components/ui/buttons"
import { readStoredUser } from "@/lib/auth"
import { homePathByRole } from "@/lib/auth-redirect"
import { canManageDtfVendors } from "@/lib/roles"

type DtfVendorRow = {
  id: string
  name: string
  contact?: string | null
  phone?: string | null
  bankAccount?: string | null
  notes?: string | null
  isActive: boolean
}

const emptyForm = {
  name: "",
  contact: "",
  phone: "",
  bankAccount: "",
  notes: "",
}

export default function AdminDtfVendorsPage() {
  const router = useRouter()
  const [items, setItems] = useState<DtfVendorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/dtf-vendors?activeOnly=false", {
        cache: "no-store",
      })
      const json = await res.json()
      setItems(Array.isArray(json) ? json : [])
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
    if (!canManageDtfVendors(user.role)) {
      router.push(homePathByRole(user.role))
      return
    }
    queueMicrotask(() => {
      void load()
    })
  }, [router])

  async function saveVendor() {
    if (!form.name.trim()) {
      alert("Nama vendor wajib diisi")
      return
    }
    setBusy(true)
    try {
      const url = editId ? `/api/dtf-vendors/${editId}` : "/api/dtf-vendors"
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const json = await res.json()
        alert(json.message ?? "Gagal menyimpan")
        return
      }
      setForm(emptyForm)
      setEditId(null)
      await load()
    } finally {
      setBusy(false)
    }
  }

  function startEdit(row: DtfVendorRow) {
    setEditId(row.id)
    setForm({
      name: row.name,
      contact: row.contact ?? "",
      phone: row.phone ?? "",
      bankAccount: row.bankAccount ?? "",
      notes: row.notes ?? "",
    })
  }

  return (
    <AppShell>
      <PageHeader
        badge="Master Data"
        title="Vendor"
        titleAccent="DTF"
        description="Kelola vendor DTF — admin produksi memilih dari daftar ini saat order di tahap Jahit."
      />

      {loading ? (
        <AppShellLoading />
      ) : (
        <div className="space-y-6">
          <section className="neo-card p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">
              {editId ? "Edit vendor" : "Tambah vendor"}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="text-zinc-400">Nama vendor *</span>
                <input
                  className="neo-input mt-1"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-zinc-400">Kontak</span>
                <input
                  className="neo-input mt-1"
                  value={form.contact}
                  onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-zinc-400">Telepon</span>
                <input
                  className="neo-input mt-1"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-zinc-400">Rekening bank</span>
                <input
                  className="neo-input mt-1"
                  value={form.bankAccount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bankAccount: e.target.value }))
                  }
                />
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="text-zinc-400">Catatan</span>
                <textarea
                  className="neo-input mt-1 min-h-[72px]"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <BtnPrimary disabled={busy} onClick={saveVendor}>
                {editId ? "Simpan perubahan" : "Tambah vendor"}
              </BtnPrimary>
              {editId ? (
                <BtnGhost
                  onClick={() => {
                    setEditId(null)
                    setForm(emptyForm)
                  }}
                >
                  Batal
                </BtnGhost>
              ) : null}
            </div>
          </section>

          <section className="neo-card p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">Daftar vendor</h2>
            {items.length === 0 ? (
              <p className="text-sm text-zinc-500">Belum ada vendor DTF.</p>
            ) : (
              <div className="space-y-3">
                {items.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          {row.name}
                          {!row.isActive ? (
                            <span className="ml-2 text-xs text-zinc-500">(nonaktif)</span>
                          ) : null}
                        </p>
                        <p className="text-sm text-zinc-400">
                          {row.contact ?? "—"} · {row.phone ?? "—"}
                        </p>
                        <p className="text-sm text-zinc-500">{row.bankAccount ?? "—"}</p>
                      </div>
                      <div className="flex gap-2">
                        <BtnGhost onClick={() => startEdit(row)}>Edit</BtnGhost>
                        {row.isActive ? (
                          <button
                            type="button"
                            className="text-sm text-red-400 hover:text-red-300"
                            onClick={async () => {
                              if (!confirm(`Nonaktifkan ${row.name}?`)) return
                              await fetch(`/api/dtf-vendors/${row.id}`, {
                                method: "DELETE",
                              })
                              await load()
                            }}
                          >
                            Nonaktifkan
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Link
            href="/admin/keuangan"
            className="neo-btn-secondary inline-flex items-center px-4 py-2 text-sm"
          >
            ← Kembali ke Keuangan
          </Link>
        </div>
      )}
    </AppShell>
  )
}
