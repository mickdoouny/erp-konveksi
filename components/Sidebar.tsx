"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import NotificationBell from "@/components/notifications/notification-bell"
import { NotificationProvider } from "@/components/notifications/notification-provider"
import { roleLabel } from "@/lib/roles"

type User = {
  nama?: string
  role: string
  divisi?: string
}

const linkClass =
  "block rounded-lg border border-transparent px-3 py-2.5 text-zinc-300 transition hover:border-orange-500/35 hover:bg-zinc-900/90 hover:text-orange-400"

const labelClass = "pt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500"

function activeModuleLabel(pathname: string): string | null {
  if (pathname.startsWith("/admin/keuangan")) return "Admin Keuangan"
  if (
    pathname.startsWith("/admin/final-orders") ||
    pathname.startsWith("/admin/siap-kirim") ||
    pathname.startsWith("/admin/spp")
  ) {
    return "Admin Produksi"
  }
  if (pathname.startsWith("/cs/antrian-desain")) return "Antrian Desain CS"
  if (pathname.startsWith("/desainer")) return "Modul Desainer"
  return null
}

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
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
  const moduleLabel = activeModuleLabel(pathname)

  const notifyRoles = ["cs", "desainer", "admin_keuangan", "admin_produksi", "owner"]

  return (
    <NotificationProvider role={role && notifyRoles.includes(role) ? role : null}>
      <div className="flex w-72 shrink-0 flex-col border-r border-zinc-800/90 bg-zinc-950 bg-[linear-gradient(180deg,#030304_0%,#050508_50%,#0a0a0c_100%)] text-white">
        <div className="border-b border-zinc-800/80 p-6">
          <div className="mb-2 h-px w-12 bg-gradient-to-r from-orange-500 to-transparent" />

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Dasa Putra Kreatif
              </h1>

              <p className="mt-1 font-mono text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                ERP · Konveksi
              </p>
            </div>
            {role && notifyRoles.includes(role) ? (
              <NotificationBell />
            ) : null}
          </div>

          {user?.nama ? (
            <div className="mt-4">
              <p className="text-sm font-medium text-zinc-200">{user.nama}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {roleLabel(role ?? "")}
                {user.divisi ? ` · ${user.divisi}` : ""}
              </p>
              {moduleLabel ? (
                <p className="mt-2 text-xs text-orange-400/90">
                  Modul aktif: {moduleLabel}
                </p>
              ) : null}
            </div>
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
                <li className={labelClass}>Admin</li>
                <li>
                  <Link href="/admin/keuangan" className={linkClass}>
                    Admin Keuangan
                  </Link>
                </li>
                <li>
                  <Link href="/admin/final-orders" className={linkClass}>
                    Admin Produksi
                  </Link>
                </li>
                <li>
                  <Link href="/admin/siap-kirim" className={linkClass}>
                    Siap Kirim
                  </Link>
                </li>
                <li className={labelClass}>CS &amp; Desain</li>
                <li>
                  <Link href="/cs/antrian-desain" className={linkClass}>
                    Antrian Desain CS
                  </Link>
                </li>
                <li>
                  <Link href="/desainer/antrian" className={linkClass}>
                    Antrian Desainer
                  </Link>
                </li>
                <li>
                  <Link href="/desainer/antrian-disetujui" className={linkClass}>
                    Antrian Disetujui
                  </Link>
                </li>
                <li>
                  <Link href="/report" className={linkClass}>
                    Report Produksi
                  </Link>
                </li>
              </>
            )}

            {role === "cs" && (
              <>
                <li>
                  <Link href="/cs/antrian-desain" className={linkClass}>
                    Antrian Desain
                  </Link>
                </li>
                <li>
                  <Link href="/cs/antrian-desain/tambah" className={linkClass}>
                    Tambah Desain
                  </Link>
                </li>
              </>
            )}

            {role === "desainer" && (
              <>
                <li>
                  <Link href="/desainer/antrian" className={linkClass}>
                    Antrian Kerja
                  </Link>
                </li>
                <li>
                  <Link href="/desainer/antrian-disetujui" className={linkClass}>
                    Antrian Disetujui
                  </Link>
                </li>
              </>
            )}

            {role === "admin_keuangan" && (
              <li>
                <Link href="/admin/keuangan" className={linkClass}>
                  Admin Keuangan
                </Link>
              </li>
            )}

            {role === "admin_produksi" && (
              <>
                <li>
                  <Link href="/admin/final-orders" className={linkClass}>
                    Antrian Produksi
                  </Link>
                </li>
                <li>
                  <Link href="/admin/siap-kirim" className={linkClass}>
                    Siap Kirim
                  </Link>
                </li>
              </>
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
    </NotificationProvider>
  )
}
