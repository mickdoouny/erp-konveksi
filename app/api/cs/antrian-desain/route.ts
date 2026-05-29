import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { apiErrorPayload } from "@/lib/api-error"
import { prisma } from "@/lib/prisma"
import {
  generateArtikelId,
  generateDesignId,
  generateSppGroupId,
  parseCsAntrianDesainBody,
  serializeDesignFiles,
  type CreateDesignBatchInput,
} from "@/lib/cs-antrian-desain"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const csNama = searchParams.get("csNama")

    const items = await prisma.designQueueItem.findMany({
      where: csNama ? { csNama } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        FinalOrder: {
          select: {
            AccountingTransaction: { select: { paymentStatus: true } },
          },
        },
      },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error("GET CS ANTRIAN DESAIN:", error)
    return NextResponse.json(
      apiErrorPayload(error, "Gagal mengambil antrian desain"),
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateDesignBatchInput
    const parsed = parseCsAntrianDesainBody(body)

    if (!parsed.ok) {
      return NextResponse.json({ message: parsed.message }, { status: 400 })
    }

    const artikelCount = await prisma.designQueueItem.count()
    const designGroups = await prisma.designQueueItem.groupBy({
      by: ["designId"],
    })

    const designId = generateDesignId(designGroups.length)
    const sppGroupId = generateSppGroupId()
    const csNama = body.namaCs?.trim() || "CS"
    const now = new Date()

    const created = await prisma.$transaction(
      body.artikels.map((artikel, index) => {
        const artikelId = generateArtikelId(artikelCount + index + 1)

        return prisma.designQueueItem.create({
          data: {
            id: randomUUID(),
            designId,
            artikelId,
            sppGroupId,
            csNama,
            csId: body.csId || null,
            namaKonsumen: body.namaKonsumen.trim(),
            noTelepon: body.telepon.trim(),
            alamatPengiriman: body.alamat.trim(),
            namaArtikel: artikel.namaArtikel.trim(),
            sppNumber: artikel.spp?.trim() || null,
            materiDesain: artikel.catatanDesain?.trim() || null,
            desainUtama: artikel.desainUtama?.length
              ? serializeDesignFiles(artikel.desainUtama)
              : null,
            logoSponsor: artikel.logoSponsor?.length
              ? serializeDesignFiles(artikel.logoSponsor)
              : null,
            statusDesain: "MENUNGGU",
            updatedAt: now,
          },
        })
      })
    )

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("POST CS ANTRIAN DESAIN:", error)
    return NextResponse.json(
      apiErrorPayload(error, "Gagal menambah desain ke antrian"),
      { status: 500 }
    )
  }
}
