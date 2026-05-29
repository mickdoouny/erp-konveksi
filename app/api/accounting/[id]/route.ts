import { NextResponse } from "next/server"
import {
  approveDp,
  approveShipRelease,
  recordPelunasanSafe,
  rejectShipRelease,
} from "@/lib/accounting-service"

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const actor = {
      name: String(body.actorName ?? "Admin Keuangan"),
      userId: body.actorUserId ? String(body.actorUserId) : undefined,
    }

    if (body.action === "approve_dp") {
      const data = await approveDp(id, actor)
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "record_pelunasan") {
      const amount = Number(body.amount)
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json(
          { success: false, message: "Nominal pelunasan tidak valid" },
          { status: 400 }
        )
      }
      const data = await recordPelunasanSafe(
        id,
        amount,
        actor,
        body.buktiUrl ? String(body.buktiUrl) : null
      )
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "approve_ship_release") {
      const pipelineId = String(body.pipelineId ?? "")
      const data = await approveShipRelease(pipelineId, actor)
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "reject_ship_release") {
      const pipelineId = String(body.pipelineId ?? "")
      const data = await rejectShipRelease(
        pipelineId,
        actor,
        body.note ? String(body.note) : undefined
      )
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json(
      { success: false, message: "Aksi tidak dikenali" },
      { status: 400 }
    )
  } catch (error) {
    console.error("PATCH ACCOUNTING:", error)
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui transaksi"
    return NextResponse.json({ success: false, message }, { status: 400 })
  }
}
