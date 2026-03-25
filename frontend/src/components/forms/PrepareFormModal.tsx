'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormTemplate, Matter } from '@/types/form';
import { useRouter } from 'next/navigation';

interface PrepareFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  templates: FormTemplate[];
}

interface User {
  lastName: string;
  firstName: string;
  id: string;
  name: string;
  email: string;
}

interface Submission {
  id: string;
  templateId: string;
  matterId: string;
  userId: string | null;
  createdAt: string;
}


export default function PrepareFormModal({ isOpen, onClose, onSubmit, templates }: PrepareFormModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedMatter, setSelectedMatter] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [matters, setMatters] = useState<Matter[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetchMatters();
      fetchUsers();
    }
  }, [isOpen]);

  const fetchMatters = async () => {
    try {
      const response = await fetch('/api/matters');
      if (response.ok) {
        const data = await response.json();
        setMatters(data);
      }
    } catch (error) {
      console.error('Error fetching matters:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSendForm = async () => {
    if (!selectedTemplate || !selectedMatter) {
      alert('Please select a form template and matter');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate,
          matterId: selectedMatter,
          userId: selectedUser || null,
        }),
      });

      if (response.ok) {
        // Here you would integrate email sending
        alert('Form sent successfully!');
        onSubmit();
        onClose();
      } else {
        throw new Error('Failed to create form submission');
      }
    } catch (error) {
      console.error('Error sending form:', error);
      alert('Failed to send form');
    } finally {
      setLoading(false);
    }
  };

  const handleFillOutForm = async () => {
    if (!selectedTemplate || !selectedMatter) {
      alert('Please select a form template and matter');
      return;
    }

    setLoading(true);
    try {
      // First, check if a submission already exists for this template/matter/user
      const existingResponse = await fetch('/api/forms');
      if (existingResponse.ok) {
        const submissions = await existingResponse.json();
        const existingSubmission = submissions.find((s: Submission) =>
          s.templateId === selectedTemplate &&
          s.matterId === selectedMatter &&
          s.userId === (selectedUser || null)
        );

        if (existingSubmission) {
          // Redirect to the existing submission
          router.push(`/forms/${existingSubmission.id}/fill`);
          onClose();
          return;
        }
      }

      // Create new submission if none exists
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate,
          matterId: selectedMatter,
          userId: selectedUser || null,
        }),
      });

      if (response.ok) {
        const submission = await response.json();
        // Redirect to fill the form
        router.push(`/forms/${submission.id}/fill`);
        onClose();
      } else {
        throw new Error('Failed to create form submission');
      }
    } catch (error) {
      console.error('Error creating form submission:', error);
      alert('Failed to start filling form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Prepare Form</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="template" className="text-right">
              Form
            </Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select form template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="matter" className="text-right">
              Matter
            </Label>
            <Select value={selectedMatter} onValueChange={setSelectedMatter}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select matter" />
              </SelectTrigger>
              <SelectContent>
                {matters.map((matter) => (
                  <SelectItem key={matter.id} value={matter.id}>
                    {matter.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contact" className="text-right">
              Contact
            </Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSendForm} disabled={loading}>
            Send Form
          </Button>
          <Button onClick={handleFillOutForm}>
            Fill Out Form
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
