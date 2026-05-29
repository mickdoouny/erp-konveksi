"use client"

import { BtnGhost, BtnPrimary } from "@/components/ui/buttons"

export type PrintableSppDocument = {
  documentNumber: string
  headerInfo: Array<{ label: string; value?: string | null }>
  orderInfo: Array<{ label: string; value?: string | null }>
  paymentSummary: string
  rosterLines: Array<{
    nama: string
    nomorPunggung?: string | null
    ukuran?: string | null
  }>
}

export function SppPrintDocument({
  data,
  onBack,
}: {
  data: PrintableSppDocument
  onBack: () => void
}) {
  return (
    <>
      <div className="min-h-screen bg-zinc-100 py-24 text-black print:bg-white print:py-0">
        <div className="no-print fixed left-4 right-4 top-4 z-50 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-lg">
          <p className="text-sm font-semibold">Cetak Surat Perintah Produksi</p>
          <div className="flex gap-2">
            <BtnPrimary type="button" onClick={() => window.print()}>
              Cetak / PDF
            </BtnPrimary>
            <BtnGhost type="button" onClick={onBack}>
              Kembali
            </BtnGhost>
          </div>
        </div>

        <article className="mx-auto max-w-[210mm] bg-white p-10 print:p-8">
          <header className="border-b-2 border-zinc-800 pb-4">
            <h1 className="text-2xl font-bold">Surat Perintah Produksi</h1>
            <p className="mt-2 font-mono text-lg">{data.documentNumber}</p>
          </header>

          <section className="mt-6 grid grid-cols-2 gap-4 text-sm">
            {data.headerInfo
              .filter((row) => row.value)
              .map((row) => (
                <div key={row.label}>
                  <p className="text-zinc-600">{row.label}</p>
                  <p className="font-semibold">{row.value}</p>
                </div>
              ))}
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-bold uppercase">Data order</h2>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {data.orderInfo.map((row) => (
                  <tr key={row.label}>
                    <td className="py-1 pr-4 text-zinc-600">{row.label}</td>
                    <td className="py-1 font-medium">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mt-6 rounded border border-zinc-300 p-4 text-sm">
            <h2 className="font-bold">Pembayaran</h2>
            <p className="mt-2">{data.paymentSummary}</p>
          </section>

          {data.rosterLines.length > 0 ? (
            <section className="mt-6">
              <h2 className="text-sm font-bold uppercase">Roster</h2>
              <table className="mt-2 w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-zinc-100">
                    <th className="p-2 text-left">Nama</th>
                    <th className="p-2 text-left">No</th>
                    <th className="p-2 text-left">Ukuran</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rosterLines.map((line, index) => (
                    <tr key={`${line.nama}-${index}`} className="border-b">
                      <td className="p-2">{line.nama}</td>
                      <td className="p-2">{line.nomorPunggung || "—"}</td>
                      <td className="p-2">{line.ukuran || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </article>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}
