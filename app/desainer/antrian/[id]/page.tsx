"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import DesignPreviewPair from "@/components/cs/design-preview-pair"
import { DtfWorkflowPanel, type DtfItemState } from "@/components/dtf/dtf-panels"
import { DesignQueueNotesSection } from "@/components/cs/design-queue-notes-section"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnPrimary } from "@/components/ui/buttons"
import { readStoredUser } from "@/lib/auth"
import { useAuthGuard } from "@/hooks/use-auth-guard"
import {
  canDesignerKirimKeCs,
  canDesignerUploadHasilDesainWithContext,
  isDesignerAwaitingCsAcc,
  isDesignerRevisionRequested,
} from "@/lib/designer-antrian"
import {
  parseDesignFiles,
  serializeDesignFiles,
  statusBadgeClass,
  statusLabel,
  type DesignQueueItemRecord,
} from "@/lib/cs-antrian-desain"
import type { DesignQueueMessageRecord } from "@/lib/design-queue-notes"

type DesainerDetailItem = DesignQueueItemRecord &
  DtfItemState & {
  messages?: DesignQueueMessageRecord[]
  returnedToCsAt?: string | Date | null
}

function desainerSenderNameFromStorage(): string {
  const user = readStoredUser()
  if (!user) return "Desainer"
  if (user.nama?.trim()) return user.nama.trim()
  if (user.username?.trim()) return user.username.trim()
  return "Desainer"
}

