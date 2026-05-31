"use client"

import { BtnGhost } from "@/components/ui/buttons"
import {
  csAntrianDesainDetailGuidance,
  labelCsAntrianDesainStatus,
  statusBadgeClass,
  type CsAntrianDesainDetailGuidance,
  type DesignQueueItemRecord,
} from "@/lib/cs-antrian-desain"

type AntrianDesainDetailStatusCardProps = {
  item: DesignQueueItemRecord & {
    FinalOrder?: {
      AccountingTransaction?: { paymentStatus: string } | null
    } | null
  }
  canEditKonsumen?: boolean
  editKonsumenDisabledTitle?: string
  onEditKonsumen?: () => void
}

const guidanceClass: Record<CsAntrianDesainDetailGuidance["variant"], string> =
  {
    info: "border-sky-500/30 bg-sky-950/25 text-sky-100/90",
    success: "border-emerald-500/30 bg-emerald-950/25 text-emerald-100/90",
    warning: "border-amber-500/30 bg-amber-950/25 text-amber-100/90",
  }

export function AntrianDesainDetailStatusCard({
  item,
  canEditKonsumen = false,
  editKonsumenDisabledTitle,
  onEditKonsumen,
}: AntrianDesainDetailStatusCardProps) {
  const paymentStatus =
    item.FinalOrder?.AccountingTransaction?.paymentStatus ?? null

  const statusText = labelCsAntrianDesainStatus(
    item.statusDesain,
    item.revisionCount,
    paymentStatus
  )

  const guidance = csAntrianDesainDetailGuidance(
    item.statusDesain,
    item.revisionCount,
    item.fileDesainProduksi,
    paymentStatus
  )

  return (
    <div className="neo-card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Status &amp; progres
          </p>
          <p className="mt-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(item.statusDesain, paymentStatus)}`}
            >
              {statusText}
            </span>
          </p>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <p>{item.designId}</p>
          <p className="mt-0.5">{item.artikelId}</p>
          {item.sppGroupId ? (
            <p className="mt-1 font-mono text-zinc-400">Grup: {item.sppGroupId}</p>
          ) : null}
        </div>
      </div>

      {guidance ? (
        <p
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${guidanceClass[guidance.variant]}`}
        >
          {guidance.message}
        </p>
      ) : null}

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 md:grid-cols-3">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-xs text-zinc-500">Konsumen</dt>
            {onEditKonsumen ? (
              <BtnGhost
                type="button"
                className="h-7 px-2.5 text-xs"
                onClick={onEditKonsumen}
                disabled={!canEditKonsumen}
                title={
                  canEditKonsumen
                    ? "Edit informasi konsumen"
                    : editKonsumenDisabledTitle
                }
              >
                Edit
              </BtnGhost>
            ) : null}
          </div>
          <dd className="mt-1 font-medium text-zinc-100">{item.namaKonsumen}</dd>
          {item.noTelepon ? (
            <dd className="mt-0.5 text-xs text-zinc-500">{item.noTelepon}</dd>
          ) : null}
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Artikel</dt>
          <dd className="mt-1 font-medium text-zinc-200">{item.namaArtikel}</dd>
          {item.sppNumber ? (
            <dd className="mt-0.5 text-xs text-zinc-500">SPP: {item.sppNumber}</dd>
          ) : null}
        </div>
        <div>
          <dt className="text-xs text-zinc-500">CS</dt>
          <dd className="mt-1 text-zinc-300">{item.csNama}</dd>
        </div>
        <div className="sm:col-span-2 md:col-span-3">
          <dt className="text-xs text-zinc-500">Alamat pengiriman</dt>
          <dd className="mt-1 whitespace-pre-wrap text-zinc-300">
            {item.alamatPengiriman?.trim() || (
              <span className="text-zinc-500">Belum diisi</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}
