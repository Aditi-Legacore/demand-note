import { z } from "zod";

export const intakeFormSchema = z.object({
  // Step 1 - Plaintiff Info
  clientName: z.string().min(1, "Client name is required"),
  gender: z.enum(["Male", "Female"]).refine((val) => val !== undefined, { message: "Gender is required" }),
  dob: z.string().nullish(),
  phone: z.string().min(10, "Enter a valid phone number"),
  email: z.string().email("Invalid email address"),
  address: z.string().nullish(),
  city: z.string().nullish(),
  zip: z.string().nullish(),
  ssn: z.string().nullish(),

  // Step 2 - Accident Info
  accidentDate: z.string().min(1, "Accident date required"),
  accidentTime: z.string().nullish(),
  accidentLocation: z.string().min(1, "Accident location required"),
  accidentDescription: z.string().min(10, "Description required"),

  passenger: z.enum(["Yes", "No"]).nullish(),
  passengerName: z.string().nullish(),
  passengerAge: z.string().nullish(),
  relationshipToYou: z.string().nullish(),
  injuryDescription: z.string().nullish(),
  hospitalized: z.string().nullish(),
  hospitalName: z.string().nullish(),
  treatmentDetails: z.string().nullish(),
  seatbeltUsed: z.string().nullish(),

  workAtAccident: z.string().nullish(),

  // Step 3 - Defendant Information (optional)
  defendant1Name: z.string().nullish(),
  defendant1Address: z.string().nullish(),
  defendant1Carrier: z.string().nullish(),
  defendant1CarrierPhone: z.string().nullish(),
  // defendant1Policy: z.string().nullish(),
  defendant1Year: z.string().nullish(),
  defendant1Make: z.string().nullish(),
  defendant1Model: z.string().nullish(),
  defendant1Damage: z.string().nullish(),
  defendant2Name: z.string().nullish(),
  defendant2Address: z.string().nullish(),
  defendant2Carrier: z.string().nullish(),
  defendant2CarrierPhone: z.string().nullish(),
  defendant2Policy: z.string().nullish(),
  defendant2Year: z.string().nullish(),
  defendant2Make: z.string().nullish(),
  defendant2Model: z.string().nullish(),
  defendant2Damage: z.string().nullish(),

  // Step 4 - Client Automobile & Health Insurance
  autoName: z.string().nullish(),
  autoPhone: z.string().nullish(),
  autoAddress: z.string().nullish(),
  autoAgent: z.string().nullish(),
  autoPolicy: z.string().nullish(),
  autoClaim: z.string().nullish(),
  autoAdditionalinfo: z.string().nullish(),

  healthCarrier: z.string().nullish(),
  healthPhone: z.string().nullish(),
  healthAddress: z.string().nullish(),
  healthAgent: z.string().nullish(),
  healthPolicy: z.string().nullish(),
  healthClaim: z.string().nullish(),
  healthAdjuster: z.string().nullish(),
  medicare: z.enum(["Yes", "No"]).nullish(),
  medicareNumber: z.string().nullish(),
  medicaid: z.enum(["Yes", "No"]).nullish(),
  medicaidNumber: z.string().nullish(),
  healthAdditionalinfo: z.string().nullish(),

  // Step 5 - Medical Treatment
  ambulance: z.enum(["Yes", "No"]).nullish(),
  admitted: z.enum(["Yes", "No"]).nullish(),
  ambulanceCompany: z.string().nullish(),
  lengthOfStay: z.string().nullish(),

  priorInjuries: z.enum(["Yes", "No"]).nullish(),
  priorDoctorHospital: z.string().nullish(),
  priorHospitalAddressPhone: z.string().nullish(),
  priorTreatmentDetails: z.string().nullish(),
  priorTreatmentFrom: z.string().nullish(),
  priorTreatmentTo: z.string().nullish(),
  priorInsuranceClaims: z.string().nullish(),
  priorAttorneys: z.string().nullish(),

  priorDoctorHospital2: z.string().nullish(),
  priorHospitalAddressPhone2: z.string().nullish(),
  priorTreatmentDetails2: z.string().nullish(),
  priorTreatmentFrom2: z.string().nullish(),
  priorTreatmentTo2: z.string().nullish(),
  priorInsuranceClaims2: z.string().nullish(),
  priorAttorneys2: z.string().nullish(),

  priorDoctorHospital3: z.string().nullish(),
  priorHospitalAddressPhone3: z.string().nullish(),
  priorTreatmentDetails3: z.string().nullish(),
  priorTreatmentFrom3: z.string().nullish(),
  priorTreatmentTo3: z.string().nullish(),
  priorInsuranceClaims3: z.string().nullish(),
  priorAttorneys3: z.string().nullish(),

  currentTreatment: z.enum(["Yes", "No"]).nullish(),

  currentDoctorHospital: z.string().nullish(),
  currentHospitalAddressPhone: z.string().nullish(),
  currentTreatmentDetails: z.string().nullish(),
  currentTreatmentFrom: z.string().nullish(),
  currentTreatmentTo: z.string().nullish(),

  currentDoctorHospital2: z.string().nullish(),
  currentHospitalAddressPhone2: z.string().nullish(),
  currentTreatmentDetails2: z.string().nullish(),
  currentTreatmentFrom2: z.string().nullish(),
  currentTreatmentTo2: z.string().nullish(),

  currentDoctorHospital3: z.string().nullish(),
  currentHospitalAddressPhone3: z.string().nullish(),
  currentTreatmentDetails3: z.string().nullish(),
  currentTreatmentFrom3: z.string().nullish(),
  currentTreatmentTo3: z.string().nullish(),

  // Step 6 - Submit
  hearAboutUs: z.string().nullish(),
  hearAboutUsDetail: z.string().nullish(),
});

export type IntakeFormData = z.infer<typeof intakeFormSchema>;

