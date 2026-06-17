import type { AuthGuardState } from "@/hooks/use-auth-guard"

/** Dark fallback — never leave a blank white screen during auth redirect. */
export function AuthGateShell({
  message = "Memuat…",
}: {
  message?: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030304] px-4 text-center text-zinc-500">
      {message}
    </div>
  )
}

export function AuthGate({
  auth,
  children,
}: {
  auth: AuthGuardState
  children: React.ReactNode
}) {
  if (auth.status === "loading") {
    return <AuthGateShell />
  }

  if (auth.status === "unauthenticated" || auth.status === "forbidden") {
    return <AuthGateShell message="Mengalihkan ke login…" />
  }

  return <>{children}</>
}
