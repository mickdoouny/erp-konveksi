import { NextResponse } from "next/server"
import type { DesignQueueStatusDesain } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  canCsEditKonsumen,
  parseCsEditKonsumenBody,
  serializeDesignFiles,
} from "@/lib/cs-antrian-desain"
import {
  attachDesignQueueMessages,
  designQueueMessagesInclude,
} from "@/lib/design-queue-notes"
import {
  canCsSubmitInputOrder,
  parseCsInputOrderBody,
  resolveLockedKonsumenFields,
} from "@/lib/cs-input-order"
import { createFinalOrderFromDesignQueue } from "@/lib/create-final-order-from-design-queue"
import { isFinalOrderWorkflowEnabled } from "@/lib/feature-flags"
import {
  csOwnsDesignQueueItem,
  parseCsRequestScope,
} from "@/lib/cs-design-queue-access"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const scope = parseCsRequestScope(request)

    const item = await prisma.designQueueItem.findUnique({
      where: { id },
      include: {
        ...designQueueMessagesInclude,
        DtfVendor: true,
        DtfPaymentRequest: { orderBy: { requestedAt: "desc" }, take: 5 },
        FinalOrder: {
          select: {
            id: true,
            orderNumber: true,
            submittedAt: true,
            AccountingTransaction: {
              select: {
                paymentStatus: true,
                totalHarga: true,
                dp: true,
                sisaPelunasan: true,
              },
            },
            ProductionPipeline: {
              select: {
                id: true,
                productionNumber: true,
                currentStatus: true,
                adminProduksiStatus: true,
                needsDTF: true,
                dtfCompletedAt: true,
              },
            },
          },
        },
      },
    })

    if (!item || !csOwnsDesignQueueItem(scope, item)) {
      return NextResponse.json(
        { message: "Item antrian tidak ditemukan" },
        { status: 404 }
      )
    }

    return NextResponse.json(attachDesignQueueMessages(item))
  } catch (error) {
    console.error("GET CS ANTRIAN ITEM:", error)
    return NextResponse.json(
      { message: "Gagal mengambil detail antrian" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const scope = parseCsRequestScope(request)
    const body = await request.json()

    const existing = await prisma.designQueueItem.findUnique({
      where: { id },
    })

    if (!existing || !csOwnsDesignQueueItem(scope, existing)) {
      return NextResponse.json(
        { message: "Item antrian tidak ditemukan" },
        { status: 404 }
      )
    }

    if (body.action === "update_konsumen") {
      const parsed = parseCsEditKonsumenBody(body as Record<string, unknown>)
      if (!parsed.ok) {
        return NextResponse.json({ message: parsed.message }, { status: 400 })
      }

      if (!canCsEditKonsumen(existing.statusDesain)) {
        return NextResponse.json(
          {
            message:
              "Data konsumen tidak dapat diubah setelah input order disetujui",
          },
          { status: 409 }
        )
      }

      const groupFilter = existing.sppGroupId
        ? { sppGroupId: existing.sppGroupId }
        : { id }

      const groupItems = await prisma.designQueueItem.findMany({
        where: groupFilter,
      })

      const blocked = groupItems.find(
        (row) => !canCsEditKonsumen(row.statusDesain)
      )
      if (blocked) {
        return NextResponse.json(
          {
            message:
              "Salah satu artikel dalam grup sudah melewati tahap input order.",
          },
          { status: 409 }
        )
      }

      await prisma.designQueueItem.updateMany({
        where: groupFilter,
        data: {
          namaKonsumen: parsed.data.namaKonsumen,
          noTelepon: parsed.data.noTelepon,
          alamatPengiriman: parsed.data.alamatPengiriman,
          updatedAt: new Date(),
        },
      })

      const updated = await prisma.designQueueItem.findUnique({
        where: { id },
        include: {
          ...designQueueMessagesInclude,
          FinalOrder: {
            select: {
              AccountingTransaction: { select: { paymentStatus: true } },
            },
          },
        },
      })

      return NextResponse.json(
        updated ? attachDesignQueueMessages(updated) : updated
      )
    }

    if (body.action === "submit_input_order") {
      if (
        !canCsSubmitInputOrder(existing.statusDesain, existing.fileDesainProduksi)
      ) {
        return NextResponse.json(
          {
            message:
              "Unggah file CDR produksi (nama file = ID artikel) terlebih dahulu.",
          },
          { status: 400 }
        )
      }

      const input = parseCsInputOrderBody(body)
      const locked = resolveLockedKonsumenFields(existing)

      const actor = {
        name: String(body.actorName ?? existing.csNama),
        role: String(body.actorRole ?? "cs"),
        userId: body.actorUserId ? String(body.actorUserId) : undefined,
      }

      if (isFinalOrderWorkflowEnabled()) {
        await createFinalOrderFromDesignQueue(existing, input, actor)
      } else {
        const qty = input.totalOrder ?? 0
        const hargaSatuan = input.hargaSatuan ?? 0
        const ongkir = input.ongkosKirim ?? 0
        const total = qty * hargaSatuan + ongkir
        const dp = input.dpAmount ?? 0

        await prisma.designQueueItem.update({
          where: { id },
          data: {
            ...locked,
            statusDesain: "DISETUJUI_CS",
            readyForAdmin: true,
            approvedAt: new Date(),
            jenisOrder: input.jenisOrder,
            jenisBahan: input.jenisBahan,
            jenisKerah: input.jenisKerah,
            lengan: input.lengan,
            totalOrder: qty,
            hargaSatuan,
            dpAmount: dp,
            sisaPelunasan: Math.max(0, total - dp),
            ongkosKirim: ongkir,
            tanggalDeadline: input.tanggalDeadline
              ? new Date(input.tanggalDeadline)
              : null,
            buktiDp: input.buktiDp,
            catatanFinishing: input.catatanFinishing,
            updatedAt: new Date(),
          },
        })
      }

      const updated = await prisma.designQueueItem.findUnique({
        where: { id },
        include: {
          ...designQueueMessagesInclude,
          FinalOrder: {
            select: {
              AccountingTransaction: { select: { paymentStatus: true } },
            },
          },
        },
      })
      return NextResponse.json(
        updated ? attachDesignQueueMessages(updated) : updated
      )
    }

    const data: {
      statusDesain?: DesignQueueStatusDesain
      revisionCount?: number
      materiDesain?: string | null
      namaKonsumen?: string
      noTelepon?: string | null
      alamatPengiriman?: string | null
      hasilDesain?: string | null
      returnedToCsAt?: Date | null
      updatedAt: Date
    } = {
      updatedAt: new Date(),
    }

    if (body.statusDesain !== undefined) {
      data.statusDesain = body.statusDesain as DesignQueueStatusDesain
    }

    if (body.namaKonsumen !== undefined) {
      data.namaKonsumen = body.namaKonsumen
    }

    if (body.noTelepon !== undefined) {
      data.noTelepon = body.noTelepon
    }

    if (body.alamatPengiriman !== undefined) {
      data.alamatPengiriman = body.alamatPengiriman
    }

    if (body.hasilDesain !== undefined) {
      data.hasilDesain =
        typeof body.hasilDesain === "string"
          ? body.hasilDesain
          : serializeDesignFiles(body.hasilDesain)
    }

    if (body.action === "revisi") {
      data.statusDesain = "DIKEMBALIKAN_CS"
      data.revisionCount = existing.revisionCount + 1
      data.returnedToCsAt = null
      if (body.catatanRevisi) {
        const note = String(body.catatanRevisi).trim()
        const prev = existing.materiDesain || ""
        data.materiDesain = prev
          ? `${prev}\n\n[Revisi] ${note}`
          : `[Revisi] ${note}`
      }
    }

    if (body.action === "acc_konsumen") {
      data.statusDesain = "MENUNGGU_DP"
    }

    if (body.action === "kirim_ke_desainer") {
      data.statusDesain = "MENUNGGU"
    }

    if (body.statusDesain === "SEDANG_DIPROSES" || body.status === "SEDANG_DIPROSES") {
      data.statusDesain = "SEDANG_DIPROSES"
    }

    const updated = await prisma.designQueueItem.update({
      where: { id },
      data,
      include: {
        ...designQueueMessagesInclude,
        FinalOrder: {
          select: {
            id: true,
            orderNumber: true,
            submittedAt: true,
            AccountingTransaction: {
              select: {
                paymentStatus: true,
                totalHarga: true,
                dp: true,
                sisaPelunasan: true,
              },
            },
            ProductionPipeline: {
              select: {
                id: true,
                productionNumber: true,
                currentStatus: true,
                adminProduksiStatus: true,
                needsDTF: true,
                dtfCompletedAt: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(attachDesignQueueMessages(updated))
  } catch (error) {
    console.error("PATCH CS ANTRIAN ITEM:", error)
    return NextResponse.json(
      { message: "Gagal memperbarui antrian desain" },
      { status: 500 }
    )
  }
}
