"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { readStoredUser } from "@/lib/auth"
import { clearClientSession } from "@/lib/login-session"

export default function ReportPage() {
  const router = useRouter()

  const [invoice, setInvoice] = useState("")
  const [divisi, setDivisi] = useState("")
  const [qtySelesai, setQtySelesai] = useState("")
  const [kendala, setKendala] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const user = readStoredUser()

    if (user) {
      setDivisi(user.divisi)
    } else {
      router.replace("/login")
    }
  }, [router])

  function logout() {
    clearClientSession()
    router.push("/login")
  }

  async function submitReport() {
    setLoading(true)

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoice,
          divisi,
          qtySelesai,
          kendala,
        }),
      })

      if (!res.ok) {
        alert("Gagal simpan report")
        setLoading(false)
        return
      }

      alert("Report berhasil disimpan")

      setInvoice("")
      setQtySelesai("")
      setKendala("")
    } catch {
      alert("Error koneksi ke server")
    }

    setLoading(false)
  }

  return (
    <div className="neo-main min-h-screen">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Report produksi
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Input hasil kerja divisi
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-red-500/50 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-400 transition hover:border-red-400 hover:bg-red-950/70"
          >
            Keluar
          </button>
        </div>

        <div className="neo-card p-6 md:p-8">
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-zinc-400">
              Invoice
            </label>
            <input
              className="neo-input"
              placeholder="INV-001"
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
            />
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-zinc-400">
              Divisi
            </label>
            <input
              className="neo-input cursor-not-allowed opacity-80"
              value={divisi}
              disabled
              readOnly
            />
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-zinc-400">
              Qty selesai
            </label>
            <input
              type="number"
              className="neo-input"
              placeholder="100"
              value={qtySelesai}
              onChange={(e) => setQtySelesai(e.target.value)}
            />
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-zinc-400">
              Kendala
            </label>
            <textarea
              className="neo-input min-h-[100px] resize-y"
              placeholder="Tidak ada"
              value={kendala}
              onChange={(e) => setKendala(e.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={submitReport}
            disabled={loading}
            className="neo-btn-primary w-full py-3.5 disabled:opacity-50"
          >
            {loading ? "Menyimpan…" : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  )
}
