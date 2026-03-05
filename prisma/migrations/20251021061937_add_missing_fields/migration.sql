-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "IntakeInfo" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "clientName" TEXT NOT NULL,
    "gender" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "zip" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "ssn" TEXT,
    "accidentDate" TIMESTAMP(3),
    "accidentTime" TEXT,
    "accidentLocation" TEXT,
    "accidentDescription" TEXT,
    "passenger" TEXT,
    "passengerName" TEXT,
    "workAtAccident" TEXT,
    "defendant1Name" TEXT,
    "defendant1Address" TEXT,
    "defendant1Carrier" TEXT,
    "defendant1CarrierPhone" TEXT,
    "defendant1Year" TEXT,
    "defendant1Make" TEXT,
    "defendant1Model" TEXT,
    "defendant1Damage" TEXT,
    "defendant2Name" TEXT,
    "defendant2Address" TEXT,
    "defendant2Carrier" TEXT,
    "defendant2CarrierPhone" TEXT,
    "defendant2Year" TEXT,
    "defendant2Make" TEXT,
    "defendant2Model" TEXT,
    "defendant2Damage" TEXT,
    "autoName" TEXT,
    "autoPhone" TEXT,
    "autoAddress" TEXT,
    "autoAgent" TEXT,
    "autoPolicy" TEXT,
    "autoClaim" TEXT,
    "autoAdditionalinfo" TEXT,
    "healthCarrier" TEXT,
    "healthPhone" TEXT,
    "healthAddress" TEXT,
    "healthPolicy" TEXT,
    "healthClaim" TEXT,
    "healthAdjuster" TEXT,
    "healthAgent" TEXT,
    "healthAdditionalinfo" TEXT,
    "medicare" TEXT,
    "medicareNumber" TEXT,
    "medicaid" TEXT,
    "medicaidNumber" TEXT,
    "ambulance" TEXT,
    "ambulanceCompany" TEXT,
    "admitted" TEXT,
    "lengthOfStay" TEXT,
    -- "doctorHospital1" TEXT,
    "address1" TEXT,
    "phone1" TEXT,
    "treatmentDate1" TIMESTAMP(3),
    "doctorHospital2" TEXT,
    "address2" TEXT,
    "phone2" TEXT,
    "treatmentDate2" TIMESTAMP(3),
    "bodyPartsAffected" TEXT,
    "priorInjuries" TEXT,
    "priorDoctorHospital" TEXT,
    "priorHospitalAddressPhone" TEXT,
    "priorTreatmentDetails" TEXT,
    "priorTreatmentFrom" TIMESTAMP(3),
    "priorTreatmentTo" TIMESTAMP(3),
    "priorInsuranceClaims" TEXT,
    "priorAttorneys" TEXT,
    "currentTreatment" TEXT,
    "currentDoctorHospital" TEXT,
    "currentHospitalAddressPhone" TEXT,
    "currentTreatmentDetails" TEXT,
    "currentTreatmentFrom" TIMESTAMP(3),
    "currentTreatmentTo" TIMESTAMP(3),
    "hearAboutUs" TEXT,
    "hearAboutUsDetail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeInfo" ADD CONSTRAINT "IntakeInfo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
