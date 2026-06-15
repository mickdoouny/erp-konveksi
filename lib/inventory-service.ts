import { randomUUID } from "crypto"
import {
  InventoryMovementType,
  ProductionStatus,
  type Prisma,
} from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  DEFAULT_INVENTORY_ITEMS,
  INVENTORY_SKU,
  type InventorySku,
} from "@/lib/inventory-catalog"
export type PrintingInkConsumption = {
  konsumsiTintaC: number
  konsumsiTintaM: number
  konsumsiTintaY: number
  konsumsiTintaK: number
}

export type PotongBahanWeights = {
  beratBahan: number
  beratRib?: number | null
}

export type InventoryDeduction = {
  sku: InventorySku
  quantity: number
}

type TxClient = Prisma.TransactionClient

export async function ensureDefaultInventoryItems() {
  const now = new Date()
  for (const item of DEFAULT_INVENTORY_ITEMS) {
    await prisma.inventoryItem.upsert({
      where: { sku: item.sku },
      create: {
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: 0,
        updatedAt: now,
      },
      update: {},
    })
  }
}

export function buildPrintingDeductions(
  ink: PrintingInkConsumption
): InventoryDeduction[] {
  return [
    { sku: INVENTORY_SKU.TINTA_C, quantity: ink.konsumsiTintaC },
    { sku: INVENTORY_SKU.TINTA_M, quantity: ink.konsumsiTintaM },
    { sku: INVENTORY_SKU.TINTA_Y, quantity: ink.konsumsiTintaY },
    { sku: INVENTORY_SKU.TINTA_K, quantity: ink.konsumsiTintaK },
  ].filter((d) => d.quantity > 0)
}

export function buildPotongBahanDeductions(
  weights: PotongBahanWeights
): InventoryDeduction[] {
  const deductions: InventoryDeduction[] = [
    { sku: INVENTORY_SKU.KAIN_UTAMA, quantity: weights.beratBahan },
  ]
  if (weights.beratRib != null && weights.beratRib > 0) {
    deductions.push({ sku: INVENTORY_SKU.RIB, quantity: weights.beratRib })
  }
  return deductions
}

async function loadItemsBySku(
  tx: TxClient,
  deductions: InventoryDeduction[]
) {
  const skus = deductions.map((d) => d.sku)
  const items = await tx.inventoryItem.findMany({
    where: { sku: { in: skus }, isActive: true },
  })
  const bySku = new Map(items.map((item) => [item.sku, item]))
  for (const sku of skus) {
    if (!bySku.has(sku)) {
      throw new Error(`Item inventori ${sku} tidak ditemukan. Hubungi Admin Produksi.`)
    }
  }
  return bySku
}

export async function assertSufficientStock(
  tx: TxClient,
  deductions: InventoryDeduction[]
) {
  if (deductions.length === 0) return

  const bySku = await loadItemsBySku(tx, deductions)

  for (const deduction of deductions) {
    const item = bySku.get(deduction.sku)!
    if (item.quantity < deduction.quantity) {
      throw new Error(
        `Stok ${item.name} tidak mencukupi. Tersedia: ${item.quantity} ${item.unit}, dibutuhkan: ${deduction.quantity} ${item.unit}`
      )
    }
  }
}

export async function hasExistingStageDeductions(
  tx: TxClient,
  pipelineId: string,
  stage: ProductionStatus
) {
  const count = await tx.inventoryMovement.count({
    where: {
      productionPipelineId: pipelineId,
      productionStage: stage,
      type: InventoryMovementType.OUT,
    },
  })
  return count > 0
}

export async function deductInventoryForStage(
  tx: TxClient,
  params: {
    pipelineId: string
    stage: ProductionStatus
    orderNumber: string
    deductions: InventoryDeduction[]
    actorName: string
    note?: string
  }
) {
  const { pipelineId, stage, orderNumber, deductions, actorName, note } = params
  if (deductions.length === 0) return

  const alreadyDeducted = await hasExistingStageDeductions(tx, pipelineId, stage)
  if (alreadyDeducted) return

  await assertSufficientStock(tx, deductions)
  const bySku = await loadItemsBySku(tx, deductions)
  const now = new Date()

  for (const deduction of deductions) {
    const item = bySku.get(deduction.sku)!
    const quantityBefore = item.quantity
    const quantityAfter = quantityBefore - deduction.quantity

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: quantityAfter, updatedAt: now },
    })

    await tx.inventoryMovement.create({
      data: {
        id: randomUUID(),
        inventoryItemId: item.id,
        type: InventoryMovementType.OUT,
        quantity: deduction.quantity,
        quantityBefore,
        quantityAfter,
        productionPipelineId: pipelineId,
        productionStage: stage,
        orderNumber,
        note: note ?? `Konsumsi produksi tahap ${stage}`,
        recordedByName: actorName,
      },
    })
  }
}

export async function adjustInventoryStock(
  inventoryItemId: string,
  delta: number,
  actorName: string,
  note?: string
) {
  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error("Jumlah penyesuaian harus angka selain nol")
  }

  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    })
    if (!item) {
      throw new Error("Item inventori tidak ditemukan")
    }

    const quantityBefore = item.quantity
    const quantityAfter = quantityBefore + delta
    if (quantityAfter < 0) {
      throw new Error(
        `Stok tidak boleh negatif. Tersedia: ${quantityBefore} ${item.unit}`
      )
    }

    const now = new Date()
    const type =
      delta > 0 ? InventoryMovementType.IN : InventoryMovementType.ADJUSTMENT

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: quantityAfter, updatedAt: now },
    })

    const movement = await tx.inventoryMovement.create({
      data: {
        id: randomUUID(),
        inventoryItemId: item.id,
        type,
        quantity: Math.abs(delta),
        quantityBefore,
        quantityAfter,
        note: note?.trim() || (delta > 0 ? "Stok masuk" : "Penyesuaian stok"),
        recordedByName: actorName,
      },
    })

    return { item: { ...item, quantity: quantityAfter }, movement }
  })
}
