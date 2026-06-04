"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import DesignPreviewPair from "@/components/cs/design-preview-pair"
import { DtfWorkflowPanel, type DtfItemState } from "@/components/dtf/dtf-panels"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { validateCdrFilename } from "@/lib/cdr-filename"
import { buildCdrUploadFilename } from "@/lib/upload-filename"
import { useAuthGuard } from "@/hooks/use-auth-guard"
import {
  serializeDesignFiles,
  type DesignQueueItemRecord,
} from "@/lib/cs-antrian-desain"

export default function DesainerAntrianDisetujuiDetailPage() {
  const auth = useAuthGuard({ roles: ["desainer", "owner"] })
  const params = useParams()
  const id = params.id as string
  const [item, setItem] = useState<(DesignQueueItemRecord & DtfItemState) | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    load()
  }, [auth.status, id])

  if (auth.status === "loading") {
    return (
      <AppShell>
        <AppShellLoading />
      </AppShell>
    )
  }

  async function uploadCdr(file: File | null) {
    if (!file || !item) return
    const validation = validateCdrFilename(item.artikelId, file.name)
    if (!validation.ok) {
      setError(validation.message)
      return
    }
    setError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("files", file)
      formData.append("saveAs", buildCdrUploadFilename(item.artikelId))
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok) {
        alert("Gagal upload CDR")
        return
      }
      await fetch(`/api/design-queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload_production_file",
          filename: file.name,
          fileDesainProduksi: serializeDesignFiles(uploadJson.files),
        }),
      })
      await load()
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
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

  return (
    <AppShell>
      <PageHeader
        badge="Desainer"
        title={`CDR ${item.artikelId}`}
        description={`File wajib: ${item.artikelId}.cdr`}
      />

      <div className="mb-6">
        <DesignPreviewPair item={item} />
      </div>

      <DtfWorkflowPanel item={item} onUpdated={(next) => setItem((prev) => (prev ? { ...prev, ...next } : prev))} />

      <div className="neo-card space-y-4 p-5">
        <p className="text-sm text-zinc-400">
          Setelah CDR diunggah, CS dapat melanjutkan input order di antrian desain.
        </p>
        <div>
          <label className="mb-2 block text-sm text-zinc-400">
            Unggah file CDR produksi
          </label>
          <input
            type="file"
            accept=".cdr"
            disabled={uploading}
            onChange={(e) => uploadCdr(e.target.files?.[0] ?? null)}
            className="neo-input"
          />
          {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        </div>
        <Link
          href="/desainer/antrian-disetujui"
          className="neo-btn-secondary inline-flex items-center px-4 py-2 text-sm"
        >
          ← Antrian disetujui
        </Link>
        {item.fileDesainProduksi ? (
          <p className="text-sm text-emerald-400">CDR produksi sudah tersimpan.</p>
        ) : null}
      </div>
    </AppShell>
  )
}
