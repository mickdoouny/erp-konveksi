"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import type { AuthUser } from "@/lib/auth"
import { homePathByRole } from "@/lib/auth"
import { clearClientSession } from "@/lib/login-session"

type LoginExistingSessionProps = {
  user: AuthUser
}

export function LoginExistingSession({ user }: LoginExistingSessionProps) {
  const router = useRouter()
  const home = homePathByRole(user.role)
  const displayName = user.nama?.trim() || user.username

  function handleLogout() {
    clearClientSession()
    router.replace("/login?error=logout")
    router.refresh()
  }

  return (
    <div
      role="status"
      className="mb-5 rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-50"
    >
      <p className="font-medium">
        Sudah login sebagai <span className="text-white">{displayName}</span>
      </p>
      <p className="mt-1 text-xs text-emerald-200/80">
        Masuk dengan akun lain di bawah, atau lanjutkan ke beranda.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Link
          href={home}
          className="neo-btn-primary inline-flex justify-center px-4 py-2.5 text-center text-sm"
        >
          Lanjutkan
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-zinc-600 bg-zinc-900/80 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-orange-500/50 hover:text-orange-300"
        >
          Logout & ganti akun
        </button>
      </div>
    </div>
  )
}
