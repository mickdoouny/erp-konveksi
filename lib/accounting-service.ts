import { randomUUID } from "crypto"
import {
  PaymentLedgerType,
  PaymentStatus,
  ShipReleaseStatus,
} from "@prisma/client"
import { prisma } from "@/lib/prisma"

export async function approveDp(
  accountingId: string,
  actor: { userId?: string; name: string }
) {
  const accounting = await prisma.accountingTransaction.findUnique({
    where: { id: accountingId },
    include: { FinalOrder: true },
  })

  if (!accounting) {
    throw new Error("Transaksi tidak ditemukan")
  }

  const now = new Date()
  const dp = accounting.dp
  const sisa = accounting.sisaPelunasan
  const paymentStatus =
    sisa <= 0 ? PaymentStatus.LUNAS : PaymentStatus.DP_TERIMA

  await prisma.$transaction([
    prisma.accountingTransaction.update({
      where: { id: accountingId },
      data: {
        paymentStatus,
        tanggalDp: now,
        updatedAt: now,
      },
    }),
    prisma.finalOrder.update({
      where: { id: accounting.finalOrderId },
      data: {
        tanggalDp: now,
        updatedAt: now,
      },
    }),
    prisma.paymentLedger.create({
      data: {
        id: randomUUID(),
        accountingId,
        type: PaymentLedgerType.DP,
        amount: dp,
        buktiUrl: accounting.buktiDp,
        recordedByUserId: actor.userId ?? null,
        recordedByName: actor.name,
        note: "Validasi DP Admin Keuangan",
      },
    }),
  ])

  return prisma.accountingTransaction.findUnique({
    where: { id: accountingId },
    include: { FinalOrder: { include: { ProductionPipeline: true } } },
  })
}

export async function recordPelunasanSafe(
  accountingId: string,
  amount: number,
  actor: { userId?: string; name: string },
  buktiUrl?: string | null
) {
  const accounting = await prisma.accountingTransaction.findUnique({
    where: { id: accountingId },
  })

  if (!accounting) {
    throw new Error("Transaksi tidak ditemukan")
  }

  if (accounting.paymentStatus === PaymentStatus.MENUNGGU_DP) {
    throw new Error("DP belum divalidasi")
  }

  const now = new Date()
  const newSisa = Math.max(0, accounting.sisaPelunasan - amount)
  const paymentStatus =
    newSisa <= 0 ? PaymentStatus.LUNAS : PaymentStatus.SEBAGIAN

  await prisma.$transaction([
    prisma.accountingTransaction.update({
      where: { id: accountingId },
      data: {
        sisaPelunasan: newSisa,
        paymentStatus,
        tanggalPelunasan: newSisa <= 0 ? now : accounting.tanggalPelunasan,
        updatedAt: now,
      },
    }),
    prisma.finalOrder.update({
      where: { id: accounting.finalOrderId },
      data: {
        sisaPelunasan: newSisa,
        tanggalPelunasan: newSisa <= 0 ? now : undefined,
        updatedAt: now,
      },
    }),
    prisma.paymentLedger.create({
      data: {
        id: randomUUID(),
        accountingId,
        type: PaymentLedgerType.PELUNASAN,
        amount,
        buktiUrl: buktiUrl ?? null,
        recordedByUserId: actor.userId ?? null,
        recordedByName: actor.name,
        note: "Pelunasan dicatat Admin Keuangan",
      },
    }),
  ])

  return prisma.accountingTransaction.findUnique({
    where: { id: accountingId },
    include: { FinalOrder: { include: { ProductionPipeline: true } } },
  })
}

export async function requestShipRelease(
  pipelineId: string,
  actor: { name: string },
  note?: string
) {
  return prisma.productionPipeline.update({
    where: { id: pipelineId },
    data: {
      shipReleaseStatus: ShipReleaseStatus.MENUNGGU_VALIDASI,
      shipReleaseRequestedAt: new Date(),
      shipReleaseRequestedBy: actor.name,
      shipReleaseNote: note ?? null,
      updatedAt: new Date(),
    },
  })
}

export async function approveShipRelease(
  pipelineId: string,
  actor: { name: string }
) {
  const pipeline = await prisma.productionPipeline.findUnique({
    where: { id: pipelineId },
    include: { FinalOrder: { include: { AccountingTransaction: true } } },
  })

  if (!pipeline) throw new Error("Pipeline tidak ditemukan")

  const pay = pipeline.FinalOrder.AccountingTransaction?.paymentStatus
  if (pay !== PaymentStatus.LUNAS && pay !== PaymentStatus.DP_DIKECUALIKAN) {
    throw new Error("Pelunasan belum lunas")
  }

  const now = new Date()

  await prisma.$transaction([
    prisma.productionPipeline.update({
      where: { id: pipelineId },
      data: {
        shipReleaseStatus: ShipReleaseStatus.DISETUJUI,
        shipReleaseValidatedAt: now,
        shipReleaseValidatedBy: actor.name,
        updatedAt: now,
      },
    }),
    prisma.finalOrder.update({
      where: { id: pipeline.finalOrderId },
      data: {
        deliveryStatus: "TERKIRIM",
        deliveredAt: now,
        updatedAt: now,
      },
    }),
  ])

  return pipeline
}

export async function rejectShipRelease(
  pipelineId: string,
  actor: { name: string },
  note?: string
) {
  return prisma.productionPipeline.update({
    where: { id: pipelineId },
    data: {
      shipReleaseStatus: ShipReleaseStatus.DITOLAK,
      shipReleaseValidatedAt: new Date(),
      shipReleaseValidatedBy: actor.name,
      shipReleaseNote: note ?? null,
      updatedAt: new Date(),
    },
  })
}
