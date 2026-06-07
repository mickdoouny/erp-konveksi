import { randomUUID } from "crypto"
import {
  DtfPaymentRequestStatus,
  DtfStatus,
  ProductionStatus,
} from "@prisma/client"
import { prisma } from "@/lib/prisma"

/** DTF workflow disabled — perluDtf is SPP note only. */
export async function assertDtfProductionGate(_designQueueItemId: string | null) {
  return
}

export async function assignDtfVendor(
  designQueueItemId: string,
  vendorId: string
) {
  const item = await prisma.designQueueItem.findUnique({
    where: { id: designQueueItemId },
  })

  if (!item) throw new Error("Item antrian tidak ditemukan")
  if (!item.perluDtf) throw new Error("Artikel ini tidak memerlukan DTF")

  const vendor = await prisma.dtfVendor.findFirst({
    where: { id: vendorId, isActive: true },
  })
  if (!vendor) throw new Error("Vendor DTF tidak ditemukan atau tidak aktif")

  const now = new Date()
  return prisma.designQueueItem.update({
    where: { id: designQueueItemId },
    data: {
      dtfVendorId: vendorId,
      statusDtf:
        item.statusDtf === DtfStatus.MENUNGGU_ORDER
          ? DtfStatus.DI_VENDOR
          : item.statusDtf,
      updatedAt: now,
    },
    include: {
      DtfVendor: true,
      DtfPaymentRequest: { orderBy: { requestedAt: "desc" }, take: 1 },
    },
  })
}

export async function updateDtfFiles(
  designQueueItemId: string,
  patch: { fileDtfVendor?: string; fileDtfProof?: string }
) {
  const item = await prisma.designQueueItem.findUnique({
    where: { id: designQueueItemId },
  })
  if (!item) throw new Error("Item antrian tidak ditemukan")
  if (!item.perluDtf) throw new Error("Artikel ini tidak memerlukan DTF")

  const now = new Date()
  const nextVendorFile = patch.fileDtfVendor ?? item.fileDtfVendor
  const nextProofFile = patch.fileDtfProof ?? item.fileDtfProof
  let nextStatus = item.statusDtf

  if (
    nextProofFile?.trim() &&
    (item.statusDtf === DtfStatus.DI_VENDOR ||
      item.statusDtf === DtfStatus.MENUNGGU_ORDER)
  ) {
    nextStatus = DtfStatus.MENUNGGU_BAYAR
  } else if (
    nextVendorFile?.trim() &&
    item.statusDtf === DtfStatus.MENUNGGU_ORDER
  ) {
    nextStatus = item.dtfVendorId ? DtfStatus.DI_VENDOR : DtfStatus.MENUNGGU_ORDER
  }

  return prisma.designQueueItem.update({
    where: { id: designQueueItemId },
    data: {
      fileDtfVendor: patch.fileDtfVendor ?? item.fileDtfVendor,
      fileDtfProof: patch.fileDtfProof ?? item.fileDtfProof,
      statusDtf: nextStatus,
      updatedAt: now,
    },
    include: {
      DtfVendor: true,
      DtfPaymentRequest: { orderBy: { requestedAt: "desc" }, take: 1 },
    },
  })
}

export async function submitDtfPaymentRequest(input: {
  designQueueItemId: string
  nominal: number
  requestedBy: string
  notes?: string
}) {
  const item = await prisma.designQueueItem.findUnique({
    where: { id: input.designQueueItemId },
    include: {
      DtfPaymentRequest: {
        where: { status: DtfPaymentRequestStatus.MENUNGGU },
      },
    },
  })

  if (!item) throw new Error("Item antrian tidak ditemukan")
  if (!item.perluDtf) throw new Error("Artikel ini tidak memerlukan DTF")
  if (!item.dtfVendorId) throw new Error("Pilih vendor DTF terlebih dahulu")
  if (!item.fileDtfVendor?.trim()) {
    throw new Error("Unggah file untuk vendor terlebih dahulu")
  }
  if (!item.fileDtfProof?.trim()) {
    throw new Error("Unggah hasil dari vendor terlebih dahulu")
  }
  if (item.DtfPaymentRequest.length > 0) {
    throw new Error("Sudah ada permintaan pembayaran DTF yang menunggu persetujuan")
  }
  if (input.nominal <= 0) throw new Error("Nominal pembayaran harus lebih dari 0")

  const now = new Date()

  await prisma.$transaction([
    prisma.dtfPaymentRequest.create({
      data: {
        id: randomUUID(),
        designQueueItemId: item.id,
        vendorId: item.dtfVendorId,
        nominal: input.nominal,
        status: DtfPaymentRequestStatus.MENUNGGU,
        requestedBy: input.requestedBy,
        notes: input.notes?.trim() || null,
      },
    }),
    prisma.designQueueItem.update({
      where: { id: item.id },
      data: {
        statusDtf: DtfStatus.MENUNGGU_BAYAR,
        updatedAt: now,
      },
    }),
  ])

  return prisma.designQueueItem.findUnique({
    where: { id: item.id },
    include: {
      DtfVendor: true,
      DtfPaymentRequest: { orderBy: { requestedAt: "desc" }, take: 5 },
    },
  })
}

