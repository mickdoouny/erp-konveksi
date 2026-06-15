import { productionStageBadgeClass } from "@/lib/production-status-display"
import { labelProductionStatus } from "@/lib/status-labels"

export function ProductionStageBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${productionStageBadgeClass(status)}`}
    >
      {labelProductionStatus(status)}
    </span>
  )
}
