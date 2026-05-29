import type { OwnerReportRow } from "@/lib/owner-dashboard-data"

export function OwnerReportsTable({ reports }: { reports: OwnerReportRow[] }) {
  return (
    <section className="neo-card overflow-hidden p-6">
      <h2 className="text-lg font-semibold text-white">Report CS / produksi</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Laporan terbaru dari operator produksi (jahit, print, dll.).
      </p>

      {reports.length === 0 ? (
        <p className="mt-6 py-8 text-center text-sm text-zinc-500">
          Belum ada report produksi.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-left text-zinc-400">
                <th className="p-3 font-semibold uppercase tracking-wide">
                  Invoice
                </th>
                <th className="p-3 font-semibold uppercase tracking-wide">
                  Divisi
                </th>
                <th className="p-3 font-semibold uppercase tracking-wide">
                  Qty
                </th>
                <th className="p-3 font-semibold uppercase tracking-wide">
                  Kendala
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr
                  key={report.id}
                  className="border-b border-zinc-800/80 hover:bg-zinc-900/50"
                >
                  <td className="p-3 font-medium text-white">
                    {report.invoice}
                  </td>
                  <td className="p-3 text-zinc-300">{report.divisi}</td>
                  <td className="p-3 text-orange-400">{report.qtySelesai}</td>
                  <td className="p-3 text-zinc-400">{report.kendala || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
