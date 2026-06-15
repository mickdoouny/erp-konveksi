"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AntrianDesainDetailStatusCard } from "@/components/cs/antrian-desain-detail-status-card"
import DesignPreviewPair from "@/components/cs/design-preview-pair"
import { DesignQueueNotesSection } from "@/components/cs/design-queue-notes-section"
import { EditKonsumenModal } from "@/components/cs/edit-konsumen-modal"
import CsShell from "@/components/layout/cs-shell"
import { BtnPrimary, BtnRevisi } from "@/components/ui/buttons"
import { useAuthGuard } from "@/hooks/use-auth-guard"
import {
  canCsEditKonsumen,
  csAntrianDesainRowActions,
  type DesignQueueItemRecord,
  type EditKonsumenPrefill,
} from "@/lib/cs-antrian-desain"
import { isCsAntrianProduksiItem } from "@/lib/cs-antrian-produksi"
import type { DesignQueueMessageRecord } from "@/lib/design-queue-notes"
import { withCsApiScope } from "@/lib/cs-api-scope"
import { formatQueueItemSubtitle } from "@/lib/cs-queue-identifiers"

type DetailItem = DesignQueueItemRecord & {
  messages?: DesignQueueMessageRecord[]
  FinalOrder?: {
    AccountingTransaction?: { paymentStatus: string } | null
  } | null
}

