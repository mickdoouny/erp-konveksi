import { randomUUID } from "crypto"
import {
  AdminProduksiStatus,
  ProductionEventType,
  ProductionStatus,
  StagePlanStatus,
} from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { PRODUCTION_STATUS_LABELS } from "@/lib/status-labels"

export { PRODUCTION_STATUS_LABELS }

const MAIN_SEQUENCE: ProductionStatus[] = [
  ProductionStatus.ADMIN_PRODUKSI,
  ProductionStatus.SETTING,
  ProductionStatus.LAYOUT_PRINT,
  ProductionStatus.PRINTING,
  ProductionStatus.POTONG_KERTAS,
  ProductionStatus.PREPARE_BAHAN_KAIN,
  ProductionStatus.PRESS,
  ProductionStatus.JAHIT,
  ProductionStatus.FINISHING,
  ProductionStatus.PACKING,
  ProductionStatus.BARANG_SELESAI,
  ProductionStatus.SIAP_KIRIM,
]

export function nextStage(current: ProductionStatus): ProductionStatus | null {
  if (current === ProductionStatus.JAHIT) {
    return ProductionStatus.ADMIN_PRODUKSI
  }
  if (current === ProductionStatus.FINISHING) {
    return ProductionStatus.PACKING
  }
  if (
    current === ProductionStatus.KANCING ||
    current === ProductionStatus.DTF
  ) {
    return ProductionStatus.FINISHING
  }

  const idx = MAIN_SEQUENCE.indexOf(current)
  if (idx < 0 || idx >= MAIN_SEQUENCE.length - 1) return null
  return MAIN_SEQUENCE[idx + 1]
}

async function markStagePlan(
  pipelineId: string,
  stage: ProductionStatus,
  status: StagePlanStatus,
  timestamps: { start?: boolean; end?: boolean } = {}
) {
  const now = new Date()
  await prisma.productionStagePlan.updateMany({
    where: { productionPipelineId: pipelineId, stage },
    data: {
      status,
      ...(timestamps.start ? { actualStartAt: now } : {}),
      ...(timestamps.end ? { actualEndAt: now } : {}),
    },
  })
}

async function transitionPipeline(
  pipelineId: string,
  from: ProductionStatus,
  to: ProductionStatus,
  actor: { name: string; role: string },
  eventType: ProductionEventType,
  note?: string
) {
  const now = new Date()
  return prisma.productionPipeline.update({
    where: { id: pipelineId },
    data: {
      currentStatus: to,
      updatedAt: now,
      completedAt:
        to === ProductionStatus.SIAP_KIRIM ? now : undefined,
      ProductionStatusHistory: {
        create: {
          id: randomUUID(),
          fromStatus: from,
          toStatus: to,
          eventType,
          changedByName: actor.name,
          changedByRole: actor.role,
          note,
        },
      },
    },
  })
}

export async function adminApprovePipeline(
  pipelineId: string,
  actor: { name: string; role: string }
) {
  const pipeline = await prisma.productionPipeline.findUnique({
    where: { id: pipelineId },
    include: {
      FinalOrder: { include: { AccountingTransaction: true } },
    },
  })

  if (!pipeline) {
    throw new Error("Pipeline tidak ditemukan")
  }

  if (pipeline.currentStatus !== ProductionStatus.ADMIN_PRODUKSI) {
    throw new Error("Order tidak dalam antrian persetujuan awal")
  }

  const pay = pipeline.FinalOrder.AccountingTransaction?.paymentStatus
  if (pay === "MENUNGGU_DP") {
    throw new Error(
      "DP belum divalidasi Admin Keuangan. Setujui di /admin/keuangan terlebih dahulu."
    )
  }

  const now = new Date()

  return prisma.productionPipeline.update({
    where: { id: pipelineId },
    data: {
      currentStatus: ProductionStatus.SETTING,
      adminProduksiStatus: AdminProduksiStatus.APPROVED,
      adminValidatedAt: now,
      adminValidatedBy: actor.name,
      updatedAt: now,
      ProductionStatusHistory: {
        create: {
          id: randomUUID(),
          fromStatus: ProductionStatus.ADMIN_PRODUKSI,
          toStatus: ProductionStatus.SETTING,
          eventType: ProductionEventType.ADMIN_APPROVED,
          changedByName: actor.name,
          changedByRole: actor.role,
          note: "Disetujui Admin Produksi → Setting",
        },
      },
    },
  })
}

