"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import CsShell from "@/components/layout/cs-shell"
import { DesignQueueListFilters } from "@/components/design-queue/list-filters"
import { useAuthGuard } from "@/hooks/use-auth-guard"
import type { DesignQueueItemRecord } from "@/lib/cs-antrian-desain"
import {
  csAntrianProduksiDtfSummary,
  csAntrianProduksiProgressLabel,
  csProduksiProgressBadgeClass,
  type CsAntrianProduksiFinalOrder,
} from "@/lib/cs-antrian-produksi"
import {
  EMPTY_CS_PRODUKSI_FILTERS,
  filterCsProduksiItems,
  hasActiveCsProduksiFilters,
  uniqueCsNames,
  type CsProduksiFilterState,
} from "@/lib/design-queue-filters"
import { PAYMENT_STATUS_LABELS, PRODUCTION_STATUS_LABELS } from "@/lib/status-labels"
import { DTF_STATUS_LABELS } from "@/lib/dtf-status-labels"
import { withCsApiScope } from "@/lib/cs-design-queue-access"

type ProduksiRow = DesignQueueItemRecord & {
  FinalOrder?: CsAntrianProduksiFinalOrder | null
}

const PRODUKSI_PAYMENT_OPTIONS = [
  { value: "", label: "Semua pembayaran" },
  ...Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
  {
    value: "MENUNGGU_ADMIN_PRODUKSI",
    label: "Menunggu Admin Produksi",
  },
]

const PRODUKSI_PIPELINE_OPTIONS = [
  { value: "", label: "Semua tahap" },
  ...Object.entries(PRODUCTION_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
]

const PRODUKSI_DTF_OPTIONS = [
  { value: "", label: "Semua DTF" },
  { value: "perlu", label: "Perlu DTF" },
  { value: "tidak", label: "Tanpa DTF" },
  ...Object.entries(DTF_STATUS_LABELS).map(([value, label]) => ({ value, label })),
]

export default function CsAntrianProduksiPage() {
  const auth = useAuthGuard({ roles: ["cs", "owner"] })
  const [items, setItems] = useState<ProduksiRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<CsProduksiFilterState>(
    EMPTY_CS_PRODUKSI_FILTERS
  )

  async function loadItems(user: { role: string; id?: string; nama?: string }) {
    try {
      setLoading(true)
      const res = await fetch(withCsApiScope("/api/cs/antrian-produksi", user), {
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
    loadItems(auth.user)
  }, [auth.status, auth.user])

  const csOptions = useMemo(() => uniqueCsNames(items), [items])
  const filtered = useMemo(
    () => filterCsProduksiItems(items, filters),
    [items, filters]
  )
  const filtersActive = hasActiveCsProduksiFilters(filters)

  return (
    <CsShell
      title="Antrian produksi"
      description="Order yang sudah diinput CS — pantau validasi DP, tahap produksi, dan status DTF."
    >
      <div className="neo-card p-5 md:p-6">
        <DesignQueueListFilters
          filters={filters}
          onChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
          onResetAll={() => setFilters(EMPTY_CS_PRODUKSI_FILTERS)}
          filtersActive={filtersActive}
          onRefresh={loadItems}
          searchPlaceholder="Cari konsumen, artikel, FO, DSN…"
          paymentStatusOptions={PRODUKSI_PAYMENT_OPTIONS}
          csOptions={csOptions}
          showDateRange
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Tahap produksi
            </span>
            <select
              value={filters.pipelineStatus}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  pipelineStatus: e.target.value,
                }))
              }
              className="neo-input cursor-pointer py-2.5 text-sm"
            >
              {PRODUKSI_PIPELINE_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Status DTF
            </span>
            <select
              value={filters.dtfStatus}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dtfStatus: e.target.value }))
              }
              className="neo-input cursor-pointer py-2.5 text-sm"
            >
              {PRODUKSI_DTF_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </DesignQueueListFilters>

        {loading ? (
          <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center text-zinc-500">
            Memuat antrian…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center text-zinc-500">
            {filtersActive
              ? "Tidak ada order yang cocok dengan filter."
              : "Belum ada order di antrian produksi. Setelah input order dari antrian desain, order akan muncul di sini."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <p className="border-b border-zinc-800 bg-zinc-950/50 px-3 py-2 text-xs text-zinc-500">
              Menampilkan {filtered.length} dari {items.length} order
            </p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-left text-zinc-500">
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    FO / DSN
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Konsumen
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Artikel
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    CS
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Progres
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    DTF
                  </th>
                  <th className="p-3 font-semibold uppercase tracking-wide">
                    Diperbarui
                  </th>
                  <th className="min-w-[5rem] p-3 text-center font-semibold uppercase tracking-wide">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const progress = csAntrianProduksiProgressLabel(item)
                  const dtfSummary = csAntrianProduksiDtfSummary(item)

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-zinc-800/80 hover:bg-zinc-900/40"
                    >
                      <td className="p-3">
                        <p className="font-medium text-orange-400">
                          {item.FinalOrder?.orderNumber ?? item.designId}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {item.designId} · {item.artikelId}
                        </p>
                      </td>
                      <td className="p-3 text-zinc-200">{item.namaKonsumen}</td>
                      <td className="p-3 text-zinc-300">{item.namaArtikel}</td>
                      <td className="p-3 text-zinc-400">{item.csNama}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${csProduksiProgressBadgeClass(progress.tone)}`}
                        >
                          {progress.primary}
                        </span>
                        {progress.secondary ? (
                          <p className="mt-1 text-xs text-zinc-500">
                            {progress.secondary}
                          </p>
                        ) : null}
                      </td>
                      <td className="p-3 text-xs text-zinc-400">
                        {dtfSummary ?? "—"}
                      </td>
                      <td className="p-3 text-zinc-500">
                        {new Date(item.updatedAt).toLocaleDateString("id-ID")}
                      </td>
                      <td className="whitespace-nowrap p-3 text-center">
                        <Link
                          href={`/cs/antrian-produksi/${item.id}`}
                          className="inline-flex items-center whitespace-nowrap rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-orange-500/50 hover:text-orange-400"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CsShell>
  )
}
