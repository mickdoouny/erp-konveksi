"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnApprove } from "@/components/ui/buttons"
import { readStoredUser } from "@/lib/auth"
import { homePathByRole } from "@/lib/auth-redirect"
import { canAccessAdminProduksiRoutes } from "@/lib/roles"
import { JenisProduksiBadge } from "@/components/production/jenis-produksi-badge"
import { ProductionStageBadge } from "@/components/production/production-stage-badge"
import { usePollingRefresh } from "@/hooks/use-polling-refresh"
import { labelShipReleaseStatus } from "@/lib/status-labels"

type Row = {
  id: string
  orderNumber: string
  namaKonsumen: string
  jenisProduksi?: string
  expressPriority?: number | null
  ProductionPipeline: {
    id: string
    productionNumber: string
    currentStatus: string
    shipReleaseStatus: string
  }
}

export default function AdminSiapKirimPage() {
  const router = useRouter()
  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [actorName, setActorName] = useState("Admin Produksi")

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    try {
      const res = await fetch("/api/final-orders?queue=siap_kirim", {
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
    setActorName(user.nama ?? "Admin Produksi")
    void load()
  }, [router, load])

  usePollingRefresh(
    useCallback(() => {
      void load({ silent: true })
    }, [load])
  )

  return (
    <AppShell>
      <PageHeader
        badge="Produksi"
        title="Siap"
        titleAccent="Kirim"
        description="Order di tahap siap kirim — ajukan izin kirim ke Admin Keuangan setelah pelunasan."
      />

      {loading ? (
        <AppShellLoading />
      ) : items.length === 0 ? (
        <div className="neo-card p-8 text-center text-zinc-500">Belum ada order siap kirim.</div>
      ) : (
        <div className="space-y-4">
          {items.map((row) => (
            <div key={row.id} className="neo-card flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-semibold text-white">{row.namaKonsumen}</p>
                <p className="text-sm text-zinc-400">
                  {row.orderNumber} · {row.ProductionPipeline.productionNumber}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ProductionStageBadge
                    status={row.ProductionPipeline.currentStatus}
                  />
                  <JenisProduksiBadge
                    jenisProduksi={row.jenisProduksi}
                    expressPriority={row.expressPriority}
                  />
                </div>
                {row.ProductionPipeline.shipReleaseStatus !== "NONE" ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    {labelShipReleaseStatus(row.ProductionPipeline.shipReleaseStatus)}
                  </p>
                ) : null}
              </div>
              <BtnApprove
                disabled={
                  busyId === row.ProductionPipeline.id ||
                  row.ProductionPipeline.shipReleaseStatus === "MENUNGGU_VALIDASI"
                }
                onClick={async () => {
                  setBusyId(row.ProductionPipeline.id)
                  await fetch(`/api/production-pipeline/${row.ProductionPipeline.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "request_ship_release",
                      actorName,
                    }),
                  })
                  setBusyId("")
                  await load()
                }}
              >
                Ajukan izin kirim
              </BtnApprove>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
