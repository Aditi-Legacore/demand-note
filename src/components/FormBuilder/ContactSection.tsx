import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { ContactData } from '@/types/form';

interface ContactSectionProps {
  contact: { id: string; data: ContactData };
  index: number;
  onUpdate: (id: string, data: ContactData) => void;
  onRemove: (id: string) => void;
  showEmail?: boolean;
  selectedFields?: {
    dateOfBirth: boolean;
    company: boolean;
    phone: boolean;
    address: boolean;
  };
  isTemplate?: boolean;
  showValidation?: boolean;
}

const PREFIX_OPTIONS = [
  'Mr.',
  'Mrs.',
  'Ms.',
  'Dr.',
  'Prof.',
  'Rev.',
  'Hon.',
];

const STATE_PROVINCE_OPTIONS = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];

export default function ContactSection({ contact, index, onUpdate, onRemove, showEmail = false, selectedFields, showValidation = false }: ContactSectionProps) {
  const [data, setData] = useState<ContactData>(contact.data);

  const handleChange = (field: keyof ContactData, value: string) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onUpdate(contact.id, newData);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Contact {index + 1}</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onRemove(contact.id)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Prefix */}
          <div>
            <Label htmlFor={`prefix-${contact.id}`}>Prefix</Label>
            <Select
              value={data.prefix || ''}
              onValueChange={(value) => handleChange('prefix', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select prefix" />
              </SelectTrigger>
              <SelectContent>
                {PREFIX_OPTIONS.map((prefix) => (
                  <SelectItem key={prefix} value={prefix}>
                    {prefix}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* First Name */}
          <div>
            <Label htmlFor={`firstName-${contact.id}`}>First Name{showValidation ? ' *' : ''}</Label>
            <Input
              id={`firstName-${contact.id}`}
              value={data.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder="Enter first name"
              required={showValidation}
            />
          </div>

          {/* Middle Name */}
          <div>
            <Label htmlFor={`middleName-${contact.id}`}>Middle Name</Label>
            <Input
              id={`middleName-${contact.id}`}
              value={data.middleName || ''}
              onChange={(e) => handleChange('middleName', e.target.value)}
              placeholder="Enter middle name"
            />
          </div>

          {/* Last Name */}
          <div>
            <Label htmlFor={`lastName-${contact.id}`}>Last Name{showValidation ? ' *' : ''}</Label>
            <Input
              id={`lastName-${contact.id}`}
              value={data.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              placeholder="Enter last name"
              required={showValidation}
            />
          </div>

          {/* Email (conditional) */}
          {showEmail && (
            <div className="md:col-span-4">
              <Label htmlFor={`email-${contact.id}`}>Email{showValidation ? ' *' : ''}</Label>
              <Input
                id={`email-${contact.id}`}
                type="email"
                value={data.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Enter email address"
                required={showValidation}
              />
            </div>
          )}

          {/* Date of Birth */}
          {selectedFields?.dateOfBirth && (
            <div>
              <Label htmlFor={`dateOfBirth-${contact.id}`}>Date of Birth</Label>
              <Input
                id={`dateOfBirth-${contact.id}`}
                type="date"
                value={data.dateOfBirth || ''}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
              />
            </div>
          )}

          {/* Company */}
          {selectedFields?.company && (
            <div>
              <Label htmlFor={`company-${contact.id}`}>Company</Label>
              <Input
                id={`company-${contact.id}`}
                value={data.company || ''}
                onChange={(e) => handleChange('company', e.target.value)}
                placeholder="Enter company name"
              />
            </div>
          )}

          {/* Phone Number */}
          {selectedFields?.phone && (
            <div>
              <Label htmlFor={`phoneNumber-${contact.id}`}>Phone Number</Label>
              <Input
                id={`phoneNumber-${contact.id}`}
                value={data.phoneNumber || ''}
                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
          )}

          {/* Address */}
          {selectedFields?.address && (
            <>
              {/* Street Address */}
              <div className="md:col-span-3">
                <Label htmlFor={`streetAddress-${contact.id}`}>Street Address</Label>
                <Input
                  id={`streetAddress-${contact.id}`}
                  value={data.streetAddress || ''}
                  onChange={(e) => handleChange('streetAddress', e.target.value)}
                  placeholder="Enter street address"
                />
              </div>

              {/* City */}
              <div>
                <Label htmlFor={`city-${contact.id}`}>City</Label>
                <Input
                  id={`city-${contact.id}`}
                  value={data.city || ''}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Enter city"
                />
              </div>

              {/* State/Province */}
              <div>
                <Label htmlFor={`stateProvince-${contact.id}`}>State/Province</Label>
                <Select
                  value={data.stateProvince || ''}
                  onValueChange={(value) => handleChange('stateProvince', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state/province" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATE_PROVINCE_OPTIONS.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Zip/Postal Code */}
              <div>
                <Label htmlFor={`zipPostalCode-${contact.id}`}>Zip/Postal Code</Label>
                <Input
                  id={`zipPostalCode-${contact.id}`}
                  value={data.zipPostalCode || ''}
                  onChange={(e) => handleChange('zipPostalCode', e.target.value)}
                  placeholder="Enter zip/postal code"
                />
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
