import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.json()

  const users = [
    {
      id: "user_owner",
      nama: "Owner",
      username: "owner",
      password: "12345",
      role: "owner",
      divisi: "owner",
    },
    {
      id: "user_cs",
      nama: "Customer Service",
      username: "cs",
      password: "12345",
      role: "cs",
      divisi: "CS",
    },
    {
      id: "user_desainer",
      nama: "Desainer",
      username: "desainer",
      password: "12345",
      role: "desainer",
      divisi: "Desain",
    },
    {
      id: "user_jahit",
      nama: "Staff Jahit",
      username: "jahit",
      password: "12345",
      role: "produksi",
      divisi: "Jahit",
    },
  ]

  const user = users.find(
    (u) => u.username === body.username && u.password === body.password
  )

  if (!user) {
    return NextResponse.json(
      { error: "Username atau password salah" },
      { status: 401 }
    )
  }

  return NextResponse.json({
    id: user.id,
    nama: user.nama,
    username: user.username,
    role: user.role,
    divisi: user.divisi,
  })
}