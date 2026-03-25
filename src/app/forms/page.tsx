'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileClock, FileCheck2, FilePenLine } from 'lucide-react';
import PrepareFormModal from '@/components/forms/PrepareFormModal';
import NewIntakeModal from '@/components/NewIntakeModal';
import { FormSubmission, FormTemplate } from '@/types/form';
import Pagination from '@/components/ui/pagination';
import FilterBar from '@/components/ui/FilterBar';
import FilterSidebar from '@/components/ui/FilterSidebar';
import ActiveFilters from '@/components/ui/ActiveFilters';
import CommonTable, { Column, Action } from '@/components/ui/CommonTable';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import { useGlobalSearch } from '@/contexts/GlobalSearchContext';

export default function FormsPage() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  // const [templates, setTemplates] = useState<any[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);

  const [loading, setLoading] = useState(true);
  const { query: searchQuery, setQuery: setSearchQuery } = useGlobalSearch();
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [showFiltersSidebar, setShowFiltersSidebar] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);

  useEffect(() => {
    fetchSubmissions();
    fetchTemplates();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await fetch('/api/forms');
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/form-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };



  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const matchesSearch =
        submission.template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (submission.user?.firstName + ' ' + submission.user?.lastName).toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.matter?.title.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
      const matchesCaseType = true; // Temporarily disable case type filter

      // Date range filtering
      let matchesDateRange = true;
      if (dateFromFilter || dateToFilter) {
        const submissionDate = new Date(submission.createdAt);
        if (dateFromFilter) {
          const fromDate = new Date(dateFromFilter);
          matchesDateRange = matchesDateRange && submissionDate >= fromDate;
        }
        if (dateToFilter) {
          const toDate = new Date(dateToFilter);
          matchesDateRange = matchesDateRange && submissionDate <= toDate;
        }
      }

      return matchesSearch && matchesStatus && matchesCaseType && matchesDateRange;
    });
  }, [submissions, searchQuery, statusFilter, dateFromFilter, dateToFilter]);

  // Paginated submissions
  const paginatedSubmissions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSubmissions.slice(startIndex, endIndex);
  }, [filteredSubmissions, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFromFilter, dateToFilter]);

  // Reset filters function
  const resetFilters = () => {
    setDateFromFilter('');
    setDateToFilter('');
  };

  // Status counts
  const pendingCount = submissions.filter(s => s.status === 'Pending').length;
  const submittedCount = submissions.filter(s => s.status === 'Submitted').length;
  const draftCount = submissions.filter(s => s.status === 'Draft').length;

  // Active filters
  const activeFilters = useMemo(() => {
    const filters = [];
    if (searchQuery) {
      filters.push({
        label: `Search: "${searchQuery}"`,
        onRemove: () => setSearchQuery('')
      });
    }
    if (statusFilter !== 'all') {
      filters.push({
        label: `Status: ${statusFilter}`,
        onRemove: () => setStatusFilter('all')
      });
    }

    if (dateFromFilter) {
      filters.push({
        label: `From: ${dateFromFilter}`,
        onRemove: () => setDateFromFilter('')
      });
    }
    if (dateToFilter) {
      filters.push({
        label: `To: ${dateToFilter}`,
        onRemove: () => setDateToFilter('')
      });
    }
    return filters;
  }, [searchQuery, statusFilter, dateFromFilter, dateToFilter, setSearchQuery]);

  // Loading state removed - now handled inline with table

  return (
    <main className="min-h-screen">
      <div className="max-w-8xl mx-auto space-y-5">

        {/* Page Header */}
        <div>
        <p className="text-xl font-bold text-foreground">Forms</p>

          <p className="text-muted-foreground mt-1">Manage and review all form submissions</p>
        </div>

        {/* Summary Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            {[
              "pending",
              "submitted",
              "draft",
            ].map((key) => (
              <LoadingSkeleton
                key={key}
                message={null}
                rowCount={2}
                cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
                contentClassName="p-2.5 space-y-2"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm">
              <CardContent className="p-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pending Forms</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{pendingCount}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="p-1 bg-amber-50 dark:bg-amber-900/30 rounded-sm">
                      <FileClock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span className="text-[15px] text-gray-500 dark:text-gray-400">{pendingCount}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        <span className="text-[15px] text-gray-500 dark:text-gray-400">{draftCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm">
              <CardContent className="p-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Submitted Forms</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{submittedCount}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="p-1 bg-green-50 dark:bg-green-900/30 rounded-sm">
                      <FileCheck2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span className="text-[15px] text-gray-500 dark:text-gray-400">{submittedCount}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        <span className="text-[15px] text-gray-500 dark:text-gray-400">{pendingCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm">
              <CardContent className="p-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Draft Forms</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{draftCount}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-sm">
                      <FilePenLine className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span className="text-[15px] text-gray-500 dark:text-gray-400">{draftCount}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        <span className="text-[15px] text-gray-500 dark:text-gray-400">{submittedCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters/Search */}
        {/* {loading ? (
          <LoadingSkeleton
            message={null}
            rowCount={3}
            cardClassName="shadow-sm"
            contentClassName="p-6 space-y-4"
          />
        ) : ( */}
        <Card className="bg-white dark:bg-gray-900">
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex-1">
                <FilterBar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  searchPlaceholder="Search by form title, contact, or matter..."
                  filterValue={statusFilter}
                  setFilterValue={setStatusFilter}
                  filterOptions={[
                    { value: 'all', label: 'All Status' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Submitted', label: 'Submitted' },
                    { value: 'Draft', label: 'Draft' },
                  ]}
                  filterPlaceholder="Filter by status"
                  onMoreFilters={() => setShowFiltersSidebar(true)}
                />
              </div>
              <Button
                onClick={() => setShowIntakeModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus size={16} />
                New Intake
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* )} */}

        {/* Active Filters */}
        <ActiveFilters filters={activeFilters} />

        {/* Forms Table */}
        {loading ? (
          <LoadingSkeleton message="Loading forms..." rowCount={5} cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm" contentClassName="p-4 space-y-3" />
        ) : (
          <FormsTable submissions={paginatedSubmissions} />
        )}

        {/* Pagination */}
        <Pagination
          totalItems={filteredSubmissions.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />

        <FilterSidebar
          isOpen={showFiltersSidebar}
          onClose={() => setShowFiltersSidebar(false)}
          dateFromFilter={dateFromFilter}
          setDateFromFilter={setDateFromFilter}
          dateToFilter={dateToFilter}
          setDateToFilter={setDateToFilter}
          onResetFilters={resetFilters}
        />

      </div>

      <PrepareFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={fetchSubmissions}
        templates={templates}
      />

      {showIntakeModal && <NewIntakeModal onClose={() => setShowIntakeModal(false)} />}
    </main>
  );
}

function FormsTable({ submissions, showEditButton = false }: { submissions: FormSubmission[]; showEditButton?: boolean }) {
  // Define columns for CommonTable
  const columns: Column[] = [
    {
      key: 'createdAt',
      label: 'Due',
      className: 'px-4 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400',
      // render: (value: unknown, _row: Record<string, unknown>, _index: number) => value ? new Date(value as string | number | Date).toLocaleDateString() : 'N/A'
      render: (value: unknown) =>
        value
          ? new Date(value as string | number | Date).toLocaleDateString()
          : 'N/A'
    },
    {
      key: 'template',
      label: 'Form',
      className: 'px-4 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium',
      // render: (value: unknown, _row: Record<string, unknown>, _index: number) => {
      //   const template = value as FormTemplate | undefined;
      //   return template?.title ?? 'N/A';
      // }

      render: (value: unknown) => {
        const template = value as FormTemplate | undefined;
        return template?.title ?? 'N/A';
      }
    },
    {
      key: 'user',
      label: 'Contact',
      className: 'px-4 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400',
      // render: (value: unknown, _row: Record<string, unknown>, _index: number) => {
      //   const user = value as { firstName?: string; lastName?: string } | undefined;
      //   const first = user?.firstName ?? '';
      //   const last = user?.lastName ?? '';
      //   const full = `${first} ${last}`.trim();
      //   return full || 'N/A';
      // }
      render: (value: unknown) => {
        const user = value as { firstName?: string; lastName?: string } | undefined;
        const first = user?.firstName ?? '';
        const last = user?.lastName ?? '';
        const full = `${first} ${last}`.trim();
        return full || 'N/A';
      }
    },
    {
      key: 'matter',
      label: 'Matter',
      className: 'px-4 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400',
      // render: (value: unknown, _row: Record<string, unknown>, _index: number) => {
      //   const v = value as { title?: string } | null | undefined;
      //   return v?.title ?? 'N/A';
      // }
      render: (value: unknown) => {
        const v = value as { title?: string } | null | undefined;
        return v?.title ?? 'N/A';
      }
    },
    {
      key: 'status',
      label: 'Status',
      className: 'px-4 py-4',
      // render: (value: unknown, _row: Record<string, unknown>, _index: number) => {
      //   const val = (value as string) ?? 'N/A';
      //   return (
      //     <Badge variant={val === 'Pending' || val === 'Draft' ? 'secondary' : 'default'}>
      //       {val}
      //     </Badge>
      //   );
      // }
      render: (value: unknown) => {
        const val = (value as string) ?? 'N/A';

        return (
          <Badge
            variant={
              val === 'Pending' || val === 'Draft'
                ? 'secondary'
                : 'default'
            }
          >
            {val}
          </Badge>
        );
      }
    }
  ];

  // Define actions for CommonTable
  const actions: Action[] = [];
  if (showEditButton) {
    actions.push({
      label: 'Edit',
      onClick: (row) => window.location.href = `/forms/${row.id}/fill`,
      className: 'text-blue-600 dark:text-blue-400'
    });
  }

  return (
    <CommonTable
      columns={columns}
      data={submissions as unknown as Record<string, unknown>[]}
      actions={actions}
      emptyMessage="No form submissions found."
    />
  );
}


