-- CreateTable
CREATE TABLE "JahitPaymentRecord" (
    "id" TEXT NOT NULL,
    "productionPipelineId" TEXT NOT NULL,
    "finalOrderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "operatorId" TEXT,
    "operatorName" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JahitPaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JahitPaymentRecord_completedAt_idx" ON "JahitPaymentRecord"("completedAt");

-- CreateIndex
CREATE INDEX "JahitPaymentRecord_finalOrderId_idx" ON "JahitPaymentRecord"("finalOrderId");

-- CreateIndex
CREATE INDEX "JahitPaymentRecord_productionPipelineId_idx" ON "JahitPaymentRecord"("productionPipelineId");

-- AddForeignKey
ALTER TABLE "JahitPaymentRecord" ADD CONSTRAINT "JahitPaymentRecord_finalOrderId_fkey" FOREIGN KEY ("finalOrderId") REFERENCES "FinalOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JahitPaymentRecord" ADD CONSTRAINT "JahitPaymentRecord_productionPipelineId_fkey" FOREIGN KEY ("productionPipelineId") REFERENCES "ProductionPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
