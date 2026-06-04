-- CreateEnum
CREATE TYPE "DtfStatus" AS ENUM ('TIDAK_PERLU', 'MENUNGGU_ORDER', 'DI_VENDOR', 'MENUNGGU_BAYAR', 'DIBAYAR', 'SIAP_PRODUKSI');

-- CreateEnum
CREATE TYPE "DtfPaymentRequestStatus" AS ENUM ('MENUNGGU', 'DISETUJUI', 'DITOLAK');

-- CreateTable
CREATE TABLE "DtfVendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "phone" TEXT,
    "bankAccount" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DtfVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DtfPaymentRequest" (
    "id" TEXT NOT NULL,
    "designQueueItemId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "nominal" INTEGER NOT NULL,
    "status" "DtfPaymentRequestStatus" NOT NULL DEFAULT 'MENUNGGU',
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "buktiBayarUrl" TEXT,
    "notes" TEXT,

    CONSTRAINT "DtfPaymentRequest_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "DesignQueueItem" ADD COLUMN     "perluDtf" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "catatanDtf" TEXT,
ADD COLUMN     "statusDtf" "DtfStatus" NOT NULL DEFAULT 'TIDAK_PERLU',
ADD COLUMN     "fileDtfVendor" TEXT,
ADD COLUMN     "fileDtfProof" TEXT,
ADD COLUMN     "dtfVendorId" TEXT;

-- CreateIndex
CREATE INDEX "DesignQueueItem_perluDtf_statusDtf_idx" ON "DesignQueueItem"("perluDtf", "statusDtf");

-- CreateIndex
CREATE INDEX "DesignQueueItem_dtfVendorId_idx" ON "DesignQueueItem"("dtfVendorId");

-- CreateIndex
CREATE INDEX "DtfVendor_isActive_name_idx" ON "DtfVendor"("isActive", "name");

-- CreateIndex
CREATE INDEX "DtfPaymentRequest_status_requestedAt_idx" ON "DtfPaymentRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "DtfPaymentRequest_designQueueItemId_idx" ON "DtfPaymentRequest"("designQueueItemId");

-- CreateIndex
CREATE INDEX "DtfPaymentRequest_vendorId_idx" ON "DtfPaymentRequest"("vendorId");

-- AddForeignKey
ALTER TABLE "DesignQueueItem" ADD CONSTRAINT "DesignQueueItem_dtfVendorId_fkey" FOREIGN KEY ("dtfVendorId") REFERENCES "DtfVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DtfPaymentRequest" ADD CONSTRAINT "DtfPaymentRequest_designQueueItemId_fkey" FOREIGN KEY ("designQueueItemId") REFERENCES "DesignQueueItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DtfPaymentRequest" ADD CONSTRAINT "DtfPaymentRequest_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "DtfVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sample vendors (optional — safe to re-run with ON CONFLICT)
INSERT INTO "DtfVendor" ("id", "name", "contact", "phone", "bankAccount", "notes", "isActive", "createdAt")
VALUES
  ('dtf-vendor-001', 'DTF Print Jogja', 'Budi Santoso', '081234567890', 'BCA 1234567890 a/n Budi Santoso', 'Vendor DTF reguler', true, NOW()),
  ('dtf-vendor-002', 'Express DTF Solo', 'Siti Rahayu', '081298765432', 'Mandiri 9876543210 a/n Siti Rahayu', 'Express 1-2 hari', true, NOW())
ON CONFLICT ("id") DO NOTHING;
