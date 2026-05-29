"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import DesignPreviewPair from "@/components/cs/design-preview-pair"
import { DesignQueueNotesSection } from "@/components/cs/design-queue-notes-section"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { BtnPrimary } from "@/components/ui/buttons"
import { homePathByRole } from "@/lib/auth-redirect"
import { canAccessDesainerRoutes } from "@/lib/roles"
import {
  serializeDesignFiles,
  type DesignQueueItemRecord,
} from "@/lib/cs-antrian-desain"
import type { DesignQueueMessageRecord } from "@/lib/design-queue-notes"

type DesainerDetailItem = DesignQueueItemRecord & {
  messages?: DesignQueueMessageRecord[]
}

function desainerSenderNameFromStorage(): string {
  if (typeof window === "undefined") return "Desainer"
  try {
    const raw = localStorage.getItem("user")
    if (!raw) return "Desainer"
    const user = JSON.parse(raw) as { name?: string; username?: string }
    if (typeof user.name === "string" && user.name.trim()) return user.name.trim()
    if (typeof user.username === "string" && user.username.trim()) {
      return user.username.trim()
    }
  } catch {
    /* ignore */
  }
  return "Desainer"
}

export default function DesainerAntrianDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [item, setItem] = useState<DesainerDetailItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
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
    const raw = localStorage.getItem("user")
    if (!raw) {
      router.push("/login")
      return
    }
    const user = JSON.parse(raw)
    if (!canAccessDesainerRoutes(user.role)) {
      router.push(homePathByRole(user.role))
      return
    }

    load()
  }, [router, id])

  async function uploadHasil(files: FileList | null) {
    if (!files?.length || !item) return
    setUploading(true)
    try {
      const formData = new FormData()
      for (const file of Array.from(files)) {
        formData.append("files", file)
      }
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok) {
        alert("Gagal upload")
        return
      }
      await fetch(`/api/design-queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasilDesain: serializeDesignFiles(uploadJson.files),
          action: "kirim_ke_cs",
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
        title={item.artikelId}
        description={`${item.designId} · ${item.namaKonsumen}`}
      />

      <div className="mb-6">
        <DesignPreviewPair item={item} />
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

      <div className="neo-card space-y-4 p-5">
        <p className="text-sm text-zinc-400">{item.materiDesain}</p>
        <div>
          <label className="mb-2 block text-sm text-zinc-400">Unggah hasil desain</label>
          <input
            type="file"
            multiple
            accept="image/*"
            disabled={uploading}
            onChange={(e) => uploadHasil(e.target.files)}
            className="neo-input"
          />
        </div>
        <div className="flex gap-3">
          <BtnPrimary
            disabled={uploading}
            onClick={() =>
              fetch(`/api/design-queue/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "mulai_proses" }),
              }).then(load)
            }
          >
            Mulai proses
          </BtnPrimary>
          <Link href="/desainer/antrian" className="neo-btn-secondary inline-flex items-center px-4 py-2 text-sm">
            ← Antrian
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
