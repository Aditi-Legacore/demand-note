'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { FormTemplate } from '@/types/form';

export default function CaseTypeFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const caseType = params.caseType as string;
  const referenceId = searchParams.get('ref');

  useEffect(() => {
    const handleCaseTypeForm = async () => {
      if (!caseType) {
        router.push('/intake-form');
        return;
      }

      try {
        // Fetch all form templates
        const templatesResponse = await fetch('/api/form-templates');
        if (!templatesResponse.ok) {
          throw new Error('Failed to fetch templates');
        }

        const templates: FormTemplate[] = await templatesResponse.json();

        // Find template where title matches caseType
        const matchingTemplate = templates.find(template => template.title === caseType);

        if (matchingTemplate) {
          // Create a new form submission
          const submissionResponse = await fetch('/api/forms', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              templateId: matchingTemplate.id,
              userId: null, // No user associated yet
              matterId: null, // No matter associated yet
              data: {}, // Empty data to start
            }),
          });

          if (submissionResponse.ok) {
            const submission = await submissionResponse.json();
            // Redirect to fill the form
            router.push(`/forms/${submission.id}/fill`);
          } else {
            throw new Error('Failed to create form submission');
          }
        } else {
          // No matching template, redirect to intake form
          router.push(`/intake-form${referenceId ? `?ref=${referenceId}` : ''}`);
        }
      } catch (error) {
        console.error('Error handling case type form:', error);
        // On error, fallback to intake form
        router.push(`/intake-form${referenceId ? `?ref=${referenceId}` : ''}`);
      }
    };

    handleCaseTypeForm();
  }, [caseType, referenceId, router]);

  return (
    <div className="flex justify-center items-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading form...</p>
      </div>
    </div>
  );
}
