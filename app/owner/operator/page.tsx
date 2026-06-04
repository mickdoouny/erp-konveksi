"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnPrimary } from "@/components/ui/buttons"
import { useAuthGuard } from "@/hooks/use-auth-guard"
import {
  OPERATOR_DEPARTMENTS,
  OPERATOR_DEPARTMENT_LABELS,
  type OperatorDepartment,
} from "@/lib/operators"

type OperatorRow = {
  id: string
  name: string
  username: string
  department: OperatorDepartment
  isActive: boolean
  createdAt: string
}

export default function OwnerOperatorPage() {
  const auth = useAuthGuard({ roles: ["owner"] })
  const [activeDepartment, setActiveDepartment] =
    useState<OperatorDepartment>("SALES")
  const [operators, setOperators] = useState<OperatorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [deletingId, setDeletingId] = useState("")

  async function load(department: OperatorDepartment) {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/operators?department=${encodeURIComponent(department)}`,
        { cache: "no-store" }
      )
      const json = await res.json()
      setOperators(Array.isArray(json) ? json : [])
    } catch {
      setOperators([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (auth.status !== "authenticated") return
    queueMicrotask(() => {
      void load(activeDepartment)
    })
  }, [auth.status, activeDepartment])

  async function addOperator() {
    const name = newName.trim()
    const username = newUsername.trim()
    const password = newPassword

    if (!name) {
      alert("Nama operator wajib diisi")
      return
    }
    if (!username) {
      alert("User ID wajib diisi")
      return
    }
    if (!password || password.length < 4) {
      alert("Password wajib diisi (minimal 4 karakter)")
      return
    }

    setBusy(true)
    try {
      const res = await fetch("/api/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username,
          password,
          department: activeDepartment,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        alert(json.message ?? "Gagal menambah operator")
        return
      }
      setNewName("")
      setNewUsername("")
      setNewPassword("")
      await load(activeDepartment)
    } finally {
      setBusy(false)
    }
  }

  async function deleteOperator(row: OperatorRow) {
    if (
      !confirm(
        `Hapus operator "${row.name}" dari ${OPERATOR_DEPARTMENT_LABELS[row.department]}?`
      )
    ) {
      return
    }
    setDeletingId(row.id)
    try {
      const res = await fetch(`/api/operators/${row.id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json()
        alert(json.message ?? "Gagal menghapus operator")
        return
      }
      await load(activeDepartment)
    } finally {
      setDeletingId("")
    }
  }

  return (
    <AppShell>
      <PageHeader
        badge="Master Data"
        title="Daftar"
        titleAccent="Operator"
        description="Kelola operator per divisi/tahap produksi. Setiap operator punya User ID dan password untuk login."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {OPERATOR_DEPARTMENTS.map((dept) => {
          const isActive = activeDepartment === dept
          return (
            <button
              key={dept}
              type="button"
              onClick={() => setActiveDepartment(dept)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-orange-500/60 bg-orange-500/10 text-orange-400"
                  : "border-zinc-700 bg-zinc-950/50 text-zinc-400 hover:border-orange-500/35 hover:text-orange-300"
              }`}
            >
              {OPERATOR_DEPARTMENT_LABELS[dept]}
            </button>
          )
        })}
      </div>

      {loading ? (
        <AppShellLoading />
      ) : (
        <div className="space-y-6">
          <section className="neo-card p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Tambah operator — {OPERATOR_DEPARTMENT_LABELS[activeDepartment]}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-sm sm:col-span-2 lg:col-span-1">
                <span className="text-zinc-400">Nama operator *</span>
                <input
                  className="neo-input mt-1"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                />
              </label>
              <label className="block text-sm">
                <span className="text-zinc-400">User ID *</span>
                <input
                  className="neo-input mt-1 font-mono"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Contoh: budi.jahit"
                  autoComplete="off"
                />
              </label>
              <label className="block text-sm">
                <span className="text-zinc-400">Password *</span>
                <input
                  type="password"
                  className="neo-input mt-1"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 4 karakter"
                  autoComplete="new-password"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      void addOperator()
                    }
                  }}
                />
              </label>
            </div>
            <div className="mt-4">
              <BtnPrimary
                disabled={busy}
                onClick={() => void addOperator()}
                className="shrink-0"
              >
                Tambah operator
              </BtnPrimary>
            </div>
          </section>

          <section className="neo-card p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Operator {OPERATOR_DEPARTMENT_LABELS[activeDepartment]}
            </h2>
            {operators.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Belum ada operator di divisi ini.
              </p>
            ) : (
              <div className="space-y-2">
                {operators.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">{row.name}</p>
                      <p className="mt-1 font-mono text-xs text-zinc-500">
                        User ID: {row.username}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                      disabled={deletingId === row.id}
                      onClick={() => void deleteOperator(row)}
                    >
                      {deletingId === row.id ? "Menghapus…" : "Hapus"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Link
            href="/owner"
            className="neo-btn-secondary inline-flex items-center px-4 py-2 text-sm"
          >
            ← Kembali ke Dashboard Owner
          </Link>
        </div>
      )}
    </AppShell>
  )
}
