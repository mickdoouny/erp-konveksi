"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { homePathByRole } from "@/lib/auth-redirect"

export default function OwnerDashboard() {
  const router = useRouter()

  const [reports, setReports] = useState<any[]>([])
  const [totalQty, setTotalQty] = useState(0)

  useEffect(() => {
    const userData = localStorage.getItem("user")

    if (!userData) {
      router.push("/login")
      return
    }

    const user = JSON.parse(userData)

    if (user.role !== "owner") {
      router.push(homePathByRole(user.role))
      return
    }

    fetchReports()
  }, [router])

  async function fetchReports() {
    try {
      const res = await fetch("/api/reports/list")
      const data = await res.json()

      setReports(data)

      const total = data.reduce(
        (sum: number, item: any) => sum + item.qtySelesai,
        0
      )

      setTotalQty(total)
    } catch {
      alert("Gagal mengambil data report")
    }
  }

  return (
    <div className="flex">
      <Sidebar />

      <div className="neo-main">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Dashboard Owner
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Ringkasan produksi &amp; report terbaru
          </p>
        </header>

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="neo-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Total report
            </p>
            <p className="mt-2 bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-4xl font-bold text-transparent">
              {reports.length}
            </p>
          </div>

          <div className="neo-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Total qty produksi
            </p>
            <p className="mt-2 bg-gradient-to-br from-orange-300 to-orange-600 bg-clip-text text-4xl font-bold text-transparent">
              {totalQty}
            </p>
          </div>
        </div>

        <div className="neo-card overflow-hidden p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Report terbaru
          </h2>

          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-left text-zinc-400">
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Invoice
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Divisi
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Qty
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Kendala
                  </th>
                </tr>
              </thead>

              <tbody>
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-zinc-800/80 hover:bg-zinc-900/50"
                  >
                    <td className="p-3 font-medium text-white">
                      {report.invoice}
                    </td>
                    <td className="p-3 text-zinc-300">{report.divisi}</td>
                    <td className="p-3 text-orange-400">{report.qtySelesai}</td>
                    <td className="p-3 text-zinc-400">{report.kendala}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
