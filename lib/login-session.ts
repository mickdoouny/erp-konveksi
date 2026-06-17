import type { AuthUser } from "@/lib/auth"

/** Single session cookie — set by POST /api/login, read by middleware + client. */
export const USER_SESSION_COOKIE = "erp_user"

export function userSessionCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 7) {
  return {
    httpOnly: false,
    secure: false,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  }
}

function decodeBase64Url(raw: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(raw, "base64url").toString("utf8")
  }

  const b64 = raw.replace(/-/g, "+").replace(/_/g, "/")
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4)
  return atob(padded)
}

export function serializePendingUser(user: AuthUser): string {
  const json = JSON.stringify(user)
  if (typeof Buffer !== "undefined") {
    return Buffer.from(json, "utf8").toString("base64url")
  }

  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function parsePendingUser(raw: string): AuthUser | null {
  try {
    const json = decodeBase64Url(raw)
    const parsed = JSON.parse(json) as AuthUser
    if (!parsed?.id || !parsed?.role) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function readUserCookieValue(): string | null {
  if (typeof document === "undefined") {
    return null
  }

  const prefix = `${USER_SESSION_COOKIE}=`
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length)
    }
  }

  return null
}

function readUserFromLocalStorage(): AuthUser | null {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.localStorage.getItem("user")
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as AuthUser
    if (parsed?.id && parsed?.role) {
      return parsed
    }
  } catch {
    /* corrupt entry */
  }

  return null
}

/** Mirror erp_user cookie into localStorage before auth guards run. */
export function syncSessionCookieToLocalStorage(): boolean {
  if (typeof window === "undefined") {
    return false
  }

  const fromCookie = readUserCookieValue()
  const cookieUser = fromCookie ? parsePendingUser(fromCookie) : null
  const storedUser = readUserFromLocalStorage()

  if (cookieUser) {
    if (
      !storedUser ||
      storedUser.id !== cookieUser.id ||
      storedUser.role !== cookieUser.role
    ) {
      try {
        window.localStorage.setItem("user", JSON.stringify(cookieUser))
        return true
      } catch {
        return false
      }
    }
    return true
  }

  if (storedUser) {
    try {
      window.localStorage.removeItem("user")
    } catch {
      /* private mode */
    }
  }

  return false
}

/** Cookie + SSR session — use after login redirect before document.cookie is readable. */
export function resolveSessionUser(
  serverUser: AuthUser | null | undefined
): AuthUser | null {
  syncSessionCookieToLocalStorage()
  return serverUser ?? readClientSessionUser()
}

/** Cookie-first session read — localStorage alone is never trusted without cookie. */
export function readClientSessionUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null
  }

  const raw = readUserCookieValue()
  const cookieUser = raw ? parsePendingUser(raw) : null

  if (cookieUser) {
    try {
      window.localStorage.setItem("user", JSON.stringify(cookieUser))
    } catch {
      /* private mode — cookie still authoritative */
    }
    return cookieUser
  }

  try {
    window.localStorage.removeItem("user")
  } catch {
    /* private mode */
  }

  return null
}

/** Clear cookie mirror + server session (Sidebar / report logout). */
export function clearClientSession() {
  if (typeof window === "undefined") {
    return
  }

  try {
    localStorage.removeItem("user")
  } catch {
    /* private mode */
  }

  document.cookie = `${USER_SESSION_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`
  void fetch("/api/logout", { method: "POST", credentials: "same-origin" })
}
