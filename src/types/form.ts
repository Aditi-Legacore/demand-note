export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'multiple_choice' | 'multi_select' | 'dropdown' | 'section_break' | 'file' | 'date' | 'yes_no' | 'contact_prefix' | 'contact_firstname' | 'contact_lastname' | 'contact_email' | 'contact_dob' | 'contact_company' | 'contact_phone' | 'contact_address';
  label: string;
  required: boolean;
  options?: string[]; // For multiple choice, multi-select, dropdown
  placeholder?: string;
}

export interface ContactData {
  prefix: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  dateOfBirth?: string;
  company?: string;
  phoneNumber?: string;
  streetAddress?: string;
  city?: string;
  stateProvince?: string;
  zipPostalCode?: string;
}

export interface ContactField {
  id: string;
  name: string;
  isOpen: boolean;
  fields: {
    dateOfBirth: boolean;
    company: boolean;
    phone: boolean;
    address: boolean;
  };
}

export interface FormTemplate {
  id: string;
  title: string;
  language: string;
  fields: {
    fields: FormField[];
    contacts?: ContactData[];
    contactFields?: ContactField[];
  };
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  id: string;
}

export interface FormSubmission {
  id: string;
  templateId: string;
  userId?: string;
  matterId?: string;
  status: 'Pending' | 'Submitted' | 'Draft';
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  template: FormTemplate;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  matter?: {
    id: string;
    title: string;
    description?: string;
    status: string;
  };
}

export interface Matter {
  id: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntakeFormData {
  userId?: string;
  referenceId?: string;
  clientName: string;
  gender?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  zip?: string;
  dateOfBirth?: string;
  ssn?: string;
  accidentDate?: string;
  accidentTime?: string;
  accidentLocation?: string;
  accidentDescription?: string;
  passenger?: string;
  passengerName?: string;
  passengerAge?: string;
  relationshipToYou?: string;
  injuryDescription?: string;
  hospitalized?: string;
  hospitalName?: string;
  treatmentDetails?: string;
  seatbeltUsed?: string;
  workAtAccident?: string;
  defendant1Name?: string;
  defendant1Address?: string;
  defendant1Carrier?: string;
  defendant1CarrierPhone?: string;
  defendant1Year?: string;
  defendant1Make?: string;
  defendant1Model?: string;
  defendant1Damage?: string;
  defendant2Name?: string;
  defendant2Address?: string;
  defendant2Carrier?: string;
  defendant2CarrierPhone?: string;
  defendant2Year?: string;
  defendant2Make?: string;
  defendant2Model?: string;
  defendant2Damage?: string;
  defendant3Name?: string;
  defendant3Address?: string;
  defendant3Carrier?: string;
  defendant3CarrierPhone?: string;
  defendant3Year?: string;
  defendant3Make?: string;
  defendant3Model?: string;
  defendant3Damage?: string;
  autoName?: string;
  autoPhone?: string;
  autoAddress?: string;
  autoAgent?: string;
  autoPolicy?: string;
  autoClaim?: string;
  autoAdditionalinfo?: string;
  healthCarrier?: string;
  healthPhone?: string;
  healthAddress?: string;
  healthAgent?: string;
  healthAdjuster?: string;
  healthPolicy?: string;
  healthClaim?: string;
  medicare?: string;
  medicareNumber?: string;
  medicaid?: string;
  medicaidNumber?: string;
  healthAdditionalinfo?: string;
  ambulance?: string;
  ambulanceCompany?: string;
  admitted?: string;
  lengthOfStay?: string;
  priorInjuries?: string;
  priorDoctorHospital?: string;
  priorHospitalAddressPhone?: string;
  priorTreatmentDetails?: string;
  priorTreatmentFrom?: string;
  priorTreatmentTo?: string;
  priorInsuranceClaims?: string;
  priorAttorneys?: string;
  priorDoctorHospital2?: string;
  priorHospitalAddressPhone2?: string;
  priorTreatmentDetails2?: string;
  priorTreatmentFrom2?: string;
  priorTreatmentTo2?: string;
  priorInsuranceClaims2?: string;
  priorAttorneys2?: string;
  priorDoctorHospital3?: string;
  priorHospitalAddressPhone3?: string;
  priorTreatmentDetails3?: string;
  priorTreatmentFrom3?: string;
  priorTreatmentTo3?: string;
  priorInsuranceClaims3?: string;
  priorAttorneys3?: string;
  currentTreatment?: string;
  currentDoctorHospital?: string;
  currentHospitalAddressPhone?: string;
  currentTreatmentDetails?: string;
  currentTreatmentFrom?: string;
  currentTreatmentTo?: string;
  currentDoctorHospital2?: string;
  currentHospitalAddressPhone2?: string;
  currentTreatmentDetails2?: string;
  currentTreatmentFrom2?: string;
  currentTreatmentTo2?: string;
  currentDoctorHospital3?: string;
  currentHospitalAddressPhone3?: string;
  currentTreatmentDetails3?: string;
  currentTreatmentFrom3?: string;
  currentTreatmentTo3?: string;
  bodyPartsAffected?: string;
  hearAboutUs?: string;
  hearAboutUsDetail?: string;
  LeadId?: string;
}
