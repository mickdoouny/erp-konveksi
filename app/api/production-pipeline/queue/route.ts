import { NextResponse } from "next/server"
import { ProductionStatus, type Prisma } from "@prisma/client"
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
          include: {
            ProductionStagePlan: {
              where: { stage: { in: stages } },
            },
          },
        },
      },
    })

    const sorted = sortProductionQueue(items)

    return NextResponse.json({ success: true, data: sorted, workflowEnabled: true })
  } catch (error) {
    console.error("GET PRODUCTION QUEUE:", error)
    return NextResponse.json(
      { success: false, message: "Gagal mengambil antrian produksi" },
      { status: 500 }
    )
  }
}
