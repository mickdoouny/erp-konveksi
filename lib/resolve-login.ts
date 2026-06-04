import {
  authenticateUser,
  isDemoUsername,
  type AuthUser,
} from "@/lib/auth"
import { authenticateOperator } from "@/lib/operator-auth"

export type LoginSuccess = { ok: true; user: AuthUser }

export type LoginFailure = {
  ok: false
  error: string
  status: number
}

export type LoginResult = LoginSuccess | LoginFailure

/** Mobile keyboards often capitalize the first letter; demo accounts are lowercase. */
export function normalizeLoginUsername(username: string): string {
  return username.trim().toLowerCase()
}

export async function resolveLogin(
  username: string,
  password: string
): Promise<LoginResult> {
  const trimmedUsername = normalizeLoginUsername(username)

  if (!trimmedUsername || !password) {
    return {
      ok: false,
      error: "Username dan password wajib diisi",
      status: 400,
    }
  }

  const defaultUser = authenticateUser(trimmedUsername, password)
  if (defaultUser) {
    return { ok: true, user: defaultUser }
  }

  if (isDemoUsername(trimmedUsername)) {
    return {
      ok: false,
      error: "Username atau password salah",
      status: 401,
    }
  }

  try {
    const operatorUser = await authenticateOperator(trimmedUsername, password)
    if (operatorUser) {
      return { ok: true, user: operatorUser }
    }
  } catch (error) {
    console.error("[login] operator auth error:", error)
    return {
      ok: false,
      error:
        "Server tidak dapat memverifikasi akun operator. Hubungi admin atau coba akun demo (cs1/desainer1).",
      status: 503,
    }
  }

  return {
    ok: false,
    error: "Username atau password salah",
    status: 401,
  }
}
