"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { DesignQueueListFilters } from "@/components/design-queue/list-filters"
import { useAuthGuard } from "@/hooks/use-auth-guard"
import { statusBadgeClass, statusLabel } from "@/lib/cs-antrian-desain"
import type { DesignQueueItemRecord } from "@/lib/cs-antrian-desain"
import { DESIGNER_APPROVED_STATUSES } from "@/lib/designer-antrian"
import {
  EMPTY_DESIGN_QUEUE_FILTERS,
  filterDesignQueueItems,
  hasActiveDesignQueueFilters,
  type DesignQueueFilterState,
} from "@/lib/design-queue-filters"

const APPROVED_STATUS_OPTIONS = [
  { value: "", label: "Semua status" },
  ...DESIGNER_APPROVED_STATUSES.map((status) => ({
    value: status,
    label: statusLabel(status),
  })),
]

export default function DesainerAntrianDisetujuiPage() {
  const auth = useAuthGuard({ roles: ["desainer", "owner"] })
  const [items, setItems] = useState<DesignQueueItemRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<DesignQueueFilterState>(
    EMPTY_DESIGN_QUEUE_FILTERS
  )

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/design-queue?queue=disetujui", {
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
    if (auth.status !== "authenticated") return
    load()
  }, [auth.status])

  const filtered = useMemo(
    () => filterDesignQueueItems(items, filters),
    [items, filters]
  )
  const filtersActive = hasActiveDesignQueueFilters(filters)

  if (auth.status === "loading") {
    return (
      <AppShell>
        <AppShellLoading />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader
        badge="Desainer"
        title="Antrian pasca-ACC"
        titleAccent="konsumen"
        description="Unggah CDR produksi (nama file = ID artikel.cdr) sebelum CS input order."
      />

      <div className="neo-card p-5 md:p-6">
        <DesignQueueListFilters
          filters={filters}
          onChange={setFilters}
          onRefresh={load}
          searchPlaceholder="Cari konsumen, artikel, ART…"
          statusOptions={APPROVED_STATUS_OPTIONS}
          showCdrFilter
        />

        {loading ? (
          <AppShellLoading />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center text-zinc-500">
            {filtersActive
              ? "Tidak ada antrian yang cocok dengan filter."
              : "Belum ada antrian pasca-ACC konsumen."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <p className="border-b border-zinc-800 bg-zinc-950/50 px-3 py-2 text-xs text-zinc-500">
              Menampilkan {filtered.length} dari {items.length} antrian
            </p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-left text-zinc-500">
                  <th className="p-3">ART</th>
                  <th className="p-3">Konsumen</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">CDR</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-900/80">
                    <td className="p-3 font-mono text-orange-300">
                      {row.artikelId}
                    </td>
                    <td className="p-3">{row.namaKonsumen}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(row.statusDesain)}`}
                      >
                        {statusLabel(row.statusDesain)}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-400">
                      {row.fileDesainProduksi ? "Sudah" : "Belum"}
                    </td>
                    <td className="p-3 text-center">
                      <Link
                        href={`/desainer/antrian-disetujui/${row.id}`}
                        className={
                          row.fileDesainProduksi
                            ? "text-zinc-300 hover:text-orange-300"
                            : "text-orange-400 hover:text-orange-300"
                        }
                      >
                        {row.fileDesainProduksi ? "Detail" : "Unggah CDR"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
