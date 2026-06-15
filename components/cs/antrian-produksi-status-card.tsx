"use client"

import {
  csAntrianProduksiProgressLabel,
  csProduksiProgressBadgeClass,
  type CsAntrianProduksiFinalOrder,
} from "@/lib/cs-antrian-produksi"
import { resolveProductionUpdatedAt } from "@/lib/production-status-display"
import {
  labelDeliveryStatus,
  labelPaymentStatus,
  labelProductionStatus,
  labelShipReleaseStatus,
} from "@/lib/status-labels"
import type { DesignQueueItemRecord } from "@/lib/cs-antrian-desain"
import { JenisProduksiBadge } from "@/components/production/jenis-produksi-badge"
import { QueueIdentifierBadges } from "@/components/cs/queue-identifier-badges"

type AntrianProduksiStatusCardProps = {
  item: DesignQueueItemRecord & {
    FinalOrder?: CsAntrianProduksiFinalOrder | null
  }
}

export function AntrianProduksiStatusCard({ item }: AntrianProduksiStatusCardProps) {
  const progress = csAntrianProduksiProgressLabel(item)
  const payment =
    item.FinalOrder?.AccountingTransaction?.paymentStatus ?? null
  const pipeline = item.FinalOrder?.ProductionPipeline
  const jenisProduksi = item.FinalOrder?.jenisProduksi ?? item.jenisProduksi
  const expressPriority =
    item.FinalOrder?.expressPriority ?? item.expressPriority
  const deliveryStatus = item.FinalOrder?.deliveryStatus
  const lastUpdated = resolveProductionUpdatedAt(
    item.updatedAt,
    pipeline?.updatedAt
  )

  return (
    <div className="neo-card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Status produksi
          </p>
          <p className="mt-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${csProduksiProgressBadgeClass(progress.tone)}`}
            >
              {progress.primary}
            </span>
          </p>
          {progress.secondary ? (
            <p className="mt-2 text-sm text-zinc-400">{progress.secondary}</p>
          ) : null}
          <div className="mt-3">
            <JenisProduksiBadge
              jenisProduksi={jenisProduksi}
              expressPriority={expressPriority}
            />
          </div>
        </div>
        <QueueIdentifierBadges
          orderNumber={item.FinalOrder?.orderNumber}
          sppNumber={item.sppNumber}
          artikelId={item.artikelId}
          namaArtikel={item.namaArtikel}
          designId={item.designId}
          variant="card"
        />
      </div>

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 md:grid-cols-4">
        <div>
          <dt className="text-xs text-zinc-500">Pembayaran</dt>
          <dd className="mt-1 font-medium text-zinc-200">
            {payment ? labelPaymentStatus(payment) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Tahap produksi</dt>
          <dd className="mt-1 font-medium text-zinc-200">
            {pipeline?.productionNumber
              ? `${pipeline.productionNumber}`
              : "Belum masuk pipeline"}
          </dd>
          {pipeline?.currentStatus ? (
            <dd className="mt-0.5 text-xs text-zinc-500">
              Tahap: {labelProductionStatus(pipeline.currentStatus)}
            </dd>
          ) : null}
          {deliveryStatus ? (
            <dd className="mt-0.5 text-xs text-zinc-500">
              Pengiriman: {labelDeliveryStatus(deliveryStatus)}
            </dd>
          ) : null}
          {pipeline?.shipReleaseStatus &&
          pipeline.shipReleaseStatus !== "NONE" ? (
            <dd className="mt-0.5 text-xs text-zinc-500">
              Izin kirim: {labelShipReleaseStatus(pipeline.shipReleaseStatus)}
            </dd>
          ) : null}
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Terakhir diperbarui</dt>
          <dd className="mt-1 font-medium text-zinc-300">
            {lastUpdated
              ? lastUpdated.toLocaleString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Konsumen</dt>
          <dd className="mt-1 font-medium text-zinc-100">{item.namaKonsumen}</dd>
          {item.noTelepon ? (
            <dd className="mt-0.5 text-xs text-zinc-500">{item.noTelepon}</dd>
          ) : null}
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Artikel</dt>
          <dd className="mt-1 font-medium text-zinc-200">{item.namaArtikel}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">CS</dt>
          <dd className="mt-1 text-zinc-300">{item.csNama}</dd>
        </div>
        <div className="sm:col-span-2 md:col-span-4">
          <dt className="text-xs text-zinc-500">Alamat pengiriman</dt>
          <dd className="mt-1 whitespace-pre-wrap text-zinc-300">
            {item.alamatPengiriman?.trim() || (
              <span className="text-zinc-500">—</span>
            )}
          </dd>
        </div>
      </dl>

      <p className="mt-4 rounded-xl border border-zinc-700/80 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-400">
        Halaman ini hanya untuk pantauan. Validasi DP dilakukan Admin Keuangan;
        persetujuan SPP dan pipeline oleh Admin Produksi.
      </p>
    </div>
  )
}
