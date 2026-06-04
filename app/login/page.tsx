import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { LoginForm } from "@/app/login/login-form"
import { homePathByRole } from "@/lib/auth"
import { parsePendingUser, USER_SESSION_COOKIE } from "@/lib/login-session"

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Username atau password salah.",
  invalid_request: "Data login tidak lengkap. Coba lagi.",
  server_error:
    "Server tidak dapat memverifikasi akun operator. Coba akun demo (cs1/desainer1) atau hubungi admin.",
  session:
    "Sesi tidak ditemukan atau kedaluwarsa. Masuk lagi dari halaman login (bukan bookmark API).",
  unauthorized: "Anda belum masuk. Silakan login.",
  forbidden: "Akun ini tidak boleh mengakses halaman tersebut.",
  logout: "Anda sudah keluar. Silakan masuk lagi.",
}

function loginErrorMessage(errorCode: string | undefined): string | null {
  const code = errorCode?.trim()
  if (!code) {
    return null
  }
  return (
    ERROR_MESSAGES[code] ??
    `Login gagal (${code}). Periksa username/password atau hubungi admin IT.`
  )
}

type LoginPageProps = {
  searchParams: Promise<{
    error?: string
    username?: string
    debug?: string
    continue?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const cookieStore = await cookies()
  const sessionRaw = cookieStore.get(USER_SESSION_COOKIE)?.value
  const existingUser = sessionRaw ? parsePendingUser(sessionRaw) : null

  if (existingUser && params.continue === "1") {
    redirect(homePathByRole(existingUser.role))
  }

  const errorMessage = loginErrorMessage(params.error)
  const initialUsername = params.username?.trim() ?? ""
  const debug = params.debug === "1"

  return (
    <LoginForm
      errorMessage={errorMessage}
      initialUsername={initialUsername}
      debug={debug}
      existingUser={existingUser}
    />
  )
}
