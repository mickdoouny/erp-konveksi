"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { CATEGORY_LABELS } from "@/lib/design-queue-notifications"
import { useNotificationsOptional } from "@/components/notifications/notification-provider"

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export default function NotificationBell() {
  const ctx = useNotificationsOptional()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [open])

  if (!ctx) return null

  const {
    unreadItems,
    unreadCount,
    loading,
    browserPermission,
    requestBrowserPermission,
  } = ctx

  const displayItems = unreadItems.length > 0 ? unreadItems : ctx.items.slice(0, 8)

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-300 transition hover:border-orange-500/40 hover:text-orange-400"
        aria-label={
          unreadCount > 0
            ? `${unreadCount} notifikasi belum dibaca`
            : "Notifikasi"
        }
        aria-expanded={open}
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-black">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-black/50">
          <div className="border-b border-zinc-800 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifikasi</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {loading
                ? "Memperbarui…"
                : unreadCount > 0
                  ? `${unreadCount} belum dibaca`
                  : "Semua sudah dibaca"}
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {displayItems.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                Tidak ada notifikasi saat ini.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-800/80">
                {displayItems.slice(0, 12).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 transition hover:bg-zinc-900/80"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400/90">
                        {CATEGORY_LABELS[item.category]}
                      </p>
                      <p className="mt-1 text-sm font-medium text-zinc-100">
                        {item.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                        {item.description}
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-600">
                        {formatTime(item.occurredAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {browserPermission === "default" ? (
            <div className="border-t border-zinc-800 px-4 py-3">
              <button
                type="button"
                onClick={requestBrowserPermission}
                className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 transition hover:border-orange-500/40 hover:text-orange-300"
              >
                Aktifkan notifikasi browser (opsional)
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
