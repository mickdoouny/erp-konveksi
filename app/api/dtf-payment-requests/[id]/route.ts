import { NextResponse } from "next/server"
import {
  approveDtfPaymentRequest,
  rejectDtfPaymentRequest,
} from "@/lib/dtf-service"

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const actorName = String(body.actorName ?? "Admin Keuangan")
    const action = String(body.action ?? "")

    if (action === "approve") {
      const buktiBayarUrl = String(body.buktiBayarUrl ?? "")
      const data = await approveDtfPaymentRequest(
        id,
        { name: actorName },
        buktiBayarUrl
      )
      return NextResponse.json({ success: true, data })
    }

    if (action === "reject") {
      const data = await rejectDtfPaymentRequest(
        id,
        { name: actorName },
        typeof body.notes === "string" ? body.notes : undefined
      )
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json(
      { message: "Aksi tidak dikenali" },
      { status: 400 }
    )
  } catch (error) {
    console.error("PATCH DTF PAYMENT REQUEST:", error)
    const message =
      error instanceof Error ? error.message : "Gagal memproses pembayaran DTF"
    return NextResponse.json({ message }, { status: 400 })
  }
}
