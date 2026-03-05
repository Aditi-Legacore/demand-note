// src/lib/intake/buildIntakeData.ts

// Helper to convert empty strings to null
export const toNullable = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value : null;

// Helper to safely create Date from unknown value
const toDate = (value: unknown): Date | null => {
  if (typeof value === "string" && value.trim() !== "") {
    return new Date(value);
  }
  return null;
};

// Main function to prepare intake data
export const buildIntakeData = (data: Record<string, unknown>) => ({
  ...(data.userId ? { user: { connect: { id: data.userId as string } } } : {}),
  ...(data.referenceId ? { referenceId: data.referenceId as string } : {}),

  clientName: data.clientName,
  gender: toNullable(data.gender),
  phoneNumber: toNullable(data.phoneNumber),
  email: toNullable(data.email),
  address: toNullable(data.address),
  city: toNullable(data.city),
  zip: toNullable(data.zip),
  dateOfBirth: toDate(data.dateOfBirth),
  ssn: toNullable(data.ssn),

  // Accident
  accidentDate: toDate(data.accidentDate),
  accidentTime: toNullable(data.accidentTime),
  accidentLocation: toNullable(data.accidentLocation),
  accidentDescription: toNullable(data.accidentDescription),
  passenger: toNullable(data.passenger),
  passengerName: toNullable(data.passengerName),
  passengerAge: toNullable(data.passengerAge),
  relationshipToYou: toNullable(data.relationshipToYou),
  injuryDescription: toNullable(data.injuryDescription),
  hospitalized: toNullable(data.hospitalized),
  hospitalName: toNullable(data.hospitalName),
  treatmentDetails: toNullable(data.treatmentDetails),
  seatbeltUsed: toNullable(data.seatbeltUsed),
  workAtAccident: toNullable(data.workAtAccident),

  // Defendant 1 + 2 + 3
  defendant1Name: toNullable(data.defendant1Name),
  defendant1Address: toNullable(data.defendant1Address),
  defendant1Carrier: toNullable(data.defendant1Carrier),
  defendant1CarrierPhone: toNullable(data.defendant1CarrierPhone),
  defendant1Year: toNullable(data.defendant1Year),
  defendant1Make: toNullable(data.defendant1Make),
  defendant1Model: toNullable(data.defendant1Model),
  defendant1Damage: toNullable(data.defendant1Damage),

  defendant2Name: toNullable(data.defendant2Name),
  defendant2Address: toNullable(data.defendant2Address),
  defendant2Carrier: toNullable(data.defendant2Carrier),
  defendant2CarrierPhone: toNullable(data.defendant2CarrierPhone),
  defendant2Year: toNullable(data.defendant2Year),
  defendant2Make: toNullable(data.defendant2Make),
  defendant2Model: toNullable(data.defendant2Model),
  defendant2Damage: toNullable(data.defendant2Damage),

  defendant3Name: toNullable(data.defendant3Name),
  defendant3Address: toNullable(data.defendant3Address),
  defendant3Carrier: toNullable(data.defendant3Carrier),
  defendant3CarrierPhone: toNullable(data.defendant3CarrierPhone),
  defendant3Year: toNullable(data.defendant3Year),
  defendant3Make: toNullable(data.defendant3Make),
  defendant3Model: toNullable(data.defendant3Model),
  defendant3Damage: toNullable(data.defendant3Damage),

  // Auto
  autoName: toNullable(data.autoName),
  autoPhone: toNullable(data.autoPhone),
  autoAddress: toNullable(data.autoAddress),
  autoAgent: toNullable(data.autoAgent),
  autoPolicy: toNullable(data.autoPolicy),
  autoClaim: toNullable(data.autoClaim),
  autoAdditionalinfo: toNullable(data.autoAdditionalinfo),

  // Health
  healthCarrier: toNullable(data.healthCarrier),
  healthPhone: toNullable(data.healthPhone),
  healthAddress: toNullable(data.healthAddress),
  healthAgent: toNullable(data.healthAgent),
  healthAdjuster: toNullable(data.healthAdjuster),
  healthPolicy: toNullable(data.healthPolicy),
  healthClaim: toNullable(data.healthClaim),
  medicare: toNullable(data.medicare),
  medicareNumber: toNullable(data.medicareNumber),
  medicaid: toNullable(data.medicaid),
  medicaidNumber: toNullable(data.medicaidNumber),
  healthAdditionalinfo: toNullable(data.healthAdditionalinfo),

  // Prior injuries (all sets)
  priorInjuries: toNullable(data.priorInjuries),
  priorDoctorHospital: toNullable(data.priorDoctorHospital),
  priorHospitalAddressPhone: toNullable(data.priorHospitalAddressPhone),
  priorTreatmentDetails: toNullable(data.priorTreatmentDetails),
  priorTreatmentFrom: toDate(data.priorTreatmentFrom),
  priorTreatmentTo: toDate(data.priorTreatmentTo),
  priorInsuranceClaims: toNullable(data.priorInsuranceClaims),
  priorAttorneys: toNullable(data.priorAttorneys),

  // Set 2
  priorDoctorHospital2: toNullable(data.priorDoctorHospital2),
  priorHospitalAddressPhone2: toNullable(data.priorHospitalAddressPhone2),
  priorTreatmentDetails2: toNullable(data.priorTreatmentDetails2),
  priorTreatmentFrom2: toDate(data.priorTreatmentFrom2),
  priorTreatmentTo2: toDate(data.priorTreatmentTo2),
  priorInsuranceClaims2: toNullable(data.priorInsuranceClaims2),
  priorAttorneys2: toNullable(data.priorAttorneys2),

  // Set 3
  priorDoctorHospital3: toNullable(data.priorDoctorHospital3),
  priorHospitalAddressPhone3: toNullable(data.priorHospitalAddressPhone3),
  priorTreatmentDetails3: toNullable(data.priorTreatmentDetails3),
  priorTreatmentFrom3: toDate(data.priorTreatmentFrom3),
  priorTreatmentTo3: toDate(data.priorTreatmentTo3),
  priorInsuranceClaims3: toNullable(data.priorInsuranceClaims3),
  priorAttorneys3: toNullable(data.priorAttorneys3),

  // Current injuries (all sets)
  currentTreatment: toNullable(data.currentTreatment),
  currentDoctorHospital: toNullable(data.currentDoctorHospital),
  currentHospitalAddressPhone: toNullable(data.currentHospitalAddressPhone),
  currentTreatmentDetails: toNullable(data.currentTreatmentDetails),
  currentTreatmentFrom: toDate(data.currentTreatmentFrom),
  currentTreatmentTo: toDate(data.currentTreatmentTo),

  // Set 2
  currentDoctorHospital2: toNullable(data.currentDoctorHospital2),
  currentHospitalAddressPhone2: toNullable(data.currentHospitalAddressPhone2),
  currentTreatmentDetails2: toNullable(data.currentTreatmentDetails2),
  currentTreatmentFrom2: toDate(data.currentTreatmentFrom2),
  currentTreatmentTo2: toDate(data.currentTreatmentTo2),

  // Set 3
  currentDoctorHospital3: toNullable(data.currentDoctorHospital3),
  currentHospitalAddressPhone3: toNullable(data.currentHospitalAddressPhone3),
  currentTreatmentDetails3: toNullable(data.currentTreatmentDetails3),
  currentTreatmentFrom3: toDate(data.currentTreatmentFrom3),
  currentTreatmentTo3: toDate(data.currentTreatmentTo3),

  bodyPartsAffected: toNullable(data.bodyPartsAffected),

  // Referral
  hearAboutUs: toNullable(data.hearAboutUs),
  hearAboutUsDetail: toNullable(data.hearAboutUsDetail),

  isDraft: false,

  ...(data.LeadId ? { Lead: { connect: { id: data.LeadId as string } } } : {}),
});
