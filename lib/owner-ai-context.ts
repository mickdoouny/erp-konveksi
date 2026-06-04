import { PaymentStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { isFinalOrderWorkflowEnabled } from "@/lib/feature-flags"
import { DESIGNER_APPROVED_STATUSES } from "@/lib/designer-antrian"
import {
  loadOwnerDashboardData,
  type OwnerDashboardPayload,
} from "@/lib/owner-dashboard-data"
import { CS_JENIS_ORDER_OPTIONS } from "@/lib/cs-input-order"
import {
  labelPaymentStatus,
  labelProductionStatus,
} from "@/lib/status-labels"

export type OwnerAiRecentOrder = {
  orderNumber: string
  namaCs: string
  namaKonsumen: string
  totalHarga: number
  status: string
  paymentStatus: string | null
  productionStage: string | null
  createdAt: string
}

export type OwnerAiContext = {
  generatedAt: string
  workflowEnabled: boolean
  dashboard: OwnerDashboardPayload
  period: {
    monthLabel: string
    monthOmzet: number
    monthOrderCount: number
    monthByJenisOrder: Record<string, number>
  }
  orderCounts: {
    totalOrders: number
    byFinalOrderStatus: Record<string, number>
    byPaymentStatus: Record<string, number>
    byJenisOrder: Record<string, number>
    byJenisOrderDesignQueue: Record<string, number>
  }
  productionPipeline: {
    total: number
    byStage: Record<string, number>
  }
  operators: {
    activeTotal: number
    byDepartment: Record<string, number>
  }
  pendingDpValidation: number
  pendingDtfPayments: number
  recentOrders: OwnerAiRecentOrder[]
}

function currentMonthRange(): { start: Date; end: Date; label: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const names = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ]
  return {
    start,
    end,
    label: `${names[now.getMonth()]} ${now.getFullYear()}`,
  }
}

function countByKey<T extends string>(
  rows: T[],
  labelFn: (key: T) => string = (k) => k
): Record<string, number> {
  const map = new Map<string, number>()
  for (const row of rows) {
    const label = labelFn(row)
    map.set(label, (map.get(label) ?? 0) + 1)
  }
  return Object.fromEntries(map)
}

function normalizeJenisOrder(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const trimmed = value.trim()
  const canonical = CS_JENIS_ORDER_OPTIONS.find(
    (o) => o.toLowerCase() === trimmed.toLowerCase()
  )
  return canonical ?? trimmed
}

function countByJenisOrder(
  rows: { jenisOrder: string | null }[]
): Record<string, number> {
  const map = new Map<string, number>()
  for (const row of rows) {
    const label = normalizeJenisOrder(row.jenisOrder)
    if (!label) continue
    map.set(label, (map.get(label) ?? 0) + 1)
  }
  return Object.fromEntries(map)
}

function emptyJenisOrderCounts(): Record<string, number> {
  return Object.fromEntries(CS_JENIS_ORDER_OPTIONS.map((o) => [o, 0]))
}

