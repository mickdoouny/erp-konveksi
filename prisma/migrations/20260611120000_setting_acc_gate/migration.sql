-- AlterEnum
ALTER TYPE "ProductionStatus" ADD VALUE 'MENUNGGU_ACC_SETTING';

-- AlterTable
ALTER TABLE "ProductionPipeline" ADD COLUMN "settingResultFiles" TEXT;
ALTER TABLE "ProductionPipeline" ADD COLUMN "settingSubmittedAt" TIMESTAMP(3);
ALTER TABLE "ProductionPipeline" ADD COLUMN "settingSubmittedBy" TEXT;
ALTER TABLE "ProductionPipeline" ADD COLUMN "settingAccAt" TIMESTAMP(3);
ALTER TABLE "ProductionPipeline" ADD COLUMN "settingAccBy" TEXT;
ALTER TABLE "ProductionPipeline" ADD COLUMN "settingAccNote" TEXT;
ALTER TABLE "ProductionPipeline" ADD COLUMN "settingRejectNote" TEXT;
