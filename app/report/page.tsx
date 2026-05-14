"use client"

import { useState } from "react"

export default function ReportPage() {
  const [invoice, setInvoice] = useState("")
  const [divisi, setDivisi] = useState("Press")
  const [qtySelesai, setQtySelesai] = useState("")
  const [kendala, setKendala] = useState("")
  const [loading, setLoading] = useState(false)

  async function submitReport() {
    setLoading(true)

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice, divisi, qtySelesai, kendala }),
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
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Report Produksi</h1>

      <div className="bg-white p-6 rounded-2xl shadow max-w-2xl">
        <div className="mb-4">
          <label className="block mb-2 font-semibold">Invoice</label>
          <input
            className="border w-full p-3 rounded-lg"
            placeholder="INV-001"
            value={invoice}
            onChange={(e) => setInvoice(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2 font-semibold">Divisi</label>
          <select
            className="border w-full p-3 rounded-lg"
            value={divisi}
            onChange={(e) => setDivisi(e.target.value)}
          >
            <option>Press</option>
            <option>Jahit</option>
            <option>Finishing</option>
            <option>Pengiriman</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block mb-2 font-semibold">Qty Selesai</label>
          <input
            type="number"
            className="border w-full p-3 rounded-lg"
            placeholder="100"
            value={qtySelesai}
            onChange={(e) => setQtySelesai(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2 font-semibold">Kendala</label>
          <textarea
            className="border w-full p-3 rounded-lg"
            placeholder="Tidak ada"
            value={kendala}
            onChange={(e) => setKendala(e.target.value)}
          />
        </div>

        <button
          onClick={submitReport}
          disabled={loading}
          className="bg-black text-white px-6 py-3 rounded-lg"
        >
          {loading ? "Menyimpan..." : "Submit Report"}
        </button>
      </div>
    </div>
  )
}