/*
  Warnings:

  - Added the required column `email` to the `IntakeSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "IntakeSession" ADD COLUMN     "caseType" TEXT,
ADD COLUMN     "email" TEXT NOT NULL;
