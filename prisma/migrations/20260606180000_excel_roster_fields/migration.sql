-- AlterTable
ALTER TABLE "FinalOrder" ADD COLUMN "hargaStelan" INTEGER,
ADD COLUMN "hargaAtasan" INTEGER,
ADD COLUMN "hargaBawahan" INTEGER;

-- AlterTable
ALTER TABLE "FinalOrderRosterLine" ADD COLUMN "jenisItem" TEXT,
ADD COLUMN "jenisKerah" TEXT,
ADD COLUMN "lengan" TEXT,
ADD COLUMN "bahan" TEXT,
ADD COLUMN "warna" TEXT,
ADD COLUMN "grup" TEXT;
