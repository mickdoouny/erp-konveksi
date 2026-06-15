"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnApprove } from "@/components/ui/buttons"
import { StatusBadge } from "@/components/ui/status-badge"
import { readStoredUser } from "@/lib/auth"
import { homePathByRole } from "@/lib/auth-redirect"
import { canAccessAdminProduksiRoutes } from "@/lib/roles"
import { ProductionStageBadge } from "@/components/production/production-stage-badge"
import { usePollingRefresh } from "@/hooks/use-polling-refresh"
import {
  resolveProductionProgressLabel,
  productionProgressBadgeClass,
} from "@/lib/production-status-display"
import { labelAdminProduksiStatus } from "@/lib/status-labels"
import { DeadlineWarningBadge } from "@/components/production/deadline-warning-badge"
import { JenisProduksiBadge } from "@/components/production/jenis-produksi-badge"
import {
  deadlineCardBorderClass,
  formatDateIdShort,
  resolveOrderEntryDate,
} from "@/lib/deadline-warning"
import { formatPotongBahanSummary } from "@/lib/potong-bahan-weights"
import { formatPrintingInkSummary } from "@/lib/printing-ink-consumption"

type FinalOrderRow = {
  id: string
  orderNumber: string
  namaCs: string
  namaKonsumen: string
  submittedAt?: string | null
  createdAt?: string | null
  deadline?: string | null
  noHp?: string | null
  alamat?: string | null
  namaArtikel: string
  qty: number
  jenisProduksi?: string
  expressPriority?: number | null
  needsKancing: boolean
  needsDTF: boolean
  DesignQueueItem?: {
    sppGroupId: string | null
    designId: string
    artikelId: string
  } | null
  AccountingTransaction?: {
    paymentStatus: string
    dp: number
    sisaPelunasan: number
  } | null
  deliveryStatus?: string
  ProductionPipeline: {
    id: string
    productionNumber: string
    currentStatus: string
    adminProduksiStatus: string
    shipReleaseStatus?: string
    updatedAt?: string | null
    beratBahan?: number | null
    beratRib?: number | null
    catatanPotongBahan?: string | null
    konsumsiTintaC?: number | null
    konsumsiTintaM?: number | null
    konsumsiTintaY?: number | null
    konsumsiTintaK?: number | null
  }
}

function shortenAlamat(alamat: string, max = 56): string {
  const trimmed = alamat.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

function AdminProduksiStatusBadge({ status }: { status: string }) {
  const cls =
    status === "PENDING"
      ? "border-amber-500/40 bg-amber-950/40 text-amber-300"
      : status === "APPROVED"
        ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
        : status === "REJECTED"
          ? "border-red-500/40 bg-red-950/40 text-red-300"
          : "border-zinc-600 bg-zinc-900/80 text-zinc-300"

  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {labelAdminProduksiStatus(status)}
    </span>
  )
}