export async function advancePipelineStage(
  pipelineId: string,
  actor: { name: string; role: string }
) {
  const pipeline = await prisma.productionPipeline.findUnique({
    where: { id: pipelineId },
  })

  if (!pipeline) {
    throw new Error("Pipeline tidak ditemukan")
  }

  const target = nextStage(pipeline.currentStatus)

  if (!target) {
    throw new Error("Tidak ada tahap berikutnya")
  }

  await markStagePlan(pipelineId, pipeline.currentStatus, StagePlanStatus.COMPLETED, {
    end: true,
  })

  return transitionPipeline(
    pipelineId,
    pipeline.currentStatus,
    target,
    actor,
    ProductionEventType.STAGE_ADVANCED
  )
}

export async function startStageProcess(
  pipelineId: string,
  actor: { name: string; role: string; id?: string }
) {
  const pipeline = await prisma.productionPipeline.findUnique({
    where: { id: pipelineId },
  })

  if (!pipeline) {
    throw new Error("Pipeline tidak ditemukan")
  }

  await markStagePlan(pipelineId, pipeline.currentStatus, StagePlanStatus.IN_PROGRESS, {
    start: true,
  })

  const now = new Date()
  return prisma.productionPipeline.update({
    where: { id: pipelineId },
    data: {
      currentOperatorId: actor.id ?? pipeline.currentOperatorId,
      updatedAt: now,
    },
  })
}

export async function completeStageProcess(
  pipelineId: string,
  actor: { name: string; role: string; id?: string },
  options?: { qty?: number; finalOrderId?: string; orderNumber?: string }
) {
  const pipeline = await prisma.productionPipeline.findUnique({
    where: { id: pipelineId },
    include: { FinalOrder: true },
  })

  if (!pipeline) {
    throw new Error("Pipeline tidak ditemukan")
  }

  const from = pipeline.currentStatus
  const target = nextStage(from)

  if (!target) {
    throw new Error("Tidak ada tahap berikutnya")
  }

  await markStagePlan(pipelineId, from, StagePlanStatus.COMPLETED, { end: true })

  const note =
    from === ProductionStatus.JAHIT
      ? "Selesai jahit → kembali Admin Produksi"
      : undefined

  const updated = await transitionPipeline(
    pipelineId,
    from,
    target,
    actor,
    ProductionEventType.STAGE_ADVANCED,
    note
  )

  if (from === ProductionStatus.JAHIT) {
    const order = pipeline.FinalOrder
    await prisma.jahitPaymentRecord.create({
      data: {
        id: randomUUID(),
        productionPipelineId: pipelineId,
        finalOrderId: order.id,
        orderNumber: order.orderNumber,
        qty: options?.qty ?? order.qty,
        operatorId: actor.id ?? null,
        operatorName: actor.name,
      },
    })
  }

  return updated
}

export async function startKancingProcess(
  pipelineId: string,
  actor: { name: string; role: string }
) {
  const pipeline = await prisma.productionPipeline.findUnique({
    where: { id: pipelineId },
  })

  if (!pipeline) {
    throw new Error("Pipeline tidak ditemukan")
  }
  if (pipeline.currentStatus !== ProductionStatus.ADMIN_PRODUKSI) {
    throw new Error("Order harus di antrian Admin Produksi")
  }
  if (!pipeline.needsKancing) {
    throw new Error("Order ini tidak memerlukan kancing")
  }
  if (pipeline.kancingCompletedAt) {
    throw new Error("Kancing sudah selesai")
  }

  return transitionPipeline(
    pipelineId,
    pipeline.currentStatus,
    ProductionStatus.KANCING,
    actor,
    ProductionEventType.STAGE_ADVANCED,
    "Proses kancing dimulai"
  )
}

