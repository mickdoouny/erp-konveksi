-- CreateEnum
CREATE TYPE "OperatorDepartment" AS ENUM ('SALES', 'DESAINER', 'SETTING', 'LAYOUT', 'PREPARE', 'PRESS', 'JAHIT', 'FINISHING');

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" "OperatorDepartment" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Operator_department_isActive_name_idx" ON "Operator"("department", "isActive", "name");
