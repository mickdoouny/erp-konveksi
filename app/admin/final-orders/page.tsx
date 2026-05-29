"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnApprove, BtnGhost } from "@/components/ui/buttons"
import { StatusBadge } from "@/components/ui/status-badge"
import { homePathByRole } from "@/lib/auth-redirect"
import { canAccessAdminProduksiRoutes } from "@/lib/roles"
import { labelProductionStatus } from "@/lib/status-labels"

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
  }
}

export default function AdminFinalOrdersPage() {
  const router = useRouter()
  const [items, setItems] = useState<FinalOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [actorName, setActorName] = useState("Admin Produksi")

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/final-orders?queue=admin_produksi", {
        cache: "no-store",
      })
      const json = await res.json()
      const rows = json.success ? json.data : []
      setItems(
        rows.filter(
          (row: FinalOrderRow) => row.ProductionPipeline?.id
        )
      )
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
    if (!canAccessAdminProduksiRoutes(user.role)) {
      router.push(homePathByRole(user.role))
      return
    }
    setActorName(user.nama ?? "Admin Produksi")
    load()
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
      ) : items.length === 0 ? (
        <div className="neo-card p-8 text-center text-zinc-500">
          Antrian kosong. Pastikan CS sudah simpan order dan Admin Keuangan sudah
          validasi DP.
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
                  <p className="font-semibold text-white">{row.namaKonsumen}</p>
                  <p className="text-sm text-zinc-400">
                    {row.orderNumber} · {row.ProductionPipeline.productionNumber}
                  </p>
                  <p className="text-sm text-zinc-400">
                    {row.namaArtikel} · {row.qty} pcs
                  </p>
                  {pay ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={pay} />
                      <span className="text-xs text-zinc-500">
                        DP Rp {(row.AccountingTransaction?.dp || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ) : null}
                  <p className="mt-1 text-xs text-zinc-600">
                    Tahap: {labelProductionStatus(row.ProductionPipeline.currentStatus)}
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
    </AppShell>
  )
}
