"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnApprove, BtnGhost, BtnPrimary, BtnRevisi } from "@/components/ui/buttons"
import { StatusBadge } from "@/components/ui/status-badge"
import { RupiahInput } from "@/components/ui/rupiah-input"
import { useAuthGuard } from "@/hooks/use-auth-guard"
import { labelPaymentStatus } from "@/lib/status-labels"
import { formatRupiahDisplay, parseRupiahInput } from "@/lib/format-rupiah"
import {
  buildBuktiDtfVendorUploadFilename,
  buildBuktiPelunasanUploadFilename,
  getFileExtension,
} from "@/lib/upload-filename"
import {
  dtfStatusBadgeClass,
  labelDtfStatus,
} from "@/lib/dtf-status-labels"

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
    DesignQueueItem?: { artikelId: string } | null
    ProductionPipeline?: {
      id: string
      shipReleaseStatus: string
      productionNumber: string
    } | null
  }
}

type DtfPaymentRow = {
  id: string
  nominal: number
  status: string
  requestedAt: string
  requestedBy: string
  DtfVendor: { name: string; bankAccount?: string | null }
  DesignQueueItem: {
    id: string
    artikelId: string
    designId: string
    namaKonsumen: string
    namaArtikel: string
    statusDtf: string
  }
}

export default function AdminKeuanganPage() {
  const auth = useAuthGuard({ roles: ["admin_keuangan", "owner"] })
  const [items, setItems] = useState<AccountingRow[]>([])
  const [dtfPayments, setDtfPayments] = useState<DtfPaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [dtfBusyId, setDtfBusyId] = useState("")
  const [actorName, setActorName] = useState("Admin Keuangan")
  const [dtfBuktiByRequest, setDtfBuktiByRequest] = useState<Record<string, string>>({})
  const [uploadingDtfBukti, setUploadingDtfBukti] = useState("")
  const [pelunasanRow, setPelunasanRow] = useState<AccountingRow | null>(null)
  const [pelunasanAmount, setPelunasanAmount] = useState("")
  const [buktiPelunasan, setBuktiPelunasan] = useState<string | null>(null)
  const [uploadingBukti, setUploadingBukti] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [accRes, dtfRes] = await Promise.all([
        fetch("/api/accounting", { cache: "no-store" }),
        fetch("/api/dtf-payment-requests?status=MENUNGGU", { cache: "no-store" }),
      ])
      const json = await accRes.json()
      const dtfJson = await dtfRes.json()
      setItems(json.success ? json.data : [])
      setDtfPayments(Array.isArray(dtfJson) ? dtfJson : [])
    } catch {
      setItems([])
      setDtfPayments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (auth.status !== "authenticated") return
    setActorName(auth.user.nama ?? "Admin Keuangan")
    load()
  }, [auth.status, auth.user])

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

  async function uploadDtfBukti(
    requestId: string,
    artikelId: string,
    files: FileList | null
  ) {
    if (!files?.length) return
    const file = files[0]
    const ext = getFileExtension(file.name) || "jpg"
    const saveAs = buildBuktiDtfVendorUploadFilename(artikelId, ext)
    setUploadingDtfBukti(requestId)
    try {
      const formData = new FormData()
      formData.append("files", file)
      formData.append("saveAs", saveAs)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const json = await res.json()
      if (res.ok && json.files?.[0]?.url) {
        setDtfBuktiByRequest((prev) => ({
          ...prev,
          [requestId]: json.files[0].url,
        }))
      } else {
        alert(json.message ?? "Gagal upload bukti bayar DTF")
      }
    } catch {
      alert("Gagal upload bukti bayar DTF")
    } finally {
      setUploadingDtfBukti("")
    }
  }

  async function patchDtfPayment(requestId: string, action: "approve" | "reject") {
    setDtfBusyId(requestId)
    try {
      const res = await fetch(`/api/dtf-payment-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          actorName,
          buktiBayarUrl: dtfBuktiByRequest[requestId],
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.message ?? "Gagal memproses pembayaran DTF")
        return
      }
      await load()
    } catch {
      alert("Gagal memproses pembayaran DTF")
    } finally {
      setDtfBusyId("")
    }
  }

  async function uploadBuktiPelunasan(
    artikelId: string,
    files: FileList | null
  ) {
    if (!files?.length) return
    const file = files[0]
    const ext = getFileExtension(file.name) || "jpg"
    const saveAs = buildBuktiPelunasanUploadFilename(artikelId, ext)
    setUploadingBukti(true)
    try {
      const formData = new FormData()
      formData.append("files", file)
      formData.append("saveAs", saveAs)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const json = await res.json()
      if (res.ok && json.files?.[0]?.url) {
        setBuktiPelunasan(json.files[0].url)
      } else {
        alert(json.message ?? "Gagal upload bukti pelunasan")
      }
    } catch {
      alert("Gagal upload bukti pelunasan")
    } finally {
      setUploadingBukti(false)
    }
  }

  function openPelunasanModal(row: AccountingRow) {
    setPelunasanRow(row)
    setPelunasanAmount(formatRupiahDisplay(row.sisaPelunasan))
    setBuktiPelunasan(null)
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">
                Antrian pembayaran DTF
              </h2>
              <Link
                href="/admin/dtf-vendors"
                className="text-sm text-orange-400 hover:text-orange-300"
              >
                Kelola vendor DTF →
              </Link>
            </div>
            {dtfPayments.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Tidak ada permintaan pembayaran DTF menunggu persetujuan.
              </p>
            ) : (
              <div className="space-y-4">
                {dtfPayments.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          {row.DesignQueueItem.namaKonsumen}
                        </p>
                        <p className="text-sm text-zinc-400">
                          {row.DesignQueueItem.artikelId} ·{" "}
                          {row.DesignQueueItem.namaArtikel}
                        </p>
                        <p className="mt-2 text-sm text-zinc-300">
                          Vendor: {row.DtfVendor.name} · Rp{" "}
                          {row.nominal.toLocaleString("id-ID")}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Diajukan {row.requestedBy} ·{" "}
                          {new Date(row.requestedAt).toLocaleString("id-ID")}
                        </p>
                        <span
                          className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${dtfStatusBadgeClass(row.DesignQueueItem.statusDtf)}`}
                        >
                          {labelDtfStatus(row.DesignQueueItem.statusDtf)}
                        </span>
                      </div>
                      <div className="min-w-[220px]">
                        <label className="block text-sm">
                          <span className="text-zinc-400">Bukti bayar vendor</span>
                          <p className="mt-1 text-xs text-zinc-500">
                            {`${row.DesignQueueItem.artikelId}-bukti-dtf-vendor.{ekstensi}`}
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingDtfBukti === row.id}
                            className="neo-input mt-1"
                            onChange={(e) =>
                              uploadDtfBukti(
                                row.id,
                                row.DesignQueueItem.artikelId,
                                e.target.files
                              )
                            }
                          />
                          {dtfBuktiByRequest[row.id] ? (
                            <p className="mt-1 text-xs text-emerald-400">
                              Bukti tersimpan.
                            </p>
                          ) : null}
                        </label>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <BtnApprove
                            disabled={
                              dtfBusyId === row.id ||
                              uploadingDtfBukti === row.id ||
                              !dtfBuktiByRequest[row.id]
                            }
                            onClick={() => patchDtfPayment(row.id, "approve")}
                          >
                            Setujui bayar
                          </BtnApprove>
                          <BtnRevisi
                            disabled={dtfBusyId === row.id}
                            onClick={() => patchDtfPayment(row.id, "reject")}
                          >
                            Tolak
                          </BtnRevisi>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

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
                        onClick={() => openPelunasanModal(row)}
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
            {pelunasanRow.FinalOrder.DesignQueueItem?.artikelId ? (
              <label className="mt-4 block text-sm">
                <span className="text-zinc-400">Bukti pelunasan</span>
                <p className="mt-1 text-xs text-zinc-500">
                  {`File disimpan sebagai ${pelunasanRow.FinalOrder.DesignQueueItem.artikelId}-bukti-pelunasan.{ekstensi}`}
                </p>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingBukti}
                  className="neo-input mt-1"
                  onChange={(e) =>
                    uploadBuktiPelunasan(
                      pelunasanRow.FinalOrder.DesignQueueItem!.artikelId,
                      e.target.files
                    )
                  }
                />
                {buktiPelunasan ? (
                  <p className="mt-1 text-xs text-emerald-400">Bukti tersimpan.</p>
                ) : null}
              </label>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <BtnGhost type="button" onClick={() => setPelunasanRow(null)}>
                Batal
              </BtnGhost>
              <BtnPrimary
                type="button"
                disabled={busyId === pelunasanRow.id || uploadingBukti}
                onClick={async () => {
                  const amount = parseRupiahInput(pelunasanAmount)
                  if (Number.isNaN(amount) || amount <= 0) {
                    alert("Nominal pelunasan tidak valid")
                    return
                  }
                  await patchAccounting(pelunasanRow.id, {
                    action: "record_pelunasan",
                    amount,
                    buktiUrl: buktiPelunasan,
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
