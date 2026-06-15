import { randomUUID } from "crypto"
import {
  AdminProduksiStatus,
  FinalOrderStatus,
  JenisProduksi,
  PaymentStatus,
  ProductionStatus,
} from "@prisma/client"
import type { DesignQueueItem } from "@prisma/client"
import { HEAVY_TRANSACTION_OPTIONS, prisma } from "@/lib/prisma"
import { isFinalOrderWorkflowEnabled } from "@/lib/feature-flags"
import { ensureDefaultStagePlans } from "@/lib/production-pipeline"
import {
  nextExpressPriority,
  parseJenisProduksi,
  resolveExpressPriorityFields,
  calculateOrderTotalFromInput,
  usesPerJenisPricing,
  type CsInputOrderBody,
} from "@/lib/cs-input-order"

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

  const { totalHarga, qty } = calculateOrderTotalFromInput(input)
  const dp = input.dpAmount ?? item.dpAmount ?? 0
  const sisa = Math.max(0, totalHarga - dp)
  const ongkir = input.ongkosKirim ?? item.ongkosKirim ?? 0

  // Legacy hargaSatuan for display when single price; store per-jenis when used
  const hargaSatuan = usesPerJenisPricing({
    hargaStelan: input.hargaStelan,
    hargaAtasan: input.hargaAtasan,
    hargaBawahan: input.hargaBawahan,
  })
    ? null
    : (input.hargaSatuan ?? item.hargaSatuan ?? 0)

  const orderId = randomUUID()
  const pipelineId = randomUUID()
  const accountingId = randomUUID()
  const orderNumber = generateOrderNumber(orderCount + 1)
  const productionNumber = generateProductionNumber(orderCount + 1)
  const invoiceNumber = generateInvoiceNumber(orderCount + 1)

  const needsKancing = Boolean(input.needsKancing ?? item.perluKancing)
  const needsDTF = Boolean(input.needsDTF ?? item.perluDtf)
  const needsProving = Boolean(item.perluProving)
  const jenisProduksi: JenisProduksi = parseJenisProduksi(input.jenisProduksi)

  await prisma.$transaction(async (tx) => {
    const expressPriority =
      jenisProduksi === "EXPRESS" ? await nextExpressPriority(tx) : null
    const productionFields = resolveExpressPriorityFields(
      jenisProduksi,
      expressPriority
    )

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
        jenisProduksi: productionFields.jenisProduksi,
        expressPriority: productionFields.expressPriority,
        needsKancing,
        needsDTF,
        needsProving,
        fileDesainFinal: item.fileDesainProduksi,
        catatanProduksi: input.catatanFinishing ?? item.catatanFinishing,
        hargaSatuan,
        hargaStelan: input.hargaStelan ?? null,
        hargaAtasan: input.hargaAtasan ?? null,
        hargaBawahan: input.hargaBawahan ?? null,
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
            jenisItem: line.jenisItem ?? null,
            jenisKerah: line.jenisKerah ?? null,
            lengan: line.lengan ?? null,
            bahan: line.bahan ?? null,
            warna: line.warna ?? null,
            grup: line.grup ?? null,
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
            needsProving,
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
        hargaSatuan: hargaSatuan ?? undefined,
        dpAmount: dp,
        sisaPelunasan: sisa,
        ongkosKirim: ongkir,
        tanggalDeadline: input.tanggalDeadline
          ? new Date(input.tanggalDeadline)
          : item.tanggalDeadline,
        jenisProduksi: productionFields.jenisProduksi,
        expressPriority: productionFields.expressPriority,
        buktiDp: input.buktiDp ?? item.buktiDp,
        catatanFinishing: input.catatanFinishing ?? item.catatanFinishing,
        updatedAt: now,
      },
    })
  }, HEAVY_TRANSACTION_OPTIONS)

  await ensureDefaultStagePlans(pipelineId)

  return prisma.finalOrder.findUnique({
    where: { id: orderId },
    include: {
      AccountingTransaction: true,
      ProductionPipeline: true,
      FinalOrderRosterLine: true,
    },
  })
}
