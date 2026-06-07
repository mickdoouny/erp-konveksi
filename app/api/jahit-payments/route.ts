import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const where: { completedAt?: { gte?: Date; lte?: Date } } = {}

    if (from) {
      where.completedAt = { ...where.completedAt, gte: new Date(from) }
    }
    if (to) {
      const end = new Date(to)
      end.setHours(23, 59, 59, 999)
      where.completedAt = { ...where.completedAt, lte: end }
    }

    const records = await prisma.jahitPaymentRecord.findMany({
      where,
      orderBy: { completedAt: "desc" },
      include: {
        FinalOrder: {
          select: {
            namaArtikel: true,
            namaKonsumen: true,
            qty: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error("GET JAHIT PAYMENTS:", error)
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data pembayaran jahit" },
      { status: 500 }
    )
  }
}
