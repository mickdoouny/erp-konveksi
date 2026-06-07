"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { usePathname } from "next/navigation"
import {
  CATEGORY_CLEAR_PATHS,
  type NotificationCategory,
  type NotificationItem,
  type NotificationPayload,
} from "@/lib/design-queue-notifications-shared"
import {
  countUnreadItems,
  fetchNotificationPayload,
  filterUnreadItems,
  markCategorySeen,
  NOTIFICATION_POLL_MS,
  readLastSeenMap,
  type LastSeenMap,
} from "@/lib/fetch-notification-payload"

type NotificationContextValue = {
  items: NotificationItem[]
  unreadItems: NotificationItem[]
  unreadCount: number
  loading: boolean
  lastPolledAt: string | null
  lastSeen: LastSeenMap
  refresh: () => Promise<void>
  markCategorySeenNow: (category: NotificationCategory) => void
  browserPermission: NotificationPermission | "unsupported"
  requestBrowserPermission: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

function categoriesForPath(pathname: string): NotificationCategory[] {
  return (Object.entries(CATEGORY_CLEAR_PATHS) as [
    NotificationCategory,
    (p: string) => boolean,
  ][]).filter(([, match]) => match(pathname)).map(([cat]) => cat)
}

export function NotificationProvider({
  role,
  children,
}: {
  role: string | null
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [payload, setPayload] = useState<NotificationPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastSeen, setLastSeen] = useState<LastSeenMap>({})
  const [browserPermission, setBrowserPermission] = useState<
    NotificationPermission | "unsupported"
  >("default")
  const prevUnreadRef = useRef(0)

  const refresh = useCallback(async () => {
    if (!role) return
    setLoading(true)
    try {
      const data = await fetchNotificationPayload(role)
      setPayload(data)
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => {
    setLastSeen(readLastSeenMap())
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(Notification.permission)
    } else {
      setBrowserPermission("unsupported")
    }
  }, [])

  useEffect(() => {
    if (!role) return
    refresh()
    const id = window.setInterval(refresh, NOTIFICATION_POLL_MS)
    return () => window.clearInterval(id)
  }, [role, refresh])

  useEffect(() => {
    const cats = categoriesForPath(pathname)
    if (cats.length === 0) return
    const now = new Date().toISOString()
    let map = readLastSeenMap()
    for (const cat of cats) {
      map = markCategorySeen(cat, now)
    }
    setLastSeen(map)
  }, [pathname])

  const items = payload?.items ?? []
  const unreadItems = useMemo(
    () => filterUnreadItems(items, lastSeen),
    [items, lastSeen]
  )
  const unreadCount = useMemo(
    () => countUnreadItems(items, lastSeen),
    [items, lastSeen]
  )

  useEffect(() => {
    if (
      browserPermission !== "granted" ||
      unreadCount <= prevUnreadRef.current
    ) {
      prevUnreadRef.current = unreadCount
      return
    }

    const newest = unreadItems[0]
    if (newest && typeof window !== "undefined" && "Notification" in window) {
      try {
        new Notification("DPK ERP · Notifikasi baru", {
          body: newest.title,
          tag: newest.id,
        })
      } catch {
        // ignore — browser may block without user gesture
      }
    }
    prevUnreadRef.current = unreadCount
  }, [unreadCount, unreadItems, browserPermission])

  const markCategorySeenNow = useCallback((category: NotificationCategory) => {
    const map = markCategorySeen(category)
    setLastSeen(map)
  }, [])

  const requestBrowserPermission = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    Notification.requestPermission().then((perm) => {
      setBrowserPermission(perm)
    })
  }, [])

  const value = useMemo(
    () => ({
      items,
      unreadItems,
      unreadCount,
      loading,
      lastPolledAt: payload?.polledAt ?? null,
      lastSeen,
      refresh,
      markCategorySeenNow,
      browserPermission,
      requestBrowserPermission,
    }),
    [
      items,
      unreadItems,
      unreadCount,
      loading,
      payload?.polledAt,
      lastSeen,
      refresh,
      markCategorySeenNow,
      browserPermission,
      requestBrowserPermission,
    ]
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error("useNotifications harus dipakai di dalam NotificationProvider")
  }
  return ctx
}

export function useNotificationsOptional() {
  return useContext(NotificationContext)
}
