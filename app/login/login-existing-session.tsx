"use client"



import { useEffect, useState } from "react"

import { useRouter } from "next/navigation"

import type { AuthUser } from "@/lib/auth"

import { homePathForUser } from "@/lib/auth-redirect"

import { clearClientSession, readClientSessionUser } from "@/lib/login-session"



/**

 * Client-only banner — keeps /login SSR HTML identical across hosts and

 * cookie states (banner appears after hydration when erp_user exists).

 */

export function LoginExistingSession() {

  const router = useRouter()

  const [user, setUser] = useState<AuthUser | null>(null)



  useEffect(() => {

    setUser(readClientSessionUser())

  }, [])



  if (!user) {

    return null

  }



  const home = homePathForUser(user)

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

        <a

          href={home}

          className="neo-btn-primary inline-flex justify-center px-4 py-2.5 text-center text-sm no-underline"

        >

          Lanjutkan

        </a>

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


