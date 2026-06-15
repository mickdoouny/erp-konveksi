"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import CsFullscreenPage from "@/components/cs/cs-fullscreen-page"
import { useAuthGuard } from "@/hooks/use-auth-guard"
import { statusLabel, type DesignFile } from "@/lib/cs-antrian-desain"
import {
  hasCsTambahDesainFieldErrors,
  validateCsTambahDesainForm,
  type CsTambahDesainFieldErrors,
} from "@/lib/cs-antrian-desain-form"
import type { KonsumenHistoryItem } from "@/lib/konsumen-phone-lookup"
import { withCsApiScope } from "@/lib/cs-api-scope"
import { isValidIndonesianPhone } from "@/lib/phone-normalize"

type ArtikelForm = {
  namaArtikel: string
  spp: string
  catatanDesain: string
  perluDtf: boolean
  perluKancing: boolean
  perluProving: boolean
  catatanDtf: string
  desainUtama: DesignFile[]
  logoSponsor: DesignFile[]
}

const emptyArtikel = (spp = ""): ArtikelForm => ({
  namaArtikel: "",
  spp,
  catatanDesain: "",
  perluDtf: false,
  perluKancing: false,
  perluProving: false,
  catatanDtf: "",
  desainUtama: [],
  logoSponsor: [],
})

function formatApiError(
  body: { message?: string; detail?: string; errors?: Array<{ field: string; message: string }> },
  fallback: string
): string {
  const message = body.message?.trim() || fallback
  const detail = body.detail?.trim()
  const fieldLines =
    body.errors?.map((e) => `• ${e.message}`).join("\n") ?? ""

  if (fieldLines) {
    return `${message}\n\n${fieldLines}`
  }
  if (detail && detail !== message) {
    return `${message}\n\n${detail}`
  }
  return detail || message
}

function fieldErrorClass(hasError: boolean): string {
  return hasError ? "border-red-500/60 focus:border-red-400" : ""
}

