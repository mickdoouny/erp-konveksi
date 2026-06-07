"use client"

import { BtnGhost, BtnPrimary } from "@/components/ui/buttons"

export type PrintableSppRosterLine = {
  nama: string
  ukuran?: string | null
  jenisKerah?: string | null
  lengan?: string | null
  warna?: string | null
  catatan?: string | null
  grup?: string | null
}

export type PrintableSppMockupImage = {
  label: string
  url: string
  alt?: string
}

export type PrintableSppDocument = {
  namaKonsumen: string
  namaArtikel: string
  namaCs: string
  noInvoice?: string
  tanggalKeluarSpp: string
  deadline: string
  jenisBahan: string
  jenisKerah?: string
  jenisOrder?: string
  mockupImages: PrintableSppMockupImage[]
  rosterLines: PrintableSppRosterLine[]
}

const SPP_NOTE_LINES = [
  "MOKA UP YANG SUDAH DI ACC OLEH CUSTOMER, CUSTOMER TIDAK BISA MENGUBAH MOKA UP, NAMA PEMAIN, NO PEMAIN, UKURAN.",
  "FONT NAMA BELAKANG DAN NO PEMAIN, MENGIKUTI FONT YANG SUDAH DIBERIKAN CUSTOMER UNTUK ORDER INI.",
  "WAKTU PENGERJAAN PRODUKSI DIMULAI SETELAH CUSTOMER MENG ACFKAN SEMUA DATA ORDER YANG SUDAH DI INPUT KAN OLEH CS..",
] as const

const WORKFLOW_STAGES = [
  "LAYOUT",
  "PRINT PRESS",
  "SEWING",
  "PACKING",
  "Delivery",
] as const

type KerahLenganCategory =
  | "panjang_berkerah"
  | "panjang_tanpa_kerah"
  | "pendek_berkerah"
  | "pendek_tanpa_kerah"

const BREAKDOWN_LABELS: Record<KerahLenganCategory, string> = {
  panjang_berkerah: "LNGN PANJANG BERKERAH",
  panjang_tanpa_kerah: "LNGN PANJANG TNPA KERAH",
  pendek_berkerah: "LNGN PENDEK BERKERAH",
  pendek_tanpa_kerah: "LNGN PENDEK TNP KERAH",
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL"]

function displayLengan(value?: string | null): string {
  const v = (value ?? "").trim().toLowerCase()
  if (!v) return "—"
  if (v.includes("panjang")) return "Panjang"
  if (v.includes("pendek")) return "Pendek"
  if (v === "3/4") return "3/4"
  if (v === "singlet") return "Singlet"
  return value!.trim()
}

function displayKerah(value?: string | null): string {
  const v = (value ?? "").trim()
  if (!v) return "Tanpa kerah"
  if (v.toLowerCase().includes("tanpa")) return "Tanpa kerah"
  return "Kerah"
}

function categorizeLine(line: PrintableSppRosterLine): KerahLenganCategory | null {
  const lengan = (line.lengan ?? "").trim().toLowerCase()
  const kerah = (line.jenisKerah ?? "").trim().toLowerCase()
  const hasKerah = Boolean(kerah) && !kerah.includes("tanpa")

  const isPanjang =
    lengan.includes("panjang") || lengan === "3/4"
  const isPendek =
    lengan.includes("pendek") || lengan === "singlet"

  if (isPanjang && hasKerah) return "panjang_berkerah"
  if (isPanjang && !hasKerah) return "panjang_tanpa_kerah"
  if (isPendek && hasKerah) return "pendek_berkerah"
  if (isPendek && !hasKerah) return "pendek_tanpa_kerah"
  return null
}

function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a.toUpperCase())
    const bi = SIZE_ORDER.indexOf(b.toUpperCase())
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.localeCompare(b, "id-ID")
  })
}

function buildBreakdowns(lines: PrintableSppRosterLine[]) {
  const allSizes = new Set<string>()
  const breakdowns: Record<KerahLenganCategory, Record<string, number>> = {
    panjang_berkerah: {},
    panjang_tanpa_kerah: {},
    pendek_berkerah: {},
    pendek_tanpa_kerah: {},
  }

  for (const line of lines) {
    const size = (line.ukuran ?? "").trim() || "—"
    allSizes.add(size)
    const cat = categorizeLine(line)
    if (cat) {
      breakdowns[cat][size] = (breakdowns[cat][size] ?? 0) + 1
    }
  }

  return { sizes: sortSizes([...allSizes]), breakdowns }
}

function cellClass(extra = "") {
  return `border border-black p-1 text-[10px] leading-tight ${extra}`.trim()
}

