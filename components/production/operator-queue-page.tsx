"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnApprove, BtnGhost, BtnPrimary } from "@/components/ui/buttons"
import { readStoredUser, type AuthUser } from "@/lib/auth"
import { homePathForUser } from "@/lib/auth-redirect"
import {
  PRODUKSI_PAGE_TITLES,
  STAGE_OPERATOR_ACTIONS,
  type OperatorStageAction,
} from "@/lib/production-operator-stages"
import { labelProductionStatus } from "@/lib/status-labels"
import { DeadlineWarningBadge } from "@/components/production/deadline-warning-badge"
import { JenisProduksiBadge } from "@/components/production/jenis-produksi-badge"
import { formatDateIdShort } from "@/lib/deadline-warning"
import type { ProductionStatus } from "@prisma/client"

type QueueRow = {
  id: string
  orderNumber: string
  namaKonsumen: string
  namaArtikel: string
  qty: number
  deadline?: string | null
  jenisProduksi?: string
  expressPriority?: number | null
  ProductionPipeline: {
    id: string
    productionNumber: string
    currentStatus: string
    ProductionStagePlan?: {
      stage: string
      status: string
    }[]
  }
}

type ProduksiDepartment = keyof typeof PRODUKSI_PAGE_TITLES

function stageActions(status: string): OperatorStageAction | null {
  return STAGE_OPERATOR_ACTIONS[status as ProductionStatus] ?? null
}

function isInProgress(row: QueueRow): boolean {
  const status = row.ProductionPipeline.currentStatus
  const plan = row.ProductionPipeline.ProductionStagePlan?.find(
    (p) => p.stage === status
  )
  return plan?.status === "IN_PROGRESS"
}

export function OperatorQueuePage({
  department,
}: {
  department: ProduksiDepartment
}) {
  const router = useRouter()
  const meta = PRODUKSI_PAGE_TITLES[department]
  const [user, setUser] = useState<AuthUser | null>(null)
  const [items, setItems] = useState<QueueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/production-pipeline/queue?department=${department}`,
        { cache: "no-store" }
      )
      const json = await res.json()
      setItems(json.success ? json.data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [department])

  useEffect(() => {
    const stored = readStoredUser()
    if (!stored) {
      router.replace("/login")
      return
    }
    if (stored.role !== "produksi" && stored.role !== "owner") {
      router.push(homePathForUser(stored))
      return
    }
    setUser(stored)
    queueMicrotask(() => {
      void load()
    })
  }, [router, load])

  async function patchPipeline(
    pipelineId: string,
    action: "start_stage" | "complete_stage"
  ) {
    if (!user) return
    setBusyId(pipelineId)
    try {
      const res = await fetch(`/api/production-pipeline/${pipelineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          actorName: user.nama,
          actorRole: user.role,
          actorId: user.id,
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
        title={meta.title}
        description={meta.description}
      />

      {loading ? (
        <AppShellLoading />
      ) : items.length === 0 ? (
        <div className="neo-card p-8 text-center text-zinc-500">
          Antrian kosong — tidak ada order di tahap ini.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((row) => {
            const pipeline = row.ProductionPipeline
            const pid = pipeline.id
            const currentStatus = pipeline.currentStatus
            const actions = stageActions(currentStatus)
            const inProgress = isInProgress(row)
            const busy = busyId === pid

            return (
              <div key={row.id} className="neo-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Order
                    </p>
                    <p className="font-medium text-orange-400">{row.orderNumber}</p>
                    <p className="text-xs text-zinc-500">
                      {pipeline.productionNumber}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DeadlineWarningBadge deadline={row.deadline} />
                    <JenisProduksiBadge
                      jenisProduksi={row.jenisProduksi}
                      expressPriority={row.expressPriority}
                    />
                    <span className="rounded-full border border-sky-500/40 bg-sky-950/40 px-2.5 py-0.5 text-xs font-semibold text-sky-200">
                      {labelProductionStatus(currentStatus)}
                    </span>
                    {inProgress ? (
                      <span className="rounded-full border border-amber-500/40 bg-amber-950/40 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                        Sedang diproses
                      </span>
                    ) : null}
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
                  </div>

                  {actions ? (
                    <div className="flex flex-wrap gap-2">
                      {!inProgress ? (
                        <BtnPrimary
                          disabled={busy}
                          onClick={() => patchPipeline(pid, "start_stage")}
                        >
                          {actions.startLabel}
                        </BtnPrimary>
                      ) : (
                        <BtnApprove
                          disabled={busy}
                          onClick={() => patchPipeline(pid, "complete_stage")}
                        >
                          {actions.completeLabel}
                        </BtnApprove>
                      )}
                      {inProgress ? (
                        <BtnGhost disabled={busy} onClick={() => void load()}>
                          Refresh
                        </BtnGhost>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
