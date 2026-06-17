import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  parsePendingUser,
  USER_SESSION_COOKIE,
  userSessionCookieOptions,
} from "@/lib/login-session"
import { relativeRedirectPath } from "@/lib/request-origin"

const PUBLIC_PREFIXES = [
  "/login",
  "/api/",
  "/_next",
  "/favicon",
]

function isPublicPath(pathname: string): boolean {
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
  return htmlResponse(NextResponse.redirect(target))
}

/** LAN operators often cache HTML after dev→prod switch; stale chunk URLs break CSS/JS. */
function htmlResponse(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, must-revalidate")
  return response
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const user = sessionUser(request)

  if (pathname === "/") {
    return redirectOnRequest(request, "/login")
  }

  if (pathname.startsWith("/login/session-bridge")) {
    return redirectOnRequest(request, "/login")
  }

  if (pathname.startsWith("/login")) {
    if (request.nextUrl.searchParams.get("logout") === "1") {
      const response = redirectOnRequest(request, "/login", { error: "logout" })
      response.cookies.set(USER_SESSION_COOKIE, "", {
        ...userSessionCookieOptions(0),
        maxAge: 0,
      })
      return response
    }
    return htmlResponse(NextResponse.next())
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  if (!user) {
    return redirectOnRequest(request, "/login", { error: "session" })
  }

  return htmlResponse(NextResponse.next())
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
}
