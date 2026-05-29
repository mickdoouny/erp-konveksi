"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnApprove, BtnGhost, BtnPrimary, BtnRevisi } from "@/components/ui/buttons"
import { StatusBadge } from "@/components/ui/status-badge"
import { RupiahInput } from "@/components/ui/rupiah-input"
import { homePathByRole } from "@/lib/auth-redirect"
import { canAccessAdminKeuanganRoutes } from "@/lib/roles"
import { labelPaymentStatus } from "@/lib/status-labels"
import { formatRupiahDisplay, parseRupiahInput } from "@/lib/format-rupiah"

type AccountingRow = {
  id: string
  invoiceNumber: string
  paymentStatus: string
  totalHarga: number
  dp: number
  sisaPelunasan: number
  buktiDp?: string | null
  FinalOrder: {
    id: string
    orderNumber: string
    namaKonsumen: string
    namaArtikel: string
    ProductionPipeline?: {
      id: string
      shipReleaseStatus: string
      productionNumber: string
    } | null
  }
}

export default function AdminKeuanganPage() {
  const router = useRouter()
  const [items, setItems] = useState<AccountingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [actorName, setActorName] = useState("Admin Keuangan")
  const [pelunasanRow, setPelunasanRow] = useState<AccountingRow | null>(null)
  const [pelunasanAmount, setPelunasanAmount] = useState("")

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/accounting", { cache: "no-store" })
      const json = await res.json()
      setItems(json.success ? json.data : [])
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
    if (!canAccessAdminKeuanganRoutes(user.role)) {
      router.push(homePathByRole(user.role))
      return
    }
    setActorName(user.nama ?? "Admin Keuangan")
    load()
  }, [router])

  async function patchAccounting(id: string, body: Record<string, unknown>) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/accounting/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, actorName }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.message ?? "Gagal")
        return
      }
      await load()
    } catch {
      alert("Gagal memperbarui transaksi")
    } finally {
      setBusyId("")
    }
  }

  const dpQueue = items.filter((row) => row.paymentStatus === "MENUNGGU_DP")
  const pelunasanQueue = items.filter(
    (row) =>
      row.paymentStatus !== "MENUNGGU_DP" &&
      row.paymentStatus !== "LUNAS" &&
      row.sisaPelunasan > 0
  )
  const shipQueue = items.filter(
    (row) =>
      row.FinalOrder.ProductionPipeline?.shipReleaseStatus ===
      "MENUNGGU_VALIDASI"
  )

  return (
    <AppShell>
      <PageHeader
        badge="Keuangan"
        title="Admin"
        titleAccent="Keuangan"
        description="Validasi DP, catat pelunasan, dan permintaan izin kirim."
      />

      {loading ? (
        <AppShellLoading />
      ) : (
        <div className="space-y-8">
          <section className="neo-card p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Antrian validasi DP
            </h2>
            {dpQueue.length === 0 ? (
              <p className="text-sm text-zinc-500">Tidak ada DP menunggu validasi.</p>
            ) : (
              <div className="space-y-4">
                {dpQueue.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          {row.FinalOrder.namaKonsumen}
                        </p>
                        <p className="text-sm text-zinc-400">
                          {row.FinalOrder.orderNumber} · {row.FinalOrder.namaArtikel}
                        </p>
                        <p className="mt-2 text-sm text-zinc-300">
                          DP Rp {row.dp.toLocaleString("id-ID")} · Total Rp{" "}
                          {row.totalHarga.toLocaleString("id-ID")}
                        </p>
                        <StatusBadge status={row.paymentStatus} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <BtnApprove
                          disabled={busyId === row.id}
                          onClick={() =>
                            patchAccounting(row.id, { action: "approve_dp" })
                          }
                        >
                          Validasi DP
                        </BtnApprove>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="neo-card p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Catat pelunasan
            </h2>
            {pelunasanQueue.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Tidak ada sisa pelunasan yang perlu dicatat.
              </p>
            ) : (
              <div className="space-y-4">
                {pelunasanQueue.map((row) => (
                  <div
                    key={`pel-${row.id}`}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
                  >
                    <p className="font-semibold text-white">
                      {row.FinalOrder.namaKonsumen}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {row.FinalOrder.orderNumber} · Sisa Rp{" "}
                      {formatRupiahDisplay(row.sisaPelunasan)}
                    </p>
                    <div className="mt-3">
                      <BtnGhost
                        disabled={busyId === row.id}
                        onClick={() => {
                          setPelunasanRow(row)
                          setPelunasanAmount(
                            formatRupiahDisplay(row.sisaPelunasan)
                          )
                        }}
                      >
                        Catat pelunasan
                      </BtnGhost>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="neo-card p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Permintaan Izin Kirim
            </h2>
            {shipQueue.length === 0 ? (
              <p className="text-sm text-zinc-500">Belum ada permintaan izin kirim.</p>
            ) : (
              <div className="space-y-4">
                {shipQueue.map((row) => {
                  const pipelineId = row.FinalOrder.ProductionPipeline?.id
                  if (!pipelineId) return null
                  return (
                    <div
                      key={`ship-${row.id}`}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
                    >
                      <p className="font-semibold text-white">
                        {row.FinalOrder.ProductionPipeline?.productionNumber ??
                          row.FinalOrder.orderNumber}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {row.FinalOrder.namaKonsumen} · Status pembayaran:{" "}
                        {labelPaymentStatus(row.paymentStatus)}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <BtnApprove
                          disabled={busyId === row.id}
                          onClick={() =>
                            patchAccounting(row.id, {
                              action: "approve_ship_release",
                              pipelineId,
                            })
                          }
                        >
                          Setujui kirim
                        </BtnApprove>
                        <BtnRevisi
                          disabled={busyId === row.id}
                          onClick={() =>
                            patchAccounting(row.id, {
                              action: "reject_ship_release",
                              pipelineId,
                            })
                          }
                        >
                          Tolak
                        </BtnRevisi>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {pelunasanRow ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Tutup"
            onClick={() => setPelunasanRow(null)}
          />
          <div className="neo-card relative z-10 w-full max-w-md p-5">
            <h3 className="text-lg font-semibold text-white">Catat pelunasan</h3>
            <p className="mt-1 text-sm text-zinc-400">
              {pelunasanRow.FinalOrder.namaKonsumen} · sisa Rp{" "}
              {formatRupiahDisplay(pelunasanRow.sisaPelunasan)}
            </p>
            <label className="mt-4 block text-sm">
              <span className="text-zinc-400">Nominal pelunasan (Rp)</span>
              <RupiahInput
                className="neo-input mt-1"
                value={pelunasanAmount}
                onChange={setPelunasanAmount}
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <BtnGhost type="button" onClick={() => setPelunasanRow(null)}>
                Batal
              </BtnGhost>
              <BtnPrimary
                type="button"
                disabled={busyId === pelunasanRow.id}
                onClick={async () => {
                  const amount = parseRupiahInput(pelunasanAmount)
                  if (Number.isNaN(amount) || amount <= 0) {
                    alert("Nominal pelunasan tidak valid")
                    return
                  }
                  await patchAccounting(pelunasanRow.id, {
                    action: "record_pelunasan",
                    amount,
                  })
                  setPelunasanRow(null)
                }}
              >
                Simpan
              </BtnPrimary>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}