export default function AdminFinalOrdersPage() {
  const router = useRouter()
  const [items, setItems] = useState<FinalOrderRow[]>([])
  const [monitorItems, setMonitorItems] = useState<FinalOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    try {
      const [approvalRes, monitorRes] = await Promise.all([
        fetch("/api/final-orders?queue=admin_produksi", { cache: "no-store" }),
        fetch("/api/final-orders?queue=in_production", { cache: "no-store" }),
      ])
      const [approvalJson, monitorJson] = await Promise.all([
        approvalRes.json(),
        monitorRes.json(),
      ])
      const approvalRows = approvalJson.success ? approvalJson.data : []
      const monitorRows = monitorJson.success ? monitorJson.data : []
      setItems(
        approvalRows.filter((row: FinalOrderRow) => row.ProductionPipeline?.id)
      )
      setMonitorItems(
        monitorRows.filter((row: FinalOrderRow) => row.ProductionPipeline?.id)
      )
    } catch {
      setItems([])
      setMonitorItems([])
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

  async function patchPipeline(
    pipelineId: string,
    action: string,
    extra?: Record<string, unknown>
  ) {
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
          ...extra,
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
        title="Admin"
        titleAccent="Produksi"
        description="Antrian order setelah DP divalidasi — cetak SPP dan setujui ke Setting."
      />

      {loading ? (
        <AppShellLoading />
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Antrian persetujuan
                </h2>
                <p className="text-sm text-zinc-500">
                  Order menunggu setujuan Admin Produksi → Setting
                </p>
              </div>
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-lg border border-orange-500/50 bg-orange-950/40 px-4 py-2 text-sm font-semibold text-orange-300 transition hover:border-orange-400"
              >
                Refresh
              </button>
            </div>

            {items.length === 0 ? (
              <div className="neo-card p-8 text-center text-zinc-500">
                Antrian kosong. Pastikan CS sudah simpan order dan Admin
                Keuangan sudah validasi DP.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((row) => {
            const pid = row.ProductionPipeline.id
            const pay = row.AccountingTransaction?.paymentStatus ?? ""
            const dpValidated = pay !== "" && pay !== "MENUNGGU_DP"
            const alamat = row.alamat?.trim()
            const tglMasuk = resolveOrderEntryDate(row.submittedAt, row.createdAt)
            const deadlineBorder = deadlineCardBorderClass(row.deadline)

            return (
              <div
                key={row.id}
                className={`neo-card p-5 ${deadlineBorder}`.trim()}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Order
                    </p>
                    <p className="font-medium text-orange-400">{row.orderNumber}</p>
                    <p className="text-xs text-zinc-500">
                      {row.ProductionPipeline.productionNumber}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <DeadlineWarningBadge deadline={row.deadline} />
                    <JenisProduksiBadge
                      jenisProduksi={row.jenisProduksi}
                      expressPriority={row.expressPriority}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <p className="text-zinc-400">
                    <span className="text-zinc-500">CS: </span>
                    <span className="text-zinc-200">{row.namaCs || "—"}</span>
                  </p>
                  <p className="text-zinc-400">
                    <span className="text-zinc-500">Masuk: </span>
                    <span className="text-zinc-200">
                      {formatDateIdShort(tglMasuk)}
                    </span>
                  </p>
                  <p className="text-zinc-400">
                    <span className="text-zinc-500">Deadline: </span>
                    <span className="text-zinc-200">
                      {formatDateIdShort(row.deadline)}
                    </span>
                  </p>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-start">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Informasi konsumen
                    </p>
                    <p className="mt-1 font-semibold text-white">{row.namaKonsumen}</p>
                    {row.noHp ? (
                      <p className="mt-0.5 text-sm text-zinc-400">{row.noHp}</p>
                    ) : null}
                    <p className="mt-2 text-sm text-zinc-300">
                      {row.namaArtikel}
                      <span className="text-zinc-500"> · </span>
                      {row.qty} pcs
                    </p>
                    {alamat ? (
                      <p
                        className="mt-1 text-xs text-zinc-500"
                        title={alamat}
                      >
                        {shortenAlamat(alamat)}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Status produksi
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <ProductionStageBadge
                        status={row.ProductionPipeline.currentStatus}
                      />
                      <AdminProduksiStatusBadge
                        status={row.ProductionPipeline.adminProduksiStatus}
                      />
                      {pay ? <StatusBadge status={pay} /> : null}
                    </div>
                    {(row.needsKancing || row.needsDTF) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {row.needsKancing ? (
                          <span className="rounded-full border border-amber-500/40 bg-amber-950/40 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                            Perlu kancing
                          </span>
                        ) : null}
                        {row.needsDTF ? (
                          <span className="rounded-full border border-amber-500/40 bg-amber-950/40 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                            Perlu DTF
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
                    <BtnApprove
                      disabled={busyId === pid || !dpValidated}
                      title={
                        dpValidated
                          ? undefined
                          : "Validasi DP di Admin Keuangan terlebih dahulu"
                      }
                      onClick={() => patchPipeline(pid, "admin_approve")}
                    >
                      Setujui → Setting
                    </BtnApprove>
                  </div>
                </div>
              </div>
            )
                })}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">
                Monitor produksi
              </h2>
              <p className="text-sm text-zinc-500">
                Semua order aktif dari Setting hingga siap kirim — diperbarui
                otomatis setiap 12 detik.
              </p>
            </div>

            {monitorItems.length === 0 ? (
              <div className="neo-card p-8 text-center text-zinc-500">
                Belum ada order dalam produksi.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-zinc-800">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/80 text-left text-zinc-500">
                      <th className="p-3 font-semibold uppercase tracking-wide">
                        Order
                      </th>
                      <th className="p-3 font-semibold uppercase tracking-wide">
                        Konsumen
                      </th>
                      <th className="p-3 font-semibold uppercase tracking-wide">
                        CS
                      </th>
                      <th className="p-3 font-semibold uppercase tracking-wide">
                        Tahap
                      </th>
                      <th className="p-3 font-semibold uppercase tracking-wide">
                        Progres
                      </th>
                      <th className="p-3 font-semibold uppercase tracking-wide">
                        Diperbarui
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {monitorItems.map((row) => {
                      const progress = resolveProductionProgressLabel({
                        paymentStatus:
                          row.AccountingTransaction?.paymentStatus ?? null,
                        deliveryStatus: row.deliveryStatus ?? null,
                        pipeline: row.ProductionPipeline,
                      })
                      const updatedAt = row.ProductionPipeline.updatedAt
                        ? new Date(row.ProductionPipeline.updatedAt)
                        : null
                      const potongBahan = formatPotongBahanSummary(
                        row.ProductionPipeline
                      )
                      const printingInk = formatPrintingInkSummary(
                        row.ProductionPipeline
                      )

                      return (
                        <tr
                          key={row.id}
                          className="border-b border-zinc-800/80 hover:bg-zinc-900/40"
                        >
                          <td className="p-3">
                            <p className="font-medium text-orange-400">
                              {row.orderNumber}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {row.ProductionPipeline.productionNumber}
                            </p>
                          </td>
                          <td className="p-3 text-zinc-200">
                            {row.namaKonsumen}
                          </td>
                          <td className="p-3 text-zinc-400">{row.namaCs}</td>
                          <td className="p-3">
                            <ProductionStageBadge
                              status={row.ProductionPipeline.currentStatus}
                            />
                          </td>
                          <td className="p-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${productionProgressBadgeClass(progress.tone)}`}
                            >
                              {progress.primary}
                            </span>
                            {progress.secondary ? (
                              <p className="mt-1 text-xs text-zinc-500">
                                {progress.secondary}
                              </p>
                            ) : null}
                            {potongBahan ? (
                              <p className="mt-1 text-xs text-emerald-400/90">
                                Potong bahan: {potongBahan}
                              </p>
                            ) : null}
                            {printingInk ? (
                              <p className="mt-1 text-xs text-sky-400/90">
                                Konsumsi tinta: {printingInk}
                              </p>
                            ) : null}
                            {(row.needsKancing || row.needsDTF) && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {row.needsKancing ? (
                                  <span className="rounded-full border border-amber-500/40 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                                    Perlu kancing
                                  </span>
                                ) : null}
                                {row.needsDTF ? (
                                  <span className="rounded-full border border-amber-500/40 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                                    Perlu DTF
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-zinc-500">
                            {updatedAt
                              ? updatedAt.toLocaleString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  )
}
