"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { OwnerDashboardHeader } from "@/components/dashboard/owner-dashboard-header"
import { OwnerKpiCards } from "@/components/dashboard/owner-kpi-cards"
import { OwnerFinancialSummary } from "@/components/dashboard/owner-financial-summary"
import { OwnerSalesPerformance } from "@/components/dashboard/owner-sales-performance"
import { OwnerReportsTable } from "@/components/dashboard/owner-reports-table"
import { homePathByRole } from "@/lib/auth-redirect"
import type { OwnerDashboardPayload } from "@/lib/owner-dashboard-data"

export default function OwnerDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<OwnerDashboardPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem("user")
    if (!raw) {
      router.push("/login")
      return
    }

    const user = JSON.parse(raw) as { role: string }
    if (user.role !== "owner") {
      router.push(homePathByRole(user.role))
      return
    }

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/owner/dashboard", { cache: "no-store" })
        const json = await res.json()
        if (!res.ok || !json.success) {
          setError(json.message ?? "Gagal memuat dashboard")
          setData(null)
          return
        }
        setData(json.data as OwnerDashboardPayload)
      } catch {
        setError("Tidak dapat terhubung ke server")
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router])

  return (
    <AppShell>
      <OwnerDashboardHeader workflowEnabled={data?.workflowEnabled ?? false} />

      {loading ? (
        <AppShellLoading />
      ) : error ? (
        <div className="neo-card border border-red-500/30 p-6 text-sm text-red-200">
          {error}
        </div>
      ) : data ? (
        <div className="space-y-8">
          <OwnerKpiCards kpis={data.kpis} />

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <OwnerFinancialSummary
              financial={data.financial}
              designQueue={data.designQueue}
              workflowEnabled={data.workflowEnabled}
            />
            <OwnerSalesPerformance
              salesByCs={data.salesByCs}
              salesTrend={data.salesTrend}
            />
          </div>

          <OwnerReportsTable reports={data.recentReports} />
        </div>
      ) : null}
    </AppShell>
  )
}
