/*
  Warnings:

  - You are about to drop the column `intakeSessionId` on the `IntakeInfo` table. All the data in the column will be lost.
  - You are about to drop the `IntakeSession` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[referenceId]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."IntakeInfo" DROP CONSTRAINT "IntakeInfo_intakeSessionId_fkey";

-- DropIndex
DROP INDEX "public"."IntakeInfo_intakeSessionId_key";

-- AlterTable
ALTER TABLE "IntakeInfo" DROP COLUMN "intakeSessionId";

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "referenceId" TEXT;

-- DropTable
DROP TABLE "public"."IntakeSession";

-- CreateIndex
CREATE UNIQUE INDEX "Lead_referenceId_key" ON "Lead"("referenceId");
