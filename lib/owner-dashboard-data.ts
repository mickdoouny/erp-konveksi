import { PaymentStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { isFinalOrderWorkflowEnabled } from "@/lib/feature-flags"
import { isDpValidatedPaymentStatus } from "@/lib/status-labels"
import {
  DESIGNER_ACTIVE_STATUSES,
  DESIGNER_APPROVED_STATUSES,
} from "@/lib/designer-antrian"

export type OwnerReportRow = {
  id: string
  invoice: string
  divisi: string
  qtySelesai: number
  kendala: string
  createdAt: string
}

export type OwnerSalesByCs = {
  namaCs: string
  total: number
  validated: number
  count: number
}

export type OwnerSalesTrendPoint = {
  label: string
  total: number
  validated: number
}

export type OwnerDashboardPayload = {
  workflowEnabled: boolean
  kpis: {
    totalReport: number
    totalQtyProduksi: number
    totalSales: number
    salesTervalidasi: number
  }
  financial: {
    totalOmzet: number
    dpDiterima: number
    menungguDp: number
    sisaPelunasan: number
    orderLunas: number
    antrianDesain: number
    antrianKeuangan: number
  }
  designQueue: {
    aktif: number
    menungguDp: number
    total: number
  }
  salesByCs: OwnerSalesByCs[]
  salesTrend: OwnerSalesTrendPoint[]
  recentReports: OwnerReportRow[]
}

function monthKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-")
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ]
  const idx = Number(m) - 1
  return `${names[idx] ?? m} ${y}`
}

function buildSalesTrend(
  rows: { createdAt: Date; total: number; validated: boolean }[]
): OwnerSalesTrendPoint[] {
  const buckets = new Map<string, { total: number; validated: number }>()

  for (const row of rows) {
    const key = monthKey(row.createdAt)
    const prev = buckets.get(key) ?? { total: 0, validated: 0 }
    prev.total += row.total
    if (row.validated) prev.validated += row.total
    buckets.set(key, prev)
  }

  const sortedKeys = [...buckets.keys()].sort().slice(-6)

  return sortedKeys.map((key) => ({
    label: monthLabel(key),
    total: buckets.get(key)?.total ?? 0,
    validated: buckets.get(key)?.validated ?? 0,
  }))
}

