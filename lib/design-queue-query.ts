import { prisma } from "@/lib/prisma"
import {
  DESIGNER_ACTIVE_STATUSES,
  DESIGNER_APPROVED_STATUSES,
} from "@/lib/designer-antrian"

export type DesignQueueListKind = "aktif" | "disetujui"

export async function listDesignQueueItems(queue: DesignQueueListKind = "aktif") {
  const statuses =
    queue === "disetujui"
      ? DESIGNER_APPROVED_STATUSES
      : DESIGNER_ACTIVE_STATUSES

  return prisma.designQueueItem.findMany({
    where: { statusDesain: { in: statuses } },
    orderBy: { updatedAt: "desc" },
  })
}
