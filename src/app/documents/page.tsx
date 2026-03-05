'use client';

import { useEffect, useMemo, useState } from "react";
import { FileCheck2, FileClock } from "lucide-react";
import LoadingSkeleton from "@/components/ui/loading-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import DocumentsTable from "@/components/table/DocumentsTable";
import FilterBar from "@/components/ui/FilterBar";
import FilterSidebar from "@/components/ui/FilterSidebar";
import ActiveFilters from "@/components/ui/ActiveFilters";

interface DocumentType {
  id: string;
  clientName: string;
  caseType: string;
  status: string;
  documentStatus: string;
  createdDate: string;
  files: string[];
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValue, setFilterValue] = useState("all");
  const [caseTypeFilter, setCaseTypeFilter] = useState("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [showFiltersSidebar, setShowFiltersSidebar] = useState(false);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (Array.isArray(data)) {
        setDocuments(data);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  };

  useEffect(() => {
    fetchDocuments().finally(() => setLoading(false));
  }, []);

  // Get unique case types for filter options
  const uniqueCaseTypes = useMemo(() => {
    const caseTypes = [...new Set(documents.map(doc => doc.caseType))].filter(Boolean);
    return caseTypes.sort();
  }, [documents]);

  // Filtered documents based on search and filters
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.caseType.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filterValue === "all" || doc.documentStatus === filterValue;
      const matchesCaseType = caseTypeFilter === "all" || doc.caseType === caseTypeFilter;

      // Date range filtering
      let matchesDateRange = true;
      if (dateFromFilter || dateToFilter) {
        const docDate = new Date(doc.createdDate);
        if (dateFromFilter) {
          const fromDate = new Date(dateFromFilter);
          matchesDateRange = matchesDateRange && docDate >= fromDate;
        }
        if (dateToFilter) {
          const toDate = new Date(dateToFilter);
          matchesDateRange = matchesDateRange && docDate <= toDate;
        }
      }

      return matchesSearch && matchesStatus && matchesCaseType && matchesDateRange;
    });
  }, [documents, searchQuery, filterValue, caseTypeFilter, dateFromFilter, dateToFilter]);

  // Reset filters function
  const resetFilters = () => {
    setCaseTypeFilter("all");
    setDateFromFilter("");
    setDateToFilter("");
  };

  const submittedCount = documents.filter(d => d.documentStatus === "submitted").length;
  const pendingCount = documents.filter(d => d.documentStatus === "pending").length;

  // Active filters for display
  const activeFilters = useMemo(() => {
    const filters = [];
    if (searchQuery) {
      filters.push({
        label: `Search: "${searchQuery}"`,
        onRemove: () => setSearchQuery("")
      });
    }
    if (filterValue !== "all") {
      const statusLabel = filterValue === "submitted" ? "Submitted" : "Pending";
      filters.push({
        label: `Status: ${statusLabel}`,
        onRemove: () => setFilterValue("all")
      });
    }
    if (caseTypeFilter !== "all") {
      filters.push({
        label: `Case Type: ${caseTypeFilter}`,
        onRemove: () => setCaseTypeFilter("all")
      });
    }
    if (dateFromFilter) {
      filters.push({
        label: `From: ${dateFromFilter}`,
        onRemove: () => setDateFromFilter("")
      });
    }
    if (dateToFilter) {
      filters.push({
        label: `To: ${dateToFilter}`,
        onRemove: () => setDateToFilter("")
      });
    }
    return filters;
  }, [searchQuery, filterValue, caseTypeFilter, dateFromFilter, dateToFilter]);

  return (
    <main className="min-h-screen">
      <div className="max-w-8xl mx-auto space-y-5">
        <div>
          <p className="text-xl font-bold text-foreground">Documents</p>
          <p className="text-muted-foreground mt-1">Manage client documents and files</p>
        </div>

        {/* Summary Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {[1, 2].map((key) => (
              <LoadingSkeleton
                key={`summary-loading-${key}`}
                message={null}
                rowCount={2}
                rowWidths={["w-2/3", "w-1/2"]}
                cardClassName="rounded-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-none"
                contentClassName="p-2.5 space-y-2"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm">
              <CardContent className="p-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Documents Submitted</p>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">Documents Pending</p>
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
                        <span className="text-[15px] text-gray-500 dark:text-gray-400">{submittedCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="bg-white dark:bg-gray-900">
          <CardContent>
            <FilterBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchPlaceholder="Search by name or document ID..."
              filterValue={filterValue}
              setFilterValue={setFilterValue}
              filterOptions={[
                { value: "all", label: "All Documents" },
                { value: "submitted", label: "Submitted" },
                { value: "pending", label: "Pending" },
              ]}
              filterPlaceholder="Filter by status"
              onMoreFilters={() => setShowFiltersSidebar(true)}
            />
          </CardContent>
        </Card>

        {/* Active Filters */}
        <ActiveFilters filters={activeFilters} />

        {loading ? (
          <LoadingSkeleton
            message={null}
            rowCount={4}
            rowWidths={["w-full", "w-5/6", "w-2/3", "w-4/5"]}
            cardClassName="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-none rounded-lg"
            contentClassName="p-6 space-y-4"
          />
        ) : (
          <DocumentsTable documents={filteredDocuments} onUploadSuccess={fetchDocuments} />
        )}

        <FilterSidebar
          isOpen={showFiltersSidebar}
          onClose={() => setShowFiltersSidebar(false)}
          caseTypeFilter={caseTypeFilter}
          setCaseTypeFilter={setCaseTypeFilter}
          caseTypeOptions={[
            { value: "all", label: "All Case Types" },
            ...uniqueCaseTypes.map((caseType) => ({ value: caseType || "", label: caseType || "" })),
          ]}
          dateFromFilter={dateFromFilter}
          setDateFromFilter={setDateFromFilter}
          dateToFilter={dateToFilter}
          setDateToFilter={setDateToFilter}
          referralSourceFilter=""
          setReferralSourceFilter={() => {}}
          referralSourceOptions={[]}
          onResetFilters={resetFilters}
          showReferralSource={false}
        />
      </div>
    </main>
  );
}
