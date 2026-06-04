import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import type { DesignQueueStatusDesain } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { validateCdrFilename } from "@/lib/cdr-filename"
import { serializeDesignFiles } from "@/lib/cs-antrian-desain"
import {
  attachDesignQueueMessages,
  designQueueMessagesInclude,
  formatDesignQueueMessages,
  parseAddDesignQueueMessageBody,
} from "@/lib/design-queue-notes"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const item = await prisma.designQueueItem.findUnique({
      where: { id },
      include: {
        ...designQueueMessagesInclude,
        DtfVendor: true,
        DtfPaymentRequest: { orderBy: { requestedAt: "desc" }, take: 5 },
        FinalOrder: {
          select: {
            AccountingTransaction: { select: { paymentStatus: true } },
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json(
        { message: "Item tidak ditemukan" },
        { status: 404 }
      )
    }

    return NextResponse.json(attachDesignQueueMessages(item))
  } catch (error) {
    console.error("GET DESIGN QUEUE:", error)
    return NextResponse.json(
      { message: "Gagal mengambil data antrian" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>

    const parsed = parseAddDesignQueueMessageBody(body)
    if (!parsed.ok) {
      return NextResponse.json({ message: parsed.message }, { status: 400 })
    }

    const existing = await prisma.designQueueItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { message: "Item tidak ditemukan" },
        { status: 404 }
      )
    }

    await prisma.designQueueMessage.create({
      data: {
        id: randomUUID(),
        designQueueItemId: id,
        senderRole: parsed.senderRole,
        senderName: parsed.senderName,
        message: parsed.message,
      },
    })

    const rows = await prisma.designQueueMessage.findMany({
      where: { designQueueItemId: id },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({
      ok: true,
      messages: formatDesignQueueMessages(rows),
    })
  } catch (error) {
    console.error("POST DESIGN QUEUE MESSAGE:", error)
    return NextResponse.json(
      { message: "Gagal mengirim pesan" },
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
    const body = await request.json()

    const existing = await prisma.designQueueItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { message: "Item tidak ditemukan" },
        { status: 404 }
      )
    }

    const data: {
      statusDesain?: DesignQueueStatusDesain
      hasilDesain?: string | null
      fileDesainProduksi?: string | null
      returnedToCsAt?: Date
      processedAt?: Date
      updatedAt: Date
    } = {
      updatedAt: new Date(),
    }

    if (body.statusDesain !== undefined) {
      data.statusDesain = body.statusDesain as DesignQueueStatusDesain
    }

    if (body.hasilDesain !== undefined) {
      data.hasilDesain =
        typeof body.hasilDesain === "string"
          ? body.hasilDesain
          : serializeDesignFiles(body.hasilDesain)
    }

    if (body.action === "upload_production_file") {
      const filename = String(body.filename ?? "")
      const validation = validateCdrFilename(existing.artikelId, filename)
      if (!validation.ok) {
        return NextResponse.json({ message: validation.message }, { status: 400 })
      }
      data.fileDesainProduksi =
        typeof body.fileDesainProduksi === "string"
          ? body.fileDesainProduksi
          : serializeDesignFiles(body.fileDesainProduksi)
      data.statusDesain = "MENUNGGU_DP"
    }

    if (body.action === "kirim_ke_cs") {
      data.statusDesain = "MENUNGGU_ACC_KONSUMEN"
      data.returnedToCsAt = new Date()
    }

    if (body.action === "mulai_proses") {
      data.statusDesain = "SEDANG_DIPROSES"
      data.processedAt = new Date()
    }

    if (body.fileDesainProduksi !== undefined && body.action !== "upload_production_file") {
      data.fileDesainProduksi =
        typeof body.fileDesainProduksi === "string"
          ? body.fileDesainProduksi
          : serializeDesignFiles(body.fileDesainProduksi)
    }

    const updated = await prisma.designQueueItem.update({
      where: { id },
      data,
      include: {
        ...designQueueMessagesInclude,
        FinalOrder: {
          select: {
            AccountingTransaction: { select: { paymentStatus: true } },
          },
        },
      },
    })

    return NextResponse.json(attachDesignQueueMessages(updated))
  } catch (error) {
    console.error("PATCH DESIGN QUEUE:", error)
    return NextResponse.json(
      { message: "Gagal memperbarui antrian desain" },
      { status: 500 }
    )
  }
}
