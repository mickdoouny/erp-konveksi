import { NextResponse } from "next/server"
import {
  approveReworkRequest,
  rejectReworkRequest,
} from "@/lib/rework-request"

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const actor = {
      name: String(body.actorName ?? "Admin Produksi"),
      role: String(body.actorRole ?? "admin_produksi"),
      id: body.actorId ? String(body.actorId) : undefined,
    }
    const adminNote = body.adminNote ? String(body.adminNote) : undefined

    if (body.action === "approve") {
      const data = await approveReworkRequest(id, actor, adminNote)
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "reject") {
      const data = await rejectReworkRequest(id, actor, adminNote)
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json(
      { success: false, message: "Aksi tidak dikenali" },
      { status: 400 }
    )
  } catch (error) {
    console.error("PATCH REWORK REQUEST:", error)
    const message =
      error instanceof Error ? error.message : "Gagal memproses request"
    return NextResponse.json({ success: false, message }, { status: 400 })
  }
}
