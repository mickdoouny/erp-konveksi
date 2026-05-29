"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  SppPrintDocument,
  type PrintableSppDocument,
} from "@/components/admin/spp-print-document"
import { homePathByRole } from "@/lib/auth-redirect"
import { canAccessAdminProduksiRoutes } from "@/lib/roles"
import { labelPaymentStatus, labelProductionStatus } from "@/lib/status-labels"

type OrderDetail = {
  orderNumber: string
  namaCs: string
  namaKonsumen: string
  noHp: string
  alamat: string | null
  namaArtikel: string
  qty: number
  totalHarga: number
  dp: number
  submittedAt: string | null
  FinalOrderRosterLine: Array<{
    nama: string
    nomorPunggung: string | null
    ukuran: string | null
  }>
  AccountingTransaction?: {
    paymentStatus: string
    invoiceNumber: string
  } | null
  ProductionPipeline?: {
    productionNumber: string
    currentStatus: string
    adminValidatedBy: string | null
  } | null
}

export default function FinalOrderPrintPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem("user")
    if (!raw) {
      router.push("/login")
      return
    }
    const user = JSON.parse(raw)
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
    const pipeline = order.ProductionPipeline
    const accounting = order.AccountingTransaction
    return {
      documentNumber: pipeline?.productionNumber ?? order.orderNumber,
      headerInfo: [
        { label: "Tanggal", value: order.submittedAt ? new Date(order.submittedAt).toLocaleString("id-ID") : "—" },
        { label: "CS", value: order.namaCs },
        { label: "Invoice", value: accounting?.invoiceNumber },
        {
          label: "Tahap",
          value: pipeline
            ? labelProductionStatus(pipeline.currentStatus)
            : "Admin Produksi",
        },
      ],
      orderInfo: [
        { label: "Konsumen", value: order.namaKonsumen },
        { label: "HP", value: order.noHp },
        { label: "Alamat", value: order.alamat || "—" },
        { label: "Artikel", value: order.namaArtikel },
        { label: "Qty", value: String(order.qty) },
        {
          label: "Total",
          value: `Rp ${order.totalHarga.toLocaleString("id-ID")}`,
        },
      ],
      paymentSummary: `DP Rp ${order.dp.toLocaleString("id-ID")} · ${labelPaymentStatus(accounting?.paymentStatus ?? "")}`,
      rosterLines: order.FinalOrderRosterLine ?? [],
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
