import { randomUUID } from "crypto"
import {
  AdminProduksiStatus,
  FinalOrderStatus,
  PaymentStatus,
  ProductionStatus,
} from "@prisma/client"
import type { DesignQueueItem } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { isFinalOrderWorkflowEnabled } from "@/lib/feature-flags"
import { ensureDefaultStagePlans } from "@/lib/production-pipeline"
import type { CsInputOrderBody } from "@/lib/cs-input-order"

function generateOrderNumber(sequence: number) {
  return `FO-${String(sequence).padStart(5, "0")}`
}

function generateProductionNumber(sequence: number) {
  return `PRD-${String(sequence).padStart(5, "0")}`
}

function generateInvoiceNumber(sequence: number) {
  return `INV-${String(sequence).padStart(5, "0")}`
}

export async function createFinalOrderFromDesignQueue(
  item: DesignQueueItem,
  input: CsInputOrderBody,
  actor: { name: string; role: string; userId?: string }
) {
  if (!isFinalOrderWorkflowEnabled()) {
    return null
  }

  const existing = await prisma.finalOrder.findUnique({
    where: { designQueueItemId: item.id },
  })

  if (existing) {
    return existing
  }

  const orderCount = await prisma.finalOrder.count()
  const now = new Date()

  const qty = input.totalOrder ?? item.totalOrder ?? 0
  const hargaSatuan = input.hargaSatuan ?? item.hargaSatuan ?? 0
  const ongkir = input.ongkosKirim ?? item.ongkosKirim ?? 0
  const totalHarga = qty * hargaSatuan + ongkir
  const dp = input.dpAmount ?? item.dpAmount ?? 0
  const sisa = Math.max(0, totalHarga - dp)

  const orderId = randomUUID()
  const pipelineId = randomUUID()
  const accountingId = randomUUID()
  const orderNumber = generateOrderNumber(orderCount + 1)
  const productionNumber = generateProductionNumber(orderCount + 1)
  const invoiceNumber = generateInvoiceNumber(orderCount + 1)

  const needsKancing = Boolean(input.needsKancing)
  const needsDTF = Boolean(input.needsDTF ?? item.perluDtf)

  await prisma.$transaction(async (tx) => {
    await tx.finalOrder.create({
      data: {
        id: orderId,
        orderNumber,
        status: FinalOrderStatus.SUBMITTED,
        submittedAt: now,
        submittedByName: actor.name,
        submittedByUserId: actor.userId ?? null,
        namaCs: item.csNama,
        namaKonsumen: item.namaKonsumen,
        noHp: item.noTelepon ?? "",
        alamat: item.alamatPengiriman,
        namaArtikel: item.namaArtikel,
        jenisOrder: input.jenisOrder ?? item.jenisOrder,
        bahan: input.jenisBahan ?? item.jenisBahan,
        jenisKerah: input.jenisKerah ?? item.jenisKerah,
        jenisLengan: input.lengan ?? item.lengan,
        qty,
        deadline: input.tanggalDeadline
          ? new Date(input.tanggalDeadline)
          : item.tanggalDeadline,
        needsKancing,
        needsDTF,
        fileDesainFinal: item.fileDesainProduksi,
        catatanProduksi: input.catatanFinishing ?? item.catatanFinishing,
        hargaSatuan,
        totalHarga,
        dp,
        sisaPelunasan: sisa,
        buktiDp: input.buktiDp ?? item.buktiDp,
        ongkosKirim: ongkir,
        designQueueItemId: item.id,
        updatedAt: now,
        FinalOrderRosterLine: {
          create: (input.rosterLines ?? []).map((line, index) => ({
            id: randomUUID(),
            nama: line.nama,
            nomorPunggung: line.nomorPunggung ?? null,
            ukuran: line.ukuran ?? null,
            catatan: line.catatan ?? null,
            sortOrder: index,
          })),
        },
        AccountingTransaction: {
          create: {
            id: accountingId,
            invoiceNumber,
            totalHarga,
            dp,
            sisaPelunasan: sisa,
            paymentStatus: PaymentStatus.MENUNGGU_DP,
            buktiDp: input.buktiDp ?? item.buktiDp,
            updatedAt: now,
          },
        },
        ProductionPipeline: {
          create: {
            id: pipelineId,
            productionNumber,
            currentStatus: ProductionStatus.ADMIN_PRODUKSI,
            adminProduksiStatus: AdminProduksiStatus.PENDING,
            needsKancing,
            needsDTF,
            deadline: input.tanggalDeadline
              ? new Date(input.tanggalDeadline)
              : item.tanggalDeadline,
            updatedAt: now,
          },
        },
      },
    })

    await tx.designQueueItem.update({
      where: { id: item.id },
      data: {
        statusDesain: "DISETUJUI_CS",
        readyForAdmin: true,
        approvedAt: now,
        jenisOrder: input.jenisOrder ?? item.jenisOrder,
        jenisBahan: input.jenisBahan ?? item.jenisBahan,
        jenisKerah: input.jenisKerah ?? item.jenisKerah,
        lengan: input.lengan ?? item.lengan,
        totalOrder: qty,
        hargaSatuan,
        dpAmount: dp,
        sisaPelunasan: sisa,
        ongkosKirim: ongkir,
        tanggalDeadline: input.tanggalDeadline
          ? new Date(input.tanggalDeadline)
          : item.tanggalDeadline,
        buktiDp: input.buktiDp ?? item.buktiDp,
        catatanFinishing: input.catatanFinishing ?? item.catatanFinishing,
        updatedAt: now,
      },
    })
  })

  await ensureDefaultStagePlans(pipelineId, needsKancing, needsDTF)

  return prisma.finalOrder.findUnique({
    where: { id: orderId },
    include: {
      AccountingTransaction: true,
      ProductionPipeline: true,
      FinalOrderRosterLine: true,
    },
  })
}
