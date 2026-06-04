"use client"

import { useEffect, useState } from "react"
import {
  readClientSessionUser,
  readUserCookieValue,
  USER_SESSION_COOKIE,
} from "@/lib/login-session"

type DebugSnapshot = {
  cookiePresent: boolean
  cookieLength: number
  cookieRawPreview: string | null
  documentCookie: string
  localStoragePresent: boolean
  parsedUser: string | null
  error: string | null
}

function snapshot(): DebugSnapshot {
  try {
    const raw = readUserCookieValue()
    const user = readClientSessionUser()
    let ls = false
    try {
      ls = Boolean(localStorage.getItem("user"))
    } catch {
      ls = false
    }
    const docCookie =
      typeof document !== "undefined" ? document.cookie : ""
    return {
      cookiePresent: Boolean(raw),
      cookieLength: raw?.length ?? 0,
      cookieRawPreview: raw ? `${raw.slice(0, 24)}…` : null,
      documentCookie: docCookie || "(kosong)",
      localStoragePresent: ls,
      parsedUser: user ? `${user.username} (${user.role})` : null,
      error: null,
    }
  } catch (e) {
    return {
      cookiePresent: false,
      cookieLength: 0,
      cookieRawPreview: null,
      documentCookie: "(error)",
      localStoragePresent: false,
      parsedUser: null,
      error: e instanceof Error ? e.message : "unknown",
    }
  }
}

export function LoginDebugPanel() {
  const [info, setInfo] = useState<DebugSnapshot | null>(null)

  useEffect(() => {
    const refresh = () => setInfo(snapshot())
    refresh()
    window.addEventListener("focus", refresh)
    window.addEventListener("pageshow", refresh)
    const id = window.setInterval(refresh, 2000)
    return () => {
      window.removeEventListener("focus", refresh)
      window.removeEventListener("pageshow", refresh)
      window.clearInterval(id)
    }
  }, [])

  if (!info) {
    return null
  }

  return (
    <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-950/30 p-4 font-mono text-[11px] text-amber-100/90">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-400">
        Debug sesi (?debug=1)
      </p>
      <ul className="space-y-1">
        <li>
          Cookie {USER_SESSION_COOKIE}:{" "}
          {info.cookiePresent ? `ada (${info.cookieLength} char)` : "tidak ada"}
        </li>
        <li>localStorage user: {info.localStoragePresent ? "ada" : "tidak ada"}</li>
        <li>readClientSessionUser: {info.parsedUser ?? "null"}</li>
        <li className="break-all text-amber-200/70">
          document.cookie: {info.documentCookie}
        </li>
        {info.cookieRawPreview ? (
          <li>erp_user preview: {info.cookieRawPreview}</li>
        ) : null}
        {info.error ? <li className="text-red-300">error: {info.error}</li> : null}
      </ul>
    </div>
  )
}
