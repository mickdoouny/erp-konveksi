"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type User = {
  nama?: string
  role: string
  divisi?: string
}

const linkClass =
  "block rounded-lg border border-transparent px-3 py-2.5 text-zinc-300 transition hover:border-orange-500/35 hover:bg-zinc-900/90 hover:text-orange-400"

const labelClass = "pt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500"

export default function Sidebar() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem("user")
    if (!raw) {
      setUser(null)
      return
    }
    try {
      setUser(JSON.parse(raw) as User)
    } catch {
      setUser(null)
    }
  }, [])

  function logout() {
    localStorage.removeItem("user")
    router.push("/login")
  }

  const role = user?.role

  return (
    <div className="flex w-72 shrink-0 flex-col border-r border-zinc-800/90 bg-zinc-950 bg-[linear-gradient(180deg,#030304_0%,#050508_50%,#0a0a0c_100%)] text-white">
      <div className="border-b border-zinc-800/80 p-6">
        <div className="mb-2 h-px w-12 bg-gradient-to-r from-orange-500 to-transparent" />

        <h1 className="text-xl font-bold tracking-tight text-white">
          Dasa Putra Kreatif
        </h1>

        <p className="mt-1 font-mono text-[11px] font-medium uppercase tracking-widest text-zinc-500">
          ERP · Konveksi
        </p>

        {user?.nama ? (
          <p className="mt-4 text-sm font-medium text-zinc-200">
            {user.nama}
            {user.divisi ? (
              <span className="mt-1 block font-normal text-zinc-500">
                {user.divisi}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <nav>
          <ul className="space-y-1">
            {role === "owner" && (
              <>
                <li>
                  <Link href="/owner" className={linkClass}>
                    Dashboard Owner
                  </Link>
                </li>
                <li>
                  <Link href="/report" className={linkClass}>
                    Report Produksi
                  </Link>
                </li>
                <li>
                  <Link href="/production-progress" className={linkClass}>
                    Progress Produksi
                  </Link>
                </li>

                <li className={labelClass}>Alur CS &amp; Desain</li>

                <li>
                  <Link href="/leads" className={linkClass}>
                    Lead / Prospek
                  </Link>
                </li>
                <li>
                  <Link href="/orders" className={linkClass}>
                    Input Lead
                  </Link>
                </li>
                <li>
                  <Link href="/cs/design-approval" className={linkClass}>
                    Approval Desain
                  </Link>
                </li>
                <li>
                  <Link href="/designs/list" className={linkClass}>
                    Antrian Desain
                  </Link>
                </li>
              </>
            )}

            {role === "cs" && (
              <>
                <li>
                  <Link href="/leads" className={linkClass}>
                    Lead / Prospek
                  </Link>
                </li>
                <li>
                  <Link href="/orders" className={linkClass}>
                    Input Lead
                  </Link>
                </li>
                <li>
                  <Link href="/cs/design-approval" className={linkClass}>
                    Approval Desain
                  </Link>
                </li>
              </>
            )}

            {role === "desainer" && (
              <li>
                <Link href="/designs/list" className={linkClass}>
                  Antrian Desain
                </Link>
              </li>
            )}

            {role === "produksi" && (
              <>
                <li>
                  <Link href="/report" className={linkClass}>
                    Report Produksi
                  </Link>
                </li>
                <li>
                  <Link href="/production-progress" className={linkClass}>
                    Progress Produksi
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>

      <div className="border-t border-zinc-800/80 p-4">
        <button
          type="button"
          onClick={logout}
          className="neo-btn-danger w-full text-center text-sm"
        >
          Keluar
        </button>
      </div>
    </div>
  )
}
