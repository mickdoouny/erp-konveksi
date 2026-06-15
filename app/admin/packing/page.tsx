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

type PackingRow = {
  id: string
  orderNumber: string
  namaKonsumen: string
  jenisProduksi?: string
  expressPriority?: number | null
  ProductionPipeline: {
    id: string
    productionNumber: string
    currentStatus: string
  }
}

export default function AdminPackingPage() {
  const router = useRouter()
  const [items, setItems] = useState<PackingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    try {
      const res = await fetch("/api/final-orders?queue=packing", {
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

  return (
    <AppShell>
      <PageHeader
        badge="Produksi"
        title="Packing"
        description="Order lulus QC — selesaikan packing lalu tandai siap kirim."
      />

      {loading ? (
        <AppShellLoading />
      ) : items.length === 0 ? (
        <div className="neo-card p-8 text-center text-zinc-500">
          Belum ada order di tahap packing.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((row) => (
            <div
              key={row.id}
              className="neo-card flex flex-wrap items-center justify-between gap-3 p-5"
            >
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
              </div>
              <BtnApprove
                disabled={busyId === row.ProductionPipeline.id}
                onClick={async () => {
                  const actor = readStoredUser()
                  const actorName = actor?.nama ?? "Admin Produksi"
                  setBusyId(row.ProductionPipeline.id)
                  try {
                    const res = await fetch(
                      `/api/production-pipeline/${row.ProductionPipeline.id}`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "complete_packing",
                          actorName,
                          actorRole: "admin_produksi",
                        }),
                      }
                    )
                    const json = await res.json()
                    if (!res.ok) {
                      alert(json.message ?? "Gagal")
                      return
                    }
                    await load()
                  } finally {
                    setBusyId("")
                  }
                }}
              >
                Selesai packing → Siap kirim
              </BtnApprove>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
