-- AlterTable
ALTER TABLE "DesignQueueItem" ADD COLUMN     "perluKancing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "perluProving" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "FinalOrder" ADD COLUMN     "needsProving" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProductionPipeline" ADD COLUMN     "needsProving" BOOLEAN NOT NULL DEFAULT false;
