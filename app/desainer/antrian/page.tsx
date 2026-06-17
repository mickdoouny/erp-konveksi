import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import DesainerAntrianClient from "./antrian-client"
import { listDesignQueueItems } from "@/lib/design-queue-query"
import { parsePendingUser, USER_SESSION_COOKIE } from "@/lib/login-session"

export default async function DesainerAntrianPage() {
  const cookieStore = await cookies()
  const sessionRaw = cookieStore.get(USER_SESSION_COOKIE)?.value
  const sessionUser = sessionRaw ? parsePendingUser(sessionRaw) : null

  if (!sessionUser || !["desainer", "owner"].includes(sessionUser.role)) {
    redirect("/login?error=session")
  }

  const items = await listDesignQueueItems("aktif")
  return <DesainerAntrianClient initialItems={items} />
}
