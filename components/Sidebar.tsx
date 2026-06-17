"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import NotificationBell from "@/components/notifications/notification-bell"
import { NotificationProvider } from "@/components/notifications/notification-provider"
import { useServerSessionUser } from "@/components/client-session-provider"
import { readStoredUser } from "@/lib/auth"
import { clearClientSession } from "@/lib/login-session"
import { roleLabel } from "@/lib/roles"
import {
  PRODUKSI_PAGE_BY_DEPARTMENT,
  PRODUKSI_PAGE_TITLES,
  resolveProduksiDepartment,
  type ProduksiOperatorDepartment,
} from "@/lib/production-operator-stages"

type User = {
  nama?: string
  role: string
  divisi?: string
  operatorDepartment?: string
}

const linkClass =
  "block rounded-lg border border-transparent px-3 py-2.5 text-zinc-300 transition hover:border-orange-500/35 hover:bg-zinc-900/90 hover:text-orange-400"

const labelClass = "pt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500"

function activeModuleLabel(pathname: string): string | null {
  if (pathname.startsWith("/owner/operator")) return "Operator"
  if (pathname.startsWith("/owner")) return "Dashboard Owner"
  if (pathname.startsWith("/operator")) return "Operator"
  if (pathname.startsWith("/admin/keuangan")) return "Admin Keuangan"
  if (
    pathname.startsWith("/admin/final-orders") ||
    pathname.startsWith("/admin/post-jahit") ||
    pathname.startsWith("/admin/packing") ||
    pathname.startsWith("/admin/jahit-pembayaran") ||
    pathname.startsWith("/admin/siap-kirim") ||
    pathname.startsWith("/admin/inventori") ||
    pathname.startsWith("/admin/rework-requests") ||
    pathname.startsWith("/admin/spp")
  ) {
    return "Admin Produksi"
  }
  if (pathname.startsWith("/produksi/")) {
    const segment = pathname.split("/")[2]
    const legacyPath = `/produksi/${segment}`
    const entry = Object.entries(PRODUKSI_PAGE_BY_DEPARTMENT).find(
      ([, path]) => path === legacyPath
    )
    if (entry) {
      return PRODUKSI_PAGE_TITLES[entry[0] as ProduksiOperatorDepartment].title
    }
    if (legacyPath === "/produksi/setting" || legacyPath === "/produksi/prepress") {
      return PRODUKSI_PAGE_TITLES.PREPRESS.title
    }
    return "Produksi"
  }
  if (pathname.startsWith("/cs/antrian-produksi")) return "Antrian Produksi CS"
  if (pathname.startsWith("/cs/antrian-desain")) return "Antrian Desain CS"
  if (pathname.startsWith("/desainer")) return "Modul Desainer"
  return null
}

