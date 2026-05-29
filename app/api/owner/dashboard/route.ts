import { NextResponse } from "next/server"
import { loadOwnerDashboardData } from "@/lib/owner-dashboard-data"

export async function GET() {
  try {
    const data = await loadOwnerDashboardData()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("GET OWNER DASHBOARD:", error)
    return NextResponse.json(
      { success: false, message: "Gagal memuat dashboard owner" },
      { status: 500 }
    )
  }
}
