"use client"

import { useLayoutEffect } from "react"
import { syncSessionCookieToLocalStorage } from "@/lib/login-session"

/**
 * Runs before child pages mount so localStorage guards see the erp_user cookie.
 * useEffect ran too late (after page auth checks) and caused immediate logout.
 */
export function SessionBootstrap() {
  syncSessionCookieToLocalStorage()

  useLayoutEffect(() => {
    syncSessionCookieToLocalStorage()
  }, [])

  return null
}
