'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, GripVertical, UserPlus, ChevronDown, ChevronRight, Eye, X } from 'lucide-react';
import { FormField, ContactData } from '@/types/form';
import { useRouter } from 'next/navigation';
import ContactSection from '@/components/FormBuilder/ContactSection';

import { v4 as uuidv4 } from 'uuid';

export default function NewFormTemplatePage() {
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('English');
  const [fields, setFields] = useState<FormField[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string; isOpen: boolean; selectedFields: { dateOfBirth: boolean; company: boolean; phone: boolean; address: boolean }; data: ContactData }[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const router = useRouter();

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: Date.now().toString(),
      type,
      label: '',
      required: false,
      options: type === 'multiple_choice' || type === 'multi_select' || type === 'dropdown' ? [''] : undefined,
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(field =>
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
  };

  const addOption = (fieldId: string) => {
    setFields(fields.map(field =>
      field.id === fieldId && field.options
        ? { ...field, options: [...field.options, ''] }
        : field
    ));
  };

  const updateOption = (fieldId: string, optionIndex: number, value: string) => {
    setFields(fields.map(field =>
      field.id === fieldId && field.options
        ? { ...field, options: field.options.map((opt, i) => i === optionIndex ? value : opt) }
        : field
    ));
  };

  const removeOption = (fieldId: string, optionIndex: number) => {
    setFields(fields.map(field =>
      field.id === fieldId && field.options
        ? { ...field, options: field.options.filter((_, i) => i !== optionIndex) }
        : field
    ));
  };

  const addContact = () => {
    setContacts([...contacts, {
      id: uuidv4(),
      name: `Contact ${contacts.length + 1}`,
      isOpen: false,
      selectedFields: { dateOfBirth: false, company: false, phone: false, address: false },
      data: { prefix: '', firstName: '', lastName: '', email: '' }
    }]);
  };

  const updateContact = (id: string, data: ContactData) => {
    setContacts(contacts.map(contact =>
      contact.id === id ? { ...contact, data } : contact
    ));
  };

  const removeContact = (id: string) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter(contact => contact.id !== id));
    }
  };

  const toggleContactField = (id: string, field: keyof typeof contacts[0]["selectedFields"]) => {
    setContacts(contacts.map(contact =>
      contact.id === id ? { ...contact, selectedFields: { ...contact.selectedFields, [field]: !contact.selectedFields[field] } } : contact
    ));
  };

  const toggleContactOpen = (id: string) => {
    setContacts(contacts.map(contact =>
      contact.id === id ? { ...contact, isOpen: !contact.isOpen } : contact
    ));
  };

  const removeAllFields = (id: string) => {
    setContacts(contacts.map(contact =>
      contact.id === id ? { ...contact, selectedFields: { dateOfBirth: false, company: false, phone: false, address: false } } : contact
    ));
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!title.trim()) {
    alert('Please enter a template title');
    return;
  }

  setLoading(true);
  try {
    const response = await fetch('/api/form-templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        language,
        fields: {
          fields,
          contacts: contacts.map(contact => contact.data),
          contactFields: contacts.map(contact => ({
            id: contact.id,
            name: contact.name,
            isOpen: contact.isOpen,
            fields: contact.selectedFields,
          })),
        },
      }),
    });

    if (response.ok) {
      router.push('/form-templates');
    } else {
      throw new Error('Failed to create template');
    }
  } catch (error) {
    console.error('Error creating template:', error);
    alert('Failed to create template');
  } finally {
    setLoading(false);
  }
};

  const fieldTypes = [
    { value: 'text', label: 'Single Line Text' },
    { value: 'textarea', label: 'Paragraph Text' },
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'multi_select', label: 'Multi-select' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'section_break', label: 'Section Break' },
    { value: 'file', label: 'File Attachment' },
    { value: 'date', label: 'Date' },
    { value: 'yes_no', label: 'Yes/No Checkbox' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">New Form Template</h1>
          <Button 
            variant="outline" 
            onClick={() => router.push('/form-templates')}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Details */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-base font-medium text-gray-900">Template Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter template title"
                  required
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language" className="text-base font-medium text-gray-900">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-11 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English" className="text-base">English</SelectItem>
                    <SelectItem value="Spanish" className="text-base">Spanish</SelectItem>
                    <SelectItem value="French" className="text-base">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Contacts Section */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Contacts</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {contacts.map((contact, index) => (
                  <div key={contact.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-base font-semibold text-gray-900">{contact.name}</h4>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleContactOpen(contact.id)}
                          className="h-9 w-9 p-0"
                        >
                          {contact.isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeContact(contact.id)}
                          className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {contact.isOpen && (
                      <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`dob-${contact.id}`}
                              checked={contact.selectedFields.dateOfBirth}
                              onChange={() => toggleContactField(contact.id, 'dateOfBirth')}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor={`dob-${contact.id}`} className="text-base font-normal cursor-pointer">Date of Birth</Label>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`company-${contact.id}`}
                              checked={contact.selectedFields.company}
                              onChange={() => toggleContactField(contact.id, 'company')}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor={`company-${contact.id}`} className="text-base font-normal cursor-pointer">Company</Label>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`phone-${contact.id}`}
                              checked={contact.selectedFields.phone}
                              onChange={() => toggleContactField(contact.id, 'phone')}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor={`phone-${contact.id}`} className="text-base font-normal cursor-pointer">Phone Number</Label>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`address-${contact.id}`}
                              checked={contact.selectedFields.address}
                              onChange={() => toggleContactField(contact.id, 'address')}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor={`address-${contact.id}`} className="text-base font-normal cursor-pointer">Address</Label>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeAllFields(contact.id)}
                            className="mt-2"
                          >
                            Remove All Fields
                          </Button>
                        </div>
                        <ContactSection
                          contact={{ id: contact.id, data: contact.data }}
                          index={index}
                          onUpdate={updateContact}
                          onRemove={() => removeContact(contact.id)}
                          showEmail={true}
                          selectedFields={contact.selectedFields}
                        />
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addContact}
                  className="w-full h-11 text-base"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add a contact
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Form Fields */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Form Fields</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <FieldEditor
                    key={field.id}
                    field={field}
                    index={index}
                    onUpdate={updateField}
                    onRemove={removeField}
                    onAddOption={addOption}
                    onUpdateOption={updateOption}
                    onRemoveOption={removeOption}
                  />
                ))}

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white">
                  <div className="text-center">
                    <p className="text-gray-600 mb-4 text-base">Add a field</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {fieldTypes.map((type) => (
                        <Button
                          key={type.value}
                          type="button"
                          variant="outline"
                          onClick={() => addField(type.value as FormField['type'])}
                          className="h-10 text-sm"
                        >
                          {type.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen(true)}
              disabled={loading}
              className="w-full sm:w-auto h-11 text-base"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview Form
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full sm:w-auto h-11 text-base bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </form>

        {/* Preview Modal - Responsive sizing */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="w-[92vw] sm:w-[85vw] md:w-[80vw] lg:w-[90vw] xl:w-[85vw] 2xl:max-w-[1600px] max-h-[85vh] sm:max-h-[88vh] lg:max-h-[92vh] overflow-y-auto p-0">
            <DialogHeader className="border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 sticky top-0 bg-white z-10 flex items-center">
              <DialogTitle className="text-lg sm:text-xl lg:text-3xl xl:text-4xl font-bold text-gray-900 flex-1">
                Form Preview: {title || 'Untitled Template'}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewOpen(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100 ml-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogHeader>
            <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8 xl:px-12 xl:py-10">
              <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                {/* Contacts Section */}
                {contacts.length > 0 && (
                  <Card className="border border-gray-200">
                    <CardHeader className="border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-6">
                      <CardTitle className="text-base sm:text-lg lg:text-2xl xl:text-3xl font-semibold text-gray-900">Contacts</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-7">
                      <div className="space-y-4 sm:space-y-5 lg:space-y-7">
                        {contacts.map((contact, index) => (
                          <div key={contact.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6 xl:p-8 bg-gray-50">
                            <h4 className="text-sm sm:text-base lg:text-xl xl:text-2xl font-semibold text-gray-900 mb-3 lg:mb-5">{contact.name}</h4>
                            <ContactSection
                              contact={{ id: contact.id, data: contact.data }}
                              index={index}
                              onUpdate={() => {}}
                              onRemove={() => {}}
                              showEmail={true}
                              selectedFields={contact.selectedFields}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Form Fields Section */}
                {fields.length > 0 && (
                  <Card className="border border-gray-200">
                    <CardHeader className="border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-6">
                      <CardTitle className="text-base sm:text-lg lg:text-2xl xl:text-3xl font-semibold text-gray-900">Form Fields</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-7">
                      <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                        {fields.map((field, index) => (
                          <div key={field.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 lg:p-6 xl:p-8 bg-white">
                            <div className="flex items-center gap-2 mb-2 lg:mb-3">
                              <span className="text-xs sm:text-sm lg:text-base font-medium text-gray-500">Field {index + 1}</span>
                              <Badge variant="outline" className="text-xs sm:text-sm lg:text-base">{field.type.replace('_', ' ')}</Badge>
                              {field.required && <Badge variant="destructive" className="text-xs sm:text-sm lg:text-base">Required</Badge>}
                            </div>
                            <h4 className="text-sm sm:text-base lg:text-xl xl:text-2xl font-semibold text-gray-900 mb-3 lg:mb-5">
                              {field.label || 'Untitled Field'}
                            </h4>

                            {/* Render field preview based on type */}
                            {field.type === 'text' && (
                              <input
                                type="text"
                                className="w-full h-9 sm:h-10 lg:h-12 xl:h-14 px-2 sm:px-3 lg:px-4 py-2 text-sm sm:text-base lg:text-lg xl:text-xl border border-gray-300 rounded-md bg-gray-50"
                                placeholder="Text input"
                                disabled
                              />
                            )}

                            {field.type === 'textarea' && (
                              <textarea
                                className="w-full px-2 sm:px-3 lg:px-4 py-2 text-sm sm:text-base lg:text-lg xl:text-xl border border-gray-300 rounded-md bg-gray-50 resize-none"
                                placeholder="Paragraph text"
                                rows={3}
                                disabled
                              />
                            )}

                            {field.type === 'multiple_choice' && field.options && (
                              <div className="space-y-2 lg:space-y-3">
                                {field.options.filter(opt => opt.trim()).map((option, optIndex) => (
                                  <div key={optIndex} className="flex items-center gap-2 lg:gap-3">
                                    <input type="radio" className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" disabled />
                                    <label className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-900">{option}</label>
                                  </div>
                                ))}
                              </div>
                            )}

                            {field.type === 'multi_select' && field.options && (
                              <div className="space-y-2 lg:space-y-3">
                                {field.options.filter(opt => opt.trim()).map((option, optIndex) => (
                                  <div key={optIndex} className="flex items-center gap-2 lg:gap-3">
                                    <input type="checkbox" className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 rounded" disabled />
                                    <label className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-900">{option}</label>
                                  </div>
                                ))}
                              </div>
                            )}

                            {field.type === 'dropdown' && field.options && (
                              <select className="w-full h-9 sm:h-10 lg:h-12 xl:h-14 px-2 sm:px-3 lg:px-4 py-2 text-sm sm:text-base lg:text-lg xl:text-xl border border-gray-300 rounded-md bg-gray-50" disabled>
                                <option>Select an option</option>
                                {field.options.filter(opt => opt.trim()).map((option, optIndex) => (
                                  <option key={optIndex}>{option}</option>
                                ))}
                              </select>
                            )}

                            {field.type === 'section_break' && (
                              <hr className="border-t-2 border-gray-300 my-3 lg:my-5" />
                            )}

                            {field.type === 'file' && (
                              <div className="p-4 sm:p-5 lg:p-8 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 text-center">
                                <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-500">File upload area</p>
                              </div>
                            )}

                            {field.type === 'date' && (
                              <input
                                type="date"
                                className="w-full h-9 sm:h-10 lg:h-12 xl:h-14 px-2 sm:px-3 lg:px-4 py-2 text-sm sm:text-base lg:text-lg xl:text-xl border border-gray-300 rounded-md bg-gray-50"
                                disabled
                              />
                            )}

                            {field.type === 'yes_no' && (
                              <div className="flex gap-4 lg:gap-8">
                                <label className="flex items-center gap-2 lg:gap-3">
                                  <input type="radio" name={`yes_no_${field.id}`} className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" disabled />
                                  <span className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-900">Yes</span>
                                </label>
                                <label className="flex items-center gap-2 lg:gap-3">
                                  <input type="radio" name={`yes_no_${field.id}`} className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" disabled />
                                  <span className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-900">No</span>
                                </label>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {contacts.length === 0 && fields.length === 0 && (
                  <div className="text-center py-8 sm:py-12 lg:py-16 text-gray-500">
                    <p className="text-sm sm:text-base lg:text-lg">No contacts or fields added yet. Add some to see the preview.</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

interface FieldEditorProps {
  field: FormField;
  index: number;
  onUpdate: (id: string, updates: Partial<FormField>) => void;
  onRemove: (id: string) => void;
  onAddOption: (fieldId: string) => void;
  onUpdateOption: (fieldId: string, optionIndex: number, value: string) => void;
  onRemoveOption: (fieldId: string, optionIndex: number) => void;
}

function FieldEditor({ field, index, onUpdate, onRemove, onAddOption, onUpdateOption, onRemoveOption }: FieldEditorProps) {
  return (
    <Card className="border border-gray-200 bg-white">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <GripVertical className="w-5 h-5 text-gray-400 mt-3 flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Field {index + 1}</span>
              <Badge variant="outline" className="text-sm">{field.type.replace('_', ' ')}</Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">Label</Label>
              <Input
                value={field.label}
                onChange={(e) => onUpdate(field.id, { label: e.target.value })}
                placeholder="Enter field label"
                className="h-11 text-base"
              />
            </div>

            {(field.type === 'multiple_choice' || field.type === 'multi_select' || field.type === 'dropdown') && (
              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-900">Options</Label>
                <div className="space-y-2">
                  {field.options?.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => onUpdateOption(field.id, optionIndex, e.target.value)}
                        placeholder={`Option ${optionIndex + 1}`}
                        className="h-10 text-base"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onRemoveOption(field.id, optionIndex)}
                        className="h-10 w-10 p-0 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onAddOption(field.id)}
                    className="h-10 text-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id={`required-${field.id}`}
                checked={field.required}
                onChange={(e) => onUpdate(field.id, { required: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor={`required-${field.id}`} className="text-base font-normal cursor-pointer">Required</Label>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRemove(field.id)}
            className="h-9 w-9 p-0 flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}