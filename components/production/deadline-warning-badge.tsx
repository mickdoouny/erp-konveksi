import {
  getDeadlineWarning,
  type DeadlineWarning,
} from "@/lib/deadline-warning"

export function DeadlineWarningBadge({
  deadline,
  className = "",
}: {
  deadline: string | Date | null | undefined
  className?: string
}) {
  const warning = getDeadlineWarning(deadline)
  if (!warning) return null

  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${warning.badgeClass} ${className}`.trim()}
    >
      {warning.label}
    </span>
  )
}

export type { DeadlineWarning }
