'use client';

import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Heart, AlertTriangle, Briefcase, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import Image from 'next/image';
import LoginLogoBg from '../../../public/assets/images/auth/logo.png';
import InputField from './inputs/InputField';
import TextareaField from './inputs/TextareaField';
import DateInputField from './inputs/DateInputField';

type LeadFormData = {
  fullName: string;
  dateOfLoss: string;
  caseType: string;
  email: string;
  [key: string]: unknown; // allows extra optional fields if needed
};


const caseTypes = [
  { value: 'personal_injury', label: 'Personal Injury', icon: AlertTriangle },
  { value: 'auto_accident', label: 'Auto Accident', icon: Car },
  { value: 'premises_liability', label: 'Premises Liabilities', icon: Car },
  { value: 'medical_malpractice', label: 'Medical Malpractice', icon: Heart },
  { value: 'workers_comp', label: 'Workers Compensation', icon: Briefcase },
];

// const referralSources = [
//   { value: 'google', label: 'Google Search' },
//   { value: 'referral', label: 'Friend/Family Referral' },
//   { value: 'social', label: 'Social Media' },
//   { value: 'advertisement', label: 'Advertisement' },
//   { value: 'other', label: 'Other' },
// ];

export default function IntakeForm({ onClose }: { onClose: () => void }) {
  const [referenceId, setReferenceId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const methods = useForm({
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      dateOfLoss: '',
      caseType: '',
      description: '',
      referralSource: '',
    },
  });

  const { handleSubmit, watch } = methods;
  const description = watch('description');
  const charCount = description ? description.length : 0;

  const onSubmit = async (data: LeadFormData) => {
    if (!data.fullName || !data.dateOfLoss || !data.caseType || !data.email) {
      setError("Please fill all required fields.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      // Create lead with reference ID and date of birth
      const leadRes = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
        }),
      });
      const leadData = await leadRes.json();
      if (!leadRes.ok) {
        setError(leadData.error || "Failed to create lead");
        setIsLoading(false);
        return;
      }

      setReferenceId(leadData.referenceId);
      localStorage.setItem("referenceId", leadData.referenceId);
      localStorage.setItem("caseType", data.caseType);
      localStorage.setItem("dateOfLoss", data.dateOfLoss);
      setError("");

      // Log activity for generating reference ID
      await fetch('/api/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refId: leadData.referenceId,
          activityType: 'generate_reference_id',
          shortDescription: 'Reference ID Generated',
          longDescription: 'generated reference ID',
        }),
      });
    } catch (err) {
      console.log(err);
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    // Close the modal first
    if (onClose) {
      onClose();
    }
    // Then navigate
    if (window.self !== window.top) {
      window.location.href = `/embed/form?ref=${referenceId}`;
    } else {
      router.push(`/intake-form?ref=${referenceId}`);
    }
  };

  return (
    <FormProvider {...methods}>
      <Card className=" card-shadow animate-scale-in">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 ">
            <div className="w-5 h-5 rounded-lg flex items-center justify-center overflow-hidden">
              <Image
                src={LoginLogoBg}
                alt="Logo"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
            <h6 className="text-lg font-bold text-foreground">Lega<span className="font-semibold text-green-300">sys</span></h6>
          </div>
        {/* <h6 className="text-xl font-bold text-muted-foreground mb-1">Let&apos;s Get Started</h6> */}

          <p className="text-sm text-muted-foreground">Tell us about your case — takes 2 minutes</p>
        </div>

        {!referenceId ? (
          <>
            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-0">
              <InputField
                name="fullName"
                label="Full Name *"
                placeholder="John Doe"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                <InputField
                  name="phone"
                  label="Phone Number *"
                  type="tel"
                  placeholder="(555) 123-4567"
                />
                <InputField
                  name="email"
                  label="Email Address *"
                  type="email"
                  placeholder="john@example.com"
                />
              </div>

              <DateInputField
                name="dateOfLoss"
                label="Date of Loss *"
                // type="date"
              />

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Case Type *
                </label>
                <Controller
                  name="caseType"
                  control={methods.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full dark:bg-gray-900">
                        <SelectValue placeholder="Select Case Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {caseTypes.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <TextareaField
                name="description"
                label="Brief Description *"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{charCount}/500 characters</p>

              {/* <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  How did you hear about us? (Optional)
                </label>
                <Controller
                  name="referralSource"
                  control={methods.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Source" />
                      </SelectTrigger>
                      <SelectContent>
                        {referralSources.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div> */}

              <Button type="submit" size="lg" className="w-full h-8 text-base" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Reference ID'
                )}
              </Button>

              <div className="text-center ">
                <p className="text-xs text-muted-foreground">
                  By submitting this form, you agree to our{' '}
                  <a href="#" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                </p>
                <p className="text-xs text-muted-foreground">🔒 Secured by Legasys</p>
              </div>
            </form>
              {error && <p className="text-red-600 text-sm text-center mt-4">{error}</p>}
            </>
          ) : (
            <div className="text-center">
              <p className="font-bold text-lg text-blue-700">Your Reference ID:</p>
              <p className="text-2xl font-extrabold mt-2">{referenceId}</p>
              <p className="text-sm text-gray-500">
                ⚠️ Please save this ID for later access.
              </p>
              <Button
                onClick={handleNext}
                className="mt-3 bg-blue-600 text-white py-2 px-4 rounded-lg"
              >
                Next
              </Button>
            </div>
          )}
        </Card>
    </FormProvider>
  );
}
