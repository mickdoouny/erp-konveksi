import type { PrismaClient } from "@prisma/client"
import { DEFAULT_USERS } from "@/lib/auth"

/** Login username → SPP prefix (e.g. Anti → ANTI, cs1 → CS1). */
export function deriveCsSppPrefix(username: string): string {
  const normalized = username
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
  return normalized || "CS"
}

export function formatSppNumber(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(6, "0")}`
}

export function parseSppSequence(
  sppNumber: string | null | undefined,
  prefix: string
): number | null {
  if (!sppNumber?.trim()) return null
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = sppNumber.trim().toUpperCase().match(new RegExp(`^${escaped}-(\\d{6})$`))
  if (!match) return null
  const seq = Number.parseInt(match[1], 10)
  return Number.isFinite(seq) ? seq : null
}

export async function getMaxSppSequenceForPrefix(
  prefix: string,
  db: Pick<PrismaClient, "designQueueItem">
): Promise<number> {
  const rows = await db.designQueueItem.findMany({
    where: { sppNumber: { startsWith: `${prefix}-` } },
    select: { sppNumber: true },
  })

  let max = 0
  for (const row of rows) {
    const seq = parseSppSequence(row.sppNumber, prefix)
    if (seq !== null && seq > max) {
      max = seq
    }
  }
  return max
}

export async function allocateNextSppNumber(
  username: string,
  db: Pick<PrismaClient, "designQueueItem">
): Promise<string> {
  const prefix = deriveCsSppPrefix(username)
  const max = await getMaxSppSequenceForPrefix(prefix, db)
  return formatSppNumber(prefix, max + 1)
}

export async function resolveCsUsernameForSpp(input: {
  csUsername?: string | null
  csId?: string | null
  db?: Pick<PrismaClient, "operator">
}): Promise<string | null> {
  const fromBody = input.csUsername?.trim()
  if (fromBody) return fromBody

  const csId = input.csId?.trim()
  if (!csId) return null

  const demo = DEFAULT_USERS.find((user) => user.id === csId)
  if (demo?.username) return demo.username

  if (input.db) {
    const operator = await input.db.operator.findUnique({
      where: { id: csId },
      select: { username: true },
    })
    if (operator?.username) return operator.username
  }

  return null
}
