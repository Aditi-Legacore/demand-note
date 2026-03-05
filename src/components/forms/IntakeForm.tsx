"use client";

import { useRef, useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { IntakeFormData, intakeFormSchema } from "../../lib/formValidationSchemas";
import PlaintiffInfoStep from "./formSteps/PlaintiffInfoStep";
import AccidentInfoStep from "./formSteps/AccidentInfoStep";
import DefendantInfoStep from "./formSteps/DefendantInfoStep";
import ClientInsuranceStep from "./formSteps/ClientInsuranceStep";
import MedicalTreatmentStep from "./formSteps/MedicalTreatmentStep";
// import InjuriesStep from "./formSteps/InjuriesStep";
import SubmitStep from "./formSteps/SubmitStep";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

// Extend the session user type to include 'id'
import type { DefaultUser } from "next-auth";
import { toast } from "sonner";
import IntakeDocuments from "./intakeDocuments/intakeDocuments";
import SuccessPage from "./SuccessPage";
import { Lead } from "@/types/leads";

declare module "next-auth" {
  interface Session {
    user: DefaultUser & { id?: string | null };
  }
  interface User extends DefaultUser {
    id?: string | null;
  }
}

interface Payload {
  phoneNumber?: string;
  dateOfBirth?: string | null;
  userId?: string | null;
  referenceId?: string | null;
  [key: string]: unknown; // for any extra keys from ...data
}

const steps = [
  "PLAINTIFF INFORMATION",
  "ACCIDENT INFORMATION",
  "DEFENDANT INFORMATION",
  "CLIENT INSURANCE INFORMATION",
  "MEDICAL TREATMENT",
  "Submit",
  "DOCUMENT UPLOAD",
  "SUCCESS",
];

// Mapping for human-readable field names
const fieldDisplayNames: Record<string, string> = {
  clientName: "Client Name",
  email: "Email",
  gender: "Gender",
  phone: "Phone",
  accidentDate: "Accident Date",
  accidentLocation: "Accident Location",
  accidentDescription: "Accident Description",
  defendant1Name: "Defendant Name",
};

// List of required fields based on the schema
const requiredFields = ["clientName", "email", "gender", "phone", "accidentDate", "accidentLocation", "accidentDescription", "defendant1Name"];

// 👇 Define the fields to validate at each step
const stepFields: (keyof IntakeFormData)[][] = [
  ["clientName", "email", "gender", "phone"], // Step 1
  ["accidentDate", "accidentLocation", "accidentDescription"], // Step 2
  ["defendant1Name"], // Step 3
  [], // Step 4 (Client Insurance - no required fields)
  [], // Step 5 (Medical Treatment - no required fields)
  [], // Step 6 (Submit)
  [], // Step 7 (Document Upload - no required fields)
  [], // Step 8 (Success - no required fields)
];

interface IntakeFormWizardProps {
  onFormSubmit?: (data: IntakeFormData) => void;
  isEmbedded?: boolean;
}


export default function IntakeFormWizard({ isEmbedded = false }: IntakeFormWizardProps) {
  const searchParams = useSearchParams();
  const [referenceId, setReferenceId] = useState<string | null>(null);
  // const [draft, setDraft] = useState<any>(null);
  // const [leadData, setLeadData] = useState<any>(null);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
const [leadData, setLeadData] = useState<Lead | null>(null);

  // Use the prop if provided, otherwise check if we're in embedded context
  const isEmbeddedCheck = isEmbedded || (typeof window !== 'undefined' && window.self !== window.top);

  const intakeId = searchParams.get("id");  // 👈 get ID from URL
  const [isLoadingExistingData, setIsLoadingExistingData] = useState(false);
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const [ setFormData] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedIntakeId, setSubmittedIntakeId] = useState<string | null>(null);

  // Set referenceId and submittedIntakeId on mount
  useEffect(() => {
    const refFromUrl = searchParams.get("ref");
    const refFromStorage = localStorage.getItem("referenceId");
    const ref = refFromUrl || refFromStorage;
    setReferenceId(ref || null);
    if (ref) {
      const savedIntakeId = localStorage.getItem(`submittedIntakeId_${ref}`); 
      setSubmittedIntakeId(savedIntakeId || null);
    }
  }, [searchParams]);

  // Set step based on referenceId and submission status
  useEffect(() => {
    if (referenceId) {
  // Use embed API if embedded, otherwise regular API
      const apiBase = isEmbeddedCheck ? '/api/embed' : '/api/intake';
      // Check if intake is already submitted
      fetch(`${apiBase}/reference/${referenceId}`)
        .then((res) => {
          if (res.ok) {
            return res.json();
          } else {
            return null;
          }
        })
        .then((intake) => {
          if (intake && !intake.isDraft) {
            // Intake is submitted, go to document upload step
            setStep(6);
          } else {
            // Not submitted, go to saved step or 0
            const savedStep = localStorage.getItem(`intakeFormStep_${referenceId}`);
            setStep(savedStep ? parseInt(savedStep, 10) : 0);
          }
        })
        .catch(() => {
          // On error, default to saved step or 0
          const savedStep = localStorage.getItem(`intakeFormStep_${referenceId}`);
          setStep(savedStep ? parseInt(savedStep, 10) : 0);
        });
    }
  }, [referenceId, isEmbeddedCheck]);

  // Persist step in localStorage
  useEffect(() => {
    if (referenceId) {
      localStorage.setItem(`intakeFormStep_${referenceId}`, step.toString());
    }
  }, [step, referenceId]);

  const methods = useForm<IntakeFormData>({
    resolver: zodResolver(intakeFormSchema),
    mode: "onSubmit",
  });
  const { data: session } = useSession();

  // Prefill draft if exists
  useEffect(() => {
    const draftData = localStorage.getItem("draftData");
    if (draftData) {
      const parsedDraft = JSON.parse(draftData);

      // Safely parse values that may be unknown coming from the draft object.
      const parseDateString = (d: unknown) => {
        if (!d) return '';
        if (typeof d === 'string' || typeof d === 'number' || d instanceof Date) {
          const date = new Date(d);
          if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
        }
        return '';
      };

      const getString = (v: unknown) => (typeof v === 'string' ? v : '');

      const mappedData = {
        ...parsedDraft,
        phone: getString((parsedDraft as Record<string, unknown>).phoneNumber) || getString((parsedDraft as Record<string, unknown>).phone),
        dob: parseDateString((parsedDraft as Record<string, unknown>).dateOfBirth ?? (parsedDraft as Record<string, unknown>).dob),
        phoneNumber: getString((parsedDraft as Record<string, unknown>).phoneNumber),
        dateOfBirth: parseDateString((parsedDraft as Record<string, unknown>).dateOfBirth ?? (parsedDraft as Record<string, unknown>).dob),
      };

      (Object.keys(mappedData) as Array<keyof typeof mappedData>).forEach((key) => {
        const value = mappedData[key];
        if (value !== null && value !== undefined) {
          methods.setValue(key as keyof IntakeFormData, value);
        }
      });
    }
  }, [methods]);

const handleSaveDraft = async () => {
    try {
      if (!referenceId) {
        toast.error("No reference ID found. Please start a new session.");
        return;
      }

      const currentFormData = methods.getValues();

      // Use embed API if embedded, otherwise regular API
      const apiUrl = isEmbedded ? "/api/embed/draft" : "/api/intake/draft";

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId, ...currentFormData }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Failed to save draft: ${res.status} ${res.statusText}`, errorText);
        throw new Error(`Failed to save draft: ${res.statusText}`);
      }
       toast.success("Draft saved successfully!");
      const savedData = await res.json(); 
      console.log("savedData", savedData);

      // Log activity for saving draft
      try {
        const activityApiUrl = isEmbeddedCheck ? '/api/embed/activity-log' : '/api/activity-log';
        await fetch(activityApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refId: savedData.id,
            activityType: 'save_draft',
            shortDescription: 'Draft Saved',
            longDescription: 'saved intake as draft',
          }),
        });
      } catch (error) {
        console.error('Failed to log draft save activity:', error);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving draft.");
    }
  };

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSubmitted && referenceId) {
      // If embedded → use existing full logic
      if (isEmbedded) {
        const apiBase = "/api/embed";
  
        // First check submitted intake
        fetch(`${apiBase}/reference/${referenceId}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((intake) => {
            if (intake && !intake.isDraft) {
              return; // already submitted → stop here
            }
  
            // No submitted intake → check for draft
            fetch(`${apiBase}/draft?referenceId=${referenceId}`)
              .then((res) => (res.ok ? res.json() : null))
              .then((data) => {
                if (data?.draft) {
                  setDraft(data.draft);
                } else {
                  // No draft → load lead data
                  fetch(`${apiBase}/leads?referenceId=${referenceId}`)
                    .then((res) => (res.ok ? res.json() : null))
                    .then((leadData) => {
                      if (leadData) setLeadData(leadData);
                    })
                    .catch(() => {});
                }
              })
              .catch(() => {});
          })
          .catch(() => {});
  
        return; // STOP — do not continue to non-embed logic
      }
  
      // NOT EMBEDDED → simplified logic (NO reference check)
      fetch(`/api/intake/draft?referenceId=${referenceId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.draft) {
            setDraft(data.draft);
          } else {
            // No draft → fetch lead
            fetch(`/api/leads?referenceId=${referenceId}`)
              .then((res) => (res.ok ? res.json() : null))
              .then((leadData) => {
                if (leadData) setLeadData(leadData);
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [referenceId, isSubmitted, isEmbedded]);
  
  
  // Populate form with draft data when draft is loaded
  useEffect(() => {
    if (draft) {
      // Safely parse values that may be unknown coming from the draft object.
      const parseDateString = (d: unknown) => {
        if (!d) return '';
        if (typeof d === 'string' || typeof d === 'number' || d instanceof Date) {
          const date = new Date(d);
          if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
        }
        return '';
      };

      const getString = (v: unknown) => (typeof v === 'string' ? v : '');

      const mappedData = {
        ...draft,
        phone: getString((draft as Record<string, unknown>).phoneNumber) || getString((draft as Record<string, unknown>).phone),
        dob: parseDateString((draft as Record<string, unknown>).dateOfBirth ?? (draft as Record<string, unknown>).dob),
        phoneNumber: getString((draft as Record<string, unknown>).phoneNumber),
        dateOfBirth: parseDateString((draft as Record<string, unknown>).dateOfBirth ?? (draft as Record<string, unknown>).dob),
      };

      (Object.keys(mappedData) as Array<keyof typeof mappedData>).forEach((key) => {
        const value = mappedData[key];
        if (value !== null && value !== undefined) {
          methods.setValue(key as keyof IntakeFormData, value);
        }
      });
    }
  }, [draft, methods]);

  // Populate form with lead data when lead data is loaded
  useEffect(() => {
    if (leadData && !draft) {
      const mappedData = {
        clientName: leadData.name || '',
        phone: leadData.phone || '',
        email: leadData.email || '',
        accidentDate: leadData.dueDate ? new Date(leadData.dueDate).toISOString().split('T')[0] : '',
        caseType: leadData.caseType || '',
        accidentDescription: leadData.description || '',
        referralSource: leadData.referralSource || '',
        dob: leadData.dateOfBirth ? new Date(leadData.dateOfBirth).toISOString().split('T')[0] : '',
        // Clear address fields since QuickIntakeForm doesn't provide them
        address: '',
        city: '',
        zip: '',
      };

      (Object.keys(mappedData) as (keyof typeof mappedData)[]).forEach((key) => {
        const value = mappedData[key];
        if (value !== null && value !== undefined) {
          methods.setValue(key as keyof IntakeFormData, value);
        }
      });
    }
  }, [leadData, draft, methods]);

  
useEffect(() => {
  // Only set from session if no referenceId (not from lead) and no intakeId (not editing existing)
  if (session?.user && !referenceId && !intakeId) {
    methods.setValue("clientName", session.user.name || "");
    methods.setValue("email", session.user.email || "");  
  }
  if (containerRef.current) {
    containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  if (intakeId && typeof window !== 'undefined' && window.self === window.top) {
    const fetchIntake = async () => {
      try {
        setIsLoadingExistingData(true);
        const res = await fetch(`/api/intake/${intakeId}`);
        if (!res.ok) throw new Error("Failed to fetch intake data");
        const data = await res.json();

        // Map database fields back to form fields
        const mappedData = {
          ...data,
          phone: data.phoneNumber || '',
          dob: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '',
          phoneNumber: data.phoneNumber || '',
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '',
        };

        (Object.keys(mappedData) as (keyof typeof mappedData)[]).forEach((key) => {
          const value = mappedData[key];
          if (value !== null && value !== undefined) {
            methods.setValue(key as keyof IntakeFormData, value);
          }
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingExistingData(false);
      }
    };
    fetchIntake();
  }
}, [session, intakeId, methods, referenceId]);

  



  // ✅ Scroll to top whenever step changes
  // 👇 Add this effect for scrolling on step change
useEffect(() => {
  if (containerRef.current) {
    containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}, [step]);



  // new code for update field added to fetch data from database

  const onSubmit = async (data: IntakeFormData) => {
  // console.log("🚀 Form submission attempted with data:", data);
  // console.log("Session user ID:", session?.user?.id);
  setIsSubmitting(true);

  try {
    const method = intakeId ? "PUT" : "POST";
    // Use embed API if embedded, otherwise regular API
    const apiBase = isEmbedded ? '/api/embed/intake' : '/api/intake';
    const url = intakeId ? `${apiBase}/${intakeId}` : apiBase;

    // console.log(`📡 Sending ${method} request to ${url}`);

  

const payload: Payload = {
  ...data,
  phoneNumber: data.phone,
  dateOfBirth: data.dob ? new Date(data.dob).toISOString() : null,
  userId: session?.user?.id || null,
  referenceId: referenceId || null,
};

    delete payload.phone;
    delete payload.dob;

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // console.log("Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Server error:", errorText);
      throw new Error("Failed to save intake");
    }

    const savedData = await response.json();
    // console.log("✅ Intake form saved:", savedData);

    // ✅ Show success message
    toast.success(intakeId ? "✅ Intake updated successfully!" : "✅ Intake created successfully!");
    setIsSubmitted(true);
    setSubmittedIntakeId(savedData.id);

    // ✅ Save intake ID locally if referenceId exists
    if (referenceId) {
      localStorage.setItem(`submittedIntakeId_${referenceId}`, savedData.id);
    }

    // ✅ Log the activity
    try {
      const activityApiUrl = isEmbeddedCheck ? '/api/embed/activity-log' : '/api/activity-log';
      await fetch(activityApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refId: savedData.id,
          activityType: intakeId ? 'intake_update' : 'intake_submission',
          shortDescription: intakeId ? 'Intake Updated' : 'Intake Submitted',
          longDescription: intakeId ? 'successfully updated intake form' : 'successfully submitted intake form',
        }),
      });
    } catch (error) {
      console.error('Failed to log intake activity:', error);
    }

    // ✅ Notify parent window if in iframe
    if (typeof window !== 'undefined' && window.self !== window.top) {
      window.parent.postMessage('formSubmitted', '*');
    }

    // ✅ Auto-navigate to step 8 (Success)
    setStep(7);

    // Optionally redirect if needed later
    // router.push("/intake-list");
    // router.push("/forms");
  } catch (error) {
    console.error("❌ Error saving intake:", error);
    toast.error("⚠️ There was an error saving the form.");
  } finally {
    setIsSubmitting(false);
  }
};
  
  // ✅ Validate current step before moving to the next
  const nextStep = async () => {
    const fieldsToValidate = stepFields[step];

    if (fieldsToValidate.length > 0) {
      const isValid = await methods.trigger(fieldsToValidate);
      if (!isValid) {
        const errors = methods.formState.errors;
        const missingFields = fieldsToValidate
          .filter(field => errors[field])
          .map(field => fieldDisplayNames[field] || field)
          .join(", ");
        const errorMessage = `Please fill in the following required fields: ${missingFields}`;
        toast.error(errorMessage);
        return; // ❌ Stop if validation fails
      }
    }

    setStep((s) => s + 1);

  };


  // const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const renderStep = () => {
    switch (step) {
      case 0: return <PlaintiffInfoStep />;
      case 1: return <AccidentInfoStep />;
      case 2: return <DefendantInfoStep />;
      case 3: return <ClientInsuranceStep />;
      case 4: return <MedicalTreatmentStep />;
      case 5: return <SubmitStep isSubmitting={isSubmitting} />;
      case 6: return submittedIntakeId ? <IntakeDocuments submittedIntakeId={submittedIntakeId} isEmbedded={isEmbeddedCheck} /> : <div className="text-center">Loading document upload...</div>;
      case 7: return <SuccessPage
        title="Form Submitted Successfully!"
        message="Thank you for submitting your intake form. Your information has been received and will be reviewed shortly."
        isEmbedded={isEmbeddedCheck}
      />;
      default: return null;
    }
  };

  // 🌀 Show loader while data is loading
  if (isLoadingExistingData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }



  return (
    <FormProvider {...methods}>
      <div
        ref={containerRef}
        className="w-full mx-auto max-h-[80vh] overflow-auto"
      >
        <div className="mx-auto border border-gray-300 dark:border-gray-600 ">
          <form
            onSubmit={(e) => {
              // console.log("Form onSubmit triggered");
              e.preventDefault();
              // console.log("Calling methods.handleSubmit(onSubmit)");
              methods.handleSubmit(onSubmit, (errors) => {
                // console.log("❌ Validation failed:", errors);
                const missingFields = Object.keys(errors)
                  .filter(field => requiredFields.includes(field))
                  .map(field => fieldDisplayNames[field] || field)
                  .join(", ");
                const errorMessage = `Please fill in the following required fields: ${missingFields}`;
                // console.error(errorMessage);
                toast.error(errorMessage);
              })();
            }}
            className="bg-white dark:bg-gray-900 p-4 sm:p-6 lg:p-8 rounded-xl shadow-xl transition-all duration-300"
          >
          <input type="hidden" {...methods.register("hearAboutUs")} />
          <input type="hidden" {...methods.register("hearAboutUsDetail")} />

          {/* Header */}
          <h2 className="text-center mb-8">
            Step {step + 1}: {steps[step]}
          </h2>

          {/* Step indicators */}
          <div className="flex justify-between mb-6 mx-auto w-full max-w-3xl">
            {steps.map((label, index) => (
              <div
                key={label}
                onClick={() => setStep(index)}
                className={`flex-1 text-center text-sm font-semibold cursor-pointer transition
                  ${index === step ? "block" : "hidden sm:block"}
                  ${
                    index <= step
                      ? "text-indigo-500 dark:text-indigo-400"
                      : "text-gray-400"
                  }`}
              >
                <div
                  className={`w-8 h-8 mx-auto mb-1 rounded-full flex items-center justify-center ${
                    index <= step
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300"
                  }`}
                >
                  {index + 1}
                </div>
                {label}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {renderStep()}
          </motion.div>

          {/* Buttons */}
          <div className="flex justify-between pt-4 border-t mt-4 dark:border-gray-700">
            {step > 0 && step < steps.length - 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-5 py-2 bg-gray-300 dark:border-gray-300 text-gray-800 dark:text-gray-900 rounded-lg hover:bg-gray-400 transition"
              >
                Back
              </button>
            )}
            {step === steps.length - 2 && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="ml-auto px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            )}
            {step < steps.length - 2 && (
              <button
                type="button"
                onClick={nextStep}
                className="ml-auto px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Next
              </button>
            )}
            {/* 💾 Save Draft Button */}
            {step < steps.length - 1 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="ml-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Save Draft
                </button>
              </div>
            )}
          </div>
        </form>
        </div>

      </div>
    </FormProvider>
  );
}
