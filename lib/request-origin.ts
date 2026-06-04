function hostFromReferer(referer: string | null): string | null {
  if (!referer) {
    return null
  }
  try {
    const { host } = new URL(referer)
    return host && !host.startsWith("0.0.0.0") ? host : null
  } catch {
    return null
  }
}

/** Build redirect origin from Host header (dev:lan binds 0.0.0.0 — never put that in Location). */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url)
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    url.protocol.replace(":", "")

  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host")?.trim() ??
    hostFromReferer(request.headers.get("referer"))

  if (host && !host.startsWith("0.0.0.0")) {
    return `${proto}://${host}`
  }

  if (url.hostname !== "0.0.0.0") {
    return url.origin
  }

  const lanHost = process.env.ERP_LAN_HOST?.trim()
  if (lanHost) {
    return `${proto}://${lanHost}`
  }

  const port = url.port || "3000"
  return `http://localhost:${port}`
}

export function redirectUrl(request: Request, pathname: string, search?: Record<string, string>): URL {
  const url = new URL(pathname, requestOrigin(request))
  if (search) {
    for (const [key, value] of Object.entries(search)) {
      url.searchParams.set(key, value)
    }
  }
  return url
}