export default function CsAntrianDesainDetailPage() {
  const router = useRouter()
  const auth = useAuthGuard({ roles: ["cs", "owner"] })
  const params = useParams()
  const id = params.id as string

  const [item, setItem] = useState<DetailItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [catatanRevisi, setCatatanRevisi] = useState("")
  const [editKonsumenItem, setEditKonsumenItem] =
    useState<EditKonsumenPrefill | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [sessionUser, setSessionUser] = useState<{
    role: string
    id?: string
    nama?: string
  } | null>(null)
  const successToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  async function loadItem(user = sessionUser) {
    if (!user) return
    try {
      setLoading(true)
      const res = await fetch(
        withCsApiScope(`/api/cs/antrian-desain/${id}`, user),
        {
          cache: "no-store",
        }
      )
      if (!res.ok) {
        setItem(null)
        return
      }
      const data = await res.json()
      setItem(data)
      setCatatanRevisi("")
    } catch {
      setItem(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      if (successToastTimerRef.current) {
        clearTimeout(successToastTimerRef.current)
      }
    }
  }, [])

  function showSuccessToast(message: string) {
    if (successToastTimerRef.current) {
      clearTimeout(successToastTimerRef.current)
    }
    setSuccessToast(message)
    successToastTimerRef.current = setTimeout(() => {
      setSuccessToast(null)
      successToastTimerRef.current = null
    }, 4500)
  }

  useEffect(() => {
    if (auth.status !== "authenticated") return
    const user = auth.user

    setSessionUser(user)
    queueMicrotask(() => {
      void loadItem(user)
    })
  }, [auth.status, auth.user, id])

  useEffect(() => {
    if (!item || loading) return
    if (isCsAntrianProduksiItem(item)) {
      router.replace(`/cs/antrian-produksi/${id}`)
    }
  }, [item, loading, router, id])

  async function patchItem(body: Record<string, unknown>) {
    if (!sessionUser) return
    setSaving(true)
    try {
      const res = await fetch(
        withCsApiScope(`/api/cs/antrian-desain/${id}`, sessionUser),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.message ?? "Gagal memperbarui status")
        return
      }
      await loadItem()
    } catch {
      alert("Gagal memperbarui status")
    } finally {
      setSaving(false)
    }
  }

  async function submitEditKonsumen(payload: {
    namaKonsumen: string
    noTelepon: string
    alamatPengiriman: string
  }) {
    if (!editKonsumenItem || !sessionUser) {
      return { ok: false, message: "Data antrian tidak ditemukan" }
    }

    setSaving(true)
    try {
      const res = await fetch(
        withCsApiScope(
          `/api/cs/antrian-desain/${editKonsumenItem.id}`,
          sessionUser
        ),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_konsumen", ...payload }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        return {
          ok: false,
          message: data.message ?? "Gagal menyimpan data konsumen",
        }
      }

      setEditKonsumenItem(null)
      setItem(data)
      showSuccessToast("Informasi konsumen berhasil diperbarui")
      return { ok: true }
    } catch {
      return { ok: false, message: "Terjadi kesalahan jaringan" }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <CsShell title="Detail antrian desain">
        <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center text-zinc-500">
          Memuat detail…
        </div>
      </CsShell>
    )
  }

  if (!item) {
    return (
      <CsShell title="Detail antrian desain">
        <div className="neo-card p-8 text-center">
          <p className="text-zinc-400">Item tidak ditemukan.</p>
          <Link
            href="/cs/antrian-desain"
            className="mt-4 inline-block text-orange-400 hover:text-orange-300"
          >
            ← Kembali ke antrian
          </Link>
        </div>
      </CsShell>
    )
  }

  const rowActions = csAntrianDesainRowActions(
    item.statusDesain,
    item.fileDesainProduksi
  )
  const canEditKonsumen = canCsEditKonsumen(item.statusDesain)

  return (
    <CsShell
      title="Detail antrian desain"
      description={formatQueueItemSubtitle({
        sppNumber: item.sppNumber,
        artikelId: item.artikelId,
        namaArtikel: item.namaArtikel,
        designId: item.designId,
      })}
      actions={
        <Link
          href="/cs/antrian-desain"
          className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:border-orange-500/50 hover:text-orange-400"
        >
          ← Antrian
        </Link>
      }
    >
      {successToast ? (
        <p className="mb-4 rounded-xl border border-emerald-500/35 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100/95">
          {successToast}
        </p>
      ) : null}

      <AntrianDesainDetailStatusCard
        item={item}
        canEditKonsumen={canEditKonsumen}
        editKonsumenDisabledTitle="Data konsumen terkunci setelah input order"
        onEditKonsumen={() =>
          setEditKonsumenItem({
            id: item.id,
            namaKonsumen: item.namaKonsumen,
            noTelepon: item.noTelepon,
            alamatPengiriman: item.alamatPengiriman,
            sppNumber: item.sppNumber,
          })
        }
      />

      <div className="my-6">
        <DesignPreviewPair item={item} />
      </div>

      <div className="mb-6">
        <DesignQueueNotesSection
          itemId={item.id}
          messages={item.messages ?? []}
          senderRole="CS"
          senderName={item.csNama?.trim() || "CS"}
          onMessagesUpdated={(messages) =>
            setItem((prev) => (prev ? { ...prev, messages } : prev))
          }
        />
      </div>

      {item.revisionCount > 0 && item.materiDesain?.includes("[Revisi]") ? (
        <div className="neo-card mb-6 border-red-500/30 p-4">
          <p className="text-sm font-semibold text-red-400">Catatan revisi</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-red-200/90">
            {item.materiDesain}
          </p>
        </div>
      ) : null}

      <div className="neo-card p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Aksi CS</h2>
        <div className="flex flex-wrap items-end gap-3">
          {rowActions.showTandaiProses ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => patchItem({ statusDesain: "SEDANG_DIPROSES" })}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-orange-500/50"
            >
              Tandai proses desain
            </button>
          ) : null}

          {rowActions.showAccKonsumen ? (
            <BtnPrimary
              disabled={saving}
              onClick={() => patchItem({ action: "acc_konsumen" })}
            >
              ACC dari konsumen
            </BtnPrimary>
          ) : null}

          {rowActions.showMenungguCdr ? (
            <span className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-2 text-sm text-amber-200">
              Menunggu CDR dari desainer
            </span>
          ) : null}

          {rowActions.showInputOrder ? (
            <Link
              href={`/cs/antrian-desain/${id}/input-order`}
              className="neo-btn-primary inline-flex items-center px-4 py-2 text-sm"
            >
              Input order
            </Link>
          ) : null}

          {rowActions.showRevisi ? (
            <>
              <textarea
                value={catatanRevisi}
                onChange={(e) => setCatatanRevisi(e.target.value)}
                placeholder="Catatan revisi untuk desainer…"
                className="neo-input min-h-[80px] w-full sm:max-w-md"
              />
              <BtnRevisi
                disabled={saving || !catatanRevisi.trim()}
                onClick={() =>
                  patchItem({
                    action: "revisi",
                    catatanRevisi: catatanRevisi.trim(),
                  })
                }
              >
                Minta revisi
              </BtnRevisi>
            </>
          ) : null}

          {rowActions.showKirimUlangDesainer ? (
            <BtnPrimary
              disabled={saving}
              onClick={() => patchItem({ action: "kirim_ke_desainer" })}
            >
              Kirim ulang ke desainer
            </BtnPrimary>
          ) : null}
        </div>
      </div>

      <EditKonsumenModal
        open={editKonsumenItem != null}
        item={editKonsumenItem}
        busy={Boolean(editKonsumenItem && saving)}
        onClose={() => setEditKonsumenItem(null)}
        onSubmit={submitEditKonsumen}
      />
    </CsShell>
  )
}
