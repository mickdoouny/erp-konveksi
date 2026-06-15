import { NextResponse } from "next/server"
import type { AuthUser } from "@/lib/auth"
import { homePathForUser } from "@/lib/auth-redirect"
import {
  serializePendingUser,
  userSessionCookieOptions,
  USER_SESSION_COOKIE,
} from "@/lib/login-session"
import { relativeRedirectResponse } from "@/lib/request-origin"
import { normalizeLoginUsername, resolveLogin } from "@/lib/resolve-login"

function isFormSubmission(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? ""
  return (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  )
}

async function readCredentials(
  request: Request
): Promise<{ username: string; password: string } | null> {
  if (isFormSubmission(request)) {
    const formData = await request.formData()
    const username = formData.get("username")
    const password = formData.get("password")
    return {
      username: typeof username === "string" ? username : "",
      password: typeof password === "string" ? password : "",
    }
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return null
  }

  const record = body && typeof body === "object" ? body : {}
  const username =
    "username" in record && typeof record.username === "string"
      ? record.username
      : ""
  const password =
    "password" in record && typeof record.password === "string"
      ? record.password
      : ""

  return { username, password }
}

function loginRedirectSearch(
  request: Request,
  base: Record<string, string>,
  credentials?: { username: string; password: string },
  formData?: FormData
): Record<string, string> {
  const search = { ...base }
  if (credentials?.username) {
    search.username = credentials.username
  }
  if (formData?.get("debug") === "1") {
    search.debug = "1"
  } else {
    const referer = request.headers.get("referer")
    if (referer) {
      try {
        if (new URL(referer).searchParams.get("debug") === "1") {
          search.debug = "1"
        }
      } catch {
        /* ignore bad referer */
      }
    }
  }
  return search
}

function loginErrorRedirect(
  request: Request,
  code: string,
  credentials?: { username: string; password: string },
  formData?: FormData
) {
  return relativeRedirectResponse(
    "/login",
    loginRedirectSearch(request, { error: code }, credentials, formData),
    303
  )
}

function loginSuccessRedirect(user: AuthUser) {
  const home = homePathForUser(user)
  const response = relativeRedirectResponse(home, undefined, 303)
  response.cookies.set(
    USER_SESSION_COOKIE,
    serializePendingUser(user),
    userSessionCookieOptions()
  )
  return response
}

export async function POST(request: Request) {
  const formSubmission = isFormSubmission(request)
  const formData = formSubmission ? await request.formData() : null
  const rawCredentials = formData
    ? {
        username:
          typeof formData.get("username") === "string"
            ? formData.get("username")
            : "",
        password:
          typeof formData.get("password") === "string"
            ? formData.get("password")
            : "",
      }
    : await readCredentials(request)

  const credentials = rawCredentials
    ? {
        username: normalizeLoginUsername(rawCredentials.username),
        password: rawCredentials.password,
      }
    : null

  if (!credentials) {
    if (formSubmission) {
      return loginErrorRedirect(request, "invalid_request")
    }
    return NextResponse.json(
      { error: "Format permintaan tidak valid" },
      { status: 400 }
    )
  }

  const result = await resolveLogin(
    credentials.username,
    credentials.password
  )

  if (!result.ok) {
    console.warn(
      "[login] failed",
      credentials.username.trim(),
      "status=",
      result.status,
      "code=",
      result.status === 401
        ? "invalid_credentials"
        : result.status === 503
          ? "server_error"
          : "invalid_request"
    )
    if (formSubmission) {
      const code =
        result.status === 401
          ? "invalid_credentials"
          : result.status === 503
            ? "server_error"
            : "invalid_request"
      return loginErrorRedirect(request, code, credentials, formData ?? undefined)
    }
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  console.info(
    "[login] success",
    result.user.username,
    "role=",
    result.user.role,
    "host=",
    request.headers.get("host") ?? "(none)"
  )

  if (formSubmission) {
    return loginSuccessRedirect(result.user)
  }

  const response = NextResponse.json(result.user)
  response.cookies.set(
    USER_SESSION_COOKIE,
    serializePendingUser(result.user),
    userSessionCookieOptions()
  )
  return response
}

/** Bookmarked GET /api/login (common on phones) → back to the HTML form. */
export async function GET() {
  return relativeRedirectResponse("/login", { error: "invalid_request" }, 303)
}
