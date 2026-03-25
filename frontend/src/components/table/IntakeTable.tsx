'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import CommonTable, { Column, Action } from '@/components/ui/CommonTable';
import { Badge } from '@/components/ui/badge';

interface CaseIntake {
  id: number | string;
  clientName: string | null | undefined;
  accidentDate: string;
  accidentDescription: string | null | undefined;
  isDraft: boolean;
  Lead?: { caseType: string };
}

interface IntakeTableProps {
  intakes: CaseIntake[];
  onDelete: (id: string) => void;
}

export default function CaseIntakeManagement({ intakes, onDelete }: IntakeTableProps) {
  const router = useRouter();
  const [loadingView, setLoadingView] = useState<number | string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState<number | string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState<number | string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleView = async (intake: CaseIntake) => {
    setLoadingView(intake.id);
    try {
      router.push(`/intake-preview/${intake.id}`);
    } finally {
      setLoadingView(null);
    }
  };

  const handleUpdate = async (id: number | string) => {
    setLoadingEdit(id);
    try {
      router.push(`/intake-form?id=${id}`);
    } finally {
      setLoadingEdit(null);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!confirm('Are you sure you want to delete this intake?')) return;
    setLoadingDelete(id);
    try {
      const res = await fetch(`/api/intake/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete intake');
      onDelete(id.toString());
      toast.success('Intake deleted successfully.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete intake.');
    } finally {
      setLoadingDelete(null);
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Sort data based on current sort state
  const sortedIntakes = React.useMemo(() => {
    if (!sortColumn) return intakes;

    return [...intakes].sort((a, b) => {
      const aValue = a[sortColumn as keyof CaseIntake];
      const bValue = b[sortColumn as keyof CaseIntake];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

      // Handle date sorting
      if (sortColumn === 'accidentDate') {
        const aDate = new Date(aValue as string);
        const bDate = new Date(bValue as string);
        return sortDirection === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
      }

      // Handle boolean sorting
      if (sortColumn === 'isDraft') {
        const aBool = aValue as boolean;
        const bBool = bValue as boolean;
        if (aBool === bBool) return 0;
        return sortDirection === 'asc' ? (aBool ? 1 : -1) : (aBool ? -1 : 1);
      }

      // Handle string sorting
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [intakes, sortColumn, sortDirection]);

  // Define columns for CommonTable
  const columns: Column<CaseIntake>[] = [
    {
      key: 'clientName',
      label: 'Client Name',
      className: 'px-4 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium',
      sortable: true,
      link: (row) => `/intake-preview/${row.id}`
    },
    {
      key: 'accidentDate',
      label: 'Date of Loss',
      className: 'px-4 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400',
      sortable: true,
      render: (value): React.ReactNode => formatDate(value as string)
    },
    {
      key: 'accidentDescription',
      label: 'Accident Description',
      className: 'px-4 py-4',
      render: (value): React.ReactNode => {
        const description = value as string | null | undefined;
        const truncatedText =
          description && description.length > 20 ? description.substring(0, 20) + '...' : description;
    
        return (
          <div className="inline-block">
            <span
              title={description || 'No description'}
              className="
                inline-block rounded-md
                bg-slate-100 dark:bg-slate-800
                px-2.5 py-1 text-xs font-medium
                text-slate-700 dark:text-slate-200
                transition-colors hover:bg-slate-200 dark:hover:bg-slate-700
                cursor-help
              "
            >
              {truncatedText || 'No description'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'isDraft',
      label: 'Status',
      className: 'px-4 py-4',
      sortable: true,
      render: (value): React.ReactNode => (
        <Badge
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            value
              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          }`}
        >
          {value ? 'Draft' : 'Complete'}
        </Badge>
      )
    }
  ];

  // Define actions for CommonTable
  const actions: Action<CaseIntake>[] = [
    {
      label: 'View',
      icon: Eye,
      onClick: (row) => handleView(row),
      disabled: (row) => loadingView === row.id,
      className: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (row) => handleUpdate(row.id),
      disabled: (row) => loadingEdit === row.id,
      className: 'text-green-600 dark:text-green-400'
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: (row) => handleDelete(row.id),
      disabled: (row) => loadingDelete === row.id,
      className: 'text-red-600 dark:text-red-400'
    }
  ];

  const IntakeTable = CommonTable as unknown as React.ComponentType<{
    columns: Column<CaseIntake>[];
    data: CaseIntake[];
    actions?: Action<CaseIntake>[];
    showSerialNumber?: boolean;
    emptyMessage?: string;
    onSort?: (column: string, direction: 'asc' | 'desc') => void;
  }>;

  return (
    <IntakeTable
      columns={columns}
      data={sortedIntakes}
      actions={actions}
      showSerialNumber={true}
      emptyMessage="No case intakes found."
      onSort={(column, direction) => {
        setSortColumn(column);
        setSortDirection(direction);
      }}
    />
  );
}