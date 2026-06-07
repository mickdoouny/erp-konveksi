import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient()
}

/** Dev HMR can keep an old PrismaClient missing fields added after `prisma generate`. */
function isStalePrismaClient(client: PrismaClient): boolean {
  if (!("designQueueItem" in client) || !("finalOrder" in client)) {
    return true
  }
  try {
    const orderFields = client.finalOrder.fields as Record<string, unknown>
    const rosterFields = client.finalOrderRosterLine.fields as Record<
      string,
      unknown
    >
    return !("hargaStelan" in orderFields) || !("jenisItem" in rosterFields)
  } catch {
    return true
  }
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma
  if (cached && !isStalePrismaClient(cached)) {
    return cached
  }

  const client = createPrismaClient()

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client
  }

  return client
}

export const prisma = getPrismaClient()

/** Nested creates (FinalOrder + roster + accounting + pipeline) need extra time on remote DB. */
export const HEAVY_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 30_000,
} as const
