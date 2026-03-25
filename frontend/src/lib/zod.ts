import { z } from "zod";

export const signupSchema = z.object({
  salutation: z.string(),
  firstName: z.string().min(2, "Name too short"),
  lastName: z.string(),
  email: z.string().email(),
  password: z.string().min(6, "Password must be 6+ chars"),
  dob:z.string(),
  caseType:z.string(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password required"),
});
