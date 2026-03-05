import { IntakeInfo } from "@prisma/client";

export interface Lead {
  id: string;
  dueDate: string;
  name: string;
  caseType: string;
  status: "new" | "form_sent" | "in_progress" | "completed";
  contact: string;
  phone: string;
  email: string;
  matter: string;
  description?: string;
  referralSource?: string;
  referenceId?: string;
  dateOfBirth?: string;
  createdAt?: string;
  updatedAt?: string;
  intakeInfo?: IntakeInfo | null;
}
