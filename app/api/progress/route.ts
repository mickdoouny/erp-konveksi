import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const reports = await prisma.report.findMany({
      orderBy: {
        createdAt: "desc",
      },
    })

    const grouped: any = {}

    reports.forEach((report) => {
      if (!grouped[report.invoice]) {
        grouped[report.invoice] = {
          invoice: report.invoice,
          Press: 0,
          Jahit: 0,
          Finishing: 0,
          Pengiriman: 0,
        }
      }

      if (report.divisi === "Press") {
        grouped[report.invoice].Press += report.qtySelesai
      }

      if (report.divisi === "Jahit") {
        grouped[report.invoice].Jahit += report.qtySelesai
      }

      if (report.divisi === "Finishing") {
        grouped[report.invoice].Finishing += report.qtySelesai
      }

      if (report.divisi === "Pengiriman") {
        grouped[report.invoice].Pengiriman += report.qtySelesai
      }
    })

    return NextResponse.json(Object.values(grouped))
  } catch (error) {
    console.log(error)

    return NextResponse.json(
      { error: "Gagal mengambil progress produksi" },
      { status: 500 }
    )
  }
}