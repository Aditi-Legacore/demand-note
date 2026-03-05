'use client';

import React, { useState } from 'react';
import CommonTable, { Column } from "@/components/ui/CommonTable";

interface ReportTableProps {
  columns: string[];
  data: Record<string, unknown>[];
}

export default function ReportTable({ columns, data }: ReportTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const tableTextClass = 'px-2 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400';

  // Sort data based on current sort state
  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn.toLowerCase()];
      const bValue = b[sortColumn.toLowerCase()];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

      // Handle string sorting
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  // Convert columns to CommonTable format
  const tableColumns: Column<Record<string, unknown>>[] = columns.map(col => ({
    key: col.toLowerCase(),
    label: col,
    className: tableTextClass,
    sortable: true,
    render: (value) => (value as React.ReactNode) || "-"
  }));

  return (
    <CommonTable
      columns={tableColumns}
      data={sortedData}
      emptyMessage="No records found"
      onSort={(column, direction) => {
        setSortColumn(column);
        setSortDirection(direction);
      }}
    />
  );
}
