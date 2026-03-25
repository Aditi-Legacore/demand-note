'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Column<T = Record<string, unknown>> {
  key: string;
  label: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  className?: string;
  hidden?: boolean;
  sortable?: boolean;
  link?: (row: T) => string; // href for link
}

export interface Action<T = Record<string, unknown>> {
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  onClick: (row: T, index: number) => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  disabled?: (row: T) => boolean;
  className?: string;
}

export interface CommonTableProps<T = Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  actions?: Action<T>[];
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
  className?: string;
  showSerialNumber?: boolean;
  serialNumberLabel?: string;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc';
  getRowActions?: (row: T) => Action<T>[];
}

export default function CommonTable({
  columns,
  data,
  actions = [],
  onRowClick,
  emptyMessage = 'No records found',
  className = '',
  showSerialNumber = false,
  serialNumberLabel = 'S.No',
  onSort,
  sortColumn: externalSortColumn,
  sortDirection: externalSortDirection,
  getRowActions
}: CommonTableProps) {
  const [internalSortColumn, setInternalSortColumn] = useState<string | null>(null);
  const [internalSortDirection, setInternalSortDirection] = useState<'asc' | 'desc'>('asc');
  const [leftArrowVisible, setLeftArrowVisible] = useState(false);
  const [rightArrowVisible, setRightArrowVisible] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sortColumn = externalSortColumn !== undefined ? externalSortColumn : internalSortColumn;
  const sortDirection = externalSortDirection !== undefined ? externalSortDirection : internalSortDirection;

  const visibleColumns = columns.filter(col => !col.hidden);

  const handleSort = (columnKey: string) => {
    if (!onSort) return;
    const newDirection = sortColumn === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
    if (externalSortColumn !== undefined) {
      onSort(columnKey, newDirection);
    } else {
      setInternalSortColumn(columnKey);
      setInternalSortDirection(newDirection);
      onSort(columnKey, newDirection);
    }
  };

  const checkOverflow = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setLeftArrowVisible(scrollLeft > 0);
      setRightArrowVisible(scrollLeft < scrollWidth - clientWidth);
    }
  };

  useEffect(() => {
    checkOverflow();
    const handleResize = () => checkOverflow();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data, columns]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className={`card-shadow bg-white dark:bg-gray-900 rounded-lg border border-border ${className}`}>
        <div className="text-center py-10 text-gray-400 dark:text-gray-400">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={`card-shadow bg-white dark:bg-gray-900 rounded-lg border border-border overflow-hidden ${className} relative`}>
      {leftArrowVisible && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-white dark:bg-gray-900 border border-border shadow-md hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={scrollLeft}
        >
          <ChevronLeft size={16} />
        </Button>
      )}
      {rightArrowVisible && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-white dark:bg-gray-900 border border-border shadow-md hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={scrollRight}
        >
          <ChevronRight size={16} />
        </Button>
      )}
      <div
        className="overflow-x-auto"
        ref={scrollContainerRef}
        onScroll={checkOverflow}
      >
        <table className="w-full border-collapse">
          <thead className="bg-muted dark:bg-gray-700 border-b border-border dark:border-gray-600">
            <tr>
{showSerialNumber && (
                <th className="px-2 py-2 text-left text-xs font-medium  dark:text-white uppercase tracking-wider whitespace-nowrap">
                  {serialNumberLabel}
                </th>
              )}
              {visibleColumns.map((column) => (
                <th
key={column.key}
                  className={`px-2 py-2 text-left text-xs font-medium  dark:text-white uppercase tracking-wider whitespace-nowrap ${column.className || ''} ${column.sortable ? 'cursor-pointer hover:bg-muted/70 dark:hover:bg-gray-600' : ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp
                          size={12}
                          className={`transition-colors ${sortColumn === column.key && sortDirection === 'asc' ? 'text-primary' : ''}`}
                        />
                        <ChevronDown
                          size={12}
                          className={`transition-colors -mt-1 ${sortColumn === column.key && sortDirection === 'desc' ? 'text-primary' : ''}`}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
{(actions.length > 0 || getRowActions) && (
                <th className="px-2 py-2 text-center text-xs font-medium  dark:text-white uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-card dark:bg-gray-900 divide-y divide-border dark:divide-gray-600">
            {data.map((row, rowIndex) => (
              <tr
                key={('id' in row ? String(row.id) : undefined) || rowIndex}
                className={`hover:bg-primary-light/50 dark:hover:bg-gray-700 transition-fast ${
                  onRowClick ? 'cursor-pointer' : ''
                } group`}
                onClick={() => onRowClick?.(row, rowIndex)}
              >
{showSerialNumber && (
                  <td className="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {rowIndex + 1}
                  </td>
                )}
                {visibleColumns.map((column) => {
                  const value = (row as Record<string, unknown>)[column.key];
                  const cellContent = column.render
                    ? column.render(value, row, rowIndex)
                    : (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
                      ? String(value)
                      : value == null
                      ? '-'
                      : '-';

return (
                    <td
                      key={column.key}
                      className={`px-2 py-2 text-sm text-foreground dark:text-gray-300 whitespace-nowrap ${column.className || ''}`}
                    >
                      {column.link ? (
                        <a
                          href={column.link(row)}
                          className="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {cellContent}
                        </a>
                      ) : (
                        cellContent
                      )}
                    </td>
                  );
                })}

                {(() => {
const rowActions = getRowActions ? getRowActions(row) : actions;
                  return rowActions.length > 0 ? (
                    <td className="px-2 py-2 text-center whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        {rowActions.map((action, actionIndex) => {
                          const Icon = action.icon;
                          const isDisabled = action.disabled?.(row) || false;

                          return (
                            <DropdownMenuItem
                              key={actionIndex}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isDisabled) action.onClick(row, rowIndex);
                              }}
                              disabled={isDisabled}
                              className={action.className || ''}
                            >
                              {Icon && <Icon size={16} className="mr-2" />}
                              {action.label}
                            </DropdownMenuItem>
                          );
                        })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  ) : null;
                })()}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}