import type {
  NotificationCategory,
  NotificationItem,
  NotificationPayload,
} from "@/lib/design-queue-notifications"

export type { NotificationCategory, NotificationItem, NotificationPayload }

const STORAGE_KEY = "notifications:lastSeen"

export type LastSeenMap = Partial<Record<NotificationCategory, string>>

export function readLastSeenMap(): LastSeenMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LastSeenMap) : {}
  } catch {
    return {}
  }
}

export function writeLastSeenMap(map: LastSeenMap): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function markCategorySeen(
  category: NotificationCategory,
  at = new Date().toISOString()
): LastSeenMap {
  const map = { ...readLastSeenMap(), [category]: at }
  writeLastSeenMap(map)
  return map
}

export function countUnreadItems(
  items: NotificationItem[],
  lastSeen: LastSeenMap
): number {
  return items.filter((item) => {
    const seenAt = lastSeen[item.category]
    if (!seenAt) return true
    return new Date(item.occurredAt).getTime() > new Date(seenAt).getTime()
  }).length
}

export function filterUnreadItems(
  items: NotificationItem[],
  lastSeen: LastSeenMap
): NotificationItem[] {
  return items.filter((item) => {
    const seenAt = lastSeen[item.category]
    if (!seenAt) return true
    return new Date(item.occurredAt).getTime() > new Date(seenAt).getTime()
  })
}

export async function fetchNotificationPayload(
  role: string
): Promise<NotificationPayload | null> {
  const params = new URLSearchParams({ role })
  const res = await fetch(`/api/notifications?${params.toString()}`, {
    cache: "no-store",
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!data || !Array.isArray(data.items)) return null
  return data as NotificationPayload
}

export const NOTIFICATION_POLL_MS = 12_000
