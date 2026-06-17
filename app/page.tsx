import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { homePathForUser } from "@/lib/auth-redirect"
import { parsePendingUser, USER_SESSION_COOKIE } from "@/lib/login-session"

/** Fallback if middleware is bypassed — always send users to login or their home. */
export default async function Home() {
  const cookieStore = await cookies()
  const sessionRaw = cookieStore.get(USER_SESSION_COOKIE)?.value
  const user = sessionRaw ? parsePendingUser(sessionRaw) : null

  if (user) {
    redirect(homePathForUser(user))
  }

  redirect("/login")
}
