import type { DesignQueueItem, Prisma } from "@prisma/client"

export type CsRequestScope = {
  role: string
  csId: string | null
  csNama: string | null
}

export function parseCsRequestScope(request: Request): CsRequestScope {
  const { searchParams } = new URL(request.url)
  return {
    role: searchParams.get("role")?.trim() ?? "",
    csId: searchParams.get("csId")?.trim() || null,
    csNama: searchParams.get("csNama")?.trim() || null,
  }
}

export function canViewAllCsDesignQueueItems(scope: CsRequestScope): boolean {
  return scope.role === "owner"
}

/** Prisma filter: owner = all; CS = own rows only; missing CS identity = none. */
export function csDesignQueueOwnershipWhere(
  scope: CsRequestScope
): Prisma.DesignQueueItemWhereInput | undefined {
  if (canViewAllCsDesignQueueItems(scope)) {
    return undefined
  }

  if (scope.role !== "cs") {
    return undefined
  }

  if (!scope.csId && !scope.csNama) {
    return { id: "__no_cs_scope__" }
  }

  if (scope.csId && scope.csNama) {
    return {
      OR: [{ csId: scope.csId }, { csId: null, csNama: scope.csNama }],
    }
  }

  if (scope.csId) {
    return { csId: scope.csId }
  }

  return { csNama: scope.csNama! }
}

export function csOwnsDesignQueueItem(
  scope: CsRequestScope,
  item: Pick<DesignQueueItem, "csId" | "csNama">
): boolean {
  if (canViewAllCsDesignQueueItems(scope)) {
    return true
  }

  if (scope.role !== "cs") {
    return true
  }

  if (scope.csId && item.csId === scope.csId) {
    return true
  }

  if (!item.csId && scope.csNama && item.csNama === scope.csNama) {
    return true
  }

  return false
}

export function csApiScopeQuery(user: {
  role: string
  id?: string
  nama?: string
}): string {
  const params = new URLSearchParams({ role: user.role })
  if (user.id) {
    params.set("csId", user.id)
  }
  if (user.nama) {
    params.set("csNama", user.nama)
  }
  return params.toString()
}

export function withCsApiScope(
  path: string,
  user: { role: string; id?: string; nama?: string }
): string {
  const query = csApiScopeQuery(user)
  return query ? `${path}?${query}` : path
}