export default function DesainerAntrianDetailPage() {
  const auth = useAuthGuard({ roles: ["desainer", "owner"] })
  const params = useParams()
  const id = params.id as string
  const [item, setItem] = useState<DesainerDetailItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [processing, setProcessing] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/design-queue/${id}`, { cache: "no-store" })
    if (!res.ok) {
      setItem(null)
      setLoading(false)
      return
    }
    setItem(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    if (auth.status !== "authenticated") return

    queueMicrotask(() => {
      void load()
    })

    function onFocus() {
      void load()
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [auth.status, id])

  async function uploadHasil(files: FileList | null) {
    if (!files?.length || !item) return
    setUploading(true)
    try {
      const formData = new FormData()
      for (const file of Array.from(files)) {
        formData.append("files", file)
      }
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      const uploadJson = (await uploadRes.json()) as {
        files?: { name: string; url: string }[]
        message?: string
      }
      if (!uploadRes.ok || !uploadJson.files?.length) {
        alert(uploadJson.message ?? "Gagal upload")
        return
      }
      const patchRes = await fetch(`/api/design-queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasilDesain: serializeDesignFiles(uploadJson.files),
        }),
      })
      if (!patchRes.ok) {
        const patchJson = (await patchRes.json().catch(() => null)) as {
          message?: string
        } | null
        alert(patchJson?.message ?? "Gagal menyimpan hasil desain")
        return
      }
      setItem(await patchRes.json())
    } finally {
      setUploading(false)
    }
  }

  async function kirimKeCs() {
    if (!item || !canDesignerKirimKeCs(item.statusDesain, item.hasilDesain)) return
    setSending(true)
    try {
      const res = await fetch(`/api/design-queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "kirim_ke_cs" }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { message?: string } | null
        alert(json?.message ?? "Gagal mengirim ke CS")
        return
      }
      await load()
    } finally {
      setSending(false)
    }
  }

  async function mulaiProses() {
    setProcessing(true)
    try {
      const res = await fetch(`/api/design-queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mulai_proses" }),
      })
      if (!res.ok) {
        alert("Gagal memulai proses")
        return
      }
      await load()
    } finally {
      setProcessing(false)
    }
  }

  if (auth.status === "loading" || loading) {
    return (
      <AppShell>
        <AppShellLoading />
      </AppShell>
    )
  }

  if (!item) {
    return (
      <AppShell>
        <div className="neo-card p-8 text-center text-zinc-500">Item tidak ditemukan.</div>
      </AppShell>
    )
  }

  const hasHasilDesain = parseDesignFiles(item.hasilDesain).length > 0
  const canKirimKeCs = canDesignerKirimKeCs(item.statusDesain, item.hasilDesain)
  const canUploadHasil = canDesignerUploadHasilDesainWithContext(item.statusDesain, {
    returnedToCsAt: item.returnedToCsAt,
    messages: item.messages,
  })
  const awaitingCsAcc = isDesignerAwaitingCsAcc(item.statusDesain)
  const revisionRequested = isDesignerRevisionRequested(item.statusDesain)
  const showMulaiProses = item.statusDesain === "MENUNGGU"
  const busy = uploading || sending || processing

  return (
    <AppShell>
      <PageHeader
        badge="Desainer"
        title={item.artikelId}
        description={`${item.designId} · ${item.namaKonsumen}`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(item.statusDesain)}`}
        >
          {statusLabel(item.statusDesain)}
        </span>
        {awaitingCsAcc ? (
          <span className="text-sm text-amber-300">
            Sudah dikirim ke CS — menunggu ACC konsumen.
          </span>
        ) : null}
        {revisionRequested ? (
          <span className="text-sm text-red-300">
            CS meminta revisi — unggah hasil baru lalu kirim ulang ke CS.
          </span>
        ) : awaitingCsAcc && canUploadHasil ? (
          <span className="text-sm text-orange-300">
            CS mengirim catatan — unggah ulang hasil desain jika diminta revisi.
          </span>
        ) : null}
      </div>

      <div className="mb-6">
        <DesignPreviewPair
          item={item}
          hasilDropzone={
            canUploadHasil
              ? {
                  onFiles: (files) => uploadHasil(files),
                  uploading,
                  accept: "image/*",
                }
              : undefined
          }
        />
      </div>

      <DtfWorkflowPanel
        item={item}
        actorName={desainerSenderNameFromStorage()}
        onUpdated={(next) => setItem((prev) => (prev ? { ...prev, ...next } : prev))}
      />

      <div className="mb-6">
        <DesignQueueNotesSection
          itemId={item.id}
          messages={item.messages ?? []}
          senderRole="DESAINER"
          senderName={desainerSenderNameFromStorage()}
          onMessagesUpdated={(messages) =>
            setItem((prev) => (prev ? { ...prev, messages } : prev))
          }
        />
      </div>

      <div className="neo-card space-y-4 p-5">
        <p className="text-sm text-zinc-400">{item.materiDesain}</p>

        {canUploadHasil ? (
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Unggah hasil desain (atau seret ke kotak Hasil Desain di atas)
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              disabled={busy}
              onChange={(e) => uploadHasil(e.target.files)}
              className="neo-input"
            />
            {uploading ? (
              <p className="mt-2 text-sm text-orange-400">Mengunggah…</p>
            ) : null}
          </div>
        ) : null}

        {canKirimKeCs ? (
          <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 p-4">
            <p className="mb-3 text-sm text-zinc-300">
              Hasil desain sudah siap. Kirim ke CS agar bisa ditunjukkan ke konsumen untuk
              ACC.
            </p>
            <BtnPrimary disabled={busy} onClick={kirimKeCs}>
              {sending ? "Mengirim ke CS…" : "Selesai & Kirim ke CS"}
            </BtnPrimary>
          </div>
        ) : null}

        {!canKirimKeCs && canUploadHasil && !hasHasilDesain ? (
          <p className="text-sm text-zinc-500">
            Unggah hasil desain terlebih dahulu, lalu kirim ke CS.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {showMulaiProses ? (
            <BtnPrimary disabled={busy} onClick={mulaiProses}>
              {processing ? "Memproses…" : "Mulai proses"}
            </BtnPrimary>
          ) : null}
          <Link
            href="/desainer/antrian"
            className="neo-btn-secondary inline-flex items-center px-4 py-2 text-sm"
          >
            ← Antrian
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
