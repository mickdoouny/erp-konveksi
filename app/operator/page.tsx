"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AppShell, AppShellLoading } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { clearClientSession } from "@/lib/login-session"
import { useAuthGuard } from "@/hooks/use-auth-guard"

export default function OperatorHomePage() {
  const auth = useAuthGuard({ roles: ["operator"] })
  const [userName, setUserName] = useState("")
  const [divisi, setDivisi] = useState("")

  useEffect(() => {
    if (auth.status !== "authenticated") return
    const user = auth.user

    queueMicrotask(() => {
      setUserName(user.nama ?? "Operator")
      setDivisi(user.divisi ?? "")
    })
  }, [auth.status, auth.user])

  if (!userName) {
    return (
      <AppShell>
        <AppShellLoading />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader
        badge="Operator"
        title="Dashboard"
        titleAccent={divisi || "Sales"}
        description="Modul khusus operator Sales. Halaman ini placeholder — fitur modul akan ditambahkan bertahap."
      />

      <div className="neo-card max-w-xl p-6">
        <p className="text-sm text-zinc-400">Selamat datang,</p>
        <p className="mt-1 text-xl font-semibold text-white">{userName}</p>
        <p className="mt-3 text-sm text-zinc-500">
          Anda masuk sebagai operator divisi{" "}
          <span className="text-orange-400">{divisi || "Sales"}</span>.
        </p>
      </div>

      <Link
        href="/login"
        onClick={() => clearClientSession()}
        className="neo-btn-secondary mt-6 inline-flex items-center px-4 py-2 text-sm"
      >
        Keluar
      </Link>
    </AppShell>
  )
}
