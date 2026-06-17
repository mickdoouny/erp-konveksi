"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import DesignPreviewPair from "@/components/cs/design-preview-pair"
import { DesignQueueNotesSection } from "@/components/cs/design-queue-notes-section"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnPrimary } from "@/components/ui/buttons"
import { readStoredUser } from "@/lib/auth"
import { useAuthGuard } from "@/hooks/use-auth-guard"
import {
  canDesignerKirimKeCs,
  canDesignerUploadHasilDesainWithContext,
  designerUploadBlockedReason,
  hasCsRevisionNoteAfterSend,
  isDesignerAwaitingCsAcc,
  isDesignerRevisionRequested,
} from "@/lib/designer-antrian"
import {
  isDesignImageFile,
  mergeDesignFiles,
  parseDesignFiles,
  serializeDesignFiles,
  statusBadgeClass,
  statusLabel,
  type DesignFile,
  type DesignQueueItemRecord,
} from "@/lib/cs-antrian-desain"
import type { DesignQueueMessageRecord } from "@/lib/design-queue-notes"

type DesainerDetailItem = DesignQueueItemRecord & {
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
  const [removingUrl, setRemovingUrl] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState<{
    kind: "error" | "success"
    message: string
  } | null>(null)
  const uploadFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const hasilFileInputRef = useRef<HTMLInputElement>(null)
  const pickingFileRef = useRef(false)

  function showUploadFeedback(
    kind: "error" | "success",
    message: string
  ) {
    if (uploadFeedbackTimerRef.current) {
      clearTimeout(uploadFeedbackTimerRef.current)
    }
    setUploadFeedback({ kind, message })
    uploadFeedbackTimerRef.current = setTimeout(() => {
      setUploadFeedback(null)
      uploadFeedbackTimerRef.current = null
    }, 6000)
  }

  useEffect(() => {
    return () => {
      if (uploadFeedbackTimerRef.current) {
        clearTimeout(uploadFeedbackTimerRef.current)
      }
    }
  }, [])

  async function load(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false
    if (!silent) setLoading(true)
    const res = await fetch(`/api/design-queue/${id}`, { cache: "no-store" })
    if (!res.ok) {
      setItem(null)
      if (!silent) setLoading(false)
      return
    }
    setItem(await res.json())
    if (!silent) setLoading(false)
  }

  function openHasilFilePicker() {
    if (uploading || removingUrl !== null || sending || processing) return
    pickingFileRef.current = true
    hasilFileInputRef.current?.click()
  }

  function handleHasilFileInputChange(files: FileList | null) {
    pickingFileRef.current = false
    const snapshot = files?.length ? Array.from(files) : []
    if (hasilFileInputRef.current) {
      hasilFileInputRef.current.value = ""
    }
    void uploadHasil(snapshot)
  }

  useEffect(() => {
    if (auth.status !== "authenticated") {
      if (auth.status !== "loading") {
        setLoading(false)
      }
      return
    }

    queueMicrotask(() => {
      void load()
    })

    function onFocus() {
      if (pickingFileRef.current) return
      void load({ silent: true })
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [auth.status, id])

  async function uploadHasil(files: FileList | File[] | null) {
    pickingFileRef.current = false
    if (!item) {
      showUploadFeedback("error", "Data antrian belum siap — muat ulang halaman.")
      return
    }
    const fileArray = files
      ? Array.isArray(files)
        ? files
        : Array.from(files)
      : []
    if (!fileArray.length) {
      showUploadFeedback(
        "error",
        "Tidak ada file terdeteksi setelah memilih dari galeri. Coba file lain atau format PNG/JPG."
      )
      return
    }

    const imageFiles = fileArray.filter(isDesignImageFile)
    if (!imageFiles.length) {
      showUploadFeedback(
        "error",
        "Hanya file gambar yang didukung (PNG, JPG, GIF, WebP, HEIC, dll.)"
      )
      return
    }

    setUploadFeedback(null)
    setUploading(true)
    try {
      const formData = new FormData()
      for (const file of imageFiles) {
        formData.append("files", file)
      }
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      const uploadJson = (await uploadRes.json().catch(() => null)) as {
        files?: { name: string; url: string }[]
        message?: string
      } | null
      if (!uploadRes.ok || !uploadJson?.files?.length) {
        showUploadFeedback(
          "error",
          uploadJson?.message ?? "Gagal upload — coba lagi atau pilih file lain"
        )
        return
      }
      const merged = mergeDesignFiles(
        parseDesignFiles(item.hasilDesain),
        uploadJson.files
      )
      const patchRes = await fetch(`/api/design-queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasilDesain: serializeDesignFiles(merged),
        }),
      })
      if (!patchRes.ok) {
        const patchJson = (await patchRes.json().catch(() => null)) as {
          message?: string
        } | null
        showUploadFeedback(
          "error",
          patchJson?.message ?? "Gagal menyimpan hasil desain ke antrian"
        )
        return
      }
      const patchJson = (await patchRes.json()) as DesainerDetailItem
      const savedHasilDesain =
        typeof patchJson.hasilDesain === "string" && patchJson.hasilDesain.trim()
          ? patchJson.hasilDesain
          : serializeDesignFiles(merged)
      setItem((prev) =>
        prev
          ? {
              ...prev,
              ...patchJson,
              hasilDesain: savedHasilDesain,
            }
          : { ...patchJson, hasilDesain: savedHasilDesain }
      )
      showUploadFeedback("success", "Hasil desain berhasil diunggah")
    } catch {
      showUploadFeedback(
        "error",
        "Terjadi kesalahan saat mengunggah. Periksa koneksi lalu coba lagi."
      )
    } finally {
      setUploading(false)
    }
  }

  async function removeHasilDesain(file: DesignFile) {
    if (!item) return
    if (
      !canDesignerUploadHasilDesainWithContext(item.statusDesain, {
        returnedToCsAt: item.returnedToCsAt,
        messages: item.messages,
      })
    ) {
      return
    }

    setUploadFeedback(null)
    setRemovingUrl(file.url)
    try {
      const next = parseDesignFiles(item.hasilDesain).filter(
        (entry) => entry.url !== file.url
      )
      const patchRes = await fetch(`/api/design-queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasilDesain: serializeDesignFiles(next),
        }),
      })
      if (!patchRes.ok) {
        const patchJson = (await patchRes.json().catch(() => null)) as {
          message?: string
        } | null
        showUploadFeedback(
          "error",
          patchJson?.message ?? "Gagal menghapus hasil desain dari antrian"
        )
        return
      }
      setItem(await patchRes.json())
      showUploadFeedback("success", "Hasil desain berhasil dihapus")
    } catch {
      showUploadFeedback(
        "error",
        "Terjadi kesalahan saat menghapus. Periksa koneksi lalu coba lagi."
      )
    } finally {
      setRemovingUrl(null)
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
  const uploadContext = {
    returnedToCsAt: item.returnedToCsAt,
    messages: item.messages,
  }
  const canUploadHasil = canDesignerUploadHasilDesainWithContext(
    item.statusDesain,
    uploadContext
  )
  const uploadBlockedReason = designerUploadBlockedReason(
    item.statusDesain,
    uploadContext
  )
  const awaitingCsAcc = isDesignerAwaitingCsAcc(item.statusDesain)
  const revisionRequested = isDesignerRevisionRequested(item.statusDesain)
  const showMulaiProses = item.statusDesain === "MENUNGGU"
  const busy = uploading || removingUrl !== null || sending || processing

  return (
    <AppShell>
      <div className="min-w-0 w-full">
      <PageHeader
        badge="Desainer"
        title={item.artikelId}
        description={`${item.designId} · ${item.namaKonsumen}`}
      />

      {uploadFeedback ? (
        <p
          role="alert"
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            uploadFeedback.kind === "success"
              ? "border-emerald-500/35 bg-emerald-950/30 text-emerald-100/95"
              : "border-red-500/40 bg-red-950/25 text-red-100/95"
          }`}
        >
          {uploadFeedback.message}
        </p>
      ) : null}

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
        ) : awaitingCsAcc && hasCsRevisionNoteAfterSend(uploadContext) ? (
          <span className="text-sm text-orange-300">
            CS mengirim catatan — unggah ulang hasil desain jika diminta revisi.
          </span>
        ) : null}
      </div>

      {canUploadHasil ? (
        <div className="mb-4">
          <input
            ref={hasilFileInputRef}
            type="file"
            multiple
            accept="image/*"
            disabled={busy}
            className="sr-only"
            onChange={(e) => handleHasilFileInputChange(e.target.files)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={openHasilFilePicker}
            className="w-full rounded-2xl border border-orange-500/50 bg-orange-600 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-orange-950/40 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Mengunggah…" : "Pilih file dari galeri / komputer"}
          </button>
          <p className="mt-2 text-center text-xs text-zinc-500">
            Di HP: gunakan tombol ini (utama). Di PC: bisa seret gambar ke kolom
            kanan jika muncul &quot;Dropzone aktif&quot;.
          </p>
        </div>
      ) : null}

      <div className="mb-6">
        <DesignPreviewPair
          item={item}
          hasilDropzone={
            canUploadHasil
              ? {
                  onFiles: (files) => uploadHasil(files),
                  uploading,
                  accept: "image/*",
                  onRemoveFile: removeHasilDesain,
                  removingUrl,
                  onOpenFilePicker: () => {
                    pickingFileRef.current = true
                  },
                  onFeedback: (message) =>
                    showUploadFeedback("error", message),
                }
              : undefined
          }
          hasilUploadBlockedReason={uploadBlockedReason}
        />
      </div>

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

      <div className="neo-card w-full min-w-0 space-y-4 p-4 sm:p-5">
        <p className="text-sm text-zinc-400">{item.materiDesain}</p>

        {canUploadHasil ? (
          <p className="text-sm text-zinc-500">
            Unggah hasil desain lewat tombol oranye di atas atau area dropzone
            kolom kanan.
          </p>
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
      </div>
    </AppShell>
  )
}
