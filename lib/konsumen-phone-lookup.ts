import { prisma } from "@/lib/prisma"
import { normalizeIndonesianPhone } from "@/lib/phone-normalize"

export type KonsumenPhoneMatch = {
  namaKonsumen: string
  noTelepon: string
  alamatPengiriman: string | null
  lastOrderAt: Date
}

export async function findKonsumenByNormalizedPhone(
  rawPhone: string
): Promise<KonsumenPhoneMatch | null> {
  const normalized = normalizeIndonesianPhone(rawPhone)
  if (!normalized) return null

  const row = await prisma.designQueueItem.findFirst({
    where: { noTeleponNormalized: normalized },
    orderBy: { createdAt: "desc" },
    select: {
      namaKonsumen: true,
      noTelepon: true,
      alamatPengiriman: true,
      createdAt: true,
    },
  })

  if (!row) return null

  return {
    namaKonsumen: row.namaKonsumen,
    noTelepon: row.noTelepon ?? rawPhone.trim(),
    alamatPengiriman: row.alamatPengiriman,
    lastOrderAt: row.createdAt,
  }
}
