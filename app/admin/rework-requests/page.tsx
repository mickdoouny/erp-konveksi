"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnApprove, BtnGhost, BtnPrimary } from "@/components/ui/buttons"
import { readStoredUser } from "@/lib/auth"
import { homePathByRole } from "@/lib/auth-redirect"
import { canAccessAdminProduksiRoutes } from "@/lib/roles"
import { usePollingRefresh } from "@/hooks/use-polling-refresh"
import { formatReworkParts } from "@/lib/rework-garment-parts"
import {
  parseAffectedParts,
  REWORK_REQUEST_STATUS_LABELS,
  REWORK_REQUEST_TYPE_LABELS,
  reworkDivisionLabel,
} from "@/lib/rework-request"
import { ReworkRequestStatus, ReworkRequestType } from "@prisma/client"

type ReworkRow = {
  id: string
  productionPipelineId: string
  requestedFromStage: string
  requestedByName: string
  requestType: ReworkRequestType | null
  reason: string
  affectedParts: unknown
  status: ReworkRequestStatus
  adminNote: string | null
  reworkTargetStage: string
  approvedAt: string | null
  approvedBy: string | null
  rejectedAt: string | null
  rejectedBy: string | null
  createdAt: string
  FinalOrder: {
    orderNumber: string
    namaArtikel: string
    namaKonsumen: string
    qty: number
  }
  ProductionPipeline: {
    productionNumber: string
    currentStatus: string
  }
}

function formatDateTime(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusBadgeClass(status: ReworkRequestStatus): string {
  switch (status) {
    case ReworkRequestStatus.PENDING:
      return "border-amber-500/40 bg-amber-950/40 text-amber-300"
    case ReworkRequestStatus.APPROVED:
      return "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
    case ReworkRequestStatus.REJECTED:
      return "border-red-500/40 bg-red-950/40 text-red-300"
    default:
      return "border-zinc-600 bg-zinc-900/80 text-zinc-300"
  }
}

export default function AdminReworkRequestsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"pending" | "history">("pending")
  const [items, setItems] = useState<ReworkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({})

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoading(true)
      try {
        const res = await fetch(`/api/rework-requests?view=${tab}`, {
          cache: "no-store",
        })
        const json = await res.json()
        setItems(json.success ? json.data : [])
      } catch {
        setItems([])
      } finally {
        if (!options?.silent) setLoading(false)
      }
    },
    [tab]
  )

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
    queueMicrotask(() => {
      void load()
    })
  }, [router, load])

  usePollingRefresh(() => load({ silent: true }), { intervalMs: 15000 })

  async function patchRequest(
    id: string,
    action: "approve" | "reject",
    adminNote?: string
  ) {
    const user = readStoredUser()
    if (!user) return

    setBusyId(id)
    try {
      const res = await fetch(`/api/rework-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          actorName: user.nama,
          actorRole: user.role,
          actorId: user.id,
          adminNote,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.message ?? "Gagal")
        return
      }
      await load({ silent: true })
    } catch {
      alert("Gagal memproses request")
    } finally {
      setBusyId("")
    }
  }

  return (
    <AppShell>
      <PageHeader
        badge="Admin Produksi"
        title="Request Rework"
        description="Kelola permintaan rework dari operator — setujui untuk mengembalikan order ke printing."
      />

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("pending")}
          className={
            tab === "pending"
              ? "rounded-lg border border-orange-500/50 bg-orange-950/30 px-4 py-2 text-sm font-medium text-orange-300"
              : "rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-600"
          }
        >
          Menunggu ({tab === "pending" ? items.length : "…"})
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={
            tab === "history"
              ? "rounded-lg border border-orange-500/50 bg-orange-950/30 px-4 py-2 text-sm font-medium text-orange-300"
              : "rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-600"
          }
        >
          Riwayat
        </button>
      </div>

      {loading ? (
        <AppShellLoading />
      ) : items.length === 0 ? (
        <div className="neo-card p-8 text-center text-zinc-500">
          {tab === "pending"
            ? "Tidak ada request rework yang menunggu."
            : "Belum ada riwayat request rework."}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((row) => {
            const busy = busyId === row.id
            const division = reworkDivisionLabel(
              row.requestedFromStage as Parameters<typeof reworkDivisionLabel>[0]
            )

            return (
              <div key={row.id} className="neo-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div>
                    <p className="font-medium text-orange-400">
                      {row.FinalOrder.orderNumber}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {row.ProductionPipeline.productionNumber}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(row.status)}`}
                    >
                      {REWORK_REQUEST_STATUS_LABELS[row.status]}
                    </span>
                    <span className="rounded-full border border-violet-500/40 bg-violet-950/40 px-2.5 py-0.5 text-xs font-semibold text-violet-200">
                      Dari {division}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="font-semibold text-white">
                      {row.FinalOrder.namaKonsumen}
                    </p>
                    <p className="text-sm text-zinc-300">
                      {row.FinalOrder.namaArtikel} · {row.FinalOrder.qty} pcs
                    </p>
                  </div>
                  <div className="text-sm text-zinc-400">
                    <p>
                      Diajukan: {row.requestedByName} ·{" "}
                      {formatDateTime(row.createdAt)}
                    </p>
                    {row.requestType ? (
                      <p className="mt-1">
                        Jenis: {REWORK_REQUEST_TYPE_LABELS[row.requestType]}
                      </p>
                    ) : null}
                  </div>
                </div>

                {parseAffectedParts(row.affectedParts).length > 0 ? (
                  <p className="mt-3 rounded-lg border border-orange-500/30 bg-orange-950/20 p-3 text-sm text-orange-100">
                    <span className="font-medium text-orange-300">
                      Bagian print ulang:{" "}
                    </span>
                    {formatReworkParts(parseAffectedParts(row.affectedParts))}
                  </p>
                ) : null}

                <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-300">
                  {row.reason}
                </p>

                {row.adminNote ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    Catatan admin: {row.adminNote}
                  </p>
                ) : null}

                {tab === "history" ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    {row.status === ReworkRequestStatus.APPROVED
                      ? `Disetujui ${row.approvedBy} · ${formatDateTime(row.approvedAt)}`
                      : row.status === ReworkRequestStatus.REJECTED
                        ? `Ditolak ${row.rejectedBy} · ${formatDateTime(row.rejectedAt)}`
                        : null}
                  </p>
                ) : (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="block flex-1 text-sm">
                      <span className="text-zinc-400">
                        Catatan admin (opsional)
                      </span>
                      <input
                        type="text"
                        className="neo-input mt-1 w-full"
                        placeholder="Catatan untuk operator…"
                        value={rejectNote[row.id] ?? ""}
                        onChange={(e) =>
                          setRejectNote((prev) => ({
                            ...prev,
                            [row.id]: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <BtnApprove
                        disabled={busy}
                        onClick={() =>
                          void patchRequest(
                            row.id,
                            "approve",
                            rejectNote[row.id]
                          )
                        }
                      >
                        Setujui rework → Printing
                      </BtnApprove>
                      <BtnGhost
                        disabled={busy}
                        onClick={() =>
                          void patchRequest(
                            row.id,
                            "reject",
                            rejectNote[row.id]
                          )
                        }
                      >
                        Tolak
                      </BtnGhost>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === "pending" ? (
        <div className="mt-4">
          <BtnPrimary onClick={() => void load()}>Refresh</BtnPrimary>
        </div>
      ) : null}
    </AppShell>
  )
}
