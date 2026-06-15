"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { BtnApprove, BtnPrimary, BtnRevisi } from "@/components/ui/buttons"
import {
  parseDesignFiles,
  type DesignQueueItemRecord,
} from "@/lib/cs-antrian-desain"
import { openImageInNewTab } from "@/lib/image-viewer"
import { withCsApiScope } from "@/lib/cs-api-scope"
import { usePollingRefresh } from "@/hooks/use-polling-refresh"
import { formatDateIdShort } from "@/lib/deadline-warning"

type SettingConfirmationItem = DesignQueueItemRecord & {
  FinalOrder?: {
    id: string
    orderNumber: string
    deadline?: string | Date | null
    ProductionPipeline?: {
      id: string
      productionNumber: string
      settingResultFiles?: string | null
      settingSubmittedAt?: string | Date | null
      settingSubmittedBy?: string | null
      settingRejectNote?: string | null
      settingSentToConsumerAt?: string | Date | null
      settingSentToConsumerBy?: string | null
      settingSubmitCount?: number | null
    } | null
  } | null
}

function FileThumbs({
  files,
  emptyLabel,
}: {
  files: { name: string; url: string }[]
  emptyLabel: string
}) {
  if (!files.length) {
    return <p className="text-sm text-zinc-500">{emptyLabel}</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {files.map((file) => (
        <button
          key={file.url || file.name}
          type="button"
          onClick={() => openImageInNewTab(file.url)}
          className="overflow-hidden rounded-lg border border-zinc-700 transition hover:border-orange-500/50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.url}
            alt={file.name}
            className="h-28 w-28 object-cover"
          />
        </button>
      ))}
    </div>
  )
}

