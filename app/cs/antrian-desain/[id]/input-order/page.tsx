"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import CsFullscreenPage from "@/components/cs/cs-fullscreen-page"
import { DatePickerInput } from "@/components/ui/date-picker-input"
import { RupiahInput } from "@/components/ui/rupiah-input"
import { readStoredUser } from "@/lib/auth"
import { useAuthGuard } from "@/hooks/use-auth-guard"
import type { DesignQueueItemRecord } from "@/lib/cs-antrian-desain"
import {
  CS_JENIS_KERAH_OPTIONS,
  CS_JENIS_ORDER_OPTIONS,
  CS_LENGAN_OPTIONS,
  canCsSubmitInputOrder,
} from "@/lib/cs-input-order"
import { isCsAntrianProduksiItem } from "@/lib/cs-antrian-produksi"
import { formatRupiahDisplay, parseRupiahInput } from "@/lib/format-rupiah"
import {
  buildBuktiDpUploadFilename,
  getFileExtension,
} from "@/lib/upload-filename"
import { withCsApiScope } from "@/lib/cs-design-queue-access"

export default function CsInputOrderPage() {
  const router = useRouter()
  const auth = useAuthGuard({ roles: ["cs", "owner"] })
  const params = useParams()
  const id = params.id as string

  const [item, setItem] = useState<DesignQueueItemRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [jenisOrder, setJenisOrder] = useState("")
  const [jenisBahan, setJenisBahan] = useState("")
  const [jenisKerah, setJenisKerah] = useState("")
  const [lengan, setLengan] = useState("")
  const [jumlahPcs, setJumlahPcs] = useState("1")
  const [hargaSatuan, setHargaSatuan] = useState("")
  const [dpAmount, setDpAmount] = useState("")
  const [ongkosKirim, setOngkosKirim] = useState("")
  const [tanggalDeadline, setTanggalDeadline] = useState("")
  const [catatanFinishing, setCatatanFinishing] = useState("")
  const [needsKancing, setNeedsKancing] = useState(false)
  const [needsDTF, setNeedsDTF] = useState(false)
  const [buktiDp, setBuktiDp] = useState<string | null>(null)

  const qtyNum = useMemo(() => {
    const n = parseInt(jumlahPcs, 10)
    return Number.isNaN(n) || n < 1 ? 0 : n
  }, [jumlahPcs])

  const hargaNum = useMemo(() => parseRupiahInput(hargaSatuan), [hargaSatuan])
  const ongkirNum = useMemo(
    () => (ongkosKirim.trim() ? parseRupiahInput(ongkosKirim) : 0),
    [ongkosKirim]
  )
  const dpNum = useMemo(() => parseRupiahInput(dpAmount), [dpAmount])

  const subtotal = useMemo(() => {
    if (qtyNum <= 0 || Number.isNaN(hargaNum) || hargaNum < 0) return 0
    return qtyNum * hargaNum
  }, [qtyNum, hargaNum])

  const totalHarga = useMemo(() => {
    const ongkir = Number.isNaN(ongkirNum) ? 0 : ongkirNum
    return subtotal + ongkir
  }, [subtotal, ongkirNum])

  const sisaPelunasan = useMemo(() => {
    if (Number.isNaN(dpNum) || dpNum < 0) return totalHarga
    return Math.max(0, totalHarga - dpNum)
  }, [totalHarga, dpNum])

  const totalDisplay = subtotal > 0 ? formatRupiahDisplay(subtotal) : ""
  const sisaDisplay =
    totalHarga > 0 && !Number.isNaN(dpNum)
      ? formatRupiahDisplay(sisaPelunasan)
      : ""

  async function load(user: { role: string; id?: string; nama?: string }) {
    setLoading(true)
    const res = await fetch(withCsApiScope(`/api/cs/antrian-desain/${id}`, user), {
      cache: "no-store",
    })
    if (!res.ok) {
      setItem(null)
      setLoading(false)
      return
    }
    const data = await res.json()
    setItem(data)
    if (data.perluDtf) {
      setNeedsDTF(true)
    }
    setLoading(false)
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!item) return
    if (!canCsSubmitInputOrder(item.statusDesain, item.fileDesainProduksi)) {
      alert("Desainer harus mengunggah CDR produksi terlebih dahulu.")
      return
    }

    if (
      qtyNum <= 0 ||
      Number.isNaN(hargaNum) ||
      hargaNum < 0 ||
      Number.isNaN(dpNum) ||
      dpNum < 0
    ) {
      alert("Lengkapi harga satuan, jumlah, dan DP dengan benar.")
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
          jenisBahan,
          jenisKerah,
          lengan,
          totalOrder: qtyNum,
          hargaSatuan: hargaNum,
          dpAmount: dpNum,
          ongkosKirim: Number.isNaN(ongkirNum) ? 0 : ongkirNum,
          tanggalDeadline,
          catatanFinishing,
          needsKancing,
          needsDTF,
          buktiDp,
        }),
        }
      )
      const json = await res.json()
      if (!res.ok) {
        alert(json.message ?? "Gagal menyimpan order")
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
      <CsFullscreenPage
        title="Input order"
        backHref="/cs/antrian-desain"
      >
        <div className="neo-card p-8 text-center text-zinc-500">
          Item tidak ditemukan.
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

        <div className="neo-card grid gap-4 p-5 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-zinc-400">Jenis order</span>
            <select
              className={selectClass}
              value={jenisOrder}
              onChange={(e) => setJenisOrder(e.target.value)}
            >
              <option value="">Pilih jenis order</option>
              {CS_JENIS_ORDER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Bahan</span>
            <input
              className="neo-input mt-1"
              value={jenisBahan}
              onChange={(e) => setJenisBahan(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Jenis kerah</span>
            <select
              className={selectClass}
              value={jenisKerah}
              onChange={(e) => setJenisKerah(e.target.value)}
            >
              <option value="">Pilih jenis kerah</option>
              {CS_JENIS_KERAH_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Lengan</span>
            <select
              className={selectClass}
              value={lengan}
              onChange={(e) => setLengan(e.target.value)}
            >
              <option value="">Pilih lengan</option>
              {CS_LENGAN_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Harga satuan (Rp)</span>
            <RupiahInput
              className="neo-input mt-1"
              value={hargaSatuan}
              onChange={setHargaSatuan}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Jumlah (PCS)</span>
            <input
              type="number"
              min={1}
              className="neo-input mt-1"
              value={jumlahPcs}
              onChange={(e) => setJumlahPcs(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="text-zinc-400">
              Total harga (satuan × jumlah)
            </span>
            <RupiahInput
              className={readOnlyClass}
              value={totalDisplay}
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
            <span className="text-zinc-400">DP (Rp)</span>
            <RupiahInput
              className="neo-input mt-1"
              value={dpAmount}
              onChange={setDpAmount}
              required
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="text-zinc-400">
              Sisa pelunasan (total + ongkir − DP)
            </span>
            <RupiahInput
              className={readOnlyClass}
              value={sisaDisplay}
              readOnly
              placeholder="Isi DP untuk hitung otomatis"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Deadline</span>
            <DatePickerInput
              value={tanggalDeadline}
              onChange={setTanggalDeadline}
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
              placeholder="Contoh: warna kancing, posisi DTF, dll."
            />
          </label>
        </div>

        <button type="submit" disabled={saving} className="neo-btn-primary px-6 py-3 text-sm">
          {saving ? "Menyimpan…" : "Simpan order"}
        </button>
      </form>
    </CsFullscreenPage>
  )
}
