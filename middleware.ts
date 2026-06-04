import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { parsePendingUser, USER_SESSION_COOKIE } from "@/lib/login-session"

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const user = sessionUser(request)

  if (pathname.startsWith("/login/session-bridge")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (pathname.startsWith("/login")) {
    return NextResponse.next()
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("error", "session")
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
}
