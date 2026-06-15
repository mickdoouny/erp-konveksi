import { randomUUID } from "crypto"
import {
  AdminProduksiStatus,
  ProductionEventType,
  ProductionStatus,
  StagePlanStatus,
} from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  buildPotongBahanDeductions,
  buildPrintingDeductions,
  deductInventoryForStage,
} from "@/lib/inventory-service"
import { PRODUCTION_STATUS_LABELS } from "@/lib/status-labels"

export { PRODUCTION_STATUS_LABELS }

const MAIN_SEQUENCE: ProductionStatus[] = [
  ProductionStatus.ADMIN_PRODUKSI,
  ProductionStatus.SETTING,
  ProductionStatus.MENUNGGU_ACC_SETTING,
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

export type PotongBahanWeights = {
  beratBahan: number
  beratRib?: number | null
  catatanPotongBahan?: string | null
}

export type PrintingInkConsumption = {
  konsumsiTintaC: number
  konsumsiTintaM: number
  konsumsiTintaY: number
  konsumsiTintaK: number
}

async function transitionPipeline(
  pipelineId: string,
  from: ProductionStatus,
  to: ProductionStatus,
  actor: { name: string; role: string },
  eventType: ProductionEventType,
  note?: string,
  extraData?: {
    beratBahan?: number
    beratRib?: number | null
    catatanPotongBahan?: string | null
    konsumsiTintaC?: number
    konsumsiTintaM?: number
    konsumsiTintaY?: number
    konsumsiTintaK?: number
  }
) {
  const now = new Date()
  return prisma.productionPipeline.update({
    where: { id: pipelineId },
    data: {
      currentStatus: to,
      updatedAt: now,
      completedAt:
        to === ProductionStatus.SIAP_KIRIM ? now : undefined,
      ...extraData,
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

  if (pipeline.currentStatus === ProductionStatus.MENUNGGU_ACC_SETTING) {
    throw new Error(
      "Menunggu ACC konsumen — hanya CS yang dapat menyetujui hasil setting"
    )
  }

  const target = nextStage(pipeline.currentStatus)

  if (!target) {
    throw new Error("Tidak ada tahap berikutnya")
  }

  if (target === ProductionStatus.LAYOUT_PRINT) {
    assertLayoutRequiresConsumerAcc(pipeline)
  }

  if (pipeline.currentStatus === ProductionStatus.SETTING) {
    assertSettingResultUploaded(pipeline.settingResultFiles)
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

  if (pipeline.currentStatus === ProductionStatus.MENUNGGU_ACC_SETTING) {
    throw new Error(
      "Menunggu ACC konsumen — proses layout belum dapat dimulai"
    )
  }

  if (pipeline.currentStatus === ProductionStatus.LAYOUT_PRINT) {
    assertLayoutRequiresConsumerAcc(pipeline)
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

function parseOptionalWeight(value: unknown): number | null {
  if (value == null || value === "") return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function parseRequiredInk(value: unknown, label: string): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Konsumsi tinta ${label} wajib diisi (ml, angka ≥ 0)`)
  }
  return n
}

function parseSettingResultFiles(raw: string | null | undefined): unknown[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function isSettingFilesLocked(pipeline: {
  settingAccAt?: Date | null
}): boolean {
  return pipeline.settingAccAt != null
}

function assertSettingResultUploaded(
  settingResultFiles: string | null | undefined
) {
  const files = parseSettingResultFiles(settingResultFiles)
  if (!files.length) {
    throw new Error(
      "Unggah minimal satu foto hasil setting sebelum kirim ke CS"
    )
  }
}

function assertLayoutRequiresConsumerAcc(pipeline: {
  settingAccAt?: Date | null
}) {
  if (!pipeline.settingAccAt) {
    throw new Error("Layout hanya dapat dimulai setelah ACC konsumen")
  }
}

export async function updateSettingResultFiles(
  pipelineId: string,
  settingResultFiles: string
) {
  const pipeline = await prisma.productionPipeline.findUnique({
    where: { id: pipelineId },
  })

  if (!pipeline) {
    throw new Error("Pipeline tidak ditemukan")
  }
  if (isSettingFilesLocked(pipeline)) {
    throw new Error("Hasil setting sudah ACC — tidak dapat diubah")
  }
  if (pipeline.currentStatus !== ProductionStatus.SETTING) {
    throw new Error("Unggah hasil setting hanya saat tahap setting")
  }

  const files = parseSettingResultFiles(settingResultFiles)
  if (!files.length) {
    throw new Error("Minimal satu file hasil setting wajib diunggah")
  }

  return prisma.productionPipeline.update({
    where: { id: pipelineId },
    data: {
      settingResultFiles,
      updatedAt: new Date(),
    },
  })
}

export async function approveSettingAcc(
  pipelineId: string,
  actor: { name: string; role: string },
  note?: string
) {
  const pipeline = await prisma.productionPipeline.findUnique({
    where: { id: pipelineId },
  })

  if (!pipeline) {
    throw new Error("Pipeline tidak ditemukan")
  }
  if (pipeline.currentStatus !== ProductionStatus.MENUNGGU_ACC_SETTING) {
    throw new Error("Order tidak menunggu konfirmasi hasil setting")
  }

  const now = new Date()
  const accNote = note?.trim() || "ACC konsumen — lanjut layout"

  await markStagePlan(
    pipelineId,
    ProductionStatus.MENUNGGU_ACC_SETTING,
    StagePlanStatus.COMPLETED,
    { end: true }
  )

  return prisma.productionPipeline.update({
    where: { id: pipelineId },
    data: {
      currentStatus: ProductionStatus.LAYOUT_PRINT,
      settingAccAt: now,
      settingAccBy: actor.name,
      settingAccNote: accNote,
      settingRejectNote: null,
      updatedAt: now,
      ProductionStatusHistory: {
        create: {
          id: randomUUID(),
          fromStatus: ProductionStatus.MENUNGGU_ACC_SETTING,
          toStatus: ProductionStatus.LAYOUT_PRINT,
          eventType: ProductionEventType.STAGE_ADVANCED,
          changedByName: actor.name,
          changedByRole: actor.role,
          note: accNote,
        },
      },
    },
  })
}

export async function markSettingSentToConsumer(
  pipelineId: string,
  actor: { name: string; role: string }
) {
  const pipeline = await prisma.productionPipeline.findUnique({
    where: { id: pipelineId },
  })

  if (!pipeline) {
    throw new Error("Pipeline tidak ditemukan")
  }
  if (pipeline.currentStatus !== ProductionStatus.MENUNGGU_ACC_SETTING) {
    throw new Error("Order tidak menunggu konfirmasi hasil setting")
  }
  assertSettingResultUploaded(pipeline.settingResultFiles)

  const now = new Date()
  return prisma.productionPipeline.update({
    where: { id: pipelineId },
    data: {
      settingSentToConsumerAt: now,
      settingSentToConsumerBy: actor.name,
      updatedAt: now,
    },
  })
}

export async function rejectSettingAcc(
  pipelineId: string,
  actor: { name: string; role: string },
  rejectNote: string
) {
  const note = rejectNote.trim()
  if (!note) {
    throw new Error("Catatan revisi wajib diisi")
  }

  const pipeline = await prisma.productionPipeline.findUnique({
    where: { id: pipelineId },
  })

  if (!pipeline) {
    throw new Error("Pipeline tidak ditemukan")
  }
  if (pipeline.currentStatus !== ProductionStatus.MENUNGGU_ACC_SETTING) {
    throw new Error("Order tidak menunggu konfirmasi hasil setting")
  }

  const now = new Date()
  await prisma.productionStagePlan.updateMany({
    where: {
      productionPipelineId: pipelineId,
      stage: {
        in: [ProductionStatus.MENUNGGU_ACC_SETTING, ProductionStatus.SETTING],
      },
    },
    data: {
      status: StagePlanStatus.PENDING,
      actualStartAt: null,
      actualEndAt: null,
    },
  })

  return prisma.productionPipeline.update({
    where: { id: pipelineId },
    data: {
      currentStatus: ProductionStatus.SETTING,
      settingRejectNote: note,
      settingSubmittedAt: null,
      settingSubmittedBy: null,
      settingSentToConsumerAt: null,
      settingSentToConsumerBy: null,
      updatedAt: now,
      ProductionStatusHistory: {
        create: {
          id: randomUUID(),
          fromStatus: ProductionStatus.MENUNGGU_ACC_SETTING,
          toStatus: ProductionStatus.SETTING,
          eventType: ProductionEventType.STAGE_ROLLBACK,
          changedByName: actor.name,
          changedByRole: actor.role,
          note: `Revisi setting: ${note}`,
        },
      },
    },
  })
}

export async function completeStageProcess(
  pipelineId: string,
  actor: { name: string; role: string; id?: string },
  options?: {
    qty?: number
    finalOrderId?: string
    orderNumber?: string
    materialWeights?: PotongBahanWeights
    inkConsumption?: PrintingInkConsumption
    settingResultFiles?: string
  }
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

  if (from === ProductionStatus.MENUNGGU_ACC_SETTING) {
    throw new Error(
      "Menunggu ACC konsumen — hanya CS yang dapat menyetujui hasil setting"
    )
  }

  if (target === ProductionStatus.LAYOUT_PRINT) {
    assertLayoutRequiresConsumerAcc(pipeline)
  }

  if (from === ProductionStatus.SETTING) {
    if (isSettingFilesLocked(pipeline)) {
      throw new Error("Hasil setting sudah ACC — tidak dapat diubah")
    }
    const filesRaw =
      options?.settingResultFiles ?? pipeline.settingResultFiles ?? null
    const files = parseSettingResultFiles(filesRaw)
    if (!files.length) {
      throw new Error(
        "Unggah minimal satu foto hasil setting sebelum kirim ke CS"
      )
    }
  }

  let weightData:
    | {
        beratBahan: number
        beratRib: number | null
        catatanPotongBahan: string | null
      }
    | undefined

  let inkData:
    | {
        konsumsiTintaC: number
        konsumsiTintaM: number
        konsumsiTintaY: number
        konsumsiTintaK: number
      }
    | undefined

  if (from === ProductionStatus.PRINTING) {
    const ink = options?.inkConsumption
    if (!ink) {
      throw new Error(
        "Konsumsi tinta C, M, Y, K wajib diisi sebelum menyelesaikan printing"
      )
    }
    inkData = {
      konsumsiTintaC: parseRequiredInk(ink.konsumsiTintaC, "C"),
      konsumsiTintaM: parseRequiredInk(ink.konsumsiTintaM, "M"),
      konsumsiTintaY: parseRequiredInk(ink.konsumsiTintaY, "Y"),
      konsumsiTintaK: parseRequiredInk(ink.konsumsiTintaK, "K"),
    }
  }

  if (from === ProductionStatus.PREPARE_BAHAN_KAIN) {
    const w = options?.materialWeights
    const beratBahan = w?.beratBahan
    if (beratBahan == null || !Number.isFinite(beratBahan) || beratBahan <= 0) {
      throw new Error("Berat bahan utama wajib diisi (kg, lebih dari 0)")
    }
    weightData = {
      beratBahan,
      beratRib: parseOptionalWeight(w?.beratRib),
      catatanPotongBahan: w?.catatanPotongBahan?.trim() || null,
    }
  }

  const note =
    from === ProductionStatus.JAHIT
      ? "Selesai jahit → kembali Admin Produksi"
      : from === ProductionStatus.SETTING
        ? "Setting selesai — menunggu konfirmasi CS/konsumen"
        : from === ProductionStatus.PREPARE_BAHAN_KAIN
          ? `Potong bahan — bahan ${weightData!.beratBahan} kg`
          : from === ProductionStatus.PRINTING
            ? `Printing — C ${inkData!.konsumsiTintaC} ml, M ${inkData!.konsumsiTintaM} ml, Y ${inkData!.konsumsiTintaY} ml, K ${inkData!.konsumsiTintaK} ml`
            : undefined

  const inventoryDeductions =
    from === ProductionStatus.PRINTING && inkData
      ? buildPrintingDeductions(inkData)
      : from === ProductionStatus.PREPARE_BAHAN_KAIN && weightData
        ? buildPotongBahanDeductions(weightData)
        : []

  const updated = await prisma.$transaction(async (tx) => {
    if (inventoryDeductions.length > 0) {
      await deductInventoryForStage(tx, {
        pipelineId,
        stage: from,
        orderNumber: pipeline.FinalOrder.orderNumber,
        deductions: inventoryDeductions,
        actorName: actor.name,
        note,
      })
    }

    const now = new Date()
    await tx.productionStagePlan.updateMany({
      where: { productionPipelineId: pipelineId, stage: from },
      data: { status: StagePlanStatus.COMPLETED, actualEndAt: now },
    })

    const settingSubmitData =
      from === ProductionStatus.SETTING
        ? {
            settingResultFiles:
              options?.settingResultFiles ?? pipeline.settingResultFiles,
            settingSubmittedAt: now,
            settingSubmittedBy: actor.name,
            settingRejectNote: null,
            settingSentToConsumerAt: null,
            settingSentToConsumerBy: null,
            settingSubmitCount: { increment: 1 },
          }
        : {}

    const pipelineUpdated = await tx.productionPipeline.update({
      where: { id: pipelineId },
      data: {
        currentStatus: target,
        updatedAt: now,
        completedAt:
          target === ProductionStatus.SIAP_KIRIM ? now : undefined,
        ...weightData,
        ...inkData,
        ...settingSubmitData,
        ProductionStatusHistory: {
          create: {
            id: randomUUID(),
            fromStatus: from,
            toStatus: target,
            eventType: ProductionEventType.STAGE_ADVANCED,
            changedByName: actor.name,
            changedByRole: actor.role,
            note,
          },
        },
      },
    })

    if (from === ProductionStatus.JAHIT) {
      const order = pipeline.FinalOrder
      await tx.jahitPaymentRecord.create({
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

    return pipelineUpdated
  })

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

export async function markKancingComplete(
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
  if (!pipeline.needsKancing) {
    throw new Error("Order ini tidak memerlukan kancing")
  }
  if (pipeline.kancingCompletedAt) {
    throw new Error("Kancing sudah ditandai selesai")
  }

  const now = new Date()
  return prisma.productionPipeline.update({
    where: { id: pipelineId },
    data: {
      kancingCompletedAt: now,
      updatedAt: now,
      ProductionStatusHistory: {
        create: {
          id: randomUUID(),
          fromStatus: ProductionStatus.ADMIN_PRODUKSI,
          toStatus: ProductionStatus.ADMIN_PRODUKSI,
          eventType: ProductionEventType.STAGE_ADVANCED,
          changedByName: actor.name,
          changedByRole: actor.role,
          note: "Kancing selesai (catatan SPP)",
        },
      },
    },
  })
}

export async function markDtfComplete(
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
  if (!pipeline.needsDTF) {
    throw new Error("Order ini tidak memerlukan DTF")
  }
  if (pipeline.dtfCompletedAt) {
    throw new Error("DTF sudah ditandai selesai")
  }

  const now = new Date()
  return prisma.productionPipeline.update({
    where: { id: pipelineId },
    data: {
      dtfCompletedAt: now,
      updatedAt: now,
      ProductionStatusHistory: {
        create: {
          id: randomUUID(),
          fromStatus: ProductionStatus.ADMIN_PRODUKSI,
          toStatus: ProductionStatus.ADMIN_PRODUKSI,
          eventType: ProductionEventType.STAGE_ADVANCED,
          changedByName: actor.name,
          changedByRole: actor.role,
          note: "DTF selesai (catatan SPP)",
        },
      },
    },
  })
}

export async function completePackingToSiapKirim(
  pipelineId: string,
  actor: { name: string; role: string }
) {
  const pipeline = await prisma.productionPipeline.findUnique({
    where: { id: pipelineId },
  })

  if (!pipeline) {
    throw new Error("Pipeline tidak ditemukan")
  }
  if (pipeline.currentStatus !== ProductionStatus.PACKING) {
    throw new Error("Order harus di tahap packing")
  }

  await markStagePlan(pipelineId, ProductionStatus.PACKING, StagePlanStatus.COMPLETED, {
    end: true,
  })
  await markStagePlan(
    pipelineId,
    ProductionStatus.BARANG_SELESAI,
    StagePlanStatus.COMPLETED,
    { end: true }
  )

  return transitionPipeline(
    pipelineId,
    ProductionStatus.PACKING,
    ProductionStatus.SIAP_KIRIM,
    actor,
    ProductionEventType.STAGE_ADVANCED,
    "Packing selesai → siap kirim"
  )
}

export async function ensureDefaultStagePlans(pipelineId: string) {
  const existing = await prisma.productionStagePlan.findMany({
    where: { productionPipelineId: pipelineId },
    select: { stage: true, sequence: true },
  })

  if (existing.length === 0) {
    await prisma.productionStagePlan.createMany({
      data: MAIN_SEQUENCE.map((stage, index) => ({
        id: randomUUID(),
        productionPipelineId: pipelineId,
        stage,
        sequence: index + 1,
        status: StagePlanStatus.PENDING,
      })),
    })
    return
  }

  const existingStages = new Set(existing.map((row) => row.stage))
  const missing = MAIN_SEQUENCE.filter((stage) => !existingStages.has(stage))
  if (!missing.length) return

  const maxSequence = Math.max(...existing.map((row) => row.sequence), 0)
  await prisma.productionStagePlan.createMany({
    data: missing.map((stage, index) => ({
      id: randomUUID(),
      productionPipelineId: pipelineId,
      stage,
      sequence: maxSequence + index + 1,
      status: StagePlanStatus.PENDING,
    })),
  })
}
