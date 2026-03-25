'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Search, Filter, FileText, Eye, Trash2, Clock3, FileCheck2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge, DemandNoteStatus } from "@/components/demand-notes/StatusBadge";
import CommonTable, { Column, Action } from "@/components/ui/CommonTable";
import Pagination from "@/components/ui/pagination";
import LoadingSkeleton from "@/components/ui/loading-skeleton";
import ActiveFilters from "@/components/ui/ActiveFilters";
import { useRouter } from "next/navigation";
import { useGlobalSearch } from "@/contexts/GlobalSearchContext";

interface DemandNote {
  id: string;
  clients: Array<{ name: string }>;
  dueDate: string | null;
  status: DemandNoteStatus;
  updatedAt: string;
}

type SummaryCounts = {
  total: number;
  initiated: number;
  generated: number;
  published: number;
};

export default function DemandNotes() {
  const router = useRouter();
  const [allDemandNotes, setAllDemandNotes] = useState<DemandNote[]>([]);
  // const [pagedDemandNotes, setPagedDemandNotes] = useState<DemandNote[]>([]);
  const [, setTotalDemandNotesCount] = useState(0);
  const [pendingFetches, setPendingFetches] = useState(0);
  const [, setPageReloadId] = useState(0);
  const [fullReloadId, setFullReloadId] = useState(0);
  const [summaryCounts, setSummaryCounts] = useState<SummaryCounts>({
    total: 0,
    initiated: 0,
    generated: 0,
    published: 0,
  });
  const [cardsLoading, setCardsLoading] = useState(true);
  const { query: searchQuery, setQuery: setSearchQuery } = useGlobalSearch();
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState<string>("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const isLoading = pendingFetches > 0;
  const fullFetchReloadRef = useRef(0);
  const hasActiveFilter = searchQuery.trim().length > 0 || statusFilter !== "all";
  // const usingServerPagination = !hasActiveFilter;
  const incrementPendingFetches = () =>
    setPendingFetches((prev) => prev + 1);
  const decrementPendingFetches = () =>
    setPendingFetches((prev) => Math.max(prev - 1, 0));

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchSummary = async () => {
      try {
        const response = await fetch("/api/demand-notes/summary", { signal });
        if (!response.ok) throw new Error("Failed to load demand note summary");
        const data = await response.json();
        if (signal.aborted) return;
        setSummaryCounts({
          total: typeof data.total === "number" ? data.total : 0,
          initiated: typeof data.initiated === "number" ? data.initiated : 0,
          generated: typeof data.generated === "number" ? data.generated : 0,
          published: typeof data.published === "number" ? data.published : 0,
        });
      } catch (error) {
        if (signal.aborted) return;
        console.error("Error loading demand note summary:", error);
      } finally {
        if (!signal.aborted) {
          setCardsLoading(false);
        }
      }
    };

    void fetchSummary();
    return () => controller.abort();
  }, []);

  // Load ALL demand notes for client-side pagination (no loading on page change)
  useEffect(() => {
    // Skip if we already have all notes loaded and no filters/search
    if (allDemandNotes.length > 0 && fullFetchReloadRef.current === fullReloadId && !hasActiveFilter) {
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchFullNotes = async () => {
      incrementPendingFetches();
      try {
        const response = await fetch("/api/demand-notes?full=true", { signal });
        if (!response.ok) throw new Error("Failed to load demand notes");
        const data = await response.json();
        if (signal.aborted) return;
        const notesArray = Array.isArray(data.notes) ? data.notes : [];
        setAllDemandNotes(notesArray);
        setTotalDemandNotesCount(
          typeof data.total === "number" ? data.total : notesArray.length
        );
        fullFetchReloadRef.current = fullReloadId;
      } catch (error) {
        if (signal.aborted) return;
        console.error("Error loading demand notes:", error);
      } finally {
        decrementPendingFetches();
      }
    };

    void fetchFullNotes();
    return () => controller.abort();
  }, [fullReloadId, allDemandNotes.length, hasActiveFilter]);

  // Note: We no longer need the paged fetch - using client-side pagination instead
  const baseNotes = allDemandNotes;

  // FILTERING
  const filteredNotes = useMemo(() => {
    return baseNotes.filter((note) => {
      const clientNames = (note.clients || []).map(c => c.name).join(", ");
      const matchesSearch = clientNames.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || note.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [baseNotes, searchQuery, statusFilter]);

  const sortedNotes = useMemo(() => {
    const getComparableValue = (note: DemandNote, column: string): string | number => {
      if (column === "clientName") {
        const firstClient = (note.clients || [])
          .map((c) => c.name?.trim())
          .find(Boolean) || "Unknown";
        return firstClient.toLowerCase();
      }

      if (column === "dueDate") {
        return note.dueDate ? new Date(note.dueDate).getTime() : 0;
      }

      if (column === "updatedAt") {
        return note.updatedAt ? new Date(note.updatedAt).getTime() : 0;
      }

      if (column === "status") {
        return String(note.status || "").toLowerCase();
      }

      return 0;
    };

    const sorted = [...filteredNotes].sort((a, b) => {
      const aValue = getComparableValue(a, sortColumn);
      const bValue = getComparableValue(b, sortColumn);

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      const aText = String(aValue);
      const bText = String(bValue);
      return sortDirection === "asc"
        ? aText.localeCompare(bText, undefined, { numeric: true, sensitivity: "base" })
        : bText.localeCompare(aText, undefined, { numeric: true, sensitivity: "base" });
    });

    return sorted;
  }, [filteredNotes, sortColumn, sortDirection]);

  // Client-side pagination: always slice the sorted data for the current page
  const displayedNotes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedNotes.slice(startIndex, endIndex);
  }, [sortedNotes, currentPage, itemsPerPage]);

  // Total items for pagination is always the filtered count
  const paginationTotalItems = filteredNotes.length;

  // show active filters above the table when search or status filter is applied
  const activeFilters = useMemo(() => {
    const filters = [];

    if (searchQuery) {
      filters.push({
        label: `Search: "${searchQuery}"`,
        onRemove: () => setSearchQuery(""),
      });
    }

    if (statusFilter !== "all") {
      const statusLabels: Record<string, string> = {
        initiated: "Initiated",
        "doc-uploading": "Uploading",
        "doc-uploaded": "Uploaded",
        verified: "Verified",
        generated: "Generated",
        sent: "Published",
        notified: "For Review",
      };

      filters.push({
        label: `Status: ${statusLabels[statusFilter] || statusFilter}`,
        onRemove: () => setStatusFilter("all"),
      });
    }

    return filters;
  }, [searchQuery, setSearchQuery, statusFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleSort = (column: string, direction: "asc" | "desc") => {
    setSortColumn(column);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const adjustSummaryCounts = (status: string | undefined, delta: number) => {
    const normalized = status?.toLowerCase() ?? "";
    setSummaryCounts((prev) => ({
      total: Math.max(prev.total + delta, 0),
      initiated:
        normalized === "initiated"
          ? Math.max(prev.initiated + delta, 0)
          : prev.initiated,
      generated:
        normalized === "generated"
          ? Math.max(prev.generated + delta, 0)
          : prev.generated,
      published:
        normalized === "sent"
          ? Math.max(prev.published + delta, 0)
          : prev.published,
    }));
  };

  // TABLE DATA → convert DemandNote → Record<string, unknown>
  const tableData: Record<string, unknown>[] = displayedNotes.map((n) => {
    const clientNames = (n.clients || [])
      .map((c) => c.name?.trim())
      .filter((name): name is string => Boolean(name));
    const combinedNames = clientNames.join(", ");
    const firstClientName = clientNames[0] || "Unknown";
    const additionalClientCount = Math.max(clientNames.length - 1, 0);
    const displayedName =
      additionalClientCount > 0
        ? `${firstClientName} (+${additionalClientCount})`
        : firstClientName;

    return {
      id: n.id,
      clientName: displayedName,
      firstClientName,
      additionalClientCount,
      fullClientName: combinedNames,
      clientNamesList: clientNames,
      dueDate: n.dueDate,
      status: n.status,
      updatedAt: n.updatedAt,
      _original: n,
    };
  });

  // COLUMNS
  const tableTextClass = "px-2 py-4 text-xs sm:text-sm";
  const columns: Column<Record<string, unknown>>[] = [
    {
      key: "clientName",
      label: "Client Name",
      className: tableTextClass,
      sortable: true,
      render: (_value, row) => {
        const firstClient = String(row.firstClientName || "Unknown");
        const additionalCount = Number(row.additionalClientCount || 0);
        const fullClientName = String(row.fullClientName || firstClient);
        const badgeLabel = additionalCount === 1 ? "+1 client" : `+${additionalCount} clients`;
        const clientNamesList = Array.isArray(row.clientNamesList)
          ? (row.clientNamesList as string[])
          : [];
        const demandNoteId = String(row.id || "");

        return (
          <div className="inline-flex items-center gap-2 max-w-[320px] text-gray-600 dark:text-gray-400" title={fullClientName}>
            <Link
              href={`/demand-notes/${demandNoteId}`}
              className="truncate font-medium hover:text-primary"
            >
              {firstClient}
            </Link>
            {additionalCount > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Badge
                    asChild
                    variant="secondary"
                    className="text-[11px] leading-4 px-2 py-0 cursor-pointer hover:bg-secondary/80"
                  >
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Show all client names"
                    >
                      {badgeLabel}
                    </button>
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-w-[320px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuLabel>Clients</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1 text-sm wrap-break-word">
                    {clientNamesList.join(", ")}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      },
    },
    {
      key: "dueDate",
      label: "Demand Date",
      className: tableTextClass,
      sortable: true,
      render: (value) =>
        value ? new Date(value as string).toLocaleDateString() : "—",
    },
    {
      key: "status",
      label: "Status",
      className: tableTextClass,
      sortable: true,
      render: (value) => <StatusBadge status={value as DemandNoteStatus} />,
    },
    {
      key: "updatedAt",
      label: "Last Updated",
      className: tableTextClass,
      sortable: true,
      render: (value) =>
        new Date(value as string).toLocaleString(),
    },
  ];

  // ACTIONS
  const actions: Action<Record<string, unknown>>[] = [
    {
      label: "View",
      icon: Eye,
      onClick: (row) => {
        const original = row._original as DemandNote;
        router.push(`/demand-notes/${original.id}`);
      },
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: async (row) => {
        const original = row._original as DemandNote;
        const clientNames = (original.clients || []).map(c => c.name).join(", ") || "Unknown";
        const confirmDelete = window.confirm(`Are you sure you want to delete the demand note for ${clientNames}?`);
        if (!confirmDelete) return;

        try {
          const response = await fetch(`/api/demand-notes/${original.id}`, {
            method: "DELETE",
          });

          if (response.ok) {
            setFullReloadId((prev) => prev + 1);
            setPageReloadId((prev) => prev + 1);
            adjustSummaryCounts(original.status, -1);
            alert("Demand note deleted successfully!");
          } else {
            alert("Failed to delete demand note.");
          }
        } catch (error) {
          console.error("Error deleting demand note:", error);
          alert("An error occurred while deleting the demand note.");
        }
      },
    },
    {
      label: "Request Documents",
      icon: FileText,
      onClick: async (row) => {
        const original = row._original as DemandNote;

        try {
          const response = await fetch(
            `/api/demand-notes/${original.id}/request-documents`,
            {
              method: "POST",
            }
          );

          if (response.ok) {
            alert("Document request sent successfully!");
          } else {
            alert("Failed to send document request.");
          }
        } catch (error) {
          console.error("Error requesting documents:", error);
          alert("An error occurred while requesting documents.");
        }
      },
    },
  ];


  return (
    <main className="min-h-screen">
      <div className="max-w-8xl mx-auto space-y-5">

{/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xl font-bold text-foreground">Demand Notes</p>
          <Button asChild>
            <Link href="/demand-notes/new">
              <Plus className="h-4 w-4 mr-2" /> New Demand Note
            </Link>
          </Button>
        </div>

        {cardsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
            <LoadingSkeleton
              key="demand-total"
              message={null}
              rowCount={2}
              cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
              contentClassName="p-4 space-y-3"
            />
            <LoadingSkeleton
              key="demand-initiated"
              message={null}
              rowCount={2}
              cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
              contentClassName="p-4 space-y-3"
            />
            <LoadingSkeleton
              key="demand-generated"
              message={null}
              rowCount={2}
              cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
              contentClassName="p-4 space-y-3"
            />
            <LoadingSkeleton
              key="demand-published"
              message={null}
              rowCount={2}
              cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
              contentClassName="p-4 space-y-3"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Demand Notes</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{summaryCounts.total}</p>
                  </div>
                  <div className="p-1 bg-blue-50 dark:bg-blue-900/30 rounded-sm">
                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Initiated</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{summaryCounts.initiated}</p>
                  </div>
                  <div className="p-1 bg-yellow-50 dark:bg-yellow-900/30 rounded-sm">
                    <Clock3 className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Generated</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{summaryCounts.generated}</p>
                  </div>
                  <div className="p-1 bg-purple-50 dark:bg-purple-900/30 rounded-sm">
                    <FileCheck2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Published</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{summaryCounts.published}</p>
                  </div>
                  <div className="p-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-sm">
                    <Send className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="bg-white dark:bg-gray-900">
          <CardContent className="px-2 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
              <Input
                placeholder="Search by client name..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-50">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="initiated">Initiated</SelectItem>
                <SelectItem value="doc-uploading">Uploading</SelectItem>
                <SelectItem value="doc-uploaded">Uploaded</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="generated">Generated</SelectItem>
                <SelectItem value="sent">Published</SelectItem>
                <SelectItem value="notified">For Review</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Active Filters */}
        <ActiveFilters filters={activeFilters} />

        {/* Table */}
        {isLoading ? (
          <LoadingSkeleton message="Loading demand notes..." rowCount={5} cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm" contentClassName="p-4 space-y-3" />
        ) : (
          <CommonTable
            columns={columns}
            data={tableData}
            actions={actions}
            className="[&_tbody_td]:text-gray-500 dark:[&_tbody_td]:text-gray-400"
            onSort={handleSort}
            emptyMessage="No demand notes found"
          />
        )}

        {/* Pagination */}
        <Pagination
          totalItems={paginationTotalItems}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </main>
  );
}
