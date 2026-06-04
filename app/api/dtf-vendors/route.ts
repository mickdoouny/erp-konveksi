import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("activeOnly") !== "false"

    const vendors = await prisma.dtfVendor.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    })

    return NextResponse.json(vendors)
  } catch (error) {
    console.error("GET DTF VENDORS:", error)
    return NextResponse.json(
      { message: "Gagal mengambil data vendor DTF" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const name = typeof body.name === "string" ? body.name.trim() : ""

    if (!name) {
      return NextResponse.json(
        { message: "Nama vendor wajib diisi" },
        { status: 400 }
      )
    }

    const vendor = await prisma.dtfVendor.create({
      data: {
        id: randomUUID(),
        name,
        contact:
          typeof body.contact === "string" ? body.contact.trim() || null : null,
        phone: typeof body.phone === "string" ? body.phone.trim() || null : null,
        bankAccount:
          typeof body.bankAccount === "string"
            ? body.bankAccount.trim() || null
            : null,
        notes:
          typeof body.notes === "string" ? body.notes.trim() || null : null,
        isActive: body.isActive !== false,
      },
    })

    return NextResponse.json(vendor, { status: 201 })
  } catch (error) {
    console.error("POST DTF VENDOR:", error)
    return NextResponse.json(
      { message: "Gagal menambah vendor DTF" },
      { status: 500 }
    )
  }
}