function BreakdownTable({
  label,
  sizes,
  counts,
}: {
  label: string
  sizes: string[]
  counts: Record<string, number>
}) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)
  if (total === 0) return null

  return (
    <div className="mb-1">
      <p className="bg-yellow-300 px-1 text-center text-[8px] font-bold leading-tight">
        {label}
      </p>
      <table className="w-full border-collapse border border-black text-[8px]">
        <thead>
          <tr>
            {sizes.map((size) => (
              <th key={size} className={cellClass("bg-yellow-200 text-center font-bold")}>
                {size}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {sizes.map((size) => (
              <td key={size} className={cellClass("text-center")}>
                {counts[size] ?? 0}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function SppPrintDocument({
  data,
  onBack,
}: {
  data: PrintableSppDocument
  onBack: () => void
}) {
  const rosterCount = data.rosterLines.length
  const { sizes, breakdowns } = buildBreakdowns(data.rosterLines)

  return (
    <>
      <div className="spp-print-root min-h-screen bg-zinc-100 py-24 text-black print:bg-white print:py-0">
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

        <article className="spp-print-page mx-auto bg-white p-4 print:p-2">
          {/* NOTE */}
          <section className="mb-2 border-2 border-black">
            <div className="bg-yellow-300 px-2 py-0.5 text-center text-xs font-bold">
              NOTE
            </div>
            <div className="bg-red-600 px-2 py-1 text-[9px] font-semibold leading-snug text-white">
              {SPP_NOTE_LINES.map((line, i) => (
                <p key={i}>
                  {i + 1}. {line}
                </p>
              ))}
            </div>
          </section>

          {/* Header: order info + workflow */}
          <section className="mb-2 grid grid-cols-[1fr_1.1fr] gap-0 border-2 border-black">
            <table className="w-full border-collapse text-[10px]">
              <tbody>
                <tr>
                  <td className={cellClass("w-28 bg-yellow-300 font-bold")}>
                    NAMA SALES
                  </td>
                  <td className={cellClass("font-semibold")}>{data.namaCs}</td>
                </tr>
                <tr>
                  <td className={cellClass("bg-yellow-300 font-bold")}>
                    NAMA KONSUMEN
                  </td>
                  <td className={cellClass("font-semibold uppercase")}>
                    {data.namaKonsumen}
                  </td>
                </tr>
                <tr>
                  <td className={cellClass("bg-yellow-300 font-bold")}>
                    NO INVOICE
                  </td>
                  <td className={cellClass()}>{data.noInvoice || "—"}</td>
                </tr>
                <tr>
                  <td className={cellClass("bg-yellow-300 font-bold")}>
                    NAMA ARTIKEL
                  </td>
                  <td className={cellClass("font-semibold uppercase")}>
                    {data.namaArtikel}
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="w-full border-collapse border-l-2 border-black text-[9px]">
              <thead>
                <tr>
                  <th
                    colSpan={WORKFLOW_STAGES.length}
                    className={cellClass("bg-pink-300 text-center font-bold")}
                  >
                    <div className="flex justify-around">
                      <span>START DATE: {data.tanggalKeluarSpp}</span>
                      <span>DEADLINE: {data.deadline}</span>
                    </div>
                  </th>
                </tr>
                <tr>
                  {WORKFLOW_STAGES.map((stage) => (
                    <th
                      key={stage}
                      className={cellClass("bg-yellow-300 text-center font-bold")}
                    >
                      {stage}
                    </th>
                  ))}
                </tr>
                <tr>
                  {WORKFLOW_STAGES.map((stage) => (
                    <th
                      key={`${stage}-nama`}
                      className={cellClass("bg-yellow-200 text-center font-bold")}
                    >
                      NAMA
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {WORKFLOW_STAGES.map((stage) => (
                    <td key={`${stage}-sign`} className={cellClass("h-10")} />
                  ))}
                </tr>
              </tbody>
            </table>
          </section>

          {/* Main: roster + sidebar */}
          <section className="mb-2 grid grid-cols-[1fr_148px] gap-0 border-2 border-black">
            {rosterCount > 0 ? (
              <div className="overflow-hidden border-r-2 border-black">
                <table className="w-full border-collapse text-[9px]">
                  <thead>
                    <tr className="bg-yellow-300">
                      <th className={cellClass("w-6 text-center font-bold")}>No</th>
                      <th className={cellClass("font-bold")}>Nama</th>
                      <th className={cellClass("w-10 text-center font-bold")}>
                        Size
                      </th>
                      <th className={cellClass("w-16 text-center font-bold")}>
                        Jenis Kerah
                      </th>
                      <th className={cellClass("w-12 text-center font-bold")}>
                        Lengan
                      </th>
                      <th className={cellClass("w-14 text-center font-bold")}>
                        Warna
                      </th>
                      <th className={cellClass("font-bold")}>Keterangan</th>
                      <th className={cellClass("w-14 text-center font-bold")}>
                        Group
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rosterLines.map((line, index) => (
                      <tr key={`${line.nama}-${index}`}>
                        <td className={cellClass("text-center")}>{index + 1}</td>
                        <td className={cellClass("font-medium uppercase")}>
                          {line.nama}
                        </td>
                        <td className={cellClass("text-center")}>
                          {line.ukuran || "—"}
                        </td>
                        <td className={cellClass("text-center")}>
                          {displayKerah(line.jenisKerah)}
                        </td>
                        <td className={cellClass("text-center")}>
                          {displayLengan(line.lengan)}
                        </td>
                        <td className={cellClass("text-center")}>
                          {line.warna || "—"}
                        </td>
                        <td className={cellClass()}>{line.catatan || "—"}</td>
                        <td className={cellClass("text-center")}>
                          {line.grup || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex min-h-[120px] items-center justify-center border-r-2 border-black p-4 text-[10px] text-zinc-600">
                Belum ada data pemain / roster untuk order ini.
              </div>
            )}

            <aside className="flex flex-col text-[9px]">
              <div className="border-b-2 border-black bg-yellow-300 p-2 text-center">
                <p className="text-[8px] font-bold">TOTAL QTY</p>
                <p className="text-2xl font-bold leading-none">{rosterCount}</p>
              </div>

              <div className="flex-1 border-b-2 border-black p-1">
                {(Object.keys(BREAKDOWN_LABELS) as KerahLenganCategory[]).map(
                  (cat) => (
                    <BreakdownTable
                      key={cat}
                      label={BREAKDOWN_LABELS[cat]}
                      sizes={sizes}
                      counts={breakdowns[cat]}
                    />
                  )
                )}
              </div>

              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className={cellClass("bg-yellow-300 font-bold")}>
                      BAHAN =
                    </td>
                    <td className={cellClass("font-semibold uppercase")}>
                      {data.jenisBahan || "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className={cellClass("bg-yellow-300 font-bold")}>
                      KERAH =
                    </td>
                    <td className={cellClass("text-[8px] uppercase")}>
                      {data.jenisKerah?.trim() || "MENYESUAIKAN MOKE UP"}
                    </td>
                  </tr>
                  <tr>
                    <td className={cellClass("bg-yellow-300 font-bold")}>
                      JENIS =
                    </td>
                    <td className={cellClass("font-semibold uppercase")}>
                      {data.jenisOrder?.trim() || "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </aside>
          </section>

          {/* Mockup: primary pair + thumbnail grid */}
          <section className="border-2 border-black">
            <div className="bg-yellow-300 px-2 py-0.5 text-center text-[10px] font-bold">
              GAMBAR MOCKUP
            </div>
            {data.mockupImages.length > 0 ? (
              <>
                <div
                  className={`grid gap-1 border-b border-black p-1 ${
                    data.mockupImages.length > 1 ? "grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  {data.mockupImages.slice(0, 2).map((image, index) => (
                    <figure
                      key={`primary-${image.label}-${image.url}-${index}`}
                      className="border border-black p-1"
                    >
                      <figcaption className="mb-0.5 text-center text-[8px] font-bold uppercase">
                        {image.label}
                      </figcaption>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={image.alt ?? image.label}
                        className="mx-auto max-h-28 w-full object-contain print:max-h-24"
                      />
                    </figure>
                  ))}
                </div>
                {data.mockupImages.length > 0 ? (
                  <div className="grid grid-cols-6 gap-1 p-1 print:grid-cols-6">
                    {data.mockupImages.map((image, index) => (
                      <figure
                        key={`thumb-${image.label}-${image.url}-${index}`}
                        className="border border-black p-0.5"
                      >
                        <figcaption className="truncate text-center text-[7px] font-bold uppercase">
                          {image.label}
                        </figcaption>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url}
                          alt={image.alt ?? image.label}
                          className="mx-auto h-14 w-full object-contain print:h-12"
                        />
                      </figure>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="p-3 text-center text-[10px] text-zinc-600">
                Belum ada gambar mockup untuk order ini.
              </p>
            )}
          </section>
        </article>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          @page {
            size: A4 landscape;
            margin: 6mm;
          }

          .spp-print-page {
            max-width: none !important;
            width: 100% !important;
            padding: 0 !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }

        @media screen {
          .spp-print-page {
            max-width: 297mm;
          }
        }
      `}</style>
    </>
  )
}
