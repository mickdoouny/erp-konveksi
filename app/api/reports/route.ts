import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const report = await prisma.report.create({
      data: {
        invoice: body.invoice,
        divisi: body.divisi,
        qtySelesai: Number(body.qtySelesai),
        kendala: body.kendala,
      },
    })

    return NextResponse.json(report)
  } catch (error) {
    console.log(error)

    return NextResponse.json(
      { error: "Gagal simpan data" },
      { status: 500 }
    )
  }
}