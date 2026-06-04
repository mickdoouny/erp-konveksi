import { NextResponse } from "next/server"
import {
  USER_SESSION_COOKIE,
  userSessionCookieOptions,
} from "@/lib/login-session"

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(USER_SESSION_COOKIE, "", {
    ...userSessionCookieOptions(0),
    maxAge: 0,
  })
  return response
}
