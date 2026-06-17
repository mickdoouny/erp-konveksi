"use client"

import { createContext, useContext } from "react"
import type { AuthUser } from "@/lib/auth"

const ClientSessionContext = createContext<AuthUser | null>(null)

export function ClientSessionProvider({
  initialUser,
  children,
}: {
  initialUser: AuthUser | null
  children: React.ReactNode
}) {
  return (
    <ClientSessionContext.Provider value={initialUser}>
      {children}
    </ClientSessionContext.Provider>
  )
}

/** Session from middleware cookie, available during SSR of client pages. */
export function useServerSessionUser(): AuthUser | null {
  return useContext(ClientSessionContext)
}
