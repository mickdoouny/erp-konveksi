import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>

    const existing = await prisma.dtfVendor.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { message: "Vendor tidak ditemukan" },
        { status: 404 }
      )
    }

    const vendor = await prisma.dtfVendor.update({
      where: { id },
      data: {
        name:
          typeof body.name === "string" && body.name.trim()
            ? body.name.trim()
            : existing.name,
        contact:
          body.contact !== undefined
            ? typeof body.contact === "string"
              ? body.contact.trim() || null
              : null
            : existing.contact,
        phone:
          body.phone !== undefined
            ? typeof body.phone === "string"
              ? body.phone.trim() || null
              : null
            : existing.phone,
        bankAccount:
          body.bankAccount !== undefined
            ? typeof body.bankAccount === "string"
              ? body.bankAccount.trim() || null
              : null
            : existing.bankAccount,
        notes:
          body.notes !== undefined
            ? typeof body.notes === "string"
              ? body.notes.trim() || null
              : null
            : existing.notes,
        isActive:
          typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
      },
    })

    return NextResponse.json(vendor)
  } catch (error) {
    console.error("PATCH DTF VENDOR:", error)
    return NextResponse.json(
      { message: "Gagal memperbarui vendor DTF" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const existing = await prisma.dtfVendor.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { message: "Vendor tidak ditemukan" },
        { status: 404 }
      )
    }

    await prisma.dtfVendor.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE DTF VENDOR:", error)
    return NextResponse.json(
      { message: "Gagal menonaktifkan vendor DTF" },
      { status: 500 }
    )
  }
}