export async function completeKancingProcess(
  pipelineId: string,
  actor: { name: string; role: string }
) {
  const pipeline = await prisma.productionPipeline.findUnique({
    where: { id: pipelineId },
  })

  if (!pipeline) {
    throw new Error("Pipeline tidak ditemukan")
  }
  if (pipeline.currentStatus !== ProductionStatus.KANCING) {
    throw new Error("Kancing belum dimulai")
  }

  const now = new Date()
  return prisma.productionPipeline.update({
    where: { id: pipelineId },
    data: {
      currentStatus: ProductionStatus.ADMIN_PRODUKSI,
      kancingCompletedAt: now,
      updatedAt: now,
      ProductionStatusHistory: {
        create: {
          id: randomUUID(),
          fromStatus: ProductionStatus.KANCING,
          toStatus: ProductionStatus.ADMIN_PRODUKSI,
          eventType: ProductionEventType.STAGE_ADVANCED,
          changedByName: actor.name,
          changedByRole: actor.role,
          note: "Kancing selesai",
        },
      },
    },
  })
}

export async function startDtfProcess(
  pipelineId: string,
  actor: { name: string; role: string }
) {
  const pipeline = await prisma.productionPipeline.findUnique({
    where: { id: pipelineId },
  })

  if (!pipeline) {
    throw new Error("Pipeline tidak ditemukan")
  }
  if (pipeline.currentStatus !== ProductionStatus.ADMIN_PRODUKSI) {
    throw new Error("Order harus di antrian Admin Produksi")
  }
  if (!pipeline.needsDTF) {
    throw new Error("Order ini tidak memerlukan DTF")
  }
  if (pipeline.dtfCompletedAt) {
    throw new Error("DTF sudah selesai")
  }

  return transitionPipeline(
    pipelineId,
    pipeline.currentStatus,
    ProductionStatus.DTF,
    actor,
    ProductionEventType.STAGE_ADVANCED,
    "Proses DTF dimulai"
  )
}

export async function completeDtfProcess(
  pipelineId: string,
  actor: { name: string; role: string }
) {
  const pipeline = await prisma.productionPipeline.findUnique({
    where: { id: pipelineId },
  })

  if (!pipeline) {
    throw new Error("Pipeline tidak ditemukan")
  }
  if (pipeline.currentStatus !== ProductionStatus.DTF) {
    throw new Error("DTF belum dimulai")
  }

  const now = new Date()
  return prisma.productionPipeline.update({
    where: { id: pipelineId },
    data: {
      currentStatus: ProductionStatus.ADMIN_PRODUKSI,
      dtfCompletedAt: now,
      updatedAt: now,
      ProductionStatusHistory: {
        create: {
          id: randomUUID(),
          fromStatus: ProductionStatus.DTF,
          toStatus: ProductionStatus.ADMIN_PRODUKSI,
          eventType: ProductionEventType.STAGE_ADVANCED,
          changedByName: actor.name,
          changedByRole: actor.role,
          note: "DTF selesai",
        },
      },
    },
  })
}

export async function advanceToQc(
  pipelineId: string,
  actor: { name: string; role: string }
) {
  const pipeline = await prisma.productionPipeline.findUnique({
    where: { id: pipelineId },
  })

  if (!pipeline) {
    throw new Error("Pipeline tidak ditemukan")
  }
  if (pipeline.currentStatus !== ProductionStatus.ADMIN_PRODUKSI) {
    throw new Error("Order harus di antrian Admin Produksi pasca-jahit")
  }

  if (pipeline.needsKancing && !pipeline.kancingCompletedAt) {
    throw new Error("Kancing belum selesai")
  }
  if (pipeline.needsDTF && !pipeline.dtfCompletedAt) {
    throw new Error("DTF belum selesai")
  }

  return transitionPipeline(
    pipelineId,
    ProductionStatus.ADMIN_PRODUKSI,
    ProductionStatus.FINISHING,
    actor,
    ProductionEventType.STAGE_ADVANCED,
    "Lanjut ke QC"
  )
}

export async function ensureDefaultStagePlans(
  pipelineId: string,
  _needsKancing?: boolean,
  _needsDTF?: boolean
) {
  const existing = await prisma.productionStagePlan.count({
    where: { productionPipelineId: pipelineId },
  })

  if (existing > 0) return

  await prisma.productionStagePlan.createMany({
    data: MAIN_SEQUENCE.map((stage, index) => ({
      id: randomUUID(),
      productionPipelineId: pipelineId,
      stage,
      sequence: index + 1,
      status: StagePlanStatus.PENDING,
    })),
  })
}
