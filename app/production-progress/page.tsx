"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"

export default function ProductionProgressPage() {
  const router = useRouter()
  const [progress, setProgress] = useState<any[]>([])

  useEffect(() => {
    const userData = localStorage.getItem("user")

    if (!userData) {
      router.push("/login")
      return
    }

    fetchProgress()
  }, [router])

  async function fetchProgress() {
    const res = await fetch("/api/progress")
    const data = await res.json()
    setProgress(data)
  }

  return (
    <div className="flex">
      <Sidebar />

      <div className="neo-main">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Progress produksi
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Status tiap tahap order
          </p>
        </header>

        <div className="neo-card overflow-hidden p-6">
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-left text-zinc-400">
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Invoice
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Press
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Jahit
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Finishing
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Pengiriman
                  </th>
                </tr>
              </thead>

              <tbody>
                {progress.map((item) => (
                  <tr
                    key={item.invoice}
                    className="border-b border-zinc-800/80 hover:bg-zinc-900/40"
                  >
                    <td className="p-3 font-medium text-white">
                      {item.invoice}
                    </td>
                    <td className="p-3 text-zinc-300">{item.Press}</td>
                    <td className="p-3 text-zinc-300">{item.Jahit}</td>
                    <td className="p-3 text-zinc-300">{item.Finishing}</td>
                    <td className="p-3 text-orange-400/90">{item.Pengiriman}</td>
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
