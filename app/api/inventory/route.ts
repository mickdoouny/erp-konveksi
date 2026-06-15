import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  adjustInventoryStock,
  ensureDefaultInventoryItems,
} from "@/lib/inventory-service"
import { INVENTORY_CATEGORY_LABELS } from "@/lib/inventory-catalog"

export async function GET(request: Request) {
  try {
    await ensureDefaultInventoryItems()

    const { searchParams } = new URL(request.url)
    const withMovements = searchParams.get("movements") === "true"
    const movementLimit = Math.min(
      Number(searchParams.get("movementLimit") ?? 20),
      100
    )

    const items = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: withMovements
        ? {
            InventoryMovement: {
              orderBy: { createdAt: "desc" },
              take: movementLimit,
            },
          }
        : undefined,
    })

    return NextResponse.json({
      success: true,
      data: items.map((item) => ({
        ...item,
        categoryLabel: INVENTORY_CATEGORY_LABELS[item.category],
      })),
    })
  } catch (error) {
    console.error("GET INVENTORY:", error)
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data inventori" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>

    if (body.action === "adjust") {
      const itemId = String(body.inventoryItemId ?? "")
      const delta = Number(body.delta)
      const actorName = String(body.actorName ?? "Admin Produksi")
      const note = typeof body.note === "string" ? body.note : undefined

      if (!itemId) {
        return NextResponse.json(
          { success: false, message: "Item inventori wajib dipilih" },
          { status: 400 }
        )
      }

      const result = await adjustInventoryStock(itemId, delta, actorName, note)
      return NextResponse.json({ success: true, data: result })
    }

    if (body.action === "create") {
      const sku = typeof body.sku === "string" ? body.sku.trim().toUpperCase() : ""
      const name = typeof body.name === "string" ? body.name.trim() : ""
      const unit = typeof body.unit === "string" ? body.unit.trim() : ""
      const category = body.category

      if (!sku || !name || !unit) {
        return NextResponse.json(
          { success: false, message: "SKU, nama, dan satuan wajib diisi" },
          { status: 400 }
        )
      }

      const now = new Date()
      const item = await prisma.inventoryItem.create({
        data: {
          id: randomUUID(),
          sku,
          name,
          unit,
          category:
            category === "TINTA" ||
            category === "KAIN" ||
            category === "AKSESORIS" ||
            category === "LAINNYA"
              ? category
              : "LAINNYA",
          quantity: 0,
          updatedAt: now,
        },
      })

      return NextResponse.json({ success: true, data: item }, { status: 201 })
    }

    return NextResponse.json(
      { success: false, message: "Aksi tidak dikenali" },
      { status: 400 }
    )
  } catch (error) {
    console.error("POST INVENTORY:", error)
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui inventori"
    return NextResponse.json({ success: false, message }, { status: 400 })
  }
}
