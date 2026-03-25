/*
  Warnings:

  - A unique constraint covering the columns `[intakeSessionId]` on the table `IntakeInfo` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "IntakeInfo" ADD COLUMN     "intakeSessionId" TEXT;

-- CreateTable
CREATE TABLE "IntakeSession" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntakeSession_referenceId_key" ON "IntakeSession"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeInfo_intakeSessionId_key" ON "IntakeInfo"("intakeSessionId");

-- AddForeignKey
ALTER TABLE "IntakeInfo" ADD CONSTRAINT "IntakeInfo_intakeSessionId_fkey" FOREIGN KEY ("intakeSessionId") REFERENCES "IntakeSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
