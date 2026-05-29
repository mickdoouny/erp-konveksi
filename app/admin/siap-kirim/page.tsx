"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnApprove } from "@/components/ui/buttons"
import { homePathByRole } from "@/lib/auth-redirect"
import { canAccessAdminProduksiRoutes } from "@/lib/roles"

type Row = {
  id: string
  orderNumber: string
  namaKonsumen: string
  ProductionPipeline: {
    id: string
    productionNumber: string
    shipReleaseStatus: string
  }
}

export default function AdminSiapKirimPage() {
  const router = useRouter()
  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [actorName, setActorName] = useState("Admin Produksi")

  async function load() {
    setLoading(true)
    const res = await fetch("/api/final-orders?queue=siap_kirim", {
      cache: "no-store",
    })
    const json = await res.json()
    setItems(json.success ? json.data : [])
    setLoading(false)
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
              </div>
              <BtnApprove
                disabled={busyId === row.ProductionPipeline.id}
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
