"use client"

import { useEffect, useState } from "react"
import { BtnGhost, BtnPrimary } from "@/components/ui/buttons"
import {
  getReworkPartsForOrder,
  REWORK_GARMENT_PART_LABELS,
  type ReworkGarmentPartCode,
} from "@/lib/rework-garment-parts"
import {
  REWORK_REQUEST_TYPE_LABELS,
  type ReworkRequestTypeCode,
} from "@/lib/rework-request"

type ReworkRequestModalProps = {
  open: boolean
  orderNumber: string
  jenisOrder?: string | null
  onClose: () => void
  onSubmit: (payload: {
    reason: string
    requestType?: ReworkRequestTypeCode
    affectedParts: ReworkGarmentPartCode[]
  }) => Promise<void>
}

export function ReworkRequestModal({
  open,
  orderNumber,
  jenisOrder,
  onClose,
  onSubmit,
}: ReworkRequestModalProps) {
  const [reason, setReason] = useState("")
  const [requestType, setRequestType] = useState<ReworkRequestTypeCode | "">("")
  const [selectedParts, setSelectedParts] = useState<ReworkGarmentPartCode[]>([])
  const [busy, setBusy] = useState(false)

  const availableParts = getReworkPartsForOrder(jenisOrder)

  useEffect(() => {
    if (!open) return
    setSelectedParts([])
    setReason("")
    setRequestType("")
  }, [open, jenisOrder])

  if (!open) return null

  function togglePart(code: ReworkGarmentPartCode) {
    setSelectedParts((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    )
  }

  async function handleSubmit() {
    if (!selectedParts.length) {
      alert("Pilih minimal satu bagian yang perlu di-print ulang")
      return
    }
    if (!reason.trim()) {
      alert("Alasan wajib diisi")
      return
    }
    setBusy(true)
    try {
      await onSubmit({
        reason: reason.trim(),
        requestType: requestType || undefined,
        affectedParts: selectedParts,
      })
      setReason("")
      setRequestType("")
      setSelectedParts([])
      onClose()
    } catch {
      alert("Gagal mengajukan request")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="neo-card max-h-[90vh] w-full max-w-md overflow-y-auto p-5">
        <h3 className="text-lg font-semibold text-white">
          Ajukan request ke Admin
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Order <span className="text-orange-400">{orderNumber}</span> — pilih
          bagian yang perlu di-print ulang.
        </p>

        <fieldset className="mt-4">
          <legend className="text-sm text-zinc-400">
            Bagian print ulang <span className="text-orange-400">*</span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableParts.map((code) => {
              const active = selectedParts.includes(code)
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => togglePart(code)}
                  className={
                    active
                      ? "rounded-lg border border-orange-500/60 bg-orange-950/40 px-3 py-1.5 text-sm font-medium text-orange-200"
                      : "rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-600"
                  }
                >
                  {REWORK_GARMENT_PART_LABELS[code]}
                </button>
              )
            })}
          </div>
        </fieldset>

        <label className="mt-4 block text-sm">
          <span className="text-zinc-400">Jenis masalah</span>
          <select
            className="neo-input mt-1 w-full"
            value={requestType}
            onChange={(e) =>
              setRequestType(e.target.value as ReworkRequestTypeCode | "")
            }
          >
            <option value="">— Pilih (opsional) —</option>
            {Object.entries(REWORK_REQUEST_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-sm">
          <span className="text-zinc-400">
            Alasan / keterangan <span className="text-orange-400">*</span>
          </span>
          <textarea
            className="neo-input mt-1 min-h-[100px] w-full resize-y"
            placeholder="Jelaskan kekurangan atau kegagalan produksi..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <BtnGhost disabled={busy} onClick={onClose}>
            Batal
          </BtnGhost>
          <BtnPrimary disabled={busy} onClick={() => void handleSubmit()}>
            {busy ? "Mengirim…" : "Kirim ke Admin"}
          </BtnPrimary>
        </div>
      </div>
    </div>
  )
}
