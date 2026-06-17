"use client"

import { useLayoutEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useServerSessionUser } from "@/components/client-session-provider"
import type { AuthUser } from "@/lib/auth"
import { homePathForUser } from "@/lib/auth-redirect"
import { resolveSessionUser } from "@/lib/login-session"

export type AuthGuardState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden"; user: AuthUser }
  | { status: "authenticated"; user: AuthUser }

type UseAuthGuardOptions = {
  /** Allowed roles; omit to allow any authenticated user. */
  roles?: string[]
  /** Set false to handle redirect yourself. Default true. */
  redirect?: boolean
}

function stableRolesKey(roles?: string[]): string {
  if (!roles?.length) return ""
  return [...roles].sort().join("\0")
}

function sameAuthState(a: AuthGuardState, b: AuthGuardState): boolean {
  if (a.status !== b.status) return false
  if (a.status === "loading" || a.status === "unauthenticated") return true
  return a.user.id === b.user.id && a.user.role === b.user.role
}

function authStateForUser(
  user: AuthUser,
  roles: string[] | undefined
): AuthGuardState {
  if (roles && !roles.includes(user.role)) {
    return { status: "forbidden", user }
  }
  return { status: "authenticated", user }
}

function resolveAuthState(
  roles: string[] | undefined,
  redirect: boolean,
  router: ReturnType<typeof useRouter>,
  serverUser: AuthUser | null
): AuthGuardState {
  const user = resolveSessionUser(serverUser)

  if (!user) {
    if (redirect) {
      router.replace("/login?error=session")
    }
    return { status: "unauthenticated" }
  }

  const next = authStateForUser(user, roles)
  if (next.status === "forbidden" && redirect) {
    router.replace(homePathForUser(user))
  }
  return next
}

function resolveInitialAuthState(
  roles: string[] | undefined,
  serverUser: AuthUser | null
): AuthGuardState {
  if (serverUser) {
    return authStateForUser(serverUser, roles)
  }

  if (typeof window !== "undefined") {
    const clientUser = resolveSessionUser(serverUser)
    if (clientUser) {
      return authStateForUser(clientUser, roles)
    }
  }

  return { status: "loading" }
}

/**
 * Cookie-first auth guard. Uses the server session cookie during SSR so LAN
 * pages never stay stuck on "Memuat…" or a blank screen when JS is slow.
 */
export function authenticatedUser(auth: AuthGuardState): AuthUser | null {
  return auth.status === "authenticated" ? auth.user : null
}

export function useAuthGuard(
  options: UseAuthGuardOptions = {}
): AuthGuardState {
  const router = useRouter()
  const serverUser = useServerSessionUser()
  const { roles, redirect = true } = options
  const rolesKey = stableRolesKey(roles)
  const [state, setState] = useState<AuthGuardState>(() =>
    resolveInitialAuthState(roles, serverUser)
  )

  useLayoutEffect(() => {
    const next = resolveAuthState(roles, redirect, router, serverUser)
    setState((prev) => (sameAuthState(prev, next) ? prev : next))
  }, [router, redirect, rolesKey, serverUser?.id, serverUser?.role])

  return state
}
