"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { AntrianProduksiStatusCard } from "@/components/cs/antrian-produksi-status-card"
import DesignPreviewPair from "@/components/cs/design-preview-pair"
import { DesignQueueNotesSection } from "@/components/cs/design-queue-notes-section"
import { SettingConfirmationPanel } from "@/components/cs/setting-confirmation-panel"
import CsShell from "@/components/layout/cs-shell"
import { useAuthGuard } from "@/hooks/use-auth-guard"
import type { DesignQueueItemRecord } from "@/lib/cs-antrian-desain"
import {
  isCsAntrianProduksiItem,
  type CsAntrianProduksiFinalOrder,
} from "@/lib/cs-antrian-produksi"
import type { DesignQueueMessageRecord } from "@/lib/design-queue-notes"
import { usePollingRefresh } from "@/hooks/use-polling-refresh"
import { withCsApiScope } from "@/lib/cs-api-scope"
import { formatQueueItemSubtitle } from "@/lib/cs-queue-identifiers"

type DetailItem = DesignQueueItemRecord & {
  messages?: DesignQueueMessageRecord[]
  FinalOrder?: CsAntrianProduksiFinalOrder | null
}

export default function CsAntrianProduksiDetailPage() {
  const auth = useAuthGuard({ roles: ["cs", "owner"] })
  const params = useParams()
  const id = params.id as string

  const [item, setItem] = useState<DetailItem | null>(null)
  const [loading, setLoading] = useState(true)

  const loadItem = useCallback(
    async (
      user: { role: string; id?: string; nama?: string },
      options?: { silent?: boolean }
    ) => {
      try {
        if (!options?.silent) setLoading(true)
        const res = await fetch(
          withCsApiScope(`/api/cs/antrian-produksi/${id}`, user),
          { cache: "no-store" }
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
        if (!options?.silent) setLoading(false)
      }
    },
    [id]
  )

  useEffect(() => {
    if (auth.status !== "authenticated") return
    void loadItem(auth.user)
  }, [auth.status, auth.user, loadItem])

  usePollingRefresh(
    useCallback(() => {
      if (auth.status !== "authenticated") return
      void loadItem(auth.user, { silent: true })
    }, [auth.status, auth.user, loadItem]),
    { enabled: auth.status === "authenticated" }
  )

  if (auth.status === "loading" || loading) {
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
      description={formatQueueItemSubtitle({
        orderNumber: item.FinalOrder?.orderNumber,
        sppNumber: item.sppNumber,
        artikelId: item.artikelId,
        namaArtikel: item.namaArtikel,
        designId: item.designId,
      })}
      actions={
        <Link
          href="/cs/antrian-produksi"
          className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:border-orange-500/50 hover:text-orange-400"
        >
          ← Antrian produksi
        </Link>
      }
    >
      {auth.status === "authenticated" ? (
        <SettingConfirmationPanel user={auth.user} />
      ) : null}

      <AntrianProduksiStatusCard item={item} />

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
