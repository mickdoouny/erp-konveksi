"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import CsFullscreenPage from "@/components/cs/cs-fullscreen-page"
import { DatePickerInput } from "@/components/ui/date-picker-input"
import { RupiahInput } from "@/components/ui/rupiah-input"
import { readStoredUser } from "@/lib/auth"
import { useAuthGuard } from "@/hooks/use-auth-guard"
import type { DesignQueueItemRecord } from "@/lib/cs-antrian-desain"
import {
  CS_JENIS_ITEM_OPTIONS,
  CS_JENIS_KERAH_OPTIONS,
  CS_JENIS_ORDER_OPTIONS,
  CS_JENIS_PRODUKSI_LABELS,
  CS_JENIS_PRODUKSI_OPTIONS,
  CS_LENGAN_OPTIONS,
  MANUAL_ROSTER_MAX_PCS,
  calculateOrderTotalFromInput,
  canCsSubmitInputOrder,
  countRosterByJenisItemFromLines,
  emptyRosterLine,
  sanitizeRosterLines,
  usesPerJenisPricing,
  validateCsInputOrderForSubmit,
  type CsJenisProduksi,
  type CsRosterLineInput,
} from "@/lib/cs-input-order"
import { isCsAntrianProduksiItem } from "@/lib/cs-queue-guards"
import {
  EXCEL_ROSTER_COLUMNS,
  parseExcelRosterBuffer,
  validateExcelRosterForSubmit,
} from "@/lib/excel-roster-parse"
import { formatRupiahDisplay, parseRupiahInput } from "@/lib/format-rupiah"
import {
  buildBuktiDpUploadFilename,
  getFileExtension,
} from "@/lib/upload-filename"
import { withCsApiScope } from "@/lib/cs-api-scope"

