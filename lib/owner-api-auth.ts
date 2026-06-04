export type ApiUserPayload = {
  id?: string
  role?: string
  nama?: string
}

export function assertOwnerAccess(user: ApiUserPayload | null | undefined) {
  if (!user || user.role !== "owner") {
    return {
      ok: false as const,
      status: 403,
      message: "Akses khusus owner",
    }
  }
  return { ok: true as const }
}