function SettingConfirmationCard({
  item,
  onUpdated,
}: {
  item: SettingConfirmationItem
  onUpdated: () => void
}) {
  const [note, setNote] = useState("")
  const [rejectNote, setRejectNote] = useState("")
  const [busy, setBusy] = useState(false)

  const pipeline = item.FinalOrder?.ProductionPipeline
  const pipelineId = pipeline?.id
  const mockupFiles = parseDesignFiles(item.hasilDesain)
  const settingFiles = parseDesignFiles(pipeline?.settingResultFiles)

  async function patchPipeline(
    action:
      | "approve_setting_acc"
      | "reject_setting_acc"
      | "mark_setting_sent_to_consumer"
  ) {
    if (!pipelineId) return
    setBusy(true)
    try {
      const res = await fetch(`/api/production-pipeline/${pipelineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          actorName: item.csNama?.trim() || "CS",
          actorRole: "cs",
          ...(action === "approve_setting_acc"
            ? { note: note.trim() || undefined }
            : { rejectNote: rejectNote.trim() }),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.message ?? "Gagal memperbarui status")
        return
      }
      setNote("")
      setRejectNote("")
      onUpdated()
    } catch {
      alert("Gagal memperbarui status")
    } finally {
      setBusy(false)
    }
  }

  const waitingForConsumer = Boolean(pipeline?.settingSentToConsumerAt)
  const submitCount = pipeline?.settingSubmitCount ?? 0

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-orange-400">
            {item.FinalOrder?.orderNumber ?? item.designId}
          </p>
          <p className="text-sm text-zinc-300">
            {item.namaKonsumen} · {item.namaArtikel}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-amber-500/40 bg-amber-950/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
              Menunggu ACC konsumen
            </span>
            {waitingForConsumer ? (
              <span className="rounded-full border border-sky-500/40 bg-sky-950/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
                Sudah dikirim ke konsumen
              </span>
            ) : null}
            {submitCount > 1 ? (
              <span className="rounded-full border border-zinc-600 bg-zinc-900/80 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-400">
                Pengiriman ke-{submitCount}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {item.artikelId}
            {pipeline?.settingSubmittedBy
              ? ` · dikirim operator: ${pipeline.settingSubmittedBy}`
              : ""}
            {pipeline?.settingSubmittedAt
              ? ` · ${formatDateIdShort(pipeline.settingSubmittedAt)}`
              : ""}
            {waitingForConsumer && pipeline?.settingSentToConsumerBy
              ? ` · ke konsumen oleh: ${pipeline.settingSentToConsumerBy}`
              : ""}
            {waitingForConsumer && pipeline?.settingSentToConsumerAt
              ? ` · ${formatDateIdShort(pipeline.settingSentToConsumerAt)}`
              : ""}
          </p>
          {pipeline?.settingRejectNote ? (
            <p className="mt-2 text-xs text-rose-300/90">
              Catatan revisi sebelumnya: {pipeline.settingRejectNote}
            </p>
          ) : null}
        </div>
        <Link
          href={`/cs/antrian-produksi/${item.id}`}
          className="text-xs font-semibold text-zinc-400 hover:text-orange-400"
        >
          Detail order →
        </Link>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Mockup (hasil desain)
          </p>
          <FileThumbs files={mockupFiles} emptyLabel="Mockup belum tersedia." />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Hasil setting
          </p>
          <FileThumbs
            files={settingFiles}
            emptyLabel="Foto hasil setting belum diunggah."
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-zinc-800/80 pt-4">
        <BtnPrimary
          disabled={busy || !settingFiles.length || waitingForConsumer}
          onClick={() => void patchPipeline("mark_setting_sent_to_consumer")}
        >
          {waitingForConsumer
            ? "Sudah dikirim ke konsumen"
            : "Sudah dikirim ke konsumen (WA)"}
        </BtnPrimary>
        <p className="min-w-[12rem] flex-1 text-xs text-zinc-500">
          {waitingForConsumer
            ? "Menunggu jawaban konsumen. Order tetap di antrian sampai ACC atau revisi."
            : "Tandai setelah foto hasil setting dikirim ke konsumen via WA/email."}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-zinc-800/80 pt-4">
        <label className="block min-w-[12rem] flex-1 text-sm">
          <span className="text-zinc-400">Catatan ACC (opsional)</span>
          <input
            type="text"
            className="neo-input mt-1 w-full"
            placeholder="cth. Konsumen setuju via WA"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <BtnApprove
          disabled={busy || !settingFiles.length}
          onClick={() => void patchPipeline("approve_setting_acc")}
        >
          ACC Konsumen
        </BtnApprove>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block min-w-[12rem] flex-1 text-sm">
          <span className="text-zinc-400">Catatan revisi</span>
          <input
            type="text"
            className="neo-input mt-1 w-full"
            placeholder="Alasan penolakan / revisi untuk operator"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
        </label>
        <BtnRevisi
          disabled={busy || !rejectNote.trim()}
          onClick={() => void patchPipeline("reject_setting_acc")}
        >
          Tolak / Revisi
        </BtnRevisi>
      </div>
    </div>
  )
}

export function SettingConfirmationPanel({
  user,
}: {
  user: { role: string; id?: string; nama?: string }
}) {
  const [items, setItems] = useState<SettingConfirmationItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadItems = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        if (!options?.silent) setLoading(true)
        const res = await fetch(
          withCsApiScope("/api/cs/konfirmasi-setting", user),
          { cache: "no-store" }
        )
        const data = await res.json()
        setItems(Array.isArray(data) ? data : [])
      } catch {
        setItems([])
      } finally {
        if (!options?.silent) setLoading(false)
      }
    },
    [user]
  )

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  usePollingRefresh(
    useCallback(() => {
      void loadItems({ silent: true })
    }, [loadItems])
  )

  if (loading) {
    return (
      <div className="neo-card mb-6 p-5">
        <p className="text-sm text-zinc-500">Memuat konfirmasi hasil setting…</p>
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <div className="neo-card mb-6 p-5 md:p-6">
      <h2 className="text-lg font-semibold text-white">
        Konfirmasi hasil setting
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        Bandingkan mockup dengan hasil setting. Kirim foto ke konsumen (WA/email),
        tandai sudah dikirim, lalu tunggu jawaban. Proses berlanjut ke layout hanya
        setelah ACC konsumen — atau tolak agar operator setting ulang.
      </p>
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <SettingConfirmationCard
            key={item.id}
            item={item}
            onUpdated={() => void loadItems({ silent: true })}
          />
        ))}
      </div>
    </div>
  )
}
