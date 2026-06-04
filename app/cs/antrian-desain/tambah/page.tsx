"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import CsFullscreenPage from "@/components/cs/cs-fullscreen-page"
import { useAuthGuard } from "@/hooks/use-auth-guard"
import type { DesignFile } from "@/lib/cs-antrian-desain"

type ArtikelForm = {
  namaArtikel: string
  spp: string
  catatanDesain: string
  perluDtf: boolean
  catatanDtf: string
  desainUtama: DesignFile[]
  logoSponsor: DesignFile[]
}

const emptyArtikel = (): ArtikelForm => ({
  namaArtikel: "",
  spp: "",
  catatanDesain: "",
  perluDtf: false,
  catatanDtf: "",
  desainUtama: [],
  logoSponsor: [],
})

function formatApiError(
  body: { message?: string; detail?: string },
  fallback: string
): string {
  const message = body.message?.trim() || fallback
  const detail = body.detail?.trim()
  if (detail && detail !== message) {
    return `${message}\n\n${detail}`
  }
  return detail || message
}

export default function TambahDesainPage() {
  const router = useRouter()
  const [namaCs, setNamaCs] = useState("CS")
  const [csId, setCsId] = useState<string | undefined>()
  const [namaKonsumen, setNamaKonsumen] = useState("")
  const [telepon, setTelepon] = useState("")
  const [alamat, setAlamat] = useState("")
  const [artikels, setArtikels] = useState<ArtikelForm[]>([emptyArtikel()])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [uploading, setUploading] = useState("")

  const auth = useAuthGuard({ roles: ["cs", "owner"] })

  useEffect(() => {
    if (auth.status !== "authenticated") return
    const user = auth.user
    setNamaCs(user.nama || user.divisi || "CS")
    setCsId(user.id)
  }, [auth.status, auth.user])

  function updateArtikel(index: number, patch: Partial<ArtikelForm>) {
    setArtikels((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )
  }

  function addArtikel() {
    setArtikels((prev) => [...prev, emptyArtikel()])
  }

  function removeArtikel(index: number) {
    if (artikels.length <= 1) return
    setArtikels((prev) => prev.filter((_, i) => i !== index))
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

  const canSubmit =
    namaKonsumen.trim() &&
    telepon.trim() &&
    alamat.trim() &&
    artikels.every((a) => a.namaArtikel.trim())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setSaveError("")
    setSaving(true)
    try {
      const res = await fetch("/api/cs/antrian-desain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaCs,
          csId,
          namaKonsumen: namaKonsumen.trim(),
          telepon: telepon.trim(),
          alamat: alamat.trim(),
          artikels: artikels.map((a) => ({
            namaArtikel: a.namaArtikel.trim(),
            spp: a.spp.trim() || undefined,
            catatanDesain: a.catatanDesain.trim() || undefined,
            perluDtf: a.perluDtf,
            catatanDtf: a.perluDtf ? a.catatanDtf.trim() || undefined : undefined,
            desainUtama: a.desainUtama,
            logoSponsor: a.logoSponsor,
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setSaveError(formatApiError(err, "Gagal menyimpan desain"))
        return
      }

      const created = await res.json()
      const firstId = Array.isArray(created) ? created[0]?.id : created?.id

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
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="neo-card p-5 md:p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Informasi konsumen
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-400">
                Nama konsumen <span className="text-red-400">*</span>
              </span>
              <input
                className="neo-input"
                value={namaKonsumen}
                onChange={(e) => setNamaKonsumen(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-400">
                No. telepon <span className="text-red-400">*</span>
              </span>
              <input
                className="neo-input"
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-zinc-400">
                Alamat pengiriman <span className="text-red-400">*</span>
              </span>
              <textarea
                className="neo-input min-h-[88px]"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                required
              />
            </label>
          </div>
        </div>

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
                  className="neo-input"
                  value={artikel.namaArtikel}
                  onChange={(e) =>
                    updateArtikel(index, { namaArtikel: e.target.value })
                  }
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-zinc-400">No. SPP</span>
                <input
                  className="neo-input"
                  value={artikel.spp}
                  onChange={(e) => updateArtikel(index, { spp: e.target.value })}
                />
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
            disabled={!canSubmit || saving}
            className="neo-btn-primary text-sm disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan ke antrian"}
          </button>
        </div>
      </form>
    </CsFullscreenPage>
  )
}
