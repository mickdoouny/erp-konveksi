import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient()
}

/** Dev HMR can keep an old PrismaClient missing models added after `prisma generate`. */
function isStalePrismaClient(client: PrismaClient): boolean {
  return !("designQueueItem" in client)
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
