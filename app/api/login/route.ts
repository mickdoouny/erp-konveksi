import { NextResponse } from "next/server"
import { authenticateUser } from "@/lib/auth"

export async function POST(request: Request) {
  const body = await request.json()
  const username = typeof body.username === "string" ? body.username : ""
  const password = typeof body.password === "string" ? body.password : ""

  const user = authenticateUser(username, password)

  if (!user) {
    return NextResponse.json(
      { error: "Username atau password salah" },
      { status: 401 }
    )
  }

  return NextResponse.json(user)
}
