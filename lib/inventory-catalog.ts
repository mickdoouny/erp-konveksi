import type { InventoryItemCategory } from "@prisma/client"

export const INVENTORY_SKU = {
  TINTA_C: "TINTA_C",
  TINTA_M: "TINTA_M",
  TINTA_Y: "TINTA_Y",
  TINTA_K: "TINTA_K",
  KAIN_UTAMA: "KAIN_UTAMA",
  RIB: "RIB",
} as const

export type InventorySku = (typeof INVENTORY_SKU)[keyof typeof INVENTORY_SKU]

export type DefaultInventorySeed = {
  id: string
  sku: InventorySku
  name: string
  category: InventoryItemCategory
  unit: string
}

export const DEFAULT_INVENTORY_ITEMS: DefaultInventorySeed[] = [
  {
    id: "inv-tinta-c",
    sku: INVENTORY_SKU.TINTA_C,
    name: "Tinta Cyan (C)",
    category: "TINTA",
    unit: "ml",
  },
  {
    id: "inv-tinta-m",
    sku: INVENTORY_SKU.TINTA_M,
    name: "Tinta Magenta (M)",
    category: "TINTA",
    unit: "ml",
  },
  {
    id: "inv-tinta-y",
    sku: INVENTORY_SKU.TINTA_Y,
    name: "Tinta Yellow (Y)",
    category: "TINTA",
    unit: "ml",
  },
  {
    id: "inv-tinta-k",
    sku: INVENTORY_SKU.TINTA_K,
    name: "Tinta Black (K)",
    category: "TINTA",
    unit: "ml",
  },
  {
    id: "inv-kain-utama",
    sku: INVENTORY_SKU.KAIN_UTAMA,
    name: "Kain Bahan Utama",
    category: "KAIN",
    unit: "kg",
  },
  {
    id: "inv-rib",
    sku: INVENTORY_SKU.RIB,
    name: "Kain Rib",
    category: "KAIN",
    unit: "kg",
  },
]

export const INVENTORY_CATEGORY_LABELS: Record<InventoryItemCategory, string> = {
  TINTA: "Tinta",
  KAIN: "Kain",
  AKSESORIS: "Aksesoris",
  LAINNYA: "Lain-lain",
}