function buildSalesByCs(
  rows: { namaCs: string; total: number; validated: boolean }[]
): OwnerSalesByCs[] {
  const map = new Map<string, { total: number; validated: number; count: number }>()

  for (const row of rows) {
    const cs = row.namaCs.trim() || "Tanpa CS"
    const prev = map.get(cs) ?? { total: 0, validated: 0, count: 0 }
    prev.total += row.total
    if (row.validated) prev.validated += row.total
    prev.count += 1
    map.set(cs, prev)
  }

  return [...map.entries()]
    .map(([namaCs, stats]) => ({ namaCs, ...stats }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
}

export async function loadOwnerDashboardData(): Promise<OwnerDashboardPayload> {
  const workflowEnabled = isFinalOrderWorkflowEnabled()

  const [reportAgg, reports, designAktif, designMenungguDp, designTotal] =
    await Promise.all([
      prisma.report.aggregate({
        _count: { id: true },
        _sum: { qtySelesai: true },
      }),
      prisma.report.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      prisma.designQueueItem.count({
        where: { statusDesain: { in: DESIGNER_ACTIVE_STATUSES } },
      }),
      prisma.designQueueItem.count({
        where: { statusDesain: { in: DESIGNER_APPROVED_STATUSES } },
      }),
      prisma.designQueueItem.count(),
    ])

  const recentReports: OwnerReportRow[] = reports.map((r) => ({
    id: r.id,
    invoice: r.invoice,
    divisi: r.divisi,
    qtySelesai: r.qtySelesai,
    kendala: r.kendala,
    createdAt: r.createdAt.toISOString(),
  }))

  let saleRows: { namaCs: string; total: number; validated: boolean; createdAt: Date }[] =
    []
  let financial = {
    totalOmzet: 0,
    dpDiterima: 0,
    menungguDp: 0,
    sisaPelunasan: 0,
    orderLunas: 0,
    antrianDesain: designAktif + designMenungguDp,
    antrianKeuangan: 0,
  }

  if (workflowEnabled) {
    const accounting = await prisma.accountingTransaction.findMany({
      select: {
        totalHarga: true,
        dp: true,
        sisaPelunasan: true,
        paymentStatus: true,
        createdAt: true,
        FinalOrder: { select: { namaCs: true } },
      },
    })

    saleRows = accounting.map((row) => ({
      namaCs: row.FinalOrder.namaCs,
      total: row.totalHarga,
      validated: isDpValidatedPaymentStatus(row.paymentStatus),
      createdAt: row.createdAt,
    }))

    financial = {
      totalOmzet: accounting.reduce((s, r) => s + r.totalHarga, 0),
      dpDiterima: accounting.reduce((s, r) => s + r.dp, 0),
      menungguDp: accounting.filter(
        (r) => r.paymentStatus === PaymentStatus.MENUNGGU_DP
      ).length,
      sisaPelunasan: accounting.reduce((s, r) => s + r.sisaPelunasan, 0),
      orderLunas: accounting.filter((r) => r.paymentStatus === PaymentStatus.LUNAS)
        .length,
      antrianDesain: designAktif + designMenungguDp,
      antrianKeuangan: accounting.filter(
        (r) =>
          r.paymentStatus === PaymentStatus.MENUNGGU_DP ||
          (r.sisaPelunasan > 0 && r.paymentStatus !== PaymentStatus.LUNAS)
      ).length,
    }
  } else {
    const leads = await prisma.leadOrder.findMany({
      select: {
        namaCs: true,
        totalHarga: true,
        dp: true,
        sisaPelunasan: true,
        validatedDpAt: true,
        statusPembayaran: true,
        createdAt: true,
      },
    })

    saleRows = leads.map((row) => {
      const total = row.totalHarga ?? 0
      const validated =
        row.validatedDpAt != null ||
        (row.statusPembayaran != null &&
          row.statusPembayaran !== "BELUM DP" &&
          row.statusPembayaran !== "MENUNGGU DP")

      return {
        namaCs: row.namaCs,
        total,
        validated,
        createdAt: row.createdAt,
      }
    })

    financial = {
      totalOmzet: leads.reduce((s, r) => s + (r.totalHarga ?? 0), 0),
      dpDiterima: leads.reduce((s, r) => s + (r.dp ?? 0), 0),
      menungguDp: leads.filter(
        (r) =>
          !r.validatedDpAt &&
          (r.statusPembayaran === "BELUM DP" ||
            r.statusPembayaran === "MENUNGGU DP")
      ).length,
      sisaPelunasan: leads.reduce((s, r) => s + (r.sisaPelunasan ?? 0), 0),
      orderLunas: leads.filter((r) => r.statusPembayaran === "LUNAS").length,
      antrianDesain: designAktif + designMenungguDp,
      antrianKeuangan: 0,
    }
  }

  const totalSales = saleRows.reduce((s, r) => s + r.total, 0)
  const salesTervalidasi = saleRows
    .filter((r) => r.validated)
    .reduce((s, r) => s + r.total, 0)

  return {
    workflowEnabled,
    kpis: {
      totalReport: reportAgg._count.id,
      totalQtyProduksi: reportAgg._sum.qtySelesai ?? 0,
      totalSales,
      salesTervalidasi,
    },
    financial,
    designQueue: {
      aktif: designAktif,
      menungguDp: designMenungguDp,
      total: designTotal,
    },
    salesByCs: buildSalesByCs(saleRows),
    salesTrend: buildSalesTrend(saleRows),
    recentReports,
  }
}
