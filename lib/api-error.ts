export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

/** Stale PrismaClient in Next dev (global cache) after `prisma generate`. */
export function isStalePrismaClientError(error: unknown): boolean {
  if (!(error instanceof TypeError)) return false
  return /Cannot read properties of undefined \(reading '(findMany|count|create|groupBy|update)'\)/.test(
    error.message
  )
}

export function prismaStaleClientHint(): string {
  return "Klien database belum diperbarui. Jalankan `npx prisma generate`, lalu restart server dev (`npm run dev`)."
}

export function apiErrorPayload(
  error: unknown,
  fallback: string
): { message: string; detail?: string } {
  if (isStalePrismaClientError(error)) {
    const hint = prismaStaleClientHint()
    return { message: fallback, detail: hint }
  }

  const detail = apiErrorMessage(error, fallback)
  if (detail === fallback) {
    return { message: fallback }
  }

  return { message: fallback, detail }
}