export async function loadOwnerAiContext(): Promise<OwnerAiContext> {
  const workflowEnabled = isFinalOrderWorkflowEnabled()
  const dashboard = await loadOwnerDashboardData()
  const { start, end, label: monthLabel } = currentMonthRange()

  const [
    designPendingDp,
    pendingDtfPayments,
    pipelineRows,
    recentFinalOrders,
    designQueueJenisRows,
    operatorGroups,
  ] = await Promise.all([
    prisma.designQueueItem.count({
      where: { statusDesain: { in: DESIGNER_APPROVED_STATUSES } },
    }),
    workflowEnabled
      ? prisma.dtfPaymentRequest.count({ where: { status: "MENUNGGU" } })
      : Promise.resolve(0),
    workflowEnabled
      ? prisma.productionPipeline.findMany({
          select: { currentStatus: true },
        })
      : Promise.resolve([]),
    workflowEnabled
      ? prisma.finalOrder.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            orderNumber: true,
            namaCs: true,
            namaKonsumen: true,
            totalHarga: true,
            status: true,
            createdAt: true,
            AccountingTransaction: { select: { paymentStatus: true } },
            ProductionPipeline: { select: { currentStatus: true } },
          },
        })
      : Promise.resolve([]),
    prisma.designQueueItem.findMany({
      where: { jenisOrder: { not: null } },
      select: { jenisOrder: true },
    }),
    prisma.operator.groupBy({
      by: ["department"],
      where: { isActive: true },
      _count: { id: true },
    }),
  ])

  let monthOmzet = 0
  let monthOrderCount = 0
  let monthByJenisOrder = emptyJenisOrderCounts()
  let byFinalOrderStatus: Record<string, number> = {}
  let byPaymentStatus: Record<string, number> = {}
  let byJenisOrder = emptyJenisOrderCounts()
  let totalOrders = 0
  let pendingDpValidation = designPendingDp
  let recentOrders: OwnerAiRecentOrder[] = []

  const byJenisOrderDesignQueue = {
    ...emptyJenisOrderCounts(),
    ...countByJenisOrder(designQueueJenisRows),
  }

  if (workflowEnabled) {
    const [monthAccounting, allOrders, paymentRows, jenisOrderRows, monthJenisRows] =
      await Promise.all([
      prisma.accountingTransaction.findMany({
        where: { createdAt: { gte: start, lt: end } },
        select: { totalHarga: true },
      }),
      prisma.finalOrder.findMany({ select: { status: true } }),
      prisma.accountingTransaction.findMany({
        select: { paymentStatus: true },
      }),
      prisma.finalOrder.findMany({
        select: { jenisOrder: true },
      }),
      prisma.finalOrder.findMany({
        where: { createdAt: { gte: start, lt: end } },
        select: { jenisOrder: true },
      }),
    ])

    monthOmzet = monthAccounting.reduce((s, r) => s + r.totalHarga, 0)
    monthOrderCount = monthAccounting.length
    byFinalOrderStatus = countByKey(
      allOrders.map((o) => o.status),
      (s) => s
    )
    byPaymentStatus = countByKey(
      paymentRows.map((r) => r.paymentStatus),
      labelPaymentStatus
    )
    pendingDpValidation = paymentRows.filter(
      (r) => r.paymentStatus === PaymentStatus.MENUNGGU_DP
    ).length
    totalOrders = jenisOrderRows.length
    byJenisOrder = {
      ...emptyJenisOrderCounts(),
      ...countByJenisOrder(jenisOrderRows),
    }
    monthByJenisOrder = {
      ...emptyJenisOrderCounts(),
      ...countByJenisOrder(monthJenisRows),
    }

    recentOrders = recentFinalOrders.map((o) => ({
      orderNumber: o.orderNumber,
      namaCs: o.namaCs,
      namaKonsumen: o.namaKonsumen,
      totalHarga: o.totalHarga,
      status: o.status,
      paymentStatus: o.AccountingTransaction
        ? labelPaymentStatus(o.AccountingTransaction.paymentStatus)
        : null,
      productionStage: o.ProductionPipeline
        ? labelProductionStatus(o.ProductionPipeline.currentStatus)
        : null,
      createdAt: o.createdAt.toISOString(),
    }))
  } else {
    const [monthLeads, allLeads, leadJenisRows, monthLeadJenisRows] =
      await Promise.all([
      prisma.leadOrder.findMany({
        where: { createdAt: { gte: start, lt: end } },
        select: { totalHarga: true },
      }),
      prisma.leadOrder.findMany({
        select: { statusPembayaran: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.leadOrder.findMany({
        select: { jenisOrder: true },
      }),
      prisma.leadOrder.findMany({
        where: { createdAt: { gte: start, lt: end } },
        select: { jenisOrder: true },
      }),
    ])

    monthOmzet = monthLeads.reduce((s, r) => s + (r.totalHarga ?? 0), 0)
    monthOrderCount = monthLeads.length
    byPaymentStatus = countByKey(
      allLeads.map((l) => l.statusPembayaran ?? "BELUM DP")
    )
    totalOrders = leadJenisRows.length
    byJenisOrder = {
      ...emptyJenisOrderCounts(),
      ...countByJenisOrder(leadJenisRows),
    }
    monthByJenisOrder = {
      ...emptyJenisOrderCounts(),
      ...countByJenisOrder(monthLeadJenisRows),
    }
  }

  const productionPipeline = {
    total: pipelineRows.length,
    byStage: countByKey(
      pipelineRows.map((p) => p.currentStatus),
      labelProductionStatus
    ),
  }

  const operatorsByDepartment = Object.fromEntries(
    operatorGroups.map((g) => [g.department, g._count.id])
  )
  const activeOperatorTotal = operatorGroups.reduce(
    (sum, g) => sum + g._count.id,
    0
  )

  return {
    generatedAt: new Date().toISOString(),
    workflowEnabled,
    dashboard,
    period: {
      monthLabel,
      monthOmzet,
      monthOrderCount,
      monthByJenisOrder,
    },
    orderCounts: {
      totalOrders,
      byFinalOrderStatus,
      byPaymentStatus,
      byJenisOrder,
      byJenisOrderDesignQueue,
    },
    productionPipeline,
    operators: {
      activeTotal: activeOperatorTotal,
      byDepartment: operatorsByDepartment,
    },
    pendingDpValidation,
    pendingDtfPayments,
    recentOrders,
  }
}

export function summarizeContextForLlm(context: OwnerAiContext): string {
  const { dashboard: d } = context
  return JSON.stringify(
    {
      generatedAt: context.generatedAt,
      periode: context.period,
      workflowEnabled: context.workflowEnabled,
      kpis: d.kpis,
      keuangan: d.financial,
      antrianDesain: d.designQueue,
      performaCs: d.salesByCs,
      trenPenjualan: d.salesTrend,
      laporanProduksiTerbaru: d.recentReports,
      totalOrder: context.orderCounts.totalOrders,
      orderByStatus: context.orderCounts.byFinalOrderStatus,
      orderByPembayaran: context.orderCounts.byPaymentStatus,
      orderByJenisOrder: context.orderCounts.byJenisOrder,
      orderJenisBulanIni: context.period.monthByJenisOrder,
      antrianDesainByJenisOrder: context.orderCounts.byJenisOrderDesignQueue,
      pipelineProduksi: context.productionPipeline,
      operatorAktif: context.operators,
      menungguValidasiDp: context.pendingDpValidation,
      pembayaranDtfMenunggu: context.pendingDtfPayments,
      orderTerbaru: context.recentOrders,
      petunjukField: {
        jenisOrder: ["Atasan", "Stelan", "Celana"],
        performaCs: "namaCs seperti cs1, cs2 — cocokkan ke performaCs",
      },
    },
    null,
    2
  )
}
