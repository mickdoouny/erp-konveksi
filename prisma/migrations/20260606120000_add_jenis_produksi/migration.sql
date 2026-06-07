-- Jenis produksi (Reguler / Express) dan prioritas antrian express.
CREATE TYPE "JenisProduksi" AS ENUM ('REGULER', 'EXPRESS');

ALTER TABLE "DesignQueueItem" ADD COLUMN "jenisProduksi" "JenisProduksi" NOT NULL DEFAULT 'REGULER';
ALTER TABLE "DesignQueueItem" ADD COLUMN "expressPriority" INTEGER;

ALTER TABLE "FinalOrder" ADD COLUMN "jenisProduksi" "JenisProduksi" NOT NULL DEFAULT 'REGULER';
ALTER TABLE "FinalOrder" ADD COLUMN "expressPriority" INTEGER;

CREATE INDEX "DesignQueueItem_jenisProduksi_expressPriority_idx" ON "DesignQueueItem"("jenisProduksi", "expressPriority");
CREATE INDEX "FinalOrder_jenisProduksi_expressPriority_idx" ON "FinalOrder"("jenisProduksi", "expressPriority");