function sessionUserToSidebarUser(
  stored: {
    nama?: string
    role: string
    divisi?: string
    operatorDepartment?: string
  } | null
): User | null {
  if (!stored) return null
  return {
    nama: stored.nama,
    role: stored.role,
    divisi: stored.divisi,
    operatorDepartment: stored.operatorDepartment,
  }
}

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const serverUser = useServerSessionUser()
  const [user, setUser] = useState<User | null>(() =>
    sessionUserToSidebarUser(serverUser)
  )

  useEffect(() => {
    queueMicrotask(() => {
      setUser(sessionUserToSidebarUser(readStoredUser() ?? serverUser))
    })
  }, [serverUser])

  function logout() {
    clearClientSession()
    router.push("/login")
  }

  const role = user?.role
  const moduleLabel = activeModuleLabel(pathname)
  const produksiDepartment =
    user && role === "produksi" ? resolveProduksiDepartment(user) : null
  const produksiQueuePath = produksiDepartment
    ? PRODUKSI_PAGE_BY_DEPARTMENT[produksiDepartment]
    : null

  const notifyRoles = ["cs", "desainer", "admin_keuangan", "admin_produksi", "owner"]

  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <NotificationProvider role={role && notifyRoles.includes(role) ? role : null}>
      <aside className="neo-sidebar flex w-full shrink-0 flex-col border-b border-zinc-800/90 bg-zinc-950 bg-[linear-gradient(180deg,#030304_0%,#050508_50%,#0a0a0c_100%)] text-white md:h-screen md:min-h-[100vh] md:w-[290px] md:min-w-[290px] md:max-w-[290px] md:border-b-0 md:border-r">
        <div className="flex min-h-0 flex-1 flex-col md:h-full">
        <div className="shrink-0 border-b border-zinc-800/80 p-4 md:p-6">
          <div className="mb-2 h-px w-12 bg-gradient-to-r from-orange-500 to-transparent" />

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-[12rem] flex-1">
              <h1 className="text-lg font-bold leading-snug tracking-tight text-white sm:text-xl">
                Dasa Putra Kreatif
              </h1>

              <p className="mt-1 font-mono text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                ERP · Konveksi
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {role && notifyRoles.includes(role) ? (
                <NotificationBell />
              ) : null}
              <button
                type="button"
                aria-expanded={mobileNavOpen}
                aria-controls="sidebar-nav"
                onClick={() => setMobileNavOpen((open) => !open)}
                className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-orange-500/40 hover:text-orange-300 md:hidden"
              >
                {mobileNavOpen ? "Tutup" : "Menu"}
              </button>
            </div>
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

      <div
        id="sidebar-nav"
        data-nav-open={mobileNavOpen ? "true" : "false"}
        className={`sidebar-nav-scroll min-h-0 flex-1 overflow-y-auto p-3 ${
          mobileNavOpen ? "" : "max-md:hidden"
        }`}
      >
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
                  <Link href="/owner/operator" className={linkClass}>
                    Operator
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
                  <Link href="/admin/rework-requests" className={linkClass}>
                    Request Rework
                  </Link>
                </li>
                <li>
                  <Link href="/admin/post-jahit" className={linkClass}>
                    Pasca Jahit
                  </Link>
                </li>
                <li>
                  <Link href="/admin/packing" className={linkClass}>
                    Packing
                  </Link>
                </li>
                <li>
                  <Link href="/admin/jahit-pembayaran" className={linkClass}>
                    Pembayaran Jahit
                  </Link>
                </li>
                <li>
                  <Link href="/admin/siap-kirim" className={linkClass}>
                    Siap Kirim
                  </Link>
                </li>
                <li>
                  <Link href="/admin/inventori" className={linkClass}>
                    Inventori Bahan
                  </Link>
                </li>
                <li className={labelClass}>CS &amp; Desain</li>
                <li>
                  <Link href="/cs/antrian-desain" className={linkClass}>
                    Antrian Desain CS
                  </Link>
                </li>
                <li>
                  <Link href="/cs/antrian-produksi" className={linkClass}>
                    Antrian Produksi CS
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
                  <Link href="/cs/antrian-produksi" className={linkClass}>
                    Antrian Produksi
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
              <>
                <li>
                  <Link href="/admin/keuangan" className={linkClass}>
                    Admin Keuangan
                  </Link>
                </li>
              </>
            )}

            {role === "admin_produksi" && (
              <>
                <li>
                  <Link href="/admin/final-orders" className={linkClass}>
                    Antrian Produksi
                  </Link>
                </li>
                <li>
                  <Link href="/admin/rework-requests" className={linkClass}>
                    Request Rework
                  </Link>
                </li>
                <li>
                  <Link href="/admin/post-jahit" className={linkClass}>
                    Pasca Jahit
                  </Link>
                </li>
                <li>
                  <Link href="/admin/packing" className={linkClass}>
                    Packing
                  </Link>
                </li>
                <li>
                  <Link href="/admin/jahit-pembayaran" className={linkClass}>
                    Pembayaran Jahit
                  </Link>
                </li>
                <li>
                  <Link href="/admin/siap-kirim" className={linkClass}>
                    Siap Kirim
                  </Link>
                </li>
                <li>
                  <Link href="/admin/inventori" className={linkClass}>
                    Inventori Bahan
                  </Link>
                </li>
              </>
            )}

            {role === "produksi" && (
              <>
                {produksiQueuePath ? (
                  <li>
                    <Link href={produksiQueuePath} className={linkClass}>
                      Antrian{" "}
                      {produksiDepartment
                        ? PRODUKSI_PAGE_TITLES[produksiDepartment].title
                        : "Produksi"}
                    </Link>
                  </li>
                ) : null}
                <li>
                  <Link href="/report" className={linkClass}>
                    Report Produksi
                  </Link>
                </li>
              </>
            )}

            {role === "operator" && (
              <li>
                <Link href="/operator" className={linkClass}>
                  Dashboard Operator
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>

        <div className="mt-auto shrink-0 border-t border-zinc-800/80 p-4">
          <button
            type="button"
            onClick={logout}
            className="neo-btn-danger w-full text-center text-sm"
          >
            Keluar
          </button>
        </div>
        </div>
      </aside>
    </NotificationProvider>
  )
}
