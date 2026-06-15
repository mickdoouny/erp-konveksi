"use client"

import { useEffect } from "react"

import { NOTIFICATION_POLL_MS } from "@/lib/fetch-notification-payload"

type UsePollingRefreshOptions = {
  enabled?: boolean
  intervalMs?: number
}

/** Re-fetch list/detail data on an interval while the tab is visible. */
export function usePollingRefresh(
  refresh: () => void | Promise<void>,
  options: UsePollingRefreshOptions = {}
) {
  const { enabled = true, intervalMs = NOTIFICATION_POLL_MS } = options

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    const tick = () => {
      if (document.visibilityState === "visible") {
        void refresh()
      }
    }

    const id = window.setInterval(tick, intervalMs)
    return () => window.clearInterval(id)
  }, [refresh, enabled, intervalMs])
}
