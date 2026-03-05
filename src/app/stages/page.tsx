'use client';

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FilterBar from "@/components/ui/FilterBar";
import ActiveFilters from "@/components/ui/ActiveFilters";
import Pagination from "@/components/ui/pagination";
import CommonTable from "@/components/ui/CommonTable";
import { Layers3, PlayCircle, Activity, CheckCircle2 } from "lucide-react";
import LoadingSkeleton from "@/components/ui/loading-skeleton";

export default function StagesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [loading, setLoading] = useState(true);

  const stages = useMemo(() => [
  { id: 1, name: 'Initial Review', description: 'Collecting initial documents', created: '2025-11-01', status: 'Active' },
  { id: 2, name: 'Verification', description: 'Checking client details', created: '2025-11-02', status: 'Active' },
  { id: 3, name: 'In Progress', description: 'Case assigned to legal team', created: '2025-11-03', status: 'Ongoing' },
  { id: 4, name: 'Completed', description: 'Case successfully closed', created: '2025-11-04', status: 'Completed' },
], []);

  const filteredStages = useMemo(() => {
    return stages.filter((stage) => {
      const matchesSearch =
        stage.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stage.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        stage.status.toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [stages, searchQuery, statusFilter]);

  const paginatedStages = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStages.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStages, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 0);
    return () => clearTimeout(timer);
  }, []);

  const totalCount = stages.length;
  const activeCount = stages.filter((s) => s.status === 'Active').length;
  const ongoingCount = stages.filter((s) => s.status === 'Ongoing').length;
  const completedCount = stages.filter((s) => s.status === 'Completed').length;

  const activeFilters = useMemo(() => {
    const filters = [];
    if (searchQuery) {
      filters.push({
        label: `Search: "${searchQuery}"`,
        onRemove: () => setSearchQuery("")
      });
    }
    if (statusFilter !== "all") {
      const statusLabel =
        statusFilter === "active"
          ? "Active"
          : statusFilter === "ongoing"
          ? "Ongoing"
          : "Completed";

      filters.push({
        label: `Status: ${statusLabel}`,
        onRemove: () => setStatusFilter("all")
      });
    }
    return filters;
  }, [searchQuery, statusFilter]);

  return (
    <main className="min-h-screen">
      <div className="max-w-8xl mx-auto space-y-5">

        {/* Page Header */}
        <div>
          <p className="text-xl font-bold text-foreground">Stages</p>
          <p className="text-muted-foreground mt-1">
            Manage and track case stages
          </p>
        </div>

        {/* Summary Section */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1">
            <LoadingSkeleton
              key="stages-total"
              message={null}
              rowCount={2}
              cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
              contentClassName="p-4 space-y-3"
            />
            <LoadingSkeleton
              key="stages-active"
              message={null}
              rowCount={2}
              cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
              contentClassName="p-4 space-y-3"
            />
            <LoadingSkeleton
              key="stages-ongoing"
              message={null}
              rowCount={2}
              cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
              contentClassName="p-4 space-y-3"
            />
            <LoadingSkeleton
              key="stages-completed"
              message={null}
              rowCount={2}
              cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
              contentClassName="p-4 space-y-3"
            />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-1">

              <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Stages</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{totalCount}</p>
                    </div>
                    <div className="p-1 bg-blue-50 dark:bg-blue-900/30 rounded-sm">
                      <Layers3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{activeCount}</p>
                    </div>
                    <div className="p-1 bg-green-50 dark:bg-green-900/30 rounded-sm">
                      <PlayCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Ongoing</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{ongoingCount}</p>
                    </div>
                    <div className="p-1 bg-yellow-50 dark:bg-yellow-900/30 rounded-sm">
                      <Activity className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{completedCount}</p>
                    </div>
                    <div className="p-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </>
        )}

        {/* Filters */}
        <Card className="bg-white dark:bg-gray-900">
          <CardContent>
            <FilterBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchPlaceholder="Search by stage name or description..."
              filterValue={statusFilter}
              setFilterValue={setStatusFilter}
              filterOptions={[
                { value: "all", label: "All Status" },
                { value: "active", label: "Active" },
                { value: "ongoing", label: "Ongoing" },
                { value: "completed", label: "Completed" },
              ]}
              filterPlaceholder="Filter by status"
            />
          </CardContent>
        </Card>

        {/* Active Filters */}
        <ActiveFilters filters={activeFilters} />

        {/* Table */}
        {loading ? (
          <LoadingSkeleton rowCount={4} />
        ) : (
          <StagesTable stages={paginatedStages} />
        )}

        <Pagination
          totalItems={filteredStages.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />

      </div>
    </main>
  );
}

interface Stage {
  id?: number;
  name: string;
  description: string;
  created: string;
  status: string;
}

interface Column {
  key: string;
  label: string;
  className?: string;
  render?: (value: unknown, row: Stage, index: number) => React.ReactNode;
}

function StagesTable({ stages }: { stages: Stage[] }) {
  const tableTextClass = "px-2 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400";

  const columns: Column[] = [
    { key: 'name', label: 'Stage Name', className: tableTextClass },
    { key: 'description', label: 'Description', className: tableTextClass },
    { key: 'created', label: 'Created Date', className: tableTextClass },
    {
      key: 'status',
      label: 'Status',
      className: tableTextClass,
      render: (value): React.ReactNode => (
        <Badge>
          {String(value)}
        </Badge>
      ),
    },
  ];

  const TableComponent = CommonTable as unknown as React.ComponentType<{
    columns: Column[];
    data: Stage[];
    emptyMessage?: string;
  }>;

  return (
    <TableComponent
      columns={columns}
      data={stages}
      emptyMessage="No stages found."
    />
  );
}
