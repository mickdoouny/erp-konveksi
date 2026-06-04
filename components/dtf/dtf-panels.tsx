"use client"

import { useEffect, useState } from "react"
import { BtnPrimary } from "@/components/ui/buttons"
import { RupiahInput } from "@/components/ui/rupiah-input"
import {
  dtfStatusBadgeClass,
  labelDtfPaymentStatus,
  labelDtfStatus,
} from "@/lib/dtf-status-labels"
import { parseRupiahInput } from "@/lib/format-rupiah"
import {
  buildDtfProofUploadFilename,
  buildDtfVendorUploadFilename,
  getFileExtension,
} from "@/lib/upload-filename"

type DtfVendor = {
  id: string
  name: string
  contact?: string | null
  phone?: string | null
  bankAccount?: string | null
}

type DtfPaymentRequest = {
  id: string
  nominal: number
  status: string
  requestedAt: string | Date
  approvedAt?: string | Date | null
  buktiBayarUrl?: string | null
}

export type DtfItemState = {
  id: string
  artikelId: string
  perluDtf?: boolean
  catatanDtf?: string | null
  statusDtf?: string
  fileDtfVendor?: string | null
  fileDtfProof?: string | null
  dtfVendorId?: string | null
  DtfVendor?: DtfVendor | null
  DtfPaymentRequest?: DtfPaymentRequest[]
}

type Props = {
  item: DtfItemState
  actorName?: string
  onUpdated?: (item: DtfItemState) => void
}

