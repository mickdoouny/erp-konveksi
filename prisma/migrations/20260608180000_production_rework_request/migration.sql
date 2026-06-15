-- CreateEnum
CREATE TYPE "ReworkRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReworkRequestType" AS ENUM ('KEKURANGAN', 'GAGAL_PRODUKSI', 'LAINNYA');

-- AlterEnum
ALTER TYPE "ProductionEventType" ADD VALUE 'REWORK_REQUESTED';
ALTER TYPE "ProductionEventType" ADD VALUE 'REWORK_APPROVED';
ALTER TYPE "ProductionEventType" ADD VALUE 'REWORK_REJECTED';

-- CreateTable
CREATE TABLE "ProductionReworkRequest" (
    "id" TEXT NOT NULL,
    "productionPipelineId" TEXT NOT NULL,
    "finalOrderId" TEXT NOT NULL,
    "requestedFromStage" "ProductionStatus" NOT NULL,
    "requestedByUserId" TEXT,
    "requestedByName" TEXT NOT NULL,
    "requestType" "ReworkRequestType",
    "reason" TEXT NOT NULL,
    "status" "ReworkRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reworkTargetStage" "ProductionStatus" NOT NULL DEFAULT 'PRINTING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionReworkRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionReworkRequest_finalOrderId_idx" ON "ProductionReworkRequest"("finalOrderId");

-- CreateIndex
CREATE INDEX "ProductionReworkRequest_productionPipelineId_status_idx" ON "ProductionReworkRequest"("productionPipelineId", "status");

-- CreateIndex
CREATE INDEX "ProductionReworkRequest_requestedFromStage_status_idx" ON "ProductionReworkRequest"("requestedFromStage", "status");

-- CreateIndex
CREATE INDEX "ProductionReworkRequest_status_createdAt_idx" ON "ProductionReworkRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "ProductionReworkRequest" ADD CONSTRAINT "ProductionReworkRequest_finalOrderId_fkey" FOREIGN KEY ("finalOrderId") REFERENCES "FinalOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionReworkRequest" ADD CONSTRAINT "ProductionReworkRequest_productionPipelineId_fkey" FOREIGN KEY ("productionPipelineId") REFERENCES "ProductionPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
