import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { DtfStatus } from "@prisma/client"
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
import { isCsAntrianDesainItem } from "@/lib/cs-antrian-produksi"
import {
  csDesignQueueOwnershipWhere,
  parseCsRequestScope,
} from "@/lib/cs-design-queue-access"

export async function GET(request: Request) {
  try {
    const scope = parseCsRequestScope(request)
    const ownershipWhere = csDesignQueueOwnershipWhere(scope)

    const rows = await prisma.designQueueItem.findMany({
      where: ownershipWhere,
      orderBy: { createdAt: "desc" },
      include: {
        FinalOrder: {
          select: {
            id: true,
            AccountingTransaction: { select: { paymentStatus: true } },
          },
        },
      },
    })

    const items = rows.filter(isCsAntrianDesainItem)

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
            perluDtf: Boolean(artikel.perluDtf),
            catatanDtf: artikel.catatanDtf?.trim() || null,
            statusDtf: artikel.perluDtf
              ? DtfStatus.MENUNGGU_ORDER
              : DtfStatus.TIDAK_PERLU,
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
