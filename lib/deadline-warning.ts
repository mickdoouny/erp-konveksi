export type DeadlineWarningLevel = "tomorrow" | "today" | "overdue"

export type DeadlineWarning = {
  level: DeadlineWarningLevel
  label: string
  badgeClass: string
  cardBorderClass: string
}

const BADGE_TOMORROW =
  "border-amber-500/50 bg-amber-950/50 text-amber-300"
const BADGE_URGENT = "border-red-500/50 bg-red-950/50 text-red-300"

const CARD_TOMORROW = "border-amber-500/40 ring-1 ring-amber-500/20"
const CARD_URGENT = "border-red-500/40 ring-1 ring-red-500/20"

function startOfLocalDay(value: Date): Date {
  const d = new Date(value)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === "") return null
  const d = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Format tanggal Indonesia singkat: dd/MM/yyyy */
export function formatDateIdShort(
  value: string | Date | null | undefined
): string {
  const d = toDate(value)
  if (!d) return "—"
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/** Tanggal masuk order: submittedAt, fallback createdAt */
export function resolveOrderEntryDate(
  submittedAt: string | Date | null | undefined,
  createdAt: string | Date | null | undefined
): Date | null {
  return toDate(submittedAt) ?? toDate(createdAt)
}

function dayDiff(deadline: Date, today: Date): number {
  const msPerDay = 86_400_000
  return Math.round(
    (startOfLocalDay(deadline).getTime() - startOfLocalDay(today).getTime()) /
      msPerDay
  )
}

/**
 * Peringatan deadline relatif terhadap hari ini (zona lokal browser/server).
 * - Besok (1 hari sebelum deadline): amber "Deadline besok"
 * - Hari ini: merah "Deadline hari ini"
 * - Lewat: merah "Melewati deadline"
 */
export function getDeadlineWarning(
  deadline: string | Date | null | undefined,
  now: Date = new Date()
): DeadlineWarning | null {
  const d = toDate(deadline)
  if (!d) return null

  const diff = dayDiff(d, now)

  if (diff === 1) {
    return {
      level: "tomorrow",
      label: "Deadline besok",
      badgeClass: BADGE_TOMORROW,
      cardBorderClass: CARD_TOMORROW,
    }
  }

  if (diff === 0) {
    return {
      level: "today",
      label: "Deadline hari ini",
      badgeClass: BADGE_URGENT,
      cardBorderClass: CARD_URGENT,
    }
  }

  if (diff < 0) {
    return {
      level: "overdue",
      label: "Melewati deadline",
      badgeClass: BADGE_URGENT,
      cardBorderClass: CARD_URGENT,
    }
  }

  return null
}

export function deadlineCardBorderClass(
  deadline: string | Date | null | undefined
): string {
  return getDeadlineWarning(deadline)?.cardBorderClass ?? ""
}
