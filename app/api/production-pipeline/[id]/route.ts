import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  adminApprovePipeline,
  advancePipelineStage,
  advanceToQc,
  approveSettingAcc,
  completeDtfProcess,
  completeKancingProcess,
  completePackingToSiapKirim,
  completeStageProcess,
  markDtfComplete,
  markKancingComplete,
  markSettingSentToConsumer,
  rejectSettingAcc,
  startDtfProcess,
  startKancingProcess,
  startStageProcess,
  updateSettingResultFiles,
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
      id: body.actorId ? String(body.actorId) : undefined,
    }

    if (body.action === "admin_approve") {
      const data = await adminApprovePipeline(id, actor)
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "advance_stage") {
      const data = await advancePipelineStage(id, actor)
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "start_stage") {
      const data = await startStageProcess(id, actor)
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "update_setting_files") {
      const data = await updateSettingResultFiles(
        id,
        String(body.settingResultFiles ?? "")
      )
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "approve_setting_acc") {
      const data = await approveSettingAcc(
        id,
        actor,
        body.note ? String(body.note) : undefined
      )
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "reject_setting_acc") {
      const data = await rejectSettingAcc(
        id,
        actor,
        String(body.rejectNote ?? "")
      )
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "mark_setting_sent_to_consumer") {
      const data = await markSettingSentToConsumer(id, actor)
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "complete_stage") {
      const mw = body.materialWeights
      const ink = body.inkConsumption
      const data = await completeStageProcess(id, actor, {
        qty: body.qty != null ? Number(body.qty) : undefined,
        settingResultFiles: body.settingResultFiles
          ? String(body.settingResultFiles)
          : undefined,
        materialWeights: mw
          ? {
              beratBahan: Number(mw.beratBahan),
              beratRib:
                mw.beratRib != null && mw.beratRib !== ""
                  ? Number(mw.beratRib)
                  : null,
              catatanPotongBahan: mw.catatanPotongBahan
                ? String(mw.catatanPotongBahan)
                : null,
            }
          : undefined,
        inkConsumption: ink
          ? {
              konsumsiTintaC: Number(ink.konsumsiTintaC),
              konsumsiTintaM: Number(ink.konsumsiTintaM),
              konsumsiTintaY: Number(ink.konsumsiTintaY),
              konsumsiTintaK: Number(ink.konsumsiTintaK),
            }
          : undefined,
      })
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "mark_kancing_complete") {
      const data = await markKancingComplete(id, actor)
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "mark_dtf_complete") {
      const data = await markDtfComplete(id, actor)
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "complete_packing") {
      const data = await completePackingToSiapKirim(id, actor)
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "start_kancing") {
      const data = await startKancingProcess(id, actor)
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "complete_kancing") {
      const data = await completeKancingProcess(id, actor)
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "start_dtf") {
      const data = await startDtfProcess(id, actor)
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "complete_dtf") {
      const data = await completeDtfProcess(id, actor)
      return NextResponse.json({ success: true, data })
    }

    if (body.action === "advance_to_qc") {
      const data = await advanceToQc(id, actor)
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
