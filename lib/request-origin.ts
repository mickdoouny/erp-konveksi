import { NextResponse } from "next/server"

/** Relative path + query — never embed localhost/LAN IP in Location headers. */
export function relativeRedirectPath(
  pathname: string,
  search?: Record<string, string>
): string {
  const params = new URLSearchParams()
  if (search) {
    for (const [key, value] of Object.entries(search)) {
      params.set(key, value)
    }
  }
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

/** HTTP redirect with a relative Location (safe for LAN + multi-app :3000 setups). */
export function relativeRedirectResponse(
  pathname: string,
  search?: Record<string, string>,
  status = 307
): NextResponse {
  return new NextResponse(null, {
    status,
    headers: { Location: relativeRedirectPath(pathname, search) },
  })
}
