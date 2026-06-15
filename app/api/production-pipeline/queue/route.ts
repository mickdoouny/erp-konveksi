import { NextResponse } from "next/server"
import {
  ProductionStatus,
  ReworkRequestStatus,
  type Prisma,
} from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { isFinalOrderWorkflowEnabled } from "@/lib/feature-flags"
import { sortProductionQueue } from "@/lib/production-queue-sort"
import { stagesForDepartment } from "@/lib/production-operator-stages"

export async function GET(request: Request) {
  try {
    if (!isFinalOrderWorkflowEnabled()) {
      return NextResponse.json({ success: true, data: [], workflowEnabled: false })
    }

    const { searchParams } = new URL(request.url)
    const department = searchParams.get("department")
    const statusesParam = searchParams.get("statuses")

    let stages: ProductionStatus[] | null = null

    if (department) {
      stages = stagesForDepartment(department)
      if (!stages) {
        return NextResponse.json(
          { success: false, message: "Divisi tidak dikenali" },
          { status: 400 }
        )
      }
    } else if (statusesParam) {
      stages = statusesParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) as ProductionStatus[]
    }

    if (!stages?.length) {
      return NextResponse.json(
        { success: false, message: "Parameter department atau statuses wajib" },
        { status: 400 }
      )
    }

    const where: Prisma.FinalOrderWhereInput = {
      ProductionPipeline: {
        is: {
          currentStatus: { in: stages },
          isOnHold: false,
        },
      },
    }

    const items = await prisma.finalOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        ProductionPipeline: {
          select: {
            id: true,
            productionNumber: true,
            currentStatus: true,
            settingResultFiles: true,
            settingSubmittedAt: true,
            settingSubmittedBy: true,
            settingAccAt: true,
            settingRejectNote: true,
            settingSentToConsumerAt: true,
            settingSentToConsumerBy: true,
            settingSubmitCount: true,
            ProductionStagePlan: {
              where: { stage: { in: stages } },
              select: { stage: true, status: true },
            },
          },
        },
        DesignQueueItem: {
          select: {
            artikelId: true,
            hasilDesain: true,
            fileDesainProduksi: true,
            fileDtfVendor: true,
            fileDtfProof: true,
            perluDtf: true,
          },
        },
      },
    })

    const sorted = sortProductionQueue(items)
    const pipelineIds = sorted
      .map((row) => row.ProductionPipeline?.id)
      .filter((id): id is string => Boolean(id))

    const [pendingRework, approvedRework] =
      pipelineIds.length > 0
        ? await Promise.all([
            prisma.productionReworkRequest.findMany({
              where: {
                productionPipelineId: { in: pipelineIds },
                status: ReworkRequestStatus.PENDING,
              },
              select: {
                id: true,
                productionPipelineId: true,
                requestedFromStage: true,
                reason: true,
                affectedParts: true,
                createdAt: true,
              },
            }),
            prisma.productionReworkRequest.findMany({
              where: {
                productionPipelineId: { in: pipelineIds },
                status: ReworkRequestStatus.APPROVED,
              },
              orderBy: { approvedAt: "desc" },
              select: {
                id: true,
                productionPipelineId: true,
                affectedParts: true,
                approvedAt: true,
              },
            }),
          ])
        : [[], []]

    const pendingByPipeline = new Map(
      pendingRework.map((r) => [r.productionPipelineId, r])
    )

    const approvedByPipeline = new Map<string, (typeof approvedRework)[number]>()
    for (const request of approvedRework) {
      if (!approvedByPipeline.has(request.productionPipelineId)) {
        approvedByPipeline.set(request.productionPipelineId, request)
      }
    }

    const withRework = sorted.map((row) => {
      const pipelineId = row.ProductionPipeline?.id
      const pending = pipelineId ? pendingByPipeline.get(pipelineId) : undefined
      const approved = pipelineId
        ? approvedByPipeline.get(pipelineId)
        : undefined
      return {
        ...row,
        pendingReworkRequest: pending ?? null,
        approvedReworkRequest: approved ?? null,
      }
    })

    return NextResponse.json({
      success: true,
      data: withRework,
      workflowEnabled: true,
    })
  } catch (error) {
    console.error("GET PRODUCTION QUEUE:", error)
    return NextResponse.json(
      { success: false, message: "Gagal mengambil antrian produksi" },
      { status: 500 }
    )
  }
}
