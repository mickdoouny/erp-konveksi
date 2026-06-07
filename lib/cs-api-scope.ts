/** Client-safe CS API scope query helpers — no @prisma/client imports. */

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
