"use client"



import { useEffect, useState } from "react"

import { useRouter } from "next/navigation"

import type { AuthUser } from "@/lib/auth"

import { homePathByRole, readStoredUser } from "@/lib/auth"



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



function resolveAuthState(

  roles: string[] | undefined,

  redirect: boolean,

  router: ReturnType<typeof useRouter>

): AuthGuardState {

  const user = readStoredUser()

  if (!user) {

    if (redirect) {

      router.replace("/login")

    }

    return { status: "unauthenticated" }

  }



  if (roles && !roles.includes(user.role)) {

    if (redirect) {

      router.replace(homePathByRole(user.role))

    }

    return { status: "forbidden", user }

  }



  return { status: "authenticated", user }

}



/**

 * Cookie-first auth guard. Never redirects until client session is resolved

 * (inline script + readStoredUser). Show loading UI while status === "loading".

 */

/** Safe session user for effect deps (never read auth.user.id while loading). */
export function authenticatedUser(
  auth: AuthGuardState
): AuthUser | null {
  return auth.status === "authenticated" ? auth.user : null
}

export function useAuthGuard(

  options: UseAuthGuardOptions = {}

): AuthGuardState {

  const router = useRouter()

  const { roles, redirect = true } = options

  const rolesKey = stableRolesKey(roles)

  const [state, setState] = useState<AuthGuardState>({ status: "loading" })



  useEffect(() => {

    const next = resolveAuthState(roles, redirect, router)

    setState((prev) => (sameAuthState(prev, next) ? prev : next))

  }, [router, redirect, rolesKey])



  return state

}


