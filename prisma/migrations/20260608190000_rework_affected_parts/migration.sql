-- AlterTable
ALTER TABLE "ProductionReworkRequest" ADD COLUMN "affectedParts" JSONB NOT NULL DEFAULT '[]';
