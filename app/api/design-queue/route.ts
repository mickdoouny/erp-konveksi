import { NextResponse } from "next/server"
import { listDesignQueueItems } from "@/lib/design-queue-query"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const queue = searchParams.get("queue") === "disetujui" ? "disetujui" : "aktif"
    const items = await listDesignQueueItems(queue)

    return NextResponse.json(items)
  } catch (error) {
    console.error("GET DESIGN QUEUE:", error)
    return NextResponse.json(
      { message: "Gagal mengambil antrian desainer" },
      { status: 500 }
    )
  }
}
