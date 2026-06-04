"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AntrianProduksiStatusCard } from "@/components/cs/antrian-produksi-status-card"
import DesignPreviewPair from "@/components/cs/design-preview-pair"
import { DesignQueueNotesSection } from "@/components/cs/design-queue-notes-section"
import { DtfStatusReadonlyPanel } from "@/components/dtf/dtf-panels"
import CsShell from "@/components/layout/cs-shell"
import { readStoredUser } from "@/lib/auth"
import { homePathByRole } from "@/lib/auth-redirect"
import type { DesignQueueItemRecord } from "@/lib/cs-antrian-desain"
import {
  isCsAntrianProduksiItem,
  type CsAntrianProduksiFinalOrder,
} from "@/lib/cs-antrian-produksi"
import type { DesignQueueMessageRecord } from "@/lib/design-queue-notes"
import { withCsApiScope } from "@/lib/cs-design-queue-access"

type DetailItem = DesignQueueItemRecord & {
  messages?: DesignQueueMessageRecord[]
  FinalOrder?: CsAntrianProduksiFinalOrder | null
}

export default function CsAntrianProduksiDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [item, setItem] = useState<DetailItem | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadItem(user: { role: string; id?: string; nama?: string }) {
    try {
      setLoading(true)
      const res = await fetch(
        withCsApiScope(`/api/cs/antrian-desain/${id}`, user),
        {
          cache: "no-store",
        }
      )
      if (!res.ok) {
        setItem(null)
        return
      }
      const data = await res.json()
      setItem(data)
    } catch {
      setItem(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const user = readStoredUser()
    if (!user) {
      router.replace("/login")
      return
    }
    if (!["cs", "owner"].includes(user.role)) {
      router.push(homePathByRole(user.role))
      return
    }

    queueMicrotask(() => {
      void loadItem(user)
    })
  }, [router, id])

  useEffect(() => {
    if (!item || loading) return
    if (!isCsAntrianProduksiItem(item)) {
      router.replace(`/cs/antrian-desain/${id}`)
    }
  }, [item, loading, router, id])

  if (loading) {
    return (
      <CsShell title="Detail antrian produksi">
        <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center text-zinc-500">
          Memuat detail…
        </div>
      </CsShell>
    )
  }

  if (!item || !isCsAntrianProduksiItem(item)) {
    return (
      <CsShell title="Detail antrian produksi">
        <div className="neo-card p-8 text-center">
          <p className="text-zinc-400">Item tidak ditemukan.</p>
          <Link
            href="/cs/antrian-produksi"
            className="mt-4 inline-block text-orange-400 hover:text-orange-300"
          >
            ← Kembali ke antrian produksi
          </Link>
        </div>
      </CsShell>
    )
  }

  return (
    <CsShell
      title="Detail antrian produksi"
      description={`${item.FinalOrder?.orderNumber ?? item.designId} · ${item.artikelId}`}
      actions={
        <Link
          href="/cs/antrian-produksi"
          className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:border-orange-500/50 hover:text-orange-400"
        >
          ← Antrian produksi
        </Link>
      }
    >
      <AntrianProduksiStatusCard item={item} />

      <DtfStatusReadonlyPanel item={item} />

      <div className="my-6">
        <DesignPreviewPair item={item} />
      </div>

      <div className="mb-6">
        <DesignQueueNotesSection
          itemId={item.id}
          messages={item.messages ?? []}
          senderRole="CS"
          senderName={item.csNama?.trim() || "CS"}
          onMessagesUpdated={(messages) =>
            setItem((prev) => (prev ? { ...prev, messages } : prev))
          }
        />
      </div>
    </CsShell>
  )
}
