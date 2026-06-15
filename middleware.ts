import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { parsePendingUser, USER_SESSION_COOKIE } from "@/lib/login-session"
import { relativeRedirectPath } from "@/lib/request-origin"

const PUBLIC_PREFIXES = [
  "/login",
  "/api/",
  "/_next",
  "/favicon",
]

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") {
    return true
  }
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  )
}

function sessionUser(request: NextRequest) {
  const raw = request.cookies.get(USER_SESSION_COOKIE)?.value
  return raw ? parsePendingUser(raw) : null
}

/** Redirect using the request host (never localhost fallback). */
function redirectOnRequest(
  request: NextRequest,
  pathname: string,
  search?: Record<string, string>
) {
  const target = new URL(relativeRedirectPath(pathname, search), request.url)
  return NextResponse.redirect(target)
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const user = sessionUser(request)

  if (pathname.startsWith("/login/session-bridge")) {
    return redirectOnRequest(request, "/login")
  }

  if (pathname.startsWith("/login")) {
    return NextResponse.next()
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  if (!user) {
    return redirectOnRequest(request, "/login", { error: "session" })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
}
