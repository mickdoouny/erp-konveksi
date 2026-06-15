-- AlterTable
ALTER TABLE "ProductionPipeline" ADD COLUMN "settingSentToConsumerAt" TIMESTAMP(3);
ALTER TABLE "ProductionPipeline" ADD COLUMN "settingSentToConsumerBy" TEXT;
ALTER TABLE "ProductionPipeline" ADD COLUMN "settingSubmitCount" INTEGER NOT NULL DEFAULT 0;