export async function approveDtfPaymentRequest(
  requestId: string,
  actor: { name: string },
  buktiBayarUrl: string
) {
  const request = await prisma.dtfPaymentRequest.findUnique({
    where: { id: requestId },
    include: { DesignQueueItem: true },
  })

  if (!request) throw new Error("Permintaan pembayaran tidak ditemukan")
  if (request.status !== DtfPaymentRequestStatus.MENUNGGU) {
    throw new Error("Permintaan sudah diproses")
  }
  if (!buktiBayarUrl.trim()) {
    throw new Error("Unggah bukti bayar terlebih dahulu")
  }

  const now = new Date()

  await prisma.$transaction([
    prisma.dtfPaymentRequest.update({
      where: { id: requestId },
      data: {
        status: DtfPaymentRequestStatus.DISETUJUI,
        approvedBy: actor.name,
        approvedAt: now,
        buktiBayarUrl: buktiBayarUrl.trim(),
      },
    }),
    prisma.designQueueItem.update({
      where: { id: request.designQueueItemId },
      data: {
        statusDtf: DtfStatus.DIBAYAR,
        updatedAt: now,
      },
    }),
  ])

  return prisma.dtfPaymentRequest.findUnique({
    where: { id: requestId },
    include: {
      DesignQueueItem: { include: { DtfVendor: true } },
      DtfVendor: true,
    },
  })
}

export async function rejectDtfPaymentRequest(
  requestId: string,
  actor: { name: string },
  notes?: string
) {
  const request = await prisma.dtfPaymentRequest.findUnique({
    where: { id: requestId },
  })

  if (!request) throw new Error("Permintaan pembayaran tidak ditemukan")
  if (request.status !== DtfPaymentRequestStatus.MENUNGGU) {
    throw new Error("Permintaan sudah diproses")
  }

  const now = new Date()

  await prisma.$transaction([
    prisma.dtfPaymentRequest.update({
      where: { id: requestId },
      data: {
        status: DtfPaymentRequestStatus.DITOLAK,
        approvedBy: actor.name,
        approvedAt: now,
        notes: notes?.trim() || request.notes,
      },
    }),
    prisma.designQueueItem.update({
      where: { id: request.designQueueItemId },
      data: {
        statusDtf: DtfStatus.MENUNGGU_BAYAR,
        updatedAt: now,
      },
    }),
  ])

  return prisma.dtfPaymentRequest.findUnique({
    where: { id: requestId },
    include: {
      DesignQueueItem: true,
      DtfVendor: true,
    },
  })
}

export async function markDtfStageCompleted(
  pipelineId: string,
  designQueueItemId: string | null
) {
  if (designQueueItemId) {
    await prisma.designQueueItem.updateMany({
      where: { id: designQueueItemId, perluDtf: true },
      data: {
        statusDtf: DtfStatus.SIAP_PRODUKSI,
        updatedAt: new Date(),
      },
    })
  }

  return prisma.productionPipeline.update({
    where: { id: pipelineId },
    data: {
      dtfCompletedAt: new Date(),
      updatedAt: new Date(),
    },
  })
}

/** DTF workflow disabled — no pipeline gates. */
export function pipelineNeedsDtfGate(
  _currentStatus: ProductionStatus,
  _targetStatus: ProductionStatus,
  _needsDTF: boolean
): boolean {
  return false
}