export default function TambahDesainPage() {
  const router = useRouter()
  const [namaCs, setNamaCs] = useState("CS")
  const [csId, setCsId] = useState<string | undefined>()
  const [csUsername, setCsUsername] = useState<string | undefined>()
  const [groupSpp, setGroupSpp] = useState("")
  const [sppLoading, setSppLoading] = useState(true)
  const [namaKonsumen, setNamaKonsumen] = useState("")
  const [telepon, setTelepon] = useState("")
  const [alamat, setAlamat] = useState("")
  const [artikels, setArtikels] = useState<ArtikelForm[]>([emptyArtikel()])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<CsTambahDesainFieldErrors | null>(
    null
  )
  const [uploading, setUploading] = useState("")
  const [lookupHint, setLookupHint] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [orderHistory, setOrderHistory] = useState<KonsumenHistoryItem[]>([])
  const artikelSectionRef = useRef<HTMLDivElement>(null)
  const phoneInputRef = useRef<HTMLInputElement>(null)
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lookupRequestIdRef = useRef(0)

  const auth = useAuthGuard({ roles: ["cs", "owner"] })

  useEffect(() => {
    if (auth.status !== "authenticated") return
    const user = auth.user
    setNamaCs(user.nama || user.divisi || "CS")
    setCsId(user.id)
    setCsUsername(user.username)
  }, [auth.status, auth.user])

  useEffect(() => {
    if (auth.status !== "authenticated") return

    let cancelled = false
    setSppLoading(true)

    void (async () => {
      try {
        const res = await fetch(
          withCsApiScope("/api/cs/next-spp-number", auth.user)
        )
        const data = await res.json()
        if (cancelled || !res.ok || !data.sppNumber) return

        setGroupSpp((current) => current || data.sppNumber)
        setArtikels((prev) => {
          if (prev.some((row) => row.spp.trim())) return prev
          return prev.map((row) => ({ ...row, spp: data.sppNumber }))
        })
      } catch {
        /* keep empty — server assigns on save */
      } finally {
        if (!cancelled) setSppLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [auth.status, auth.user])

  useEffect(() => {
    phoneInputRef.current?.focus()
  }, [])

  useEffect(() => {
    return () => {
      if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current)
    }
  }, [])

  function updateArtikel(index: number, patch: Partial<ArtikelForm>) {
    setArtikels((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )
  }

  function addArtikel() {
    const sharedSpp = artikels[0]?.spp.trim() || groupSpp
    setArtikels((prev) => [...prev, emptyArtikel(sharedSpp)])
  }

  function removeArtikel(index: number) {
    if (artikels.length <= 1) return
    setArtikels((prev) => prev.filter((_, i) => i !== index))
  }

  function clearFieldError(key: keyof CsTambahDesainFieldErrors) {
    setFieldErrors((prev) => {
      if (!prev) return null
      const next = { ...prev }
      delete next[key]
      if (key === "artikelNama") delete next.artikelNama
      const hasRemaining =
        next.namaKonsumen ||
        next.telepon ||
        next.alamat ||
        (next.artikelNama && Object.keys(next.artikelNama).length > 0)
      return hasRemaining ? next : null
    })
  }

  function isArtikelEmpty(row: ArtikelForm): boolean {
    return (
      !row.namaArtikel.trim() &&
      !row.spp.trim() &&
      !row.catatanDesain.trim() &&
      !row.perluDtf &&
      !row.perluKancing &&
      !row.perluProving &&
      !row.catatanDtf.trim() &&
      row.desainUtama.length === 0 &&
      row.logoSponsor.length === 0
    )
  }

  function applyOrderUlang(item: KonsumenHistoryItem) {
    const prefilled: ArtikelForm = {
      namaArtikel: item.namaArtikel,
      spp: item.sppNumber ?? "",
      catatanDesain: item.catatan ?? "",
      perluDtf: item.perluDtf,
      perluKancing: item.perluKancing ?? false,
      perluProving: item.perluProving ?? false,
      catatanDtf: item.catatanDtf ?? "",
      desainUtama:
        item.desainUtama.length > 0 ? item.desainUtama : item.hasilDesain,
      logoSponsor: item.logoSponsor,
    }

    setArtikels((prev) => {
      if (prev.length === 1 && isArtikelEmpty(prev[0])) {
        return [prefilled]
      }
      return [...prev, prefilled]
    })

    setFieldErrors((prev) => {
      if (!prev?.artikelNama) return prev
      const nextArtikel = { ...prev.artikelNama }
      delete nextArtikel[0]
      return {
        ...prev,
        artikelNama:
          Object.keys(nextArtikel).length > 0 ? nextArtikel : undefined,
      }
    })

    requestAnimationFrame(() => {
      artikelSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    })
  }

  function scheduleKonsumenLookup(rawPhone: string) {
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current)
    lookupTimerRef.current = setTimeout(() => {
      void lookupKonsumenByPhone(rawPhone)
    }, 400)
  }

  async function lookupKonsumenByPhone(rawPhone: string) {
    const trimmed = rawPhone.trim()
    if (!trimmed || !isValidIndonesianPhone(trimmed)) {
      setLookupHint("")
      setOrderHistory([])
      return
    }

    const requestId = ++lookupRequestIdRef.current
    setLookupLoading(true)
    try {
      const res = await fetch(
        `/api/cs/konsumen-lookup?phone=${encodeURIComponent(trimmed)}`
      )
      const data = await res.json()

      if (requestId !== lookupRequestIdRef.current) return

      if (!res.ok) {
        setLookupHint("")
        setOrderHistory([])
        return
      }

      if (!data.found) {
        setLookupHint("Konsumen baru — nomor belum pernah terdaftar.")
        setOrderHistory([])
        return
      }

      const lastDate = data.history?.[0]?.createdAt
      const lastLabel = lastDate
        ? new Date(lastDate).toLocaleDateString("id-ID")
        : "—"

      setLookupHint(
        `Konsumen dikenali: ${data.nama} (order terakhir ${lastLabel}).`
      )
      setNamaKonsumen(data.nama ?? "")
      setAlamat(data.alamat ?? "")
      setOrderHistory(Array.isArray(data.history) ? data.history : [])
      clearFieldError("namaKonsumen")
      clearFieldError("alamat")
    } catch {
      if (requestId !== lookupRequestIdRef.current) return
      setLookupHint("")
      setOrderHistory([])
    } finally {
      if (requestId === lookupRequestIdRef.current) {
        setLookupLoading(false)
      }
    }
  }

  async function uploadFiles(
    index: number,
    field: "desainUtama" | "logoSponsor",
    files: FileList | null
  ) {
    if (!files?.length) return

    const key = `${index}-${field}`
    setUploading(key)

    try {
      const formData = new FormData()
      for (const file of Array.from(files)) {
        formData.append("files", file)
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        alert("Gagal upload file")
        return
      }

      const current = artikels[index][field]
      updateArtikel(index, {
        [field]: [...current, ...(data.files || [])],
      })
    } catch {
      alert("Terjadi kesalahan upload")
    } finally {
      setUploading("")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validation = validateCsTambahDesainForm({
      namaKonsumen,
      telepon,
      alamat,
      artikels,
    })

    if (hasCsTambahDesainFieldErrors(validation)) {
      setFieldErrors(validation)
      setSaveError(validation.summary ?? "Lengkapi semua kolom wajib sebelum menyimpan")
      return
    }

    setFieldErrors(null)
    setSaveError("")
    setSaving(true)
    try {
      const res = await fetch("/api/cs/antrian-desain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaCs,
          csId,
          csUsername,
          namaKonsumen: namaKonsumen.trim(),
          telepon: telepon.trim(),
          alamat: alamat.trim(),
          artikels: artikels.map((a) => ({
            namaArtikel: a.namaArtikel.trim(),
            spp: a.spp.trim() || undefined,
            catatanDesain: a.catatanDesain.trim() || undefined,
            perluDtf: a.perluDtf,
            perluKancing: a.perluKancing,
            perluProving: a.perluProving,
            catatanDtf: a.perluDtf ? a.catatanDtf.trim() || undefined : undefined,
            desainUtama: a.desainUtama,
            logoSponsor: a.logoSponsor,
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setSaveError(formatApiError(err, "Gagal menyimpan desain"))
        if (Array.isArray(err.errors)) {
          const next: CsTambahDesainFieldErrors = {
            summary: err.message,
          }
          for (const row of err.errors) {
            if (row.field === "namaKonsumen") next.namaKonsumen = row.message
            if (row.field === "telepon") next.telepon = row.message
            if (row.field === "alamat") next.alamat = row.message
            const artikelMatch = row.field.match(/^artikels\.(\d+)\.namaArtikel$/)
            if (artikelMatch) {
              const idx = Number(artikelMatch[1])
              next.artikelNama = { ...(next.artikelNama ?? {}), [idx]: row.message }
            }
          }
          setFieldErrors(next)
        }
        return
      }

      const created = await res.json()
      const items = Array.isArray(created) ? created : created.items
      const firstId = Array.isArray(items) ? items[0]?.id : items?.id

      if (firstId) {
        router.push(`/cs/antrian-desain/${firstId}`)
      } else {
        router.push("/cs/antrian-desain")
      }
    } catch {
      setSaveError("Terjadi kesalahan jaringan. Periksa koneksi lalu coba lagi.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <CsFullscreenPage
      title="Tambah desain ke antrian"
      description="Satu konsumen dapat memiliki beberapa artikel dalam satu pengajuan (grup SPP & designId bersama)."
      backHref="/cs/antrian-desain"
      backLabel="← Batal"
    >
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="neo-card p-5 md:p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Informasi konsumen
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-zinc-400">
                No. telepon <span className="text-red-400">*</span>
              </span>
              <input
                ref={phoneInputRef}
                className={`neo-input ${fieldErrorClass(Boolean(fieldErrors?.telepon))}`}
                value={telepon}
                onChange={(e) => {
                  const value = e.target.value
                  setTelepon(value)
                  clearFieldError("telepon")
                  setLookupHint("")
                  setOrderHistory([])
                  scheduleKonsumenLookup(value)
                }}
                onBlur={(e) => {
                  if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current)
                  void lookupKonsumenByPhone(e.target.value)
                }}
                placeholder="082112341234 atau +62 821-1234-1234"
                aria-invalid={Boolean(fieldErrors?.telepon)}
              />
              {fieldErrors?.telepon ? (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.telepon}</p>
              ) : null}
              {lookupLoading ? (
                <p className="mt-1 text-xs text-orange-400">Mencari data konsumen…</p>
              ) : lookupHint ? (
                <p className="mt-1 text-xs text-sky-300">{lookupHint}</p>
              ) : null}
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-400">
                Nama konsumen <span className="text-red-400">*</span>
              </span>
              <input
                className={`neo-input ${fieldErrorClass(Boolean(fieldErrors?.namaKonsumen))}`}
                value={namaKonsumen}
                onChange={(e) => {
                  setNamaKonsumen(e.target.value)
                  clearFieldError("namaKonsumen")
                }}
                aria-invalid={Boolean(fieldErrors?.namaKonsumen)}
              />
              {fieldErrors?.namaKonsumen ? (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.namaKonsumen}</p>
              ) : null}
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-zinc-400">
                Alamat pengiriman <span className="text-red-400">*</span>
              </span>
              <textarea
                className={`neo-input min-h-[88px] ${fieldErrorClass(Boolean(fieldErrors?.alamat))}`}
                value={alamat}
                onChange={(e) => {
                  setAlamat(e.target.value)
                  clearFieldError("alamat")
                }}
                aria-invalid={Boolean(fieldErrors?.alamat)}
              />
              {fieldErrors?.alamat ? (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.alamat}</p>
              ) : null}
            </label>
          </div>
        </div>

        {orderHistory.length > 0 ? (
          <div className="neo-card p-5 md:p-6">
            <h2 className="mb-1 text-lg font-semibold text-white">
              Riwayat order
            </h2>
            <p className="mb-4 text-sm text-zinc-500">
              Artikel yang pernah dipesan dengan nomor ini. Klik order ulang untuk
              mengisi form dengan desain yang sama.
            </p>
            <div className="space-y-3">
              {orderHistory.map((item) => (
                <div
                  key={item.designQueueItemId}
                  className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900">
                      {item.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.previewUrl}
                          alt={`Preview ${item.namaArtikel}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">
                          Tanpa preview
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">
                        {item.namaArtikel}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {item.artikelId}
                        {item.jenisOrder ? ` · ${item.jenisOrder}` : ""}
                        {item.jenisProduksi ? ` · ${item.jenisProduksi}` : ""}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(item.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {" · "}
                        {statusLabel(item.statusDesain)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyOrderUlang(item)}
                    className="shrink-0 rounded-lg border border-orange-500/40 px-3 py-2 text-sm font-semibold text-orange-300 hover:border-orange-400 hover:bg-orange-500/10"
                  >
                    Order ulang
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div ref={artikelSectionRef} className="space-y-6">
        {artikels.map((artikel, index) => (
          <div key={index} className="neo-card p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Artikel {index + 1}
              </h2>
              {artikels.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeArtikel(index)}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Hapus
                </button>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-zinc-400">
                  Nama artikel <span className="text-red-400">*</span>
                </span>
                <input
                  className={`neo-input ${fieldErrorClass(Boolean(fieldErrors?.artikelNama?.[index]))}`}
                  value={artikel.namaArtikel}
                  onChange={(e) => {
                    updateArtikel(index, { namaArtikel: e.target.value })
                    setFieldErrors((prev) => {
                      if (!prev?.artikelNama?.[index]) return prev
                      const nextArtikel = { ...prev.artikelNama }
                      delete nextArtikel[index]
                      return {
                        ...prev,
                        artikelNama:
                          Object.keys(nextArtikel).length > 0 ? nextArtikel : undefined,
                      }
                    })
                  }}
                  aria-invalid={Boolean(fieldErrors?.artikelNama?.[index])}
                />
                {fieldErrors?.artikelNama?.[index] ? (
                  <p className="mt-1 text-xs text-red-400">
                    {fieldErrors.artikelNama[index]}
                  </p>
                ) : null}
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-zinc-400">No. SPP</span>
                <input
                  className="neo-input bg-zinc-900/60 text-zinc-300"
                  value={artikel.spp}
                  readOnly
                  aria-readonly
                />
                <p className="mt-1 text-xs text-zinc-500">
                  {sppLoading && index === 0
                    ? "Membuat nomor SPP otomatis…"
                    : "Nomor SPP otomatis"}
                </p>
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="mb-1 block text-zinc-400">Catatan desain</span>
                <textarea
                  className="neo-input min-h-[72px]"
                  value={artikel.catatanDesain}
                  onChange={(e) =>
                    updateArtikel(index, { catatanDesain: e.target.value })
                  }
                />
              </label>
              <div className="md:col-span-2 space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={artikel.perluDtf}
                      onChange={(e) =>
                        updateArtikel(index, {
                          perluDtf: e.target.checked,
                          catatanDtf: e.target.checked ? artikel.catatanDtf : "",
                        })
                      }
                    />
                    Perlu DTF
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={artikel.perluKancing}
                      onChange={(e) =>
                        updateArtikel(index, { perluKancing: e.target.checked })
                      }
                    />
                    Perlu kancing
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={artikel.perluProving}
                      onChange={(e) =>
                        updateArtikel(index, { perluProving: e.target.checked })
                      }
                    />
                    Perlu proving
                  </label>
                </div>
                {artikel.perluDtf ? (
                  <label className="block text-sm">
                    <span className="mb-1 block text-zinc-400">Catatan DTF</span>
                    <textarea
                      className="neo-input min-h-[64px]"
                      value={artikel.catatanDtf}
                      placeholder="Posisi print, ukuran, warna film, dll."
                      onChange={(e) =>
                        updateArtikel(index, { catatanDtf: e.target.value })
                      }
                    />
                  </label>
                ) : null}
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-zinc-400">Desain utama</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,.cdr,.pdf"
                  className="neo-input"
                  onChange={(e) =>
                    uploadFiles(index, "desainUtama", e.target.files)
                  }
                />
                {uploading === `${index}-desainUtama` ? (
                  <p className="mt-1 text-xs text-orange-400">Mengunggah…</p>
                ) : null}
                {artikel.desainUtama.length > 0 ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    {artikel.desainUtama.length} file terunggah
                  </p>
                ) : null}
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-zinc-400">Logo sponsor</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,.cdr,.pdf"
                  className="neo-input"
                  onChange={(e) =>
                    uploadFiles(index, "logoSponsor", e.target.files)
                  }
                />
                {uploading === `${index}-logoSponsor` ? (
                  <p className="mt-1 text-xs text-orange-400">Mengunggah…</p>
                ) : null}
              </label>
            </div>
          </div>
        ))}
        </div>

        {saveError ? (
          <div
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-300 whitespace-pre-wrap"
          >
            {saveError}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addArtikel}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-orange-500/50"
          >
            + Tambah artikel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="neo-btn-primary text-sm disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan ke antrian"}
          </button>
        </div>
      </form>
    </CsFullscreenPage>
  )
}
