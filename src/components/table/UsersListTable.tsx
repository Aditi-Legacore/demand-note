'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Send, Trash, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import CommonTable, { Column, Action } from '@/components/ui/CommonTable';
import Pagination from '@/components/ui/pagination';

interface User {
  id: string;
  email: string;
  roles: string[]; // Changed from 'role: string' to 'roles: string[]'
  createdAt: string;
  updatedAt: string;
  password: string | null;
  status: boolean;
  firstName?: string;
  requestPassword: boolean;
  isDeletedUser: boolean;
}

export default function UsersListTable({ users, onUserUpdate,onEdit,loading, isDeletedFilter }: { 
  users: User[]; 
  onUserUpdate?: () => void;
  onEdit?: (user: User) => void; 
  loading?: boolean; 
  isDeletedFilter?: boolean;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sendingUserIds, setSendingUserIds] = useState<Set<string>>(new Set());

  const itemsPerPage = 5;
  const prevUsersLengthRef = useRef(users.length);
  // const prevPaginatedLengthRef = useRef(0);

  // Helper function to get display value for sorting
  const getSortValue = (user: User, column: string): string => {
    switch (column) {
      case 'email':
        return user.email.toLowerCase();
      case 'roles':
        // Join roles for sorting
        return (user.roles || []).join(', ').toLowerCase();
      case 'status':
        return user.status ? 'active' : 'inactive';
      case 'firstName':
        return (user.firstName || '').toLowerCase();
      default:
        return '';
    }
  };

  // Adjust currentPage when users data changes to prevent showing empty pages
  useEffect(() => {
    const prevLength = prevUsersLengthRef.current;
    prevUsersLengthRef.current = users.length;

    // If users is cleared for refresh (e.g., after deletion), don't adjust page
    if (users.length === 0 && prevLength > 0) {
      return;
    }

    // Compute sortedUsers (same logic as in useMemo)
    const sortedUsers = sortColumn
      ? [...users].sort((a, b) => {
          const aValue = getSortValue(a, sortColumn);
          const bValue = getSortValue(b, sortColumn);

          if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        })
      : users;

    const totalPages = Math.ceil(users.length / itemsPerPage);
    let newPage = currentPage;

    // Adjust for total pages first
    if (currentPage > totalPages && totalPages > 0) {
      newPage = totalPages;
    } else if (totalPages === 0) {
      newPage = 1;
    }

    // Then check if the adjusted page has any users
    const startIndex = (newPage - 1) * itemsPerPage;
    const paginatedUsers = sortedUsers.slice(startIndex, startIndex + itemsPerPage);

    if (paginatedUsers.length === 0 && newPage > 1) {
      newPage = 1;
    }

    if (newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  }, [users, sortColumn, sortDirection, itemsPerPage, currentPage]);

  // Sort users based on current sort state
  const sortedUsers = React.useMemo(() => {
    if (!sortColumn) return users;

    return [...users].sort((a, b) => {
      const aValue = getSortValue(a, sortColumn);
      const bValue = getSortValue(b, sortColumn);

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, sortColumn, sortDirection]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => setCurrentPage(page);

  // const handleSort = (column: string) => {
  //   if (sortColumn === column) {
  //     setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  //   } else {
  //     setSortColumn(column);
  //     setSortDirection('asc');
  //   }
  // };

  const handleSendEmail = async (userId: string) => {
    setSendingUserIds(prev => new Set(prev).add(userId));
    try {
      const res = await fetch('/api/admin/send-user-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) throw new Error();

      toast.success('Login email sent successfully');

      // Call onUserUpdate to refresh the parent component
      onUserUpdate?.();
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSendingUserIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Render role badges
  const renderRoles = (roles: string[]) => {
    if (!roles || roles.length === 0) {
      return <span className="text-gray-400">No roles</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {roles.map((role, index) => {
          let bgColor = 'bg-gray-100 text-gray-800';
          
          // Different colors for different roles
          if (role === 'admin') {
            bgColor = 'bg-purple-100 text-purple-800';
          } else if (role === 'App admin') {
            bgColor = 'bg-blue-100 text-blue-800';
          } else if (role === 'Legacore User') {
            bgColor = 'bg-orange-100 text-orange-800';
          } else if (role === 'Customer') {
            bgColor = 'bg-green-100 text-green-800';
          }

          return (
            <span
              key={index}
              className={`px-2 py-1 rounded-md text-xs font-medium ${bgColor}`}
            >
              {role}
            </span>
          );
        })}
      </div>
    );
  };

  // Define actions
  const getActions = (row: User): Action<User>[] => {
    const actions: Action<User>[] = [];

    if (!row.isDeletedUser) {
      actions.push({
        label: 'Edit',
        icon: Pencil,
        onClick: (row) => {
          // This will be handled by the parent component
          // We'll pass the user data to the modal
          onEdit?.(row);
        },
        className: 'text-blue-600 dark:text-blue-400'
      });
    
      actions.push({
        label: 'Send Login Email',
        icon: Send,
        onClick: async (row) => {
          try {
            const res = await fetch('/api/admin/send-user-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: row.id }),
            });

            if (!res.ok) throw new Error();

            toast.success('Login email sent successfully');

            // Call onUserUpdate to refresh the parent component
            onUserUpdate?.();
          } catch {
            toast.error('Failed to send email');
          }
        },
        className: 'text-blue-600 dark:text-blue-400'
      });

      actions.push({
        label: 'Delete',
        icon: Trash,
        onClick: async (row) => {
          const confirmed = window.confirm(`Are you sure you want to mark user ${row.email} as deleted?`);
          if (!confirmed) return;

          try {
            const res = await fetch('/api/admin/users', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: row.id }),
            });

            if (!res.ok) {
              const error = await res.json();
              throw new Error(error.error || 'Failed to mark user as deleted');
            }

            toast.success('User marked as deleted successfully');
            // Call onUserUpdate to refresh the parent component
            onUserUpdate?.();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete user');
          }
        },
        className: 'text-red-600 dark:text-red-400'
      });
    } else {
      actions.push({
        label: 'Revive User',
        icon: Send, // Using Send icon, could use a different one if available
        onClick: async (row) => {
          const confirmed = window.confirm(`Are you sure you want to revive user ${row.email}?`);
          if (!confirmed) return;

          try {
            const res = await fetch('/api/admin/users', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: row.id }),
            });

            if (!res.ok) {
              const error = await res.json();
              throw new Error(error.error || 'Failed to revive user');
            }

            toast.success('User revived successfully');
            // Call onUserUpdate to refresh the parent component
            onUserUpdate?.();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to revive user');
          }
        },
        className: 'text-green-600 dark:text-green-400'
      });
    }

    return actions;
  };

  // Define columns
  const baseColumns: Column<User>[] = [
    {
      key: 'email',
      label: 'Email',
      className: 'px-2 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400',
      sortable: true
    },
    {
      key: 'roles',
      label: 'Roles',
      className: 'px-2 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400',
      sortable: true,
      // onSort: () => handleSort('roles'),
      render: (value, row) => renderRoles(row.roles)
    },
    {
      key: 'status',
      label: 'Status',
      className: 'px-2 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400',
      render: (value) => (
        <button
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}
          disabled
        >
          {value ? 'Active' : 'Initialized'}
        </button>
      )
    },
    {
      key: 'credentials',
      label: 'Credentials',
      className: 'px-2 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400',
      // sortable: true,
      render: (value, row) => {
        const isSending = sendingUserIds.has(row.id);
        if (row.requestPassword) {
          return (
            <button
              onClick={() => handleSendEmail(row.id)}
              disabled={row.status || isSending}
              title={row.requestPassword && !row.status ? "user requested to resend password again" : undefined}
              className={`px-3 py-1 rounded-md text-xs font-medium ${
                row.status || isSending
                  ? 'bg-gray-100 text-gray-800 cursor-not-allowed border border-gray-300'
                  : 'bg-yellow-200 text-yellow-900 hover:bg-yellow-300 border border-yellow-500 cursor-pointer'
              }`}
            >
              {row.status ? 'Sent' : isSending ? 'Sending...' : 'Resend'}
            </button>
          );
        } else {
          return (
            <button
              onClick={() => handleSendEmail(row.id)}
              disabled={row.status || isSending}
              className={`px-3 py-1 rounded-md text-xs font-medium ${
                row.status || isSending
                  ? 'bg-gray-100 text-gray-800 cursor-not-allowed border border-gray-300'
                  : 'bg-blue-200 text-blue-900 hover:bg-blue-300 border border-blue-500 cursor-pointer'
              }`}
            >
              {row.status ? 'Sent' : isSending ? 'Sending...' : 'Send'}
            </button>
          );
        }
      }
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      className: 'px-2 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400',
      sortable: true,
      render: (value) => (value as string).split('T')[0]
    },
    {
      key: 'deletedDate',
      label: 'Deleted Date',
      className: 'px-2 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400',
      sortable: true,
      render: (value, row) => row.updatedAt.split('T')[0]
    }
  ];

  const columns = isDeletedFilter
    ? baseColumns.filter(col => col.key !== 'credentials').filter(col => col.key !== 'status')
    : baseColumns.filter(col => col.key !== 'deletedDate');





  const UsersTable = CommonTable as unknown as React.ComponentType<{
    columns: Column<User>[];
    data: User[];
    actions?: Action<User>[];
    showSerialNumber?: boolean;
    emptyMessage?: string;
    onSort?: (column: string, direction: 'asc' | 'desc') => void;
    getRowActions?: (row: User) => Action<User>[];
  }>;

  return (
    <>
      <UsersTable
        columns={columns}
        data={paginatedUsers}
        getRowActions={getActions}
        showSerialNumber={true}
        emptyMessage={loading ? "Loading users..." : "No users found."}
        onSort={(column, direction) => {
          setSortColumn(column);
          setSortDirection(direction);
        }}
      />

      {/* Pagination */}
      {users.length > itemsPerPage && (
        <div className="mt-6">
          <Pagination
            totalItems={users.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </>
  );
}
