"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnApprove, BtnGhost, BtnPrimary } from "@/components/ui/buttons"
import { readStoredUser } from "@/lib/auth"
import { homePathByRole } from "@/lib/auth-redirect"
import { canAccessAdminProduksiRoutes } from "@/lib/roles"
import { usePollingRefresh } from "@/hooks/use-polling-refresh"
import { labelProductionStatus } from "@/lib/status-labels"
import { DeadlineWarningBadge } from "@/components/production/deadline-warning-badge"
import { JenisProduksiBadge } from "@/components/production/jenis-produksi-badge"
import {
  deadlineCardBorderClass,
  formatDateIdShort,
} from "@/lib/deadline-warning"

type PostJahitRow = {
  id: string
  orderNumber: string
  namaKonsumen: string
  namaArtikel: string
  qty: number
  deadline?: string | null
  jenisProduksi?: string
  expressPriority?: number | null
  needsKancing: boolean
  needsDTF: boolean
  ProductionPipeline: {
    id: string
    productionNumber: string
    currentStatus: string
    kancingCompletedAt?: string | null
    dtfCompletedAt?: string | null
  }
}

function canAdvanceToQc(row: PostJahitRow): boolean {
  const pipeline = row.ProductionPipeline
  if (pipeline.currentStatus !== "ADMIN_PRODUKSI") return false
  if (row.needsKancing && !pipeline.kancingCompletedAt) return false
  if (row.needsDTF && !pipeline.dtfCompletedAt) return false
  return true
}

export default function AdminPostJahitPage() {
  const router = useRouter()
  const [items, setItems] = useState<PostJahitRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    try {
      const res = await fetch("/api/final-orders?queue=post_jahit", {
        cache: "no-store",
      })
      const json = await res.json()
      setItems(json.success ? json.data : [])
    } catch {
      setItems([])
    } finally {
      if (!options?.silent) setLoading(false)
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
    queueMicrotask(() => {
      void load()
    })
  }, [router, load])

  usePollingRefresh(
    useCallback(() => {
      void load({ silent: true })
    }, [load])
  )

  async function patchPipeline(pipelineId: string, action: string) {
    const actor = readStoredUser()
    const actorName = actor?.nama ?? "Admin Produksi"
    setBusyId(pipelineId)
    try {
      const res = await fetch(`/api/production-pipeline/${pipelineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          actorName,
          actorRole: "admin_produksi",
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.message ?? "Gagal")
        return
      }
      await load()
    } catch {
      alert("Gagal memperbarui pipeline")
    } finally {
      setBusyId("")
    }
  }

  return (
    <AppShell>
      <PageHeader
        badge="Produksi"
        title="Pasca"
        titleAccent="Jahit"
        description="Setelah jahit selesai — tandai kancing/DTF (catatan SPP) lalu lanjut ke QC."
      />

      {loading ? (
        <AppShellLoading />
      ) : items.length === 0 ? (
        <div className="neo-card p-8 text-center text-zinc-500">
          Tidak ada order pasca-jahit. Order muncul di sini setelah operator jahit
          menyelesaikan tahap jahit.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((row) => {
            const pipeline = row.ProductionPipeline
            const pid = pipeline.id
            const busy = busyId === pid
            const readyForQc = canAdvanceToQc(row)

            return (
              <div
                key={row.id}
                className={`neo-card p-5 ${deadlineCardBorderClass(row.deadline)}`.trim()}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Order
                    </p>
                    <p className="font-medium text-orange-400">{row.orderNumber}</p>
                    <p className="text-xs text-zinc-500">{pipeline.productionNumber}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DeadlineWarningBadge deadline={row.deadline} />
                    <JenisProduksiBadge
                      jenisProduksi={row.jenisProduksi}
                      expressPriority={row.expressPriority}
                    />
                    <span className="rounded-full border border-sky-500/40 bg-sky-950/40 px-2.5 py-0.5 text-xs font-semibold text-sky-200">
                      {labelProductionStatus(pipeline.currentStatus)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <p className="font-semibold text-white">{row.namaKonsumen}</p>
                    <p className="mt-1 text-sm text-zinc-300">
                      {row.namaArtikel}
                      <span className="text-zinc-500"> · </span>
                      {row.qty} pcs
                    </p>
                    {row.deadline ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        Deadline: {formatDateIdShort(row.deadline)}
                      </p>
                    ) : null}

                    {(row.needsKancing || row.needsDTF) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {row.needsKancing ? (
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                              pipeline.kancingCompletedAt
                                ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                                : "border-amber-500/40 bg-amber-950/40 text-amber-300"
                            }`}
                          >
                            Perlu kancing
                            {pipeline.kancingCompletedAt ? " ✓" : " · menunggu"}
                          </span>
                        ) : null}
                        {row.needsDTF ? (
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                              pipeline.dtfCompletedAt
                                ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                                : "border-amber-500/40 bg-amber-950/40 text-amber-300"
                            }`}
                          >
                            Perlu DTF
                            {pipeline.dtfCompletedAt ? " ✓" : " · menunggu"}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Link
                      href={`/admin/final-orders/${row.id}/print`}
                      target="_blank"
                      rel="noreferrer"
                      className="neo-btn-secondary inline-flex items-center px-4 py-2 text-sm"
                    >
                      Cetak SPP
                    </Link>
                    {row.needsKancing && !pipeline.kancingCompletedAt ? (
                      <BtnPrimary
                        disabled={busy}
                        onClick={() => patchPipeline(pid, "mark_kancing_complete")}
                      >
                        Kancing selesai
                      </BtnPrimary>
                    ) : null}
                    {row.needsDTF && !pipeline.dtfCompletedAt ? (
                      <BtnPrimary
                        disabled={busy}
                        onClick={() => patchPipeline(pid, "mark_dtf_complete")}
                      >
                        DTF selesai
                      </BtnPrimary>
                    ) : null}
                    <BtnApprove
                      disabled={busy || !readyForQc}
                      title={
                        readyForQc
                          ? undefined
                          : "Selesaikan kancing/DTF terlebih dahulu jika diperlukan"
                      }
                      onClick={() => patchPipeline(pid, "advance_to_qc")}
                    >
                      Lanjut ke QC
                    </BtnApprove>
                    <BtnGhost disabled={busy} onClick={() => void load()}>
                      Refresh
                    </BtnGhost>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
