'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface User {
  id: string;
  email: string;
  password: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function UserListModal({ open, onClose }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchUsers = async () => {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
      setLoading(false);
    };

    fetchUsers();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden bg-white">

        <DialogHeader>
          <DialogTitle>User List</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading users...</p>
        ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">

            <table className="w-full border text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="border px-3 py-2 text-left">Email</th>
                  <th className="border px-3 py-2 text-left">Password (hashed)</th>
                  <th className="border px-3 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-4">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td className="border px-3 py-2">{user.email}</td>
                      <td className="border px-3 py-2 truncate max-w-xs">
                        {user.password}
                      </td>
                      <td className="border px-3 py-2 text-center">
                      <Button
                        size="sm"
                            onClick={async () => {
                                try {
                                const res = await fetch('/api/admin/send-user-login', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: user.id }),
                                });

                                if (!res.ok) throw new Error();

                                alert('Login email sent successfully');
                                } catch {
                                alert('Failed to send email');
                                }
                            }}
                            >
                            Send
                        </Button>

                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
