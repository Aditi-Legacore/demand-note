/*
  Warnings:

  - A unique constraint covering the columns `[uniqueUserId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "IntakeInfo"
ADD COLUMN     "currentDoctorHospital2" TEXT,
ADD COLUMN     "currentDoctorHospital3" TEXT,
ADD COLUMN     "currentHospitalAddressPhone2" TEXT,
ADD COLUMN     "currentHospitalAddressPhone3" TEXT,
ADD COLUMN     "currentTreatmentDetails2" TEXT,
ADD COLUMN     "currentTreatmentDetails3" TEXT,
ADD COLUMN     "currentTreatmentFrom2" TIMESTAMP(3),
ADD COLUMN     "currentTreatmentFrom3" TIMESTAMP(3),
ADD COLUMN     "currentTreatmentTo2" TIMESTAMP(3),
ADD COLUMN     "currentTreatmentTo3" TIMESTAMP(3),
ADD COLUMN     "defendant3Address" TEXT,
ADD COLUMN     "defendant3Carrier" TEXT,
ADD COLUMN     "defendant3CarrierPhone" TEXT,
ADD COLUMN     "defendant3Damage" TEXT,
ADD COLUMN     "defendant3Make" TEXT,
ADD COLUMN     "defendant3Model" TEXT,
ADD COLUMN     "defendant3Name" TEXT,
ADD COLUMN     "defendant3Year" TEXT,
ADD COLUMN     "hospitalName" TEXT,
ADD COLUMN     "hospitalized" TEXT,
ADD COLUMN     "injuryDescription" TEXT,
ADD COLUMN     "passengerAge" TEXT,
ADD COLUMN     "priorAttorneys2" TEXT,
ADD COLUMN     "priorAttorneys3" TEXT,
ADD COLUMN     "priorDoctorHospital2" TEXT,
ADD COLUMN     "priorDoctorHospital3" TEXT,
ADD COLUMN     "priorHospitalAddressPhone2" TEXT,
ADD COLUMN     "priorHospitalAddressPhone3" TEXT,
ADD COLUMN     "priorInsuranceClaims2" TEXT,
ADD COLUMN     "priorInsuranceClaims3" TEXT,
ADD COLUMN     "priorTreatmentDetails2" TEXT,
ADD COLUMN     "priorTreatmentDetails3" TEXT,
ADD COLUMN     "priorTreatmentFrom2" TIMESTAMP(3),
ADD COLUMN     "priorTreatmentFrom3" TIMESTAMP(3),
ADD COLUMN     "priorTreatmentTo2" TIMESTAMP(3),
ADD COLUMN     "priorTreatmentTo3" TIMESTAMP(3),
ADD COLUMN     "relationshipToYou" TEXT,
ADD COLUMN     "seatbeltUsed" TEXT,
ADD COLUMN     "treatmentDetails" TEXT;

-- AlterTable
-- No changes needed, columns already exist

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "caseType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "contact" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "matter" TEXT NOT NULL DEFAULT '-',
    "description" TEXT,
    "referralSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);


