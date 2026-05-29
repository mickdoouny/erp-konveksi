import { NextResponse } from "next/server"
import { fetchNotificationsForRole } from "@/lib/design-queue-notifications"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")?.trim() ?? ""

    if (!role) {
      return NextResponse.json(
        { message: "Parameter role wajib diisi" },
        { status: 400 }
      )
    }

    const payload = await fetchNotificationsForRole(role)
    return NextResponse.json(payload)
  } catch (error) {
    console.error("GET NOTIFICATIONS:", error)
    return NextResponse.json(
      { message: "Gagal mengambil notifikasi" },
      { status: 500 }
    )
  }
}
