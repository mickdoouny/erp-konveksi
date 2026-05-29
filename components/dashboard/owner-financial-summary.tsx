import { formatRupiahDisplay } from "@/lib/format-rupiah"
import type { OwnerDashboardPayload } from "@/lib/owner-dashboard-data"

function StatRow({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-800/80 py-3 last:border-0">
      <div>
        <p className="text-sm text-zinc-400">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-zinc-600">{hint}</p> : null}
      </div>
      <p className="text-right font-mono text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  )
}

export function OwnerFinancialSummary({
  financial,
  designQueue,
  workflowEnabled,
}: {
  financial: OwnerDashboardPayload["financial"]
  designQueue: OwnerDashboardPayload["designQueue"]
  workflowEnabled: boolean
}) {
  const rupiah = (n: number) => `Rp ${formatRupiahDisplay(n)}`

  return (
    <section className="neo-card p-6">
      <h2 className="text-lg font-semibold text-white">Ringkasan keuangan</h2>
      <p className="mt-1 text-sm text-zinc-500">
        {workflowEnabled
          ? "Data dari modul accounting & final order."
          : "Data dari lead penjualan (alur legacy)."}
      </p>

      <div className="mt-5">
        <StatRow label="Total omzet" value={rupiah(financial.totalOmzet)} />
        <StatRow label="DP diterima" value={rupiah(financial.dpDiterima)} />
        <StatRow
          label="Sisa pelunasan"
          value={rupiah(financial.sisaPelunasan)}
        />
        <StatRow
          label="Order menunggu DP"
          value={financial.menungguDp.toLocaleString("id-ID")}
        />
        <StatRow
          label="Order lunas"
          value={financial.orderLunas.toLocaleString("id-ID")}
        />
        {workflowEnabled ? (
          <StatRow
            label="Antrian validasi keuangan"
            value={financial.antrianKeuangan.toLocaleString("id-ID")}
            hint="DP atau pelunasan perlu tindakan"
          />
        ) : null}
      </div>

      <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Antrian desain CS
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-orange-400">
              {designQueue.aktif}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">Aktif desainer</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-sky-400">
              {designQueue.menungguDp}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">Menunggu DP</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-200">
              {designQueue.total}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">Total antrian</p>
          </div>
        </div>
      </div>
    </section>
  )
}
