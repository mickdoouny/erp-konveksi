-- AlterTable
ALTER TABLE "Operator" ADD COLUMN "username" TEXT;
ALTER TABLE "Operator" ADD COLUMN "passwordHash" TEXT;

-- Backfill legacy rows (if any) so NOT NULL can be applied safely.
UPDATE "Operator"
SET
  "username" = 'legacy_' || LEFT("id", 8),
  "passwordHash" = 'legacy:0000000000000000000000000000000000000000000000000000000000000000'
WHERE "username" IS NULL;

ALTER TABLE "Operator" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "Operator" ALTER COLUMN "passwordHash" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Operator_username_key" ON "Operator"("username");
