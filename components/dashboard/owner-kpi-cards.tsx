import { formatRupiahDisplay } from "@/lib/format-rupiah"
import type { OwnerDashboardPayload } from "@/lib/owner-dashboard-data"

const cards: {
  key: keyof OwnerDashboardPayload["kpis"]
  label: string
  format: "number" | "rupiah"
  accent: string
}[] = [
  {
    key: "totalReport",
    label: "Total report",
    format: "number",
    accent: "from-white to-zinc-400",
  },
  {
    key: "totalQtyProduksi",
    label: "Qty produksi",
    format: "number",
    accent: "from-orange-300 to-orange-600",
  },
  {
    key: "totalSales",
    label: "Total penjualan",
    format: "rupiah",
    accent: "from-emerald-300 to-emerald-600",
  },
  {
    key: "salesTervalidasi",
    label: "Penjualan tervalidasi",
    format: "rupiah",
    accent: "from-sky-300 to-sky-600",
  },
]

export function OwnerKpiCards({ kpis }: { kpis: OwnerDashboardPayload["kpis"] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const raw = kpis[card.key]
        const display =
          card.format === "rupiah"
            ? `Rp ${formatRupiahDisplay(raw)}`
            : raw.toLocaleString("id-ID")

        return (
          <div key={card.key} className="neo-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {card.label}
            </p>
            <p
              className={`mt-2 bg-gradient-to-br ${card.accent} bg-clip-text text-3xl font-bold text-transparent md:text-4xl`}
            >
              {display}
            </p>
          </div>
        )
      })}
    </div>
  )
}
