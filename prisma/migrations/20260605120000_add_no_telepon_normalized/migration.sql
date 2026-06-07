-- Add normalized phone key for konsumen matching across formatting variants.
ALTER TABLE "DesignQueueItem" ADD COLUMN "noTeleponNormalized" TEXT;

CREATE INDEX "DesignQueueItem_noTeleponNormalized_idx" ON "DesignQueueItem"("noTeleponNormalized");

-- Backfill from existing noTelepon (strip non-digits, 0→62, 8→62).
UPDATE "DesignQueueItem" AS d
SET "noTeleponNormalized" = normalized.value
FROM (
  SELECT
    id,
    CASE
      WHEN digits ~ '^0[89][0-9]{7,11}$' THEN '62' || SUBSTRING(digits FROM 2)
      WHEN digits ~ '^62[89][0-9]{7,11}$' THEN digits
      WHEN digits ~ '^8[0-9]{8,11}$' THEN '62' || digits
      ELSE NULL
    END AS value
  FROM (
    SELECT
      id,
      REGEXP_REPLACE(TRIM("noTelepon"), '[^0-9]', '', 'g') AS digits
    FROM "DesignQueueItem"
    WHERE "noTelepon" IS NOT NULL AND TRIM("noTelepon") <> ''
  ) AS stripped
) AS normalized
WHERE d.id = normalized.id
  AND normalized.value IS NOT NULL;
