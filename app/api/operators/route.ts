import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { isOperatorDepartment } from "@/lib/operators"
import { hashPassword } from "@/lib/password"
import { prisma } from "@/lib/prisma"

const OPERATOR_PUBLIC_SELECT = {
  id: true,
  name: true,
  department: true,
  username: true,
  isActive: true,
  createdAt: true,
} as const

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const department = searchParams.get("department")
    const activeOnly = searchParams.get("activeOnly") !== "false"

    if (department && !isOperatorDepartment(department)) {
      return NextResponse.json(
        { message: "Divisi operator tidak valid" },
        { status: 400 }
      )
    }

    const operators = await prisma.operator.findMany({
      where: {
        ...(department ? { department } : {}),
        ...(activeOnly ? { isActive: true } : {}),
      },
      select: OPERATOR_PUBLIC_SELECT,
      orderBy: [{ department: "asc" }, { name: "asc" }],
    })

    return NextResponse.json(operators)
  } catch (error) {
    console.error("GET OPERATORS:", error)
    return NextResponse.json(
      { message: "Gagal mengambil data operator" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const username =
      typeof body.username === "string" ? body.username.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const department =
      typeof body.department === "string" ? body.department : ""

    if (!name) {
      return NextResponse.json(
        { message: "Nama operator wajib diisi" },
        { status: 400 }
      )
    }

    if (!username) {
      return NextResponse.json(
        { message: "User ID (username) wajib diisi" },
        { status: 400 }
      )
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return NextResponse.json(
        {
          message:
            "User ID hanya boleh huruf, angka, titik, strip, dan underscore",
        },
        { status: 400 }
      )
    }

    if (!password || password.length < 4) {
      return NextResponse.json(
        { message: "Password wajib diisi (minimal 4 karakter)" },
        { status: 400 }
      )
    }

    if (!isOperatorDepartment(department)) {
      return NextResponse.json(
        { message: "Divisi operator wajib diisi dan valid" },
        { status: 400 }
      )
    }

    const existingUsername = await prisma.operator.findUnique({
      where: { username },
      select: { id: true },
    })
    if (existingUsername) {
      return NextResponse.json(
        { message: "User ID sudah dipakai operator lain" },
        { status: 409 }
      )
    }

    const operator = await prisma.operator.create({
      data: {
        id: randomUUID(),
        name,
        username,
        passwordHash: hashPassword(password),
        department,
        isActive: body.isActive !== false,
      },
      select: OPERATOR_PUBLIC_SELECT,
    })

    return NextResponse.json(operator, { status: 201 })
  } catch (error) {
    console.error("POST OPERATOR:", error)
    return NextResponse.json(
      { message: "Gagal menambah operator" },
      { status: 500 }
    )
  }
}
