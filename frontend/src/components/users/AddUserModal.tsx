'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface UserData {
  id?: string;
  email: string;
  roles: string[];
}

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userData?: UserData | null; // For edit mode
}

// Available roles
const AVAILABLE_ROLES = [
  { value: 'admin', label: 'Super Admin' },
  { value: 'App admin', label: 'App Admin' },
  { value: 'Legacore User', label: 'Legacore User' },
  { value: 'Customer', label: 'Customer' },
];

export default function AddUserModal({ open, onClose, onSuccess, userData }: AddUserModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Load user data when in edit mode
  useEffect(() => {
    if (userData) {
      setEmail(userData.email);
      setSelectedRoles(userData.roles || []);
      setPassword(''); // Don't pre-fill password for security
    } else {
      // Reset form when adding new user
      setEmail('');
      setPassword('');
      setSelectedRoles([]);
    }
  }, [userData, open]);

  const handleAddRole = (role: string) => {
    if (!selectedRoles.includes(role)) {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleRemoveRole = (roleToRemove: string) => {
    setSelectedRoles(selectedRoles.filter(role => role !== roleToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const isEditMode = !!userData?.id;
    const url = '/api/admin/users';
    const method = isEditMode ? 'PUT' : 'POST';

    // const body: any = { 
    //   email, 
    //   roles: selectedRoles,
    // };

    const body: {
      email: string;
      roles: string[];
      password?: string;
      id?: string;
    } = {
      email,
      roles: selectedRoles,
    };

    if (isEditMode) {
      body.id = userData.id;
      // Only include password if it's provided
      if (password) {
        body.password = password;
      }
    } else {
      body.password = password; // Password is required for new users
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (res.ok) {
      onClose();
      onSuccess?.();
    } else {
      const data = await res.json();
      alert(data.error || `Failed to ${isEditMode ? 'update' : 'create'} user`);
    }
  };

  const isEditMode = !!userData?.id;
  const title = isEditMode ? 'Edit User' : 'Add New User';
  const submitButtonText = isEditMode
    ? (loading ? 'Updating...' : 'Update User')
    : (loading ? 'Creating...' : 'Create User');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 dark:text-slate-100 p-6 sm:p-7">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{isEditMode ? 'New Password (leave blank to keep current)' : 'Password'}</Label>
            <Input
              type="password"
              placeholder={isEditMode ? "Enter new password" : "********"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEditMode}
            />
          </div>

          <div className="space-y-2">
            <Label>Roles</Label>

            {/* Selected roles badges */}
            {selectedRoles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedRoles.map((role) => {
                  const roleLabel = AVAILABLE_ROLES.find(r => r.value === role)?.label || role;
                  return (
                    <Badge key={role} variant="secondary" className="px-3 py-1">
                      {roleLabel}
                      <button
                        type="button"
                        onClick={() => handleRemoveRole(role)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Role selector */}
            <Select onValueChange={handleAddRole} value="">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a role to add" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_ROLES.map((role) => (
                  <SelectItem
                    key={role.value}
                    value={role.value}
                    disabled={selectedRoles.includes(role.value)}
                  >
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedRoles.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Please select at least one role
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || selectedRoles.length === 0}
          >
            {submitButtonText}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
