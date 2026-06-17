"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AuthGateShell } from "@/components/auth-gate"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { DesignQueueListFilters } from "@/components/design-queue/list-filters"
import { useAuthGuard } from "@/hooks/use-auth-guard"
import { statusBadgeClass, statusLabel } from "@/lib/cs-antrian-desain"
import type { DesignQueueItemRecord } from "@/lib/cs-antrian-desain"
import { DESIGNER_ACTIVE_STATUSES } from "@/lib/designer-antrian"
import {
  EMPTY_DESIGN_QUEUE_FILTERS,
  filterDesignQueueItems,
  hasActiveDesignQueueFilters,
  type DesignQueueFilterState,
} from "@/lib/design-queue-filters"

const DESIGNER_STATUS_OPTIONS = [
  { value: "", label: "Semua status" },
  ...DESIGNER_ACTIVE_STATUSES.map((status) => ({
    value: status,
    label: statusLabel(status),
  })),
]

type DesainerAntrianClientProps = {
  initialItems: DesignQueueItemRecord[]
}

export default function DesainerAntrianClient({
  initialItems,
}: DesainerAntrianClientProps) {
  const auth = useAuthGuard({ roles: ["desainer", "owner"] })
  const [items, setItems] = useState<DesignQueueItemRecord[]>(initialItems)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<DesignQueueFilterState>(
    EMPTY_DESIGN_QUEUE_FILTERS
  )

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/design-queue?queue=aktif", {
        cache: "no-store",
      })
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const filtered = useMemo(
    () => filterDesignQueueItems(items, filters),
    [items, filters]
  )
  const filtersActive = hasActiveDesignQueueFilters(filters)

  if (auth.status === "unauthenticated" || auth.status === "forbidden") {
    return <AuthGateShell message="Mengalihkan ke login…" />
  }

  return (
    <AppShell>
      <div className="min-w-0 w-full">
      <PageHeader
        badge="Desainer"
        title="Antrian"
        titleAccent="kerja"
        description="Desain menunggu proses atau revisi — unggah hasil lalu kirim ke CS."
      />

      <div className="neo-card w-full min-w-0 p-4 sm:p-5 md:p-6">
        <DesignQueueListFilters
          filters={filters}
          onChange={setFilters}
          onRefresh={load}
          searchPlaceholder="Cari konsumen, artikel, DSN, ART…"
          statusOptions={DESIGNER_STATUS_OPTIONS}
        />

        {loading ? (
          <AppShellLoading />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center text-zinc-500">
            {filtersActive
              ? "Tidak ada antrian yang cocok dengan filter."
              : "Antrian kosong."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <p className="border-b border-zinc-800 bg-zinc-950/50 px-3 py-2 text-xs text-zinc-500">
              Menampilkan {filtered.length} dari {items.length} antrian
            </p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-left text-zinc-500">
                  <th className="p-3">DSN / ART</th>
                  <th className="p-3">Konsumen</th>
                  <th className="p-3">Artikel</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-900/80">
                    <td className="p-3 font-mono text-xs text-orange-300">
                      {row.designId}
                      <br />
                      {row.artikelId}
                    </td>
                    <td className="p-3 text-zinc-200">{row.namaKonsumen}</td>
                    <td className="p-3 text-zinc-300">{row.namaArtikel}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(row.statusDesain)}`}
                      >
                        {statusLabel(row.statusDesain)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Link
                        href={`/desainer/antrian/${row.id}`}
                        className="text-orange-400 hover:text-orange-300"
                      >
                        Buka
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </AppShell>
  )
}
