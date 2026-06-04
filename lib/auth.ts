export type AuthUser = {
  id: string
  nama: string
  username: string
  role: string
  divisi: string
  operatorDepartment?: string
}

type UserRecord = AuthUser & {
  password: string
}

export const DEMO_ACCOUNT_SHARED_PASSWORD = "12345"

export const DEFAULT_USERS: UserRecord[] = [
  {
    id: "user_owner",
    nama: "Owner",
    username: "owner",
    password: DEMO_ACCOUNT_SHARED_PASSWORD,
    role: "owner",
    divisi: "Owner",
  },
  {
    id: "user_admin",
    nama: "Admin Produksi",
    username: "admin",
    password: DEMO_ACCOUNT_SHARED_PASSWORD,
    role: "admin_produksi",
    divisi: "Admin Produksi",
  },
  {
    id: "user_keuangan",
    nama: "Admin Keuangan",
    username: "keuangan",
    password: DEMO_ACCOUNT_SHARED_PASSWORD,
    role: "admin_keuangan",
    divisi: "Admin Keuangan",
  },
  {
    id: "user_cs",
    nama: "Customer Service",
    username: "cs",
    password: DEMO_ACCOUNT_SHARED_PASSWORD,
    role: "cs",
    divisi: "CS",
  },
  {
    id: "user_cs1",
    nama: "CS 1",
    username: "cs1",
    password: DEMO_ACCOUNT_SHARED_PASSWORD,
    role: "cs",
    divisi: "CS · CS-001",
  },
  {
    id: "user_cs2",
    nama: "CS 2",
    username: "cs2",
    password: DEMO_ACCOUNT_SHARED_PASSWORD,
    role: "cs",
    divisi: "CS · CS-002",
  },
  {
    id: "user_cs3",
    nama: "CS 3",
    username: "cs3",
    password: DEMO_ACCOUNT_SHARED_PASSWORD,
    role: "cs",
    divisi: "CS · CS-003",
  },
  {
    id: "user_desainer",
    nama: "Desainer",
    username: "desainer",
    password: DEMO_ACCOUNT_SHARED_PASSWORD,
    role: "desainer",
    divisi: "Desain",
  },
  {
    id: "user_desainer1",
    nama: "Desainer 1",
    username: "desainer1",
    password: DEMO_ACCOUNT_SHARED_PASSWORD,
    role: "desainer",
    divisi: "Desain · DS-001",
  },
  {
    id: "user_desainer2",
    nama: "Desainer 2",
    username: "desainer2",
    password: DEMO_ACCOUNT_SHARED_PASSWORD,
    role: "desainer",
    divisi: "Desain · DS-002",
  },
  {
    id: "user_desainer3",
    nama: "Desainer 3",
    username: "desainer3",
    password: DEMO_ACCOUNT_SHARED_PASSWORD,
    role: "desainer",
    divisi: "Desain · DS-003",
  },
  {
    id: "user_jahit",
    nama: "Staff Jahit",
    username: "jahit",
    password: DEMO_ACCOUNT_SHARED_PASSWORD,
    role: "produksi",
    divisi: "Jahit",
  },
  {
    id: "user_print",
    nama: "Staff Print",
    username: "print",
    password: DEMO_ACCOUNT_SHARED_PASSWORD,
    role: "produksi",
    divisi: "Print",
  },
]

export function isDemoUsername(username: string): boolean {
  const normalized = username.trim().toLowerCase()
  return DEFAULT_USERS.some((entry) => entry.username === normalized)
}

export function authenticateUser(
  username: string,
  password: string
): AuthUser | null {
  const normalized = username.trim().toLowerCase()
  const user = DEFAULT_USERS.find(
    (entry) => entry.username === normalized && entry.password === password
  )

  if (!user) {
    return null
  }

  const { password: _password, ...authUser } = user
  return authUser
}

/** Halaman default setelah login / saat user salah peran. */
export function homePathByRole(role: string): string {
  switch (role) {
    case "owner":
      return "/owner"
    case "admin_keuangan":
      return "/admin/keuangan"
    case "admin_produksi":
      return "/admin/final-orders"
    case "cs":
      return "/cs/antrian-desain"
    case "desainer":
      return "/desainer/antrian"
    case "produksi":
      return "/report"
    case "operator":
      return "/operator"
    default:
      return "/login"
  }
}

import { readClientSessionUser } from "@/lib/login-session"

export function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null
  }

  return readClientSessionUser()
}

type DemoAccountGroupDefinition = {
  label: string
  match: (user: UserRecord) => boolean
}

export type DemoAccount = {
  username: string
  nama: string
  role: string
  divisi: string
}

export type DemoAccountGroup = {
  label: string
  accounts: DemoAccount[]
}

const DEMO_ACCOUNT_GROUP_DEFINITIONS: DemoAccountGroupDefinition[] = [
  {
    label: "Owner",
    match: (user) => user.role === "owner",
  },
  {
    label: "Admin Produksi",
    match: (user) => user.role === "admin_produksi",
  },
  {
    label: "Admin Keuangan",
    match: (user) => user.role === "admin_keuangan",
  },
  {
    label: "Customer Service",
    match: (user) => user.role === "cs",
  },
  {
    label: "Desainer",
    match: (user) => user.role === "desainer",
  },
  {
    label: "Produksi / Operator",
    match: (user) => user.role === "produksi",
  },
]

export const DEMO_ACCOUNT_GROUPS: DemoAccountGroup[] =
  DEMO_ACCOUNT_GROUP_DEFINITIONS.map(({ label, match }) => ({
    label,
    accounts: DEFAULT_USERS.filter(match).map((user) => ({
      username: user.username,
      nama: user.nama,
      role: user.role,
      divisi: user.divisi,
    })),
  })).filter((group) => group.accounts.length > 0)
