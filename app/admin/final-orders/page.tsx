"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnApprove, BtnGhost } from "@/components/ui/buttons"
import { StatusBadge } from "@/components/ui/status-badge"
import { readStoredUser } from "@/lib/auth"
import { homePathByRole } from "@/lib/auth-redirect"
import { canAccessAdminProduksiRoutes } from "@/lib/roles"
import { labelProductionStatus } from "@/lib/status-labels"
import {
  dtfStatusBadgeClass,
  isDtfPaymentApprovedForProduction,
  labelDtfStatus,
} from "@/lib/dtf-status-labels"

type FinalOrderRow = {
  id: string
  orderNumber: string
  namaKonsumen: string
  namaArtikel: string
  qty: number
  needsKancing: boolean
  needsDTF: boolean
  DesignQueueItem?: {
    sppGroupId: string | null
    designId: string
    artikelId: string
    perluDtf?: boolean
    statusDtf?: string
    DtfVendor?: { name: string } | null
  } | null
  AccountingTransaction?: {
    paymentStatus: string
    dp: number
    sisaPelunasan: number
  } | null
  ProductionPipeline: {
    id: string
    productionNumber: string
    currentStatus: string
    needsDTF: boolean
    dtfCompletedAt?: string | null
  }
}

export default function AdminFinalOrdersPage() {
  const router = useRouter()
  const [items, setItems] = useState<FinalOrderRow[]>([])
  const [dtfItems, setDtfItems] = useState<FinalOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [actorName, setActorName] = useState("Admin Produksi")

  async function load() {
    setLoading(true)
    try {
      const [adminRes, dtfRes] = await Promise.all([
        fetch("/api/final-orders?queue=admin_produksi", { cache: "no-store" }),
        fetch("/api/final-orders?queue=dtf_stage", { cache: "no-store" }),
      ])
      const json = await adminRes.json()
      const dtfJson = await dtfRes.json()
      const rows = json.success ? json.data : []
      setItems(rows.filter((row: FinalOrderRow) => row.ProductionPipeline?.id))
      setDtfItems(dtfJson.success ? dtfJson.data : [])
    } catch {
      setItems([])
      setDtfItems([])
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
      router.push(homePathByRole(user.role))
      return
    }
    setActorName(user.nama ?? "Admin Produksi")
    queueMicrotask(() => {
      void load()
    })
  }, [router])

  async function patchPipeline(
    pipelineId: string,
    action: string,
    extra?: Record<string, unknown>
  ) {
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
          {dtfItems.length > 0 ? (
            <section className="neo-card p-5">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Tahap DTF — ambil film
              </h2>
              <p className="mb-4 text-sm text-zinc-500">
                Film DTF hanya bisa diambil setelah pembayaran vendor disetujui
                Keuangan.
              </p>
              <div className="space-y-4">
                {dtfItems.map((row) => {
                  const pid = row.ProductionPipeline.id
                  const dtfStatus =
                    row.DesignQueueItem?.statusDtf ?? "MENUNGGU_ORDER"
                  const dtfReady = isDtfPaymentApprovedForProduction(dtfStatus)
                  return (
                    <div
                      key={`dtf-${row.id}`}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">
                            {row.namaKonsumen}
                          </p>
                          <p className="text-sm text-zinc-400">
                            {row.orderNumber} ·{" "}
                            {row.ProductionPipeline.productionNumber}
                          </p>
                          <p className="text-sm text-zinc-400">
                            {row.namaArtikel} · Vendor:{" "}
                            {row.DesignQueueItem?.DtfVendor?.name ?? "—"}
                          </p>
                          <span
                            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${dtfStatusBadgeClass(dtfStatus)}`}
                          >
                            {labelDtfStatus(dtfStatus)}
                          </span>
                        </div>
                        <BtnGhost
                          disabled={busyId === pid || !dtfReady}
                          title={
                            dtfReady
                              ? "Konfirmasi film DTF diambil → lanjut Packing"
                              : "Menunggu pembayaran DTF disetujui Keuangan"
                          }
                          onClick={() => patchPipeline(pid, "advance_stage")}
                        >
                          Film diambil → Packing
                        </BtnGhost>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          {items.length === 0 ? (
            <div className="neo-card p-8 text-center text-zinc-500">
              Antrian kosong. Pastikan CS sudah simpan order dan Admin Keuangan
              sudah validasi DP.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((row) => {
                const pid = row.ProductionPipeline.id
                const pay = row.AccountingTransaction?.paymentStatus ?? ""
                const dpValidated = pay !== "" && pay !== "MENUNGGU_DP"

                return (
                  <div
                    key={row.id}
                    className="neo-card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {row.namaKonsumen}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {row.orderNumber} ·{" "}
                        {row.ProductionPipeline.productionNumber}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {row.namaArtikel} · {row.qty} pcs
                        {row.needsDTF ? (
                          <span className="ml-2 text-orange-400">· DTF</span>
                        ) : null}
                      </p>
                      {pay ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusBadge status={pay} />
                        </div>
                      ) : null}
                      <p className="mt-1 text-xs text-zinc-600">
                        Tahap:{" "}
                        {labelProductionStatus(
                          row.ProductionPipeline.currentStatus
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                      <BtnGhost
                        disabled={busyId === pid || !dpValidated}
                        onClick={() => patchPipeline(pid, "advance_stage")}
                      >
                        Lanjut tahap
                      </BtnGhost>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}
