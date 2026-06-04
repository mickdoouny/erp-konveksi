import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const existing = await prisma.operator.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { message: "Operator tidak ditemukan" },
        { status: 404 }
      )
    }

    await prisma.operator.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE OPERATOR:", error)
    return NextResponse.json(
      { message: "Gagal menghapus operator" },
      { status: 500 }
    )
  }
}
