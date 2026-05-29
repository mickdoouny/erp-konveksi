import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  adminApprovePipeline,
  advancePipelineStage,
} from "@/lib/production-pipeline"
import { requestShipRelease } from "@/lib/accounting-service"

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
    }

    if (body.action === "admin_approve") {
      const data = await adminApprovePipeline(id, actor)
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "advance_stage") {
      const data = await advancePipelineStage(id, actor)
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "request_ship_release") {
      const data = await requestShipRelease(
        id,
        actor,
        body.note ? String(body.note) : undefined
      )
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "reject_admin") {
      const data = await prisma.productionPipeline.update({
        where: { id },
        data: {
          adminProduksiStatus: "REJECTED",
          updatedAt: new Date(),
        },
      })
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json(
      { success: false, message: "Aksi tidak dikenali" },
      { status: 400 }
    )
  } catch (error) {
    console.error("PATCH PIPELINE:", error)
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui pipeline"
    return NextResponse.json({ success: false, message }, { status: 400 })
  }
}
