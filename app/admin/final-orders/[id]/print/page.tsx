"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  SppPrintDocument,
  type PrintableSppDocument,
  type PrintableSppMockupImage,
} from "@/components/admin/spp-print-document"
import { readStoredUser } from "@/lib/auth"
import { homePathByRole } from "@/lib/auth-redirect"
import {
  isDesignImageUrl,
  mergeDesignFiles,
  parseDesignFiles,
  type DesignFile,
} from "@/lib/cs-antrian-desain"
import { canAccessAdminProduksiRoutes } from "@/lib/roles"

type OrderDetail = {
  orderNumber: string
  namaCs: string
  namaKonsumen: string
  namaArtikel: string
  bahan: string | null
  jenisKerah: string | null
  jenisOrder: string | null
  deadline: string | null
  submittedAt: string | null
  FinalOrderRosterLine: Array<{
    nama: string
    ukuran: string | null
    jenisKerah: string | null
    lengan: string | null
    warna: string | null
    catatan: string | null
    grup: string | null
    bahan: string | null
  }>
  DesignQueueItem?: {
    desainUtama: string | null
    hasilDesain: string | null
    materiDesain: string | null
  } | null
}

const FRONT_BACK_LABELS = ["Depan", "Belakang"] as const

function inferMockupLabel(file: DesignFile, index: number, total: number): string {
  const name = `${file.name} ${file.url}`.toLowerCase()
  if (/\b(depan|front|awal)\b/.test(name)) return "Depan"
  if (/\b(belakang|back|rear)\b/.test(name)) return "Belakang"
  if (total === 1) return "Mockup"
  return FRONT_BACK_LABELS[index] ?? `Gambar ${index + 1}`
}

function collectMockupImages(
  designQueueItem?: OrderDetail["DesignQueueItem"]
): PrintableSppMockupImage[] {
  if (!designQueueItem) return []

  const hasilDesain = parseDesignFiles(designQueueItem.hasilDesain).filter((file) =>
    isDesignImageUrl(file.url)
  )
  const desainAwal = mergeDesignFiles(
    parseDesignFiles(designQueueItem.desainUtama),
    parseDesignFiles(designQueueItem.materiDesain)
  ).filter((file) => isDesignImageUrl(file.url))

  const files = hasilDesain.length > 0 ? hasilDesain : desainAwal

  return files.map((file, index) => ({
    label: inferMockupLabel(file, index, files.length),
    url: file.url,
    alt: file.name,
  }))
}

function formatDateId(value: string | null | undefined): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function resolveBahan(
  orderBahan: string | null,
  rosterLines: OrderDetail["FinalOrderRosterLine"]
): string {
  const orderLevel = orderBahan?.trim()
  if (orderLevel) return orderLevel

  const lineBahan = rosterLines
    .map((line) => line.bahan?.trim())
    .find((value) => Boolean(value))
  return lineBahan ?? "—"
}

export default function FinalOrderPrintPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)

  useEffect(() => {
    const user = readStoredUser()
    if (!user) {
      router.replace("/login")
      return
    }
    if (!canAccessAdminProduksiRoutes(user.role)) {
      router.push(homePathByRole(user.role))
      return
    }

    fetch(`/api/final-orders/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setOrder(json.data)
      })
  }, [id, router])

  const printable = useMemo<PrintableSppDocument | null>(() => {
    if (!order) return null

    const rosterLines = (order.FinalOrderRosterLine ?? []).map((line) => ({
      nama: line.nama,
      ukuran: line.ukuran,
      jenisKerah: line.jenisKerah,
      lengan: line.lengan,
      warna: line.warna,
      catatan: line.catatan,
      grup: line.grup,
    }))

    return {
      namaKonsumen: order.namaKonsumen,
      namaArtikel: order.namaArtikel,
      namaCs: order.namaCs,
      noInvoice: order.orderNumber,
      tanggalKeluarSpp: formatDateId(order.submittedAt ?? new Date().toISOString()),
      deadline: formatDateId(order.deadline),
      jenisBahan: resolveBahan(order.bahan, order.FinalOrderRosterLine ?? []),
      jenisKerah: order.jenisKerah?.trim() || undefined,
      jenisOrder: order.jenisOrder?.trim() || undefined,
      mockupImages: collectMockupImages(order.DesignQueueItem),
      rosterLines,
    }
  }, [order])

  if (!printable) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-black">
        Memuat…
      </div>
    )
  }

  return <SppPrintDocument data={printable} onBack={() => router.back()} />
}
