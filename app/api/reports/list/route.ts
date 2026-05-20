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

    return NextResponse.json(reports)
  } catch (error) {
    console.log(error)

    return NextResponse.json(
      { error: "Gagal mengambil data report" },
      { status: 500 }
    )
  }
}