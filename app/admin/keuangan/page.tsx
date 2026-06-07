"use client"

import { useEffect, useState } from "react"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnApprove, BtnGhost, BtnPrimary, BtnRevisi } from "@/components/ui/buttons"
import { StatusBadge } from "@/components/ui/status-badge"
import { RupiahInput } from "@/components/ui/rupiah-input"
import { authenticatedUser, useAuthGuard } from "@/hooks/use-auth-guard"
import { isDesignImageUrl } from "@/lib/cs-antrian-desain"
import { openImageInNewTab } from "@/lib/image-viewer"
import { labelPaymentStatus } from "@/lib/status-labels"
import { formatRupiahDisplay, parseRupiahInput } from "@/lib/format-rupiah"
import {
  buildBuktiPelunasanUploadFilename,
  getFileExtension,
} from "@/lib/upload-filename"
import { JenisProduksiBadge } from "@/components/production/jenis-produksi-badge"

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
    namaCs?: string
    submittedByName?: string | null
    submittedAt?: string | null
    jenisProduksi?: string
    expressPriority?: number | null
    DesignQueueItem?: { artikelId: string; csNama?: string } | null
    ProductionPipeline?: {
      id: string
      shipReleaseStatus: string
      productionNumber: string
    } | null
  }
}

function resolveCsName(row: AccountingRow): string {
  return (
    row.FinalOrder.namaCs?.trim() ||
    row.FinalOrder.DesignQueueItem?.csNama?.trim() ||
    "—"
  )
}

function BuktiDpPreview({ url, artikelId }: { url: string; artikelId?: string }) {
  const label = artikelId ? `${artikelId} — bukti DP` : "Bukti DP"
  const isImage = isDesignImageUrl(url)

  return (
    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Bukti transfer DP
      </p>
      {isImage ? (
        <button
          type="button"
          className="mt-2 block overflow-hidden rounded-lg border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
          onClick={() => openImageInNewTab(url, label)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            className="max-h-40 w-full object-contain bg-zinc-950"
          />
        </button>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <BtnGhost type="button" onClick={() => openImageInNewTab(url, label)}>
          {isImage ? "Buka gambar penuh" : "Lihat bukti DP"}
        </BtnGhost>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-xs text-zinc-400 underline hover:text-zinc-200"
        >
          Unduh / buka file
        </a>
      </div>
    </div>
  )
}

export default function AdminKeuanganPage() {
  const auth = useAuthGuard({ roles: ["admin_keuangan", "owner"] })
  const sessionUser = authenticatedUser(auth)
  const [items, setItems] = useState<AccountingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState("")
  const [actorName, setActorName] = useState("Admin Keuangan")
  const [pelunasanRow, setPelunasanRow] = useState<AccountingRow | null>(null)
  const [pelunasanAmount, setPelunasanAmount] = useState("")
  const [buktiPelunasan, setBuktiPelunasan] = useState<string | null>(null)
  const [uploadingBukti, setUploadingBukti] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const accRes = await fetch("/api/accounting", { cache: "no-store" })
      const json = await accRes.json()
      setItems(json.success ? json.data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!sessionUser) return
    setActorName(sessionUser.nama ?? "Admin Keuangan")
    load()
  }, [auth.status, sessionUser])

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
        description="Validasi bukti DP dari CS, catat pelunasan, dan setujui permintaan izin kirim."
      />

      {loading ? (
        <AppShellLoading />
      ) : (
        <div className="space-y-8">
          <section className="neo-card p-5">
            <h2 className="text-lg font-semibold text-white">
              Antrian validasi DP
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Cek bukti transfer ke rekening perusahaan. Bandingkan nominal DP
              dengan mutasi rekening. Jika sudah sesuai, klik{" "}
              <span className="text-zinc-200">Setujui DP · Lanjut produksi</span>{" "}
              — order akan masuk antrian Admin Produksi.
            </p>
            {dpQueue.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                Tidak ada DP menunggu validasi.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {dpQueue.map((row) => {
                  const csName = resolveCsName(row)
                  const artikelId = row.FinalOrder.DesignQueueItem?.artikelId
                  return (
                    <div
                      key={row.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white">
                            {row.FinalOrder.namaKonsumen}
                          </p>
                          <p className="text-sm text-zinc-400">
                            {row.FinalOrder.orderNumber} ·{" "}
                            {row.FinalOrder.namaArtikel}
                            {artikelId ? ` · ${artikelId}` : ""}
                          </p>
                          <div className="mt-2">
                            <JenisProduksiBadge
                              jenisProduksi={row.FinalOrder.jenisProduksi}
                              expressPriority={row.FinalOrder.expressPriority}
                            />
                          </div>
                          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                            <div>
                              <dt className="text-zinc-500">Nominal DP</dt>
                              <dd className="font-medium text-emerald-300">
                                Rp {formatRupiahDisplay(row.dp)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-zinc-500">Total order</dt>
                              <dd className="font-medium text-zinc-200">
                                Rp {formatRupiahDisplay(row.totalHarga)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-zinc-500">Sisa pelunasan</dt>
                              <dd className="font-medium text-amber-200">
                                Rp {formatRupiahDisplay(row.sisaPelunasan)}
                              </dd>
                            </div>
                          </dl>
                          <p className="mt-3 text-sm text-zinc-400">
                            CS pengaju:{" "}
                            <span className="text-zinc-200">{csName}</span>
                            {row.FinalOrder.submittedByName &&
                            row.FinalOrder.submittedByName !== csName ? (
                              <span className="text-zinc-500">
                                {" "}
                                · disimpan oleh {row.FinalOrder.submittedByName}
                              </span>
                            ) : null}
                          </p>
                          <div className="mt-2">
                            <StatusBadge status={row.paymentStatus} />
                          </div>
                          {row.buktiDp?.trim() ? (
                            <BuktiDpPreview
                              url={row.buktiDp.trim()}
                              artikelId={artikelId}
                            />
                          ) : (
                            <p className="mt-3 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
                              Bukti DP belum diunggah CS. Minta CS melampirkan
                              bukti transfer sebelum disetujui.
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                          <BtnApprove
                            disabled={busyId === row.id}
                            onClick={() =>
                              patchAccounting(row.id, { action: "approve_dp" })
                            }
                          >
                            Setujui DP · Lanjut produksi
                          </BtnApprove>
                        </div>
                      </div>
                    </div>
                  )
                })}
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
                    <div className="mt-2">
                      <JenisProduksiBadge
                        jenisProduksi={row.FinalOrder.jenisProduksi}
                        expressPriority={row.FinalOrder.expressPriority}
                      />
                    </div>
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
                      <div className="mt-2">
                        <JenisProduksiBadge
                          jenisProduksi={row.FinalOrder.jenisProduksi}
                          expressPriority={row.FinalOrder.expressPriority}
                        />
                      </div>
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
