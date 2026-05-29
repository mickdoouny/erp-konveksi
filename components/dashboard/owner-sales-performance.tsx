import { SimpleBarChart } from "@/components/dashboard/simple-bar-chart"
import { formatRupiahDisplay } from "@/lib/format-rupiah"
import type {
  OwnerSalesByCs,
  OwnerSalesTrendPoint,
} from "@/lib/owner-dashboard-data"

const formatRp = (n: number) => `Rp ${formatRupiahDisplay(n)}`

export function OwnerSalesPerformance({
  salesByCs,
  salesTrend,
}: {
  salesByCs: OwnerSalesByCs[]
  salesTrend: OwnerSalesTrendPoint[]
}) {
  return (
    <section className="neo-card p-6">
      <h2 className="text-lg font-semibold text-white">
        Performa penjualan
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Laporan ringkas per CS dan tren 6 bulan terakhir (total vs tervalidasi).
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Omzet per CS
          </h3>
          <SimpleBarChart
            items={salesByCs.map((row) => ({
              label: row.namaCs,
              value: row.total,
              secondaryValue: row.validated,
            }))}
            formatValue={formatRp}
            showSecondary
          />
          <p className="mt-3 text-[11px] text-zinc-600">
            Bar oranye: total · Bar abu: tervalidasi
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Tren bulanan
          </h3>
          <SimpleBarChart
            items={salesTrend.map((row) => ({
              label: row.label,
              value: row.total,
              secondaryValue: row.validated,
            }))}
            formatValue={formatRp}
            showSecondary
            primaryClassName="bg-gradient-to-r from-emerald-500 to-teal-600"
          />
        </div>
      </div>

      {salesByCs.length > 0 ? (
        <div className="mt-8 overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-left text-zinc-400">
                <th className="p-3 font-semibold uppercase tracking-wide">
                  CS
                </th>
                <th className="p-3 font-semibold uppercase tracking-wide">
                  Order
                </th>
                <th className="p-3 font-semibold uppercase tracking-wide">
                  Total
                </th>
                <th className="p-3 font-semibold uppercase tracking-wide">
                  Tervalidasi
                </th>
              </tr>
            </thead>
            <tbody>
              {salesByCs.map((row) => (
                <tr
                  key={row.namaCs}
                  className="border-b border-zinc-800/80 hover:bg-zinc-900/50"
                >
                  <td className="p-3 font-medium text-white">{row.namaCs}</td>
                  <td className="p-3 text-zinc-400">{row.count}</td>
                  <td className="p-3 text-emerald-400">{formatRp(row.total)}</td>
                  <td className="p-3 text-sky-400">
                    {formatRp(row.validated)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
