import {
  isDesignImageUrl,
  parseDesignFiles,
  type DesignFile,
} from "@/lib/cs-antrian-desain"
import { prisma } from "@/lib/prisma"
import { normalizeIndonesianPhone } from "@/lib/phone-normalize"

export type KonsumenPhoneMatch = {
  namaKonsumen: string
  noTelepon: string
  alamatPengiriman: string | null
  lastOrderAt: Date
}

export type KonsumenHistoryItem = {
  designQueueItemId: string
  artikelId: string
  namaArtikel: string
  jenisOrder: string | null
  jenisProduksi: string
  statusDesain: string
  createdAt: string
  previewUrl: string | null
  catatan: string | null
  sppNumber: string | null
  perluDtf: boolean
  perluKancing: boolean
  perluProving: boolean
  catatanDtf: string | null
  desainUtama: DesignFile[]
  logoSponsor: DesignFile[]
  hasilDesain: DesignFile[]
}

export type KonsumenLookupResult = {
  found: boolean
  nama: string | null
  alamat: string | null
  noTelepon: string | null
  history: KonsumenHistoryItem[]
}

function firstImagePreviewUrl(
  ...sources: Array<string | null | undefined>
): string | null {
  for (const raw of sources) {
    for (const file of parseDesignFiles(raw)) {
      if (isDesignImageUrl(file.url)) return file.url
    }
  }
  return null
}

function mapHistoryRow(row: {
  id: string
  artikelId: string
  namaArtikel: string
  jenisOrder: string | null
  jenisProduksi: string
  statusDesain: string
  createdAt: Date
  materiDesain: string | null
  sppNumber: string | null
  perluDtf: boolean
  perluKancing: boolean
  perluProving: boolean
  catatanDtf: string | null
  desainUtama: string | null
  logoSponsor: string | null
  hasilDesain: string | null
}): KonsumenHistoryItem {
  const desainUtama = parseDesignFiles(row.desainUtama)
  const logoSponsor = parseDesignFiles(row.logoSponsor)
  const hasilDesain = parseDesignFiles(row.hasilDesain)

  return {
    designQueueItemId: row.id,
    artikelId: row.artikelId,
    namaArtikel: row.namaArtikel,
    jenisOrder: row.jenisOrder,
    jenisProduksi: row.jenisProduksi,
    statusDesain: row.statusDesain,
    createdAt: row.createdAt.toISOString(),
    previewUrl: firstImagePreviewUrl(
      row.hasilDesain,
      row.desainUtama,
      row.logoSponsor
    ),
    catatan: row.materiDesain,
    sppNumber: row.sppNumber,
    perluDtf: row.perluDtf,
    perluKancing: row.perluKancing,
    perluProving: row.perluProving,
    catatanDtf: row.catatanDtf,
    desainUtama,
    logoSponsor,
    hasilDesain,
  }
}

export async function lookupKonsumenByPhone(
  rawPhone: string
): Promise<KonsumenLookupResult> {
  const normalized = normalizeIndonesianPhone(rawPhone)
  if (!normalized) {
    return {
      found: false,
      nama: null,
      alamat: null,
      noTelepon: null,
      history: [],
    }
  }

  const rows = await prisma.designQueueItem.findMany({
    where: { noTeleponNormalized: normalized },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      artikelId: true,
      namaArtikel: true,
      namaKonsumen: true,
      alamatPengiriman: true,
      noTelepon: true,
      jenisOrder: true,
      jenisProduksi: true,
      statusDesain: true,
      createdAt: true,
      materiDesain: true,
      sppNumber: true,
      perluDtf: true,
      perluKancing: true,
      perluProving: true,
      catatanDtf: true,
      desainUtama: true,
      logoSponsor: true,
      hasilDesain: true,
    },
  })

  if (rows.length === 0) {
    return {
      found: false,
      nama: null,
      alamat: null,
      noTelepon: null,
      history: [],
    }
  }

  const latest = rows[0]

  return {
    found: true,
    nama: latest.namaKonsumen,
    alamat: latest.alamatPengiriman ?? "",
    noTelepon: latest.noTelepon ?? rawPhone.trim(),
    history: rows.map(mapHistoryRow),
  }
}

export async function findKonsumenByNormalizedPhone(
  rawPhone: string
): Promise<KonsumenPhoneMatch | null> {
  const lookup = await lookupKonsumenByPhone(rawPhone)
  if (!lookup.found || !lookup.nama) return null

  const history = lookup.history[0]
  return {
    namaKonsumen: lookup.nama,
    noTelepon: lookup.noTelepon ?? rawPhone.trim(),
    alamatPengiriman: lookup.alamat,
    lastOrderAt: history ? new Date(history.createdAt) : new Date(),
  }
}
