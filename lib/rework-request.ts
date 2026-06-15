import { randomUUID } from "crypto"
import {
  ProductionEventType,
  ProductionStatus,
  ReworkRequestStatus,
  ReworkRequestType,
  StagePlanStatus,
} from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  formatReworkParts,
  normalizeReworkParts,
  validateReworkParts,
  type ReworkGarmentPartCode,
} from "@/lib/rework-garment-parts"
import { labelProductionStatus } from "@/lib/status-labels"

export const REWORK_ELIGIBLE_STAGES: ProductionStatus[] = [
  ProductionStatus.SETTING,
  ProductionStatus.LAYOUT_PRINT,
  ProductionStatus.PRINTING,
  ProductionStatus.POTONG_KERTAS,
  ProductionStatus.PREPARE_BAHAN_KAIN,
  ProductionStatus.PRESS,
  ProductionStatus.JAHIT,
  ProductionStatus.FINISHING,
]

const REWORK_DIVISION_LABELS: Partial<Record<ProductionStatus, string>> = {
  [ProductionStatus.SETTING]: "Printing",
  [ProductionStatus.LAYOUT_PRINT]: "Printing",
  [ProductionStatus.PRINTING]: "Printing",
  [ProductionStatus.POTONG_KERTAS]: "Preparing",
  [ProductionStatus.PREPARE_BAHAN_KAIN]: "Preparing",
  [ProductionStatus.PRESS]: "Press",
  [ProductionStatus.JAHIT]: "Jahit",
  [ProductionStatus.FINISHING]: "QC",
}

/** String keys — Prisma enums are undefined in client bundles at module init. */
export const REWORK_REQUEST_TYPE_LABELS = {
  KEKURANGAN: "Kekurangan",
  GAGAL_PRODUKSI: "Gagal produksi",
  LAINNYA: "Lainnya",
} as const

export type ReworkRequestTypeCode = keyof typeof REWORK_REQUEST_TYPE_LABELS

export const REWORK_REQUEST_STATUS_LABELS = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  COMPLETED: "Selesai",
} as const

export type ReworkRequestStatusCode = keyof typeof REWORK_REQUEST_STATUS_LABELS

const REWORK_RESET_STAGES: ProductionStatus[] = [
  ProductionStatus.PRINTING,
  ProductionStatus.POTONG_KERTAS,
  ProductionStatus.PREPARE_BAHAN_KAIN,
  ProductionStatus.PRESS,
  ProductionStatus.JAHIT,
  ProductionStatus.ADMIN_PRODUKSI,
  ProductionStatus.FINISHING,
  ProductionStatus.PACKING,
  ProductionStatus.BARANG_SELESAI,
  ProductionStatus.SIAP_KIRIM,
]

export function reworkDivisionLabel(stage: ProductionStatus): string {
  return REWORK_DIVISION_LABELS[stage] ?? labelProductionStatus(stage)
}

export function isReworkEligibleStage(stage: ProductionStatus): boolean {
  return REWORK_ELIGIBLE_STAGES.includes(stage)
}

export function parseAffectedParts(value: unknown): ReworkGarmentPartCode[] {
  if (!Array.isArray(value)) return []
  return normalizeReworkParts(value.map(String))
}

export async function createReworkRequest(input: {
  productionPipelineId: string
  requestedByUserId?: string
  requestedByName: string
  reason: string
  requestType?: ReworkRequestType
  affectedParts: string[]
}) {
  const reason = input.reason.trim()
  if (!reason) {
    throw new Error("Alasan request wajib diisi")
  }

  const pipeline = await prisma.productionPipeline.findUnique({
    where: { id: input.productionPipelineId },
    include: { FinalOrder: true },
  })

  if (!pipeline) {
    throw new Error("Pipeline tidak ditemukan")
  }

  const stage = pipeline.currentStatus
  if (!isReworkEligibleStage(stage)) {
    throw new Error("Tahap ini tidak dapat mengajukan request rework")
  }

  const existing = await prisma.productionReworkRequest.findFirst({
    where: {
      productionPipelineId: input.productionPipelineId,
      requestedFromStage: stage,
      status: ReworkRequestStatus.PENDING,
    },
  })

  if (existing) {
    throw new Error("Sudah ada request pending untuk order di tahap ini")
  }

  const partsError = validateReworkParts(
    input.affectedParts,
    pipeline.FinalOrder.jenisOrder
  )
  if (partsError) {
    throw new Error(partsError)
  }

  const affectedParts = normalizeReworkParts(
    input.affectedParts,
    pipeline.FinalOrder.jenisOrder
  )
  const partsLabel = formatReworkParts(affectedParts)
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const request = await tx.productionReworkRequest.create({
      data: {
        id: randomUUID(),
        productionPipelineId: pipeline.id,
        finalOrderId: pipeline.finalOrderId,
        requestedFromStage: stage,
        requestedByUserId: input.requestedByUserId ?? null,
        requestedByName: input.requestedByName,
        requestType: input.requestType ?? null,
        reason,
        affectedParts,
        reworkTargetStage: ProductionStatus.PRINTING,
        updatedAt: now,
      },
    })

    await tx.productionStatusHistory.create({
      data: {
        id: randomUUID(),
        productionPipelineId: pipeline.id,
        fromStatus: stage,
        toStatus: stage,
        eventType: ProductionEventType.REWORK_REQUESTED,
        changedByUserId: input.requestedByUserId ?? null,
        changedByName: input.requestedByName,
        changedByRole: "produksi",
        note: `Request rework dari ${reworkDivisionLabel(stage)} — print ulang: ${partsLabel}. ${reason}`,
        metadata: { reworkRequestId: request.id, affectedParts },
      },
    })

    return request
  })
}