function RosterPreviewTable({ lines }: { lines: CsRosterLineInput[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-xs">
        <thead>
          <tr className="border-b border-zinc-700 text-left text-zinc-400">
            <th className="w-10 p-2">No</th>
            <th className="p-2">Nama</th>
            <th className="w-16 p-2">Ukuran</th>
            <th className="w-16 p-2">No.Punggung</th>
            <th className="w-20 p-2">JenisItem</th>
            <th className="w-24 p-2">JenisKerah</th>
            <th className="w-24 p-2">Lengan</th>
            <th className="w-20 p-2">Bahan</th>
            <th className="w-16 p-2">Warna</th>
            <th className="p-2">Keterangan</th>
            <th className="w-16 p-2">Grup</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr
              key={index}
              className="border-b border-zinc-800/80 align-top text-zinc-200"
            >
              <td className="p-2 text-zinc-500">{index + 1}</td>
              <td className="p-2">{line.nama}</td>
              <td className="p-2">{line.ukuran || "—"}</td>
              <td className="p-2">{line.nomorPunggung || "—"}</td>
              <td className="p-2">{line.jenisItem || "—"}</td>
              <td className="p-2">{line.jenisKerah || "—"}</td>
              <td className="p-2">{line.lengan || "—"}</td>
              <td className="p-2">{line.bahan || "—"}</td>
              <td className="p-2">{line.warna || "—"}</td>
              <td className="p-2">{line.catatan || "—"}</td>
              <td className="p-2">{line.grup || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CsInputOrderPage() {
  const router = useRouter()
  const auth = useAuthGuard({ roles: ["cs", "owner"] })
  const params = useParams()
  const id = params.id as string
  const excelInputRef = useRef<HTMLInputElement>(null)

  const [item, setItem] = useState<DesignQueueItemRecord | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [parsingExcel, setParsingExcel] = useState(false)

  const [jenisOrder, setJenisOrder] = useState("")
  const [hargaStelan, setHargaStelan] = useState("")
  const [hargaAtasan, setHargaAtasan] = useState("")
  const [hargaBawahan, setHargaBawahan] = useState("")
  const [jumlahPcs, setJumlahPcs] = useState("0")
  const [pcsManualOverride, setPcsManualOverride] = useState(false)
  const [dpAmount, setDpAmount] = useState("")
  const [ongkosKirim, setOngkosKirim] = useState("")
  const [tanggalDeadline, setTanggalDeadline] = useState("")
  const [jenisProduksi, setJenisProduksi] = useState<CsJenisProduksi>("REGULER")
  const [catatanFinishing, setCatatanFinishing] = useState("")
  const [needsKancing, setNeedsKancing] = useState(false)
  const [needsDTF, setNeedsDTF] = useState(false)
  const [buktiDp, setBuktiDp] = useState<string | null>(null)

  const [excelSource, setExcelSource] = useState(false)
  const [excelFileName, setExcelFileName] = useState<string | null>(null)
  const [excelErrors, setExcelErrors] = useState<string[]>([])
  const [excelWarnings, setExcelWarnings] = useState<string[]>([])
  const [rosterLines, setRosterLines] = useState<CsRosterLineInput[]>([])
  const [manualMode, setManualMode] = useState(false)

  const sanitizedRoster = useMemo(
    () => sanitizeRosterLines(rosterLines),
    [rosterLines]
  )

  const excelRowCount = sanitizedRoster.length

  const qtyNum = useMemo(() => {
    const n = parseInt(jumlahPcs, 10)
    return Number.isNaN(n) || n < 0 ? 0 : n
  }, [jumlahPcs])

  const hargaStelanNum = useMemo(() => parseRupiahInput(hargaStelan), [hargaStelan])
  const hargaAtasanNum = useMemo(() => parseRupiahInput(hargaAtasan), [hargaAtasan])
  const hargaBawahanNum = useMemo(
    () => parseRupiahInput(hargaBawahan),
    [hargaBawahan]
  )
  const ongkirNum = useMemo(
    () => (ongkosKirim.trim() ? parseRupiahInput(ongkosKirim) : 0),
    [ongkosKirim]
  )
  const dpNum = useMemo(() => parseRupiahInput(dpAmount), [dpAmount])

  const countsByJenis = useMemo(
    () => countRosterByJenisItemFromLines(sanitizedRoster),
    [sanitizedRoster]
  )

  const pricingInput = useMemo(
    () => ({
      totalOrder: qtyNum,
      hargaStelan: hargaStelanNum,
      hargaAtasan: hargaAtasanNum,
      hargaBawahan: hargaBawahanNum,
      ongkosKirim: ongkirNum,
      rosterLines: sanitizedRoster,
    }),
    [
      qtyNum,
      hargaStelanNum,
      hargaAtasanNum,
      hargaBawahanNum,
      ongkirNum,
      sanitizedRoster,
    ]
  )

  const { subtotal, totalHarga } = useMemo(
    () => calculateOrderTotalFromInput(pricingInput),
    [pricingInput]
  )

  const sisaPelunasan = useMemo(() => {
    if (Number.isNaN(dpNum) || dpNum < 0) return totalHarga
    return Math.max(0, totalHarga - dpNum)
  }, [totalHarga, dpNum])

  const subtotalDisplay = subtotal > 0 ? formatRupiahDisplay(subtotal) : ""
  const totalDisplay =
    totalHarga > 0 ? formatRupiahDisplay(totalHarga) : ""
  const sisaDisplay =
    totalHarga > 0 && !Number.isNaN(dpNum)
      ? formatRupiahDisplay(sisaPelunasan)
      : ""

  const showManualGrid =
    manualMode && !excelSource && (qtyNum <= MANUAL_ROSTER_MAX_PCS || qtyNum === 0)

  const pcsMismatch =
    excelSource &&
    qtyNum > 0 &&
    excelRowCount > 0 &&
    qtyNum !== excelRowCount

  useEffect(() => {
    if (excelSource && excelRowCount > 0 && !pcsManualOverride) {
      setJumlahPcs(String(excelRowCount))
    }
  }, [excelSource, excelRowCount, pcsManualOverride])

  useEffect(() => {
    if (manualMode && !excelSource && sanitizedRoster.length > 0 && !pcsManualOverride) {
      setJumlahPcs(String(sanitizedRoster.length))
    }
  }, [manualMode, excelSource, sanitizedRoster.length, pcsManualOverride])

  function updateRosterLine(
    index: number,
    field: keyof CsRosterLineInput,
    value: string
  ) {
    setRosterLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    )
  }

  function addRosterRow() {
    setRosterLines((prev) => [...prev, emptyRosterLine()])
  }

  function removeRosterRow(index: number) {
    setRosterLines((prev) => prev.filter((_, i) => i !== index))
  }

  async function load(user: { role: string; id?: string; nama?: string }) {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(
        withCsApiScope(`/api/cs/antrian-desain/${id}`, user),
        { cache: "no-store" }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setItem(null)
        setLoadError(
          typeof data.message === "string"
            ? data.message
            : res.status === 404
              ? "Item antrian tidak ditemukan atau Anda tidak memiliki akses."
              : `Gagal memuat antrian (HTTP ${res.status}).`
        )
        return
      }
      setItem(data)
      if (data.perluDtf) {
        setNeedsDTF(true)
      }
      if (data.perluKancing) {
        setNeedsKancing(true)
      }
    } catch {
      setItem(null)
      setLoadError("Gagal memuat antrian. Periksa koneksi lalu coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (auth.status !== "authenticated") return
    load(auth.user)
  }, [auth.status, auth.user, id])

  useEffect(() => {
    if (!item || loading) return
    if (isCsAntrianProduksiItem(item)) {
      router.replace(`/cs/antrian-produksi/${id}`)
    }
  }, [item, loading, router, id])

  async function uploadBukti(files: FileList | null) {
    if (!files?.length || !item) return
    const file = files[0]
    const ext = getFileExtension(file.name) || "jpg"
    const saveAs = buildBuktiDpUploadFilename(item.artikelId, ext)
    const formData = new FormData()
    formData.append("files", file)
    formData.append("saveAs", saveAs)
    const res = await fetch("/api/upload", { method: "POST", body: formData })
    const json = await res.json()
    if (res.ok && json.files?.[0]?.url) {
      setBuktiDp(json.files[0].url)
    }
  }

  async function handleExcelUpload(files: FileList | null) {
    if (!files?.length) return
    const file = files[0]
    setParsingExcel(true)
    setExcelErrors([])
    setExcelWarnings([])
    try {
      const buffer = await file.arrayBuffer()
      const result = await parseExcelRosterBuffer(buffer)
      if (!result.ok) {
        setExcelErrors(result.errors)
        setExcelSource(false)
        setExcelFileName(null)
        setRosterLines([])
        return
      }
      setRosterLines(result.data.lines)
      setExcelSource(true)
      setExcelFileName(file.name)
      setExcelWarnings(result.data.warnings)
      setManualMode(false)
      setPcsManualOverride(false)
    } finally {
      setParsingExcel(false)
      if (excelInputRef.current) excelInputRef.current.value = ""
    }
  }

  function clearExcel() {
    setExcelSource(false)
    setExcelFileName(null)
    setExcelErrors([])
    setExcelWarnings([])
    setRosterLines([])
    setJumlahPcs("0")
    setPcsManualOverride(false)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!item) return
    if (!canCsSubmitInputOrder(item.statusDesain, item.fileDesainProduksi)) {
      alert("Desainer harus mengunggah CDR produksi terlebih dahulu.")
      return
    }

    if (
      qtyNum <= 0 ||
      Number.isNaN(dpNum) ||
      dpNum < 0 ||
      subtotal <= 0
    ) {
      alert("Lengkapi harga per jenis, daftar item, dan DP dengan benar.")
      return
    }

    const rosterCheck = validateExcelRosterForSubmit(sanitizedRoster, qtyNum)
    if (!rosterCheck.ok) {
      alert(rosterCheck.errors?.join("\n") ?? "Roster tidak valid.")
      return
    }
    const orderCheck = validateCsInputOrderForSubmit({
      tanggalDeadline,
      jenisProduksi,
    })
    if (!orderCheck.ok) {
      alert(orderCheck.message)
      return
    }

    const warnings: string[] = []
    if (rosterCheck.warning) warnings.push(rosterCheck.warning)
    if (pcsMismatch) {
      warnings.push(
        `Jumlah PCS (${qtyNum}) berbeda dari baris Excel (${excelRowCount}). Lanjutkan?`
      )
    }
    if (excelWarnings.length) warnings.push(...excelWarnings)
    if (warnings.length) {
      const proceed = window.confirm(warnings.join("\n\n"))
      if (!proceed) return
    }

    if (!excelSource && qtyNum > MANUAL_ROSTER_MAX_PCS) {
      alert(
        `Order > ${MANUAL_ROSTER_MAX_PCS} PCS wajib unggah Excel roster. Unduh template terlebih dahulu.`
      )
      return
    }

    setSaving(true)
    try {
      const user = readStoredUser()
      if (!user) return
      const res = await fetch(
        withCsApiScope(`/api/cs/antrian-desain/${id}`, user),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submit_input_order",
            actorName: user.nama,
            actorRole: user.role,
            jenisOrder,
            totalOrder: qtyNum,
            hargaStelan: hargaStelanNum,
            hargaAtasan: hargaAtasanNum,
            hargaBawahan: hargaBawahanNum,
            dpAmount: dpNum,
            ongkosKirim: Number.isNaN(ongkirNum) ? 0 : ongkirNum,
            tanggalDeadline,
            jenisProduksi,
            catatanFinishing,
            needsKancing,
            needsDTF,
            buktiDp,
            excelSource,
            rosterLines: sanitizedRoster,
          }),
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(
          json.message ??
            `Gagal menyimpan order (HTTP ${res.status}).`
        )
        return
      }
      router.replace(`/cs/antrian-produksi/${id}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <CsFullscreenPage
        title="Input order"
        backHref={`/cs/antrian-desain/${id}`}
      >
        <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center text-zinc-500">
          Memuat…
        </div>
      </CsFullscreenPage>
    )
  }

  if (!item) {
    return (
      <CsFullscreenPage title="Input order" backHref="/cs/antrian-desain">
        <div className="neo-card space-y-3 p-8 text-center">
          <p className="text-zinc-400">
            {loadError ?? "Item tidak ditemukan."}
          </p>
          <p className="text-xs text-zinc-500">
            ID antrian: <span className="font-mono text-zinc-400">{id}</span>
          </p>
        </div>
      </CsFullscreenPage>
    )
  }

  const readOnlyClass = "neo-input mt-1 bg-zinc-900/80"
  const selectClass =
    "neo-input mt-1 cursor-pointer py-2.5 text-sm [color-scheme:dark]"

  return (
    <CsFullscreenPage
      title="Input order"
      description={`${item.artikelId} · ${item.namaKonsumen}`}
      backHref={`/cs/antrian-desain/${id}`}
      backLabel="← Detail antrian"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="neo-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Informasi konsumen (terkunci)
          </h2>
          <dl className="grid gap-3 text-sm md:grid-cols-3">
            <div>
              <dt className="text-zinc-500">Nama</dt>
              <dd className="text-zinc-200">{item.namaKonsumen}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Telepon</dt>
              <dd className="text-zinc-200">{item.noTelepon || "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Alamat</dt>
              <dd className="whitespace-pre-wrap text-zinc-200">
                {item.alamatPengiriman || "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="neo-card p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Upload roster Excel
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Satu baris = 1 PCS. Kolom:{" "}
                {EXCEL_ROSTER_COLUMNS.join(", ")}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/cs/roster-template"
                className="neo-btn-secondary px-3 py-2 text-xs"
                download
              >
                Unduh template .xlsx
              </a>
              <label className="neo-btn-secondary cursor-pointer px-3 py-2 text-xs">
                {parsingExcel ? "Memproses…" : "Unggah Excel"}
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  disabled={parsingExcel}
                  onChange={(e) => handleExcelUpload(e.target.files)}
                />
              </label>
              {excelSource ? (
                <button
                  type="button"
                  className="neo-btn-secondary px-3 py-2 text-xs text-red-300"
                  onClick={clearExcel}
                >
                  Hapus Excel
                </button>
              ) : null}
              {!excelSource ? (
                <button
                  type="button"
                  className="neo-btn-secondary px-3 py-2 text-xs"
                  onClick={() => {
                    setManualMode(true)
                    if (rosterLines.length === 0) addRosterRow()
                  }}
                >
                  Input manual (≤{MANUAL_ROSTER_MAX_PCS} PCS)
                </button>
              ) : null}
            </div>
          </div>

          {excelFileName ? (
            <p className="mb-3 text-sm text-emerald-400">
              File: {excelFileName} · {excelRowCount} baris
            </p>
          ) : null}

          {excelErrors.length > 0 ? (
            <div className="mb-3 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-xs text-red-200">
              {excelErrors.map((err) => (
                <p key={err}>{err}</p>
              ))}
            </div>
          ) : null}

          {excelSource && sanitizedRoster.length > 0 ? (
            <RosterPreviewTable lines={sanitizedRoster} />
          ) : null}

          {showManualGrid ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[960px] text-xs">
                <thead>
                  <tr className="border-b border-zinc-700 text-left text-zinc-400">
                    <th className="w-10 p-2">No</th>
                    <th className="p-2">Nama</th>
                    <th className="w-16 p-2">Ukuran</th>
                    <th className="w-16 p-2">No.Punggung</th>
                    <th className="w-20 p-2">JenisItem</th>
                    <th className="w-24 p-2">JenisKerah</th>
                    <th className="w-24 p-2">Lengan</th>
                    <th className="w-20 p-2">Bahan</th>
                    <th className="w-16 p-2">Warna</th>
                    <th className="p-2">Keterangan</th>
                    <th className="w-16 p-2">Grup</th>
                    <th className="w-10 p-2" />
                  </tr>
                </thead>
                <tbody>
                  {rosterLines.map((line, index) => (
                    <tr
                      key={index}
                      className="border-b border-zinc-800/80 align-top"
                    >
                      <td className="p-2 text-zinc-500">{index + 1}</td>
                      <td className="p-2">
                        <input
                          className="neo-input w-full py-1.5 text-sm"
                          value={line.nama}
                          onChange={(e) =>
                            updateRosterLine(index, "nama", e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="neo-input w-full py-1.5 text-sm"
                          value={line.ukuran ?? ""}
                          onChange={(e) =>
                            updateRosterLine(index, "ukuran", e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="neo-input w-full py-1.5 text-sm"
                          value={line.nomorPunggung ?? ""}
                          onChange={(e) =>
                            updateRosterLine(
                              index,
                              "nomorPunggung",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="p-2">
                        <select
                          className={selectClass}
                          value={line.jenisItem ?? ""}
                          onChange={(e) =>
                            updateRosterLine(index, "jenisItem", e.target.value)
                          }
                        >
                          <option value="">—</option>
                          {CS_JENIS_ITEM_OPTIONS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          className={selectClass}
                          value={line.jenisKerah ?? ""}
                          onChange={(e) =>
                            updateRosterLine(index, "jenisKerah", e.target.value)
                          }
                        >
                          <option value="">—</option>
                          {CS_JENIS_KERAH_OPTIONS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select
                          className={selectClass}
                          value={line.lengan ?? ""}
                          onChange={(e) =>
                            updateRosterLine(index, "lengan", e.target.value)
                          }
                        >
                          <option value="">—</option>
                          {CS_LENGAN_OPTIONS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          className="neo-input w-full py-1.5 text-sm"
                          value={line.bahan ?? ""}
                          onChange={(e) =>
                            updateRosterLine(index, "bahan", e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="neo-input w-full py-1.5 text-sm"
                          value={line.warna ?? ""}
                          onChange={(e) =>
                            updateRosterLine(index, "warna", e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="neo-input w-full py-1.5 text-sm"
                          value={line.catatan ?? ""}
                          onChange={(e) =>
                            updateRosterLine(index, "catatan", e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="neo-input w-full py-1.5 text-sm"
                          value={line.grup ?? ""}
                          onChange={(e) =>
                            updateRosterLine(index, "grup", e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2">
                        <button
                          type="button"
                          className="text-xs text-red-400"
                          onClick={() => removeRosterRow(index)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rosterLines.length < MANUAL_ROSTER_MAX_PCS ? (
                <button
                  type="button"
                  className="neo-btn-secondary mt-3 px-3 py-2 text-xs"
                  onClick={addRosterRow}
                >
                  + Tambah baris
                </button>
              ) : null}
            </div>
          ) : !excelSource ? (
            <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
              Unggah file Excel roster atau gunakan input manual untuk order
              kecil (≤{MANUAL_ROSTER_MAX_PCS} PCS).
            </p>
          ) : null}
        </div>

        <div className="neo-card grid gap-4 p-5 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-zinc-400">Jenis order (ringkasan)</span>
            <select
              className={selectClass}
              value={jenisOrder}
              onChange={(e) => setJenisOrder(e.target.value)}
            >
              <option value="">Campuran / pilih jika tunggal</option>
              {CS_JENIS_ORDER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Jumlah PCS</span>
            <input
              type="number"
              min={1}
              className="neo-input mt-1"
              value={jumlahPcs}
              onChange={(e) => {
                setPcsManualOverride(true)
                setJumlahPcs(e.target.value)
              }}
              required
            />
            {pcsMismatch ? (
              <p className="mt-1 text-xs text-amber-300">
                PCS manual ({qtyNum}) ≠ baris Excel ({excelRowCount})
              </p>
            ) : excelSource && excelRowCount > 0 ? (
              <p className="mt-1 text-xs text-zinc-500">
                Otomatis dari Excel ({excelRowCount} baris)
              </p>
            ) : null}
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Harga Stelan (Rp/PCS)</span>
            <RupiahInput
              className="neo-input mt-1"
              value={hargaStelan}
              onChange={setHargaStelan}
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Harga Atasan (Rp/PCS)</span>
            <RupiahInput
              className="neo-input mt-1"
              value={hargaAtasan}
              onChange={setHargaAtasan}
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Harga Bawahan/Celana (Rp/PCS)</span>
            <RupiahInput
              className="neo-input mt-1"
              value={hargaBawahan}
              onChange={setHargaBawahan}
            />
          </label>

          {sanitizedRoster.length > 0 ? (
            <div className="text-sm md:col-span-2">
              <span className="text-zinc-400">Rincian qty per jenis</span>
              <p className="mt-1 text-zinc-200">
                Stelan: {countsByJenis.Stelan} · Atasan: {countsByJenis.Atasan}{" "}
                · Bawahan: {countsByJenis.Bawahan}
              </p>
              {usesPerJenisPricing({
                hargaStelan: hargaStelanNum,
                hargaAtasan: hargaAtasanNum,
                hargaBawahan: hargaBawahanNum,
              }) ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Subtotal: Stelan {countsByJenis.Stelan}×
                  {formatRupiahDisplay(hargaStelanNum || 0)} + Atasan{" "}
                  {countsByJenis.Atasan}×
                  {formatRupiahDisplay(hargaAtasanNum || 0)} + Bawahan{" "}
                  {countsByJenis.Bawahan}×
                  {formatRupiahDisplay(hargaBawahanNum || 0)}
                </p>
              ) : null}
            </div>
          ) : null}

          <label className="block text-sm md:col-span-2">
            <span className="text-zinc-400">Subtotal (harga × qty per jenis)</span>
            <RupiahInput
              className={readOnlyClass}
              value={subtotalDisplay}
              readOnly
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Ongkos kirim (jika ada)</span>
            <RupiahInput
              className="neo-input mt-1"
              value={ongkosKirim}
              onChange={setOngkosKirim}
              placeholder="Kosongkan jika ambil di toko"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Total (subtotal + ongkir)</span>
            <RupiahInput
              className={readOnlyClass}
              value={totalDisplay}
              readOnly
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">DP (Rp)</span>
            <RupiahInput
              className="neo-input mt-1"
              value={dpAmount}
              onChange={setDpAmount}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Sisa pelunasan (total − DP)</span>
            <RupiahInput
              className={readOnlyClass}
              value={sisaDisplay}
              readOnly
              placeholder="Isi DP untuk hitung otomatis"
            />
          </label>
          <div className="block text-sm md:col-span-2">
            <span className="text-zinc-400">Jenis produksi</span>
            <div className="mt-2 flex flex-wrap gap-4">
              {CS_JENIS_PRODUKSI_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 text-zinc-200"
                >
                  <input
                    type="radio"
                    name="jenisProduksi"
                    value={option}
                    checked={jenisProduksi === option}
                    onChange={() => setJenisProduksi(option)}
                  />
                  {CS_JENIS_PRODUKSI_LABELS[option]}
                </label>
              ))}
            </div>
          </div>
          <label className="block text-sm">
            <span className="text-zinc-400">Deadline</span>
            <DatePickerInput
              value={tanggalDeadline}
              onChange={setTanggalDeadline}
              required
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="text-zinc-400">Bukti DP</span>
            <p className="mt-1 text-xs text-zinc-500">
              {`File disimpan sebagai ${item.artikelId}-bukti-dp.{ekstensi}`}
            </p>
            <input
              type="file"
              accept="image/*"
              className="neo-input mt-1"
              onChange={(e) => uploadBukti(e.target.files)}
            />
            {buktiDp ? (
              <p className="mt-1 text-xs text-emerald-400">Bukti tersimpan.</p>
            ) : null}
          </label>
        </div>

        <div className="neo-card p-5">
          <h2 className="mb-3 text-lg font-semibold text-white">
            Proses finishing khusus
          </h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={needsKancing}
                onChange={(e) => setNeedsKancing(e.target.checked)}
              />
              Perlu kancing
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={needsDTF}
                onChange={(e) => setNeedsDTF(e.target.checked)}
              />
              Perlu DTF
            </label>
          </div>
          <label className="mt-4 block text-sm">
            <span className="text-zinc-400">Catatan finishing</span>
            <textarea
              className="neo-input mt-1 min-h-[80px]"
              value={catatanFinishing}
              onChange={(e) => setCatatanFinishing(e.target.value)}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving || parsingExcel}
          className="neo-btn-primary px-6 py-3 text-sm"
        >
          {saving ? "Menyimpan…" : "Simpan order"}
        </button>
      </form>
    </CsFullscreenPage>
  )
}
