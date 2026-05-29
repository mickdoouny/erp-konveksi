import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  DESIGNER_ACTIVE_STATUSES,
  DESIGNER_APPROVED_STATUSES,
} from "@/lib/designer-antrian"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const queue = searchParams.get("queue")

    const statuses =
      queue === "disetujui"
        ? DESIGNER_APPROVED_STATUSES
        : DESIGNER_ACTIVE_STATUSES

    const items = await prisma.designQueueItem.findMany({
      where: { statusDesain: { in: statuses } },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error("GET DESIGN QUEUE:", error)
    return NextResponse.json(
      { message: "Gagal mengambil antrian desainer" },
      { status: 500 }
    )
  }
}
