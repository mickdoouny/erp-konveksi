"use client"

import type { DesignQueueFilterState } from "@/lib/design-queue-filters"
import { hasActiveDesignQueueFilters } from "@/lib/design-queue-filters"

type FilterOption = {
  value: string
  label: string
}

type DesignQueueListFiltersProps = {
  filters: DesignQueueFilterState
  onChange: (next: DesignQueueFilterState) => void
  onRefresh?: () => void
  searchPlaceholder?: string
  statusOptions?: FilterOption[]
  paymentStatusOptions?: FilterOption[]
  csOptions?: string[]
  showDateRange?: boolean
  showCdrFilter?: boolean
  /** Extra filter controls rendered in the filter grid (e.g. pipeline / DTF). */
  children?: React.ReactNode
  /** Override active-state for reset button (e.g. extended filter state). */
  filtersActive?: boolean
  /** Full reset including fields not in DesignQueueFilterState. */
  onResetAll?: () => void
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="neo-input cursor-pointer py-2.5 text-sm"
      >
        {options.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function DesignQueueListFilters({
  filters,
  onChange,
  onRefresh,
  searchPlaceholder = "Cari konsumen, artikel, DSN…",
  statusOptions,
  paymentStatusOptions,
  csOptions,
  showDateRange = false,
  showCdrFilter = false,
  children,
  filtersActive,
  onResetAll,
}: DesignQueueListFiltersProps) {
  function patch(partial: Partial<DesignQueueFilterState>) {
    onChange({ ...filters, ...partial })
  }

  function resetFilters() {
    if (onResetAll) {
      onResetAll()
      return
    }
    onChange({
      search: "",
      status: "",
      paymentStatus: "",
      csNama: "",
      dateFrom: "",
      dateTo: "",
      cdrStatus: "",
    })
  }

  const active = filtersActive ?? hasActiveDesignQueueFilters(filters)

  return (
    <div className="mb-6 min-w-0 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Pencarian
          </span>
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
            className="neo-input text-sm"
          />
        </label>

        <div className="flex shrink-0 flex-wrap gap-2">
          {active ? (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-zinc-600 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Reset filter
            </button>
          ) : null}
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-lg border border-orange-500/50 bg-orange-950/40 px-4 py-2.5 text-sm font-semibold text-orange-300 transition hover:border-orange-400"
            >
              Refresh
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {statusOptions?.length ? (
          <FilterSelect
            label="Status desain"
            value={filters.status}
            options={statusOptions}
            onChange={(status) => patch({ status })}
          />
        ) : null}

        {paymentStatusOptions?.length ? (
          <FilterSelect
            label="Status pembayaran"
            value={filters.paymentStatus}
            options={paymentStatusOptions}
            onChange={(paymentStatus) => patch({ paymentStatus })}
          />
        ) : null}

        {csOptions?.length ? (
          <FilterSelect
            label="CS"
            value={filters.csNama}
            options={[
              { value: "", label: "Semua CS" },
              ...csOptions.map((name) => ({ value: name, label: name })),
            ]}
            onChange={(csNama) => patch({ csNama })}
          />
        ) : null}

        {showCdrFilter ? (
          <FilterSelect
            label="File CDR"
            value={filters.cdrStatus}
            options={[
              { value: "", label: "Semua" },
              { value: "sudah", label: "Sudah diunggah" },
              { value: "belum", label: "Belum diunggah" },
            ]}
            onChange={(cdrStatus) => patch({ cdrStatus })}
          />
        ) : null}

        {showDateRange ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Dari tanggal
              </span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => patch({ dateFrom: e.target.value })}
                className="neo-input py-2.5 text-sm [color-scheme:dark]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Sampai tanggal
              </span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => patch({ dateTo: e.target.value })}
                className="neo-input py-2.5 text-sm [color-scheme:dark]"
              />
            </label>
          </>
        ) : null}

        {children}
      </div>
    </div>
  )
}
