"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import DesignPreviewPair from "@/components/cs/design-preview-pair"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { validateCdrFilename } from "@/lib/cdr-filename"
import {
  hasProductionDesignFile,
  parseDesignFiles,
  serializeDesignFiles,
  statusBadgeClass,
  statusLabel,
  type DesignQueueItemRecord,
} from "@/lib/cs-antrian-desain"
import { isDesignerApprovedStatus } from "@/lib/designer-antrian"
import { buildCdrUploadFilename } from "@/lib/upload-filename"
import { useAuthGuard } from "@/hooks/use-auth-guard"

export default function DesainerAntrianDisetujuiDetailPage() {
  const auth = useAuthGuard({ roles: ["desainer", "owner"] })
  const params = useParams()
  const id = params.id as string
  const [item, setItem] = useState<DesignQueueItemRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState<{
    kind: "error" | "success"
    message: string
  } | null>(null)
  const cdrFileInputRef = useRef<HTMLInputElement>(null)
  const pickingFileRef = useRef(false)

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

  useEffect(() => {
    if (auth.status !== "authenticated") return
    void load()
  }, [auth.status, id])

  function openCdrFilePicker() {
    if (uploading) return
    pickingFileRef.current = true
    cdrFileInputRef.current?.click()
  }

  function handleCdrFileInputChange(files: FileList | null) {
    pickingFileRef.current = false
    const file = files?.[0] ?? null
    if (cdrFileInputRef.current) {
      cdrFileInputRef.current.value = ""
    }
    void uploadCdr(file)
  }

  async function uploadCdr(file: File | null) {
    if (!file || !item) {
      setUploadFeedback({
        kind: "error",
        message: "Tidak ada file terdeteksi. Pilih file .cdr lalu coba lagi.",
      })
      return
    }

    const validation = validateCdrFilename(item.artikelId, file.name)
    if (!validation.ok) {
      setUploadFeedback({ kind: "error", message: validation.message })
      return
    }

    setUploadFeedback(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("files", file)
      formData.append("saveAs", buildCdrUploadFilename(item.artikelId))
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      const uploadJson = (await uploadRes.json().catch(() => null)) as {
        files?: { name: string; url: string }[]
        message?: string
      } | null
      if (!uploadRes.ok || !uploadJson?.files?.length) {
        setUploadFeedback({
          kind: "error",
          message: uploadJson?.message ?? "Gagal upload CDR — coba lagi.",
        })
        return
      }

      const patchRes = await fetch(`/api/design-queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload_production_file",
          filename: file.name,
          fileDesainProduksi: serializeDesignFiles(uploadJson.files),
        }),
      })
      if (!patchRes.ok) {
        const patchJson = (await patchRes.json().catch(() => null)) as {
          message?: string
        } | null
        setUploadFeedback({
          kind: "error",
          message: patchJson?.message ?? "Gagal menyimpan CDR ke antrian.",
        })
        return
      }

      const patchJson = (await patchRes.json()) as DesignQueueItemRecord
      setItem((prev) => (prev ? { ...prev, ...patchJson } : patchJson))
      setUploadFeedback({
        kind: "success",
        message: "CDR produksi berhasil diunggah. CS dapat melanjutkan input order.",
      })
    } catch {
      setUploadFeedback({
        kind: "error",
        message: "Terjadi kesalahan saat mengunggah. Periksa koneksi lalu coba lagi.",
      })
    } finally {
      setUploading(false)
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

  const hasCdr = hasProductionDesignFile(item)
  const cdrFiles = parseDesignFiles(item.fileDesainProduksi)
  const canUploadCdr = isDesignerApprovedStatus(item.statusDesain)
  const busy = uploading

  return (
    <AppShell>
      <div className="min-w-0 w-full">
      <PageHeader
        badge="Desainer"
        title={`CDR ${item.artikelId}`}
        description={`File wajib: ${item.artikelId}.cdr`}
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
        {hasCdr ? (
          <span className="text-sm text-emerald-300">CDR produksi sudah tersimpan.</span>
        ) : (
          <span className="text-sm text-amber-300">Belum ada file CDR produksi.</span>
        )}
      </div>

      {canUploadCdr ? (
        <div className="mb-4">
          <input
            ref={cdrFileInputRef}
            type="file"
            accept=".cdr"
            disabled={busy}
            className="sr-only"
            onChange={(e) => handleCdrFileInputChange(e.target.files)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={openCdrFilePicker}
            className="w-full rounded-2xl border border-orange-500/50 bg-orange-600 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-orange-950/40 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Mengunggah CDR…" : hasCdr ? "Ganti file CDR" : "Pilih file CDR (.cdr)"}
          </button>
          <p className="mt-2 text-center text-xs text-zinc-500">
            Nama file harus persis {item.artikelId}.cdr
          </p>
        </div>
      ) : (
        <p className="mb-4 text-sm text-zinc-500">
          Unggah CDR tidak tersedia pada status ini.
        </p>
      )}

      <div className="mb-6">
        <DesignPreviewPair item={item} />
      </div>

      <div className="neo-card w-full min-w-0 space-y-4 p-4 sm:p-5">
        <p className="text-sm text-zinc-400">
          Setelah CDR diunggah, CS dapat melanjutkan input order di antrian desain.
        </p>

        {hasCdr ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
            <p className="mb-3 text-sm text-zinc-300">
              CDR produksi sudah siap. CS akan melihat tombol Input order setelah file
              tersimpan.
            </p>
            {cdrFiles[0]?.url ? (
              <a
                href={cdrFiles[0].url}
                target="_blank"
                rel="noreferrer"
                className="mb-3 inline-block text-sm text-orange-400 hover:text-orange-300"
              >
                Lihat file CDR
              </a>
            ) : null}
            <div>
              <Link
                href="/desainer/antrian-disetujui"
                className="neo-btn-primary inline-flex items-center px-4 py-2 text-sm font-semibold"
              >
                Selesai — kembali ke antrian
              </Link>
            </div>
          </div>
        ) : canUploadCdr ? (
          <p className="text-sm text-zinc-500">
            Pilih file CDR lewat tombol oranye di atas, lalu lanjutkan ke antrian setelah
            unggah berhasil.
          </p>
        ) : null}

        <Link
          href="/desainer/antrian-disetujui"
          className="neo-btn-secondary inline-flex items-center px-4 py-2 text-sm"
        >
          ← Antrian disetujui
        </Link>
      </div>
      </div>
    </AppShell>
  )
}