export function DtfStatusReadonlyPanel({ item }: { item: DtfItemState }) {
  if (!item.perluDtf) return null

  const latestPayment = item.DtfPaymentRequest?.[0]

  return (
    <div className="neo-card mb-6 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-white">Status DTF</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${dtfStatusBadgeClass(item.statusDtf ?? "MENUNGGU_ORDER")}`}
        >
          {labelDtfStatus(item.statusDtf ?? "MENUNGGU_ORDER")}
        </span>
        <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-300">
          DTF
        </span>
      </div>
      {item.catatanDtf ? (
        <p className="mb-3 text-sm text-zinc-400">
          <span className="text-zinc-500">Catatan CS:</span> {item.catatanDtf}
        </p>
      ) : null}
      {item.DtfVendor ? (
        <p className="text-sm text-zinc-300">
          Vendor: <span className="text-white">{item.DtfVendor.name}</span>
        </p>
      ) : (
        <p className="text-sm text-zinc-500">
          Desainer akan memilih vendor dan mengelola order DTF.
        </p>
      )}
      {latestPayment ? (
        <p className="mt-2 text-sm text-zinc-400">
          Pembayaran vendor: Rp {latestPayment.nominal.toLocaleString("id-ID")} ·{" "}
          {labelDtfPaymentStatus(latestPayment.status)}
        </p>
      ) : null}
    </div>
  )
}

export function DtfWorkflowPanel({ item, actorName = "Desainer", onUpdated }: Props) {
  const [vendors, setVendors] = useState<DtfVendor[]>([])
  const [vendorId, setVendorId] = useState(item.dtfVendorId ?? "")
  const [nominal, setNominal] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/dtf-vendors?activeOnly=true", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setVendors(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setVendors([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!item.perluDtf) return null

  const latestPayment = item.DtfPaymentRequest?.[0]
  const hasPendingPayment = latestPayment?.status === "MENUNGGU"
  const paymentApproved = latestPayment?.status === "DISETUJUI"
  const filesReady =
    Boolean(item.fileDtfVendor?.trim()) && Boolean(item.fileDtfProof?.trim())
  const canSubmitPayment =
    filesReady &&
    Boolean(item.dtfVendorId) &&
    !hasPendingPayment &&
    !paymentApproved
  const selectedVendorId = item.dtfVendorId ?? vendorId

  async function patchDtf(body: Record<string, unknown>) {
    setBusy(true)
    try {
      const res = await fetch(`/api/design-queue/${item.id}/dtf`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.message ?? "Gagal memperbarui DTF")
        return
      }
      onUpdated?.(json)
    } finally {
      setBusy(false)
    }
  }

  async function uploadFile(
    field: "fileDtfVendor" | "fileDtfProof",
    files: FileList | null,
    buildName: (artikelId: string, ext: string) => string
  ) {
    if (!files?.length) return
    const file = files[0]
    const ext = getFileExtension(file.name) || "pdf"
    const formData = new FormData()
    formData.append("files", file)
    formData.append("saveAs", buildName(item.artikelId, ext))
    setBusy(true)
    try {
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok || !uploadJson.files?.[0]?.url) {
        alert(uploadJson.message ?? "Gagal upload file")
        return
      }
      await patchDtf({
        action: "update_files",
        [field]: uploadJson.files[0].url,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="neo-card mb-6 space-y-4 border border-orange-500/20 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-white">Alur DTF</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${dtfStatusBadgeClass(item.statusDtf ?? "MENUNGGU_ORDER")}`}
        >
          {labelDtfStatus(item.statusDtf ?? "MENUNGGU_ORDER")}
        </span>
      </div>

      {item.catatanDtf ? (
        <p className="text-sm text-zinc-400">
          <span className="text-zinc-500">Catatan CS:</span> {item.catatanDtf}
        </p>
      ) : null}

      <label className="block text-sm">
        <span className="text-zinc-400">Vendor DTF</span>
        <select
          className="neo-input mt-1 cursor-pointer py-2.5 text-sm [color-scheme:dark]"
          value={selectedVendorId}
          disabled={busy || paymentApproved}
          onChange={async (e) => {
            const next = e.target.value
            setVendorId(next)
            if (next) await patchDtf({ action: "assign_vendor", vendorId: next })
          }}
        >
          <option value="">Pilih vendor</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>

      {item.DtfVendor ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-xs text-zinc-400">
          <p>
            {item.DtfVendor.contact ?? "—"} · {item.DtfVendor.phone ?? "—"}
          </p>
          <p className="mt-1">
            {item.DtfVendor.bankAccount ?? "Rekening belum diisi"}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-zinc-400">File untuk vendor</span>
          <p className="mt-1 text-xs text-zinc-500">
            {`${item.artikelId}-dtf-vendor.{ekstensi}`}
          </p>
          <input
            type="file"
            accept="image/*,.pdf,.cdr"
            disabled={busy || paymentApproved}
            className="neo-input mt-1"
            onChange={(e) =>
              uploadFile("fileDtfVendor", e.target.files, buildDtfVendorUploadFilename)
            }
          />
          {item.fileDtfVendor ? (
            <a
              href={item.fileDtfVendor}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-orange-400 hover:text-orange-300"
            >
              Lihat file vendor
            </a>
          ) : null}
        </label>
        <label className="block text-sm">
          <span className="text-zinc-400">Hasil dari vendor</span>
          <p className="mt-1 text-xs text-zinc-500">
            {`${item.artikelId}-dtf-proof.{ekstensi}`}
          </p>
          <input
            type="file"
            accept="image/*,.pdf"
            disabled={busy || paymentApproved}
            className="neo-input mt-1"
            onChange={(e) =>
              uploadFile("fileDtfProof", e.target.files, buildDtfProofUploadFilename)
            }
          />
          {item.fileDtfProof ? (
            <a
              href={item.fileDtfProof}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-orange-400 hover:text-orange-300"
            >
              Lihat hasil vendor
            </a>
          ) : null}
        </label>
      </div>

      {latestPayment ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-sm">
          <p className="text-zinc-300">
            Request pembayaran: Rp {latestPayment.nominal.toLocaleString("id-ID")}
          </p>
          <p className="text-zinc-500">
            Status: {labelDtfPaymentStatus(latestPayment.status)}
          </p>
        </div>
      ) : null}

      {canSubmitPayment ? (
        <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 p-4">
          <label className="block text-sm">
            <span className="text-zinc-400">Nominal pembayaran vendor (Rp)</span>
            <RupiahInput
              className="neo-input mt-1"
              value={nominal}
              onChange={setNominal}
            />
          </label>
          <BtnPrimary
            className="mt-3"
            disabled={busy}
            onClick={async () => {
              const amount = parseRupiahInput(nominal)
              if (Number.isNaN(amount) || amount <= 0) {
                alert("Nominal tidak valid")
                return
              }
              await patchDtf({
                action: "submit_payment",
                nominal: amount,
                requestedBy: actorName,
              })
            }}
          >
            Ajukan Pembayaran DTF
          </BtnPrimary>
        </div>
      ) : null}

      {paymentApproved ? (
        <p className="text-sm text-emerald-400">
          Pembayaran DTF disetujui — produksi dapat mengambil film saat tahap DTF.
        </p>
      ) : null}
    </div>
  )
}
