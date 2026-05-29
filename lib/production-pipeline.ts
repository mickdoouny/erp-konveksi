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

function nextStage(
  current: ProductionStatus,
  needsKancing: boolean,
  needsDTF: boolean
): ProductionStatus | null {
  if (current === ProductionStatus.FINISHING) {
    if (needsKancing) return ProductionStatus.KANCING
    if (needsDTF) return ProductionStatus.DTF
    return ProductionStatus.PACKING
  }
  if (current === ProductionStatus.KANCING) {
    return needsDTF ? ProductionStatus.DTF : ProductionStatus.PACKING
  }
  if (current === ProductionStatus.DTF) {
    return ProductionStatus.PACKING
  }

  const idx = MAIN_SEQUENCE.indexOf(current)
  if (idx < 0 || idx >= MAIN_SEQUENCE.length - 1) return null
  return MAIN_SEQUENCE[idx + 1]
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
          note: "Disetujui Admin Produksi",
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

  const target = nextStage(
    pipeline.currentStatus,
    pipeline.needsKancing,
    pipeline.needsDTF
  )

  if (!target) {
    throw new Error("Tidak ada tahap berikutnya")
  }

  const now = new Date()

  return prisma.productionPipeline.update({
    where: { id: pipelineId },
    data: {
      currentStatus: target,
      updatedAt: now,
      completedAt:
        target === ProductionStatus.SIAP_KIRIM ? now : pipeline.completedAt,
      ProductionStatusHistory: {
        create: {
          id: randomUUID(),
          fromStatus: pipeline.currentStatus,
          toStatus: target,
          eventType: ProductionEventType.STAGE_ADVANCED,
          changedByName: actor.name,
          changedByRole: actor.role,
        },
      },
    },
  })
}

export async function ensureDefaultStagePlans(
  pipelineId: string,
  needsKancing: boolean,
  needsDTF: boolean
) {
  const existing = await prisma.productionStagePlan.count({
    where: { productionPipelineId: pipelineId },
  })

  if (existing > 0) return

  const stages: ProductionStatus[] = [...MAIN_SEQUENCE]
  if (needsKancing) stages.splice(stages.indexOf(ProductionStatus.FINISHING) + 1, 0, ProductionStatus.KANCING)
  if (needsDTF) {
    const insertAt = needsKancing
      ? stages.indexOf(ProductionStatus.KANCING) + 1
      : stages.indexOf(ProductionStatus.FINISHING) + 1
    stages.splice(insertAt, 0, ProductionStatus.DTF)
  }

  await prisma.productionStagePlan.createMany({
    data: stages.map((stage, index) => ({
      id: randomUUID(),
      productionPipelineId: pipelineId,
      stage,
      sequence: index + 1,
      status: StagePlanStatus.PENDING,
    })),
  })
}
