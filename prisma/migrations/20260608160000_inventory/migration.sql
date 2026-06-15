-- CreateEnum
CREATE TYPE "InventoryItemCategory" AS ENUM ('TINTA', 'KAIN', 'AKSESORIS', 'LAINNYA');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InventoryItemCategory" NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minQuantity" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "quantityBefore" DOUBLE PRECISION NOT NULL,
    "quantityAfter" DOUBLE PRECISION NOT NULL,
    "productionPipelineId" TEXT,
    "productionStage" "ProductionStatus",
    "orderNumber" TEXT,
    "note" TEXT,
    "recordedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_sku_key" ON "InventoryItem"("sku");

-- CreateIndex
CREATE INDEX "InventoryItem_category_isActive_idx" ON "InventoryItem"("category", "isActive");

-- CreateIndex
CREATE INDEX "InventoryMovement_inventoryItemId_createdAt_idx" ON "InventoryMovement"("inventoryItemId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_productionPipelineId_idx" ON "InventoryMovement"("productionPipelineId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_productionPipelineId_productionStage_invent_key" ON "InventoryMovement"("productionPipelineId", "productionStage", "inventoryItemId");

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default inventory items
INSERT INTO "InventoryItem" ("id", "sku", "name", "category", "unit", "quantity", "updatedAt") VALUES
  ('inv-tinta-c', 'TINTA_C', 'Tinta Cyan (C)', 'TINTA', 'ml', 0, CURRENT_TIMESTAMP),
  ('inv-tinta-m', 'TINTA_M', 'Tinta Magenta (M)', 'TINTA', 'ml', 0, CURRENT_TIMESTAMP),
  ('inv-tinta-y', 'TINTA_Y', 'Tinta Yellow (Y)', 'TINTA', 'ml', 0, CURRENT_TIMESTAMP),
  ('inv-tinta-k', 'TINTA_K', 'Tinta Black (K)', 'TINTA', 'ml', 0, CURRENT_TIMESTAMP),
  ('inv-kain-utama', 'KAIN_UTAMA', 'Kain Bahan Utama', 'KAIN', 'kg', 0, CURRENT_TIMESTAMP),
  ('inv-rib', 'RIB', 'Kain Rib', 'KAIN', 'kg', 0, CURRENT_TIMESTAMP);