export async function approveReworkRequest(
  requestId: string,
  actor: { name: string; role: string; id?: string },
  adminNote?: string
) {
  const request = await prisma.productionReworkRequest.findUnique({
    where: { id: requestId },
    include: {
      ProductionPipeline: { include: { FinalOrder: true } },
    },
  })

  if (!request) {
    throw new Error("Request tidak ditemukan")
  }

  if (request.status !== ReworkRequestStatus.PENDING) {
    throw new Error("Request sudah diproses")
  }

  const pipeline = request.ProductionPipeline
  const fromStage = pipeline.currentStatus
  const targetStage = request.reworkTargetStage
  const now = new Date()
  const division = reworkDivisionLabel(request.requestedFromStage)
  const parts = parseAffectedParts(request.affectedParts)
  const partsLabel = formatReworkParts(parts)
  const note =
    adminNote?.trim() ||
    `Rework disetujui — kembali ke ${labelProductionStatus(targetStage)} (dari ${division}). Print ulang: ${partsLabel}`

  return prisma.$transaction(async (tx) => {
    await tx.productionStagePlan.updateMany({
      where: {
        productionPipelineId: pipeline.id,
        stage: { in: REWORK_RESET_STAGES },
      },
      data: {
        status: StagePlanStatus.PENDING,
        actualStartAt: null,
        actualEndAt: null,
      },
    })

    await tx.productionPipeline.update({
      where: { id: pipeline.id },
      data: {
        currentStatus: targetStage,
        currentOperatorId: null,
        completedAt: null,
        updatedAt: now,
        ProductionStatusHistory: {
          create: {
            id: randomUUID(),
            fromStatus: fromStage,
            toStatus: targetStage,
            eventType: ProductionEventType.REWORK_APPROVED,
            changedByUserId: actor.id ?? null,
            changedByName: actor.name,
            changedByRole: actor.role,
            note,
            metadata: { reworkRequestId: request.id, affectedParts: parts },
          },
        },
      },
    })

    return tx.productionReworkRequest.update({
      where: { id: requestId },
      data: {
        status: ReworkRequestStatus.APPROVED,
        approvedAt: now,
        approvedBy: actor.name,
        adminNote: adminNote?.trim() || null,
        updatedAt: now,
      },
    })
  })
}

export async function rejectReworkRequest(
  requestId: string,
  actor: { name: string; role: string; id?: string },
  adminNote?: string
) {
  const request = await prisma.productionReworkRequest.findUnique({
    where: { id: requestId },
    include: { ProductionPipeline: true },
  })

  if (!request) {
    throw new Error("Request tidak ditemukan")
  }

  if (request.status !== ReworkRequestStatus.PENDING) {
    throw new Error("Request sudah diproses")
  }

  const now = new Date()
  const note = adminNote?.trim() || "Request rework ditolak"

  return prisma.$transaction(async (tx) => {
    await tx.productionStatusHistory.create({
      data: {
        id: randomUUID(),
        productionPipelineId: request.productionPipelineId,
        fromStatus: request.requestedFromStage,
        toStatus: request.requestedFromStage,
        eventType: ProductionEventType.REWORK_REJECTED,
        changedByUserId: actor.id ?? null,
        changedByName: actor.name,
        changedByRole: actor.role,
        note,
        metadata: { reworkRequestId: request.id },
      },
    })

    return tx.productionReworkRequest.update({
      where: { id: requestId },
      data: {
        status: ReworkRequestStatus.REJECTED,
        rejectedAt: now,
        rejectedBy: actor.name,
        adminNote: adminNote?.trim() || null,
        updatedAt: now,
      },
    })
  })
}
