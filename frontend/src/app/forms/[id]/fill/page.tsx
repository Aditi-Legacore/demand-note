'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ContactSection from '@/components/FormBuilder/ContactSection';
import { FormSubmission, FormField, ContactData } from '@/types/form';

type FormDataMap = Record<string, string | string[] | boolean | File | null>;

export default function FillFormPage() {
  const params = useParams();
  const router = useRouter();
  const [submission, setSubmission] = useState<FormSubmission | null>(null);
  const [formData, setFormData] = useState<FormDataMap>({});
  const [contacts, setContacts] = useState<{ id: string; data: ContactData; selectedFields: { dateOfBirth: boolean; company: boolean; phone: boolean; address: boolean } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldMap, setFieldMap] = useState<Map<string, FormField>>(new Map());

  useEffect(() => {
    const fetchSubmission = async () => {
    try {
      const response = await fetch(`/api/forms/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setSubmission(data);
        // Initialize form data with empty values or existing data
        const initialData: FormDataMap = {};
        const templateFields = data.template.fields;
        const fields = Array.isArray(templateFields) ? templateFields : (templateFields.fields || []);
        const fieldMap = new Map<string, FormField>();
        fields.forEach((field: FormField) => {
          fieldMap.set(field.id, field);
          if (field.type === 'multiple_choice' || field.type === 'multi_select') {
            initialData[field.label] = [];
          } else if (field.type === 'yes_no') {
            initialData[field.label] = false;
          } else {
            initialData[field.label] = '';
          }
        });

        // Populate with existing submission data if available
        if (data.data) {
          Object.keys(data.data).forEach(key => {
            if (key !== 'contacts') {
              const field = fieldMap.get(key);
              if (field) {
                initialData[field.label] = data.data[key];
              }
            }
          });
        }

        setFormData(initialData);
        setFieldMap(fieldMap);

        // Initialize contacts from submission data or template
        const templateContacts = data.template.fields.contacts || [];
        const templateContactFields = data.template.fields.contactFields || [];
        const initialContacts = Array.isArray(data.data.contacts) ? data.data.contacts.map((contact: ContactData, index: number) => {
          const contactField = templateContactFields[index];
          return {
            id: `contact-${index}`,
            data: contact,
            selectedFields: contactField ? contactField.fields : {
              dateOfBirth: false,
              company: false,
              phone: false,
              address: false,
            },
          };
        }) : Array.isArray(templateContacts) ? templateContacts.map((contact: ContactData, index: number) => {
          const contactField = templateContactFields[index];
          return {
            id: `contact-${index}`,
            data: contact,
            selectedFields: contactField ? contactField.fields : {
              dateOfBirth: false,
              company: false,
              phone: false,
              address: false,
            },
          };
        }) : [];
        setContacts(initialContacts);
      } else {
        alert('Form not found or access denied');
        router.push('/forms');
      }
    } catch (error) {
      console.error('Error fetching form:', error);
      alert('Failed to load form');
    } finally {
      setLoading(false);
    }
  };
    fetchSubmission();
  }, [params.id, router]);

  

 const handleInputChange = (fieldLabel: string, value: string | boolean | File | string[] | null) => {
  setFormData(prev => ({ ...prev, [fieldLabel]: value }));
};


  const handleMultiSelectChange = (fieldLabel: string, option: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [fieldLabel]: checked
  ? [...((prev[fieldLabel] as string[]) || []), option]
  : ((prev[fieldLabel] as string[]) || []).filter(opt => opt !== option)

    }));
  };

  const handleContactUpdate = (id: string, data: ContactData) => {
    setContacts(prev => prev.map(contact => contact.id === id ? { ...contact, data } : contact));
  };

  const handleContactRemove = (id: string) => {
    setContacts(prev => prev.filter(contact => contact.id !== id));
  };

  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      // Convert formData back to field IDs for storage
      const dataToStore: Record<string, string | boolean | File | string[] | null> = {};

      const response = await fetch(`/api/forms/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Draft',
          data: {
            ...dataToStore,
            contacts: contacts.map(contact => contact.data),
          },
        }),
      });

      if (response.ok) {
        alert('Draft saved successfully!');
      } else {
        throw new Error('Failed to save draft');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const templateFields = submission?.template.fields;
    const fields = Array.isArray(templateFields) ? templateFields : (templateFields?.fields || []);
    const missingFields = fields.filter(field =>
      field.required && (
        formData[field.label] == null ||
        (typeof formData[field.label] === 'string' && (formData[field.label] as string).length === 0) ||
        (Array.isArray(formData[field.label]) && (formData[field.label] as string[]).length === 0)
      )
    );

    if (missingFields && missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      // Convert formData back to field IDs for storage
      const dataToStore: Record<string, string | boolean | File | string[] | null> = {};
      console.log("formData", formData);

      Object.keys(formData).forEach(label => {
        const field = Array.from(fieldMap.values()).find(f => f.label === label);
        console.log("dataToStore", dataToStore, field);

        if (field) {
          dataToStore[field.id] = formData[label];
        }
      });

      const response = await fetch(`/api/forms/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Submitted',
          data: {
            ...dataToStore,
            contacts: contacts.map(contact => contact.data),
          },
        }),
      });

      if (response.ok) {
        alert('Form submitted successfully!');
        // If embedded in iframe, notify parent window
        if (window.self !== window.top) {
          window.parent.postMessage('formSubmitted', '*');
        } else {
          router.push('/forms');
        }
      } else {
        throw new Error('Failed to submit form');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.label];

    switch (field.type) {
      case 'text':
        return (
          <Input
            id={field.id}
            value={(value as string) || ''}
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="h-11 text-base"
          />
        );

      case 'textarea':
        return (
          <Textarea
            id={field.id}
            value={(value as string) || ''}
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="min-h-[120px] text-base resize-y"
          />
        );

      case 'multiple_choice':
        return (
          <RadioGroup
            value={typeof value === 'string' ? value : ''}
            onValueChange={(val) => handleInputChange(field.label, val)}
            className="space-y-3"
          >
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-3">
                <RadioGroupItem value={option} id={`${field.id}-${option}`} className="h-5 w-5" />
                <Label htmlFor={`${field.id}-${option}`} className="text-base font-normal cursor-pointer">{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'multi_select':
        return (
          <div className="space-y-3">
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-3">
                <Checkbox
                  id={`${field.id}-${option}`}
                  checked={Array.isArray(value) ? (value as string[]).includes(option) : false}
                  onCheckedChange={(checked) =>
                    handleMultiSelectChange(field.label, option, checked as boolean)
                  }
                  className="h-5 w-5"
                />
                <Label htmlFor={`${field.id}-${option}`} className="text-base font-normal cursor-pointer">{option}</Label>
              </div>
            ))}
          </div>
        );

      case 'dropdown':
        return (
          <Select value={(value as string) || ''} onValueChange={(val) => handleInputChange(field.label, val)}>
            <SelectTrigger className="h-11 text-base">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option} className="text-base">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'yes_no':
        return (
          <div className="flex items-center space-x-3">
            <Checkbox
              id={field.id}
              checked={!!value}
              onCheckedChange={(checked) => handleInputChange(field.label, checked === 'indeterminate' ? false : Boolean(checked))}
              className="h-5 w-5"
            />
            <Label htmlFor={field.id} className="text-base font-normal cursor-pointer">Yes</Label>
          </div>
        );

      case 'date':
        return (
          <Input
            id={field.id}
            type="date"
            value={(value as string) || ''}
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            required={field.required}
            className="h-11 text-base"
          />
        );

      case 'file':
        return (
          <Input
            id={field.id}
            type="file"
            onChange={(e) => handleInputChange(field.label, e.target.files?.[0] || null)}
            required={field.required}
            className="h-11 text-base file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium"
          />
        );

      default:
        return (
          <Input
            id={field.id}
            value={(value as string) || ''}
            onChange={(e) => handleInputChange(field.label, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="h-11 text-base"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-gray-600 text-lg">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600 text-lg">Form not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 sm:mb-8">
          <div className="px-6 sm:px-8 py-6 sm:py-8 border-b border-gray-200">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {submission.template.title}
            </h1>
            {submission.matter?.title && (
              <p className="text-gray-600 text-sm sm:text-base">
                Matter: {submission.matter.title}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Contacts Section */}
          {contacts.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">
                Contacts
              </h2>
              <div className="space-y-6">
                {contacts.map((contact, index) => (
                  <div 
                    key={contact.id} 
                    className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {index + 1}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Contact {index + 1}
                      </h3>
                    </div>
                    <ContactSection
                      contact={contact}
                      index={index}
                      onUpdate={handleContactUpdate}
                      onRemove={handleContactRemove}
                      showEmail={true}
                      selectedFields={contact.selectedFields}
                      showValidation={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-6">
            {(Array.isArray(submission.template.fields) ? submission.template.fields : (submission.template.fields.fields || [])).map((field) => (
              <Card key={field.id} className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900 flex items-baseline gap-2">
                    <span>{field.label}</span>
                    {field.required && (
                      <span className="text-red-600 text-base" aria-label="required">*</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderField(field)}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/forms')}
                className="w-full sm:w-auto h-11 px-6 text-base font-medium"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveDraft}
                disabled={submitting}
                className="w-full sm:w-auto h-11 px-6 text-base font-medium"
              >
                {submitting ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto h-11 px-6 text-base font-medium bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? 'Submitting...' : 'Submit Form'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}