'use client';

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import LeadsTable from "@/components/table/LeadsTable";
import { Lead } from "@/types/leads";
import Pagination from "@/components/ui/pagination";
import FilterBar from "@/components/ui/FilterBar";
import FilterSidebar from "@/components/ui/FilterSidebar";
import ActiveFilters from "@/components/ui/ActiveFilters";
import LoadingSkeleton from "@/components/ui/loading-skeleton";
import { BarChart3, Clock3, Sparkles } from "lucide-react";

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [caseTypeFilter, setCaseTypeFilter] = useState("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [referralSourceFilter, setReferralSourceFilter] = useState("all");
  const [showFiltersSidebar, setShowFiltersSidebar] = useState(false);
  const [leadsData, setLeadsData] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads');
      if (response.ok) {
        const data = await response.json();
        setLeadsData(data);
      } else {
        console.error('Failed to fetch leads');
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Get unique case types and referral sources for filter options
  const uniqueCaseTypes = useMemo(() => {
    const caseTypes = [...new Set(leadsData.map(lead => lead.caseType))].filter(Boolean);
    return caseTypes.sort();
  }, [leadsData]);

  const uniqueReferralSources = useMemo(() => {
    const sources = [...new Set(leadsData.map(lead => lead.referralSource))].filter(Boolean);
    return sources.sort();
  }, [leadsData]);

  // Filtered leads based on all filters
  const filteredLeads = useMemo(() => {
    return leadsData.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery) ||
        lead.caseType.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchesCaseType = caseTypeFilter === "all" || lead.caseType === caseTypeFilter;
      const matchesReferralSource = referralSourceFilter === "all" || lead.referralSource === referralSourceFilter;

      // Date range filtering
      let matchesDateRange = true;
      if (dateFromFilter || dateToFilter) {
        const leadDate = new Date(lead.dueDate);
        if (dateFromFilter) {
          const fromDate = new Date(dateFromFilter);
          matchesDateRange = matchesDateRange && leadDate >= fromDate;
        }
        if (dateToFilter) {
          const toDate = new Date(dateToFilter);
          matchesDateRange = matchesDateRange && leadDate <= toDate;
        }
      }

      return matchesSearch && matchesStatus && matchesCaseType && matchesReferralSource && matchesDateRange;
    });
  }, [leadsData, searchQuery, statusFilter, caseTypeFilter, dateFromFilter, dateToFilter, referralSourceFilter]);

  // Paginated leads
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLeads.slice(startIndex, endIndex);
  }, [filteredLeads, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, caseTypeFilter, dateFromFilter, dateToFilter, referralSourceFilter]);

  // Reset filters function
  const resetFilters = () => {
    setCaseTypeFilter("all");
    setDateFromFilter("");
    setDateToFilter("");
    setReferralSourceFilter("all");
  };

  // Status counts for cards
  const completedCount = leadsData.filter((l: Lead) => l.status === "completed").length;
  const inProgressCount = leadsData.filter((l: Lead) => l.status === "in_progress").length;
  const newCount = leadsData.filter((l: Lead) => l.status === "new").length;

  // Active filters for display
  const activeFilters = useMemo(() => {
    const filters = [];
    if (searchQuery) {
      filters.push({
        label: `Search: "${searchQuery}"`,
        onRemove: () => setSearchQuery("")
      });
    }
    if (statusFilter !== "all") {
      const statusLabel = statusFilter === "new" ? "New" : statusFilter === "in_progress" ? "In Progress" : "Completed";
      filters.push({
        label: `Status: ${statusLabel}`,
        onRemove: () => setStatusFilter("all")
      });
    }
    if (caseTypeFilter !== "all") {
      filters.push({
        label: `Case Type: ${caseTypeFilter}`,
        onRemove: () => setCaseTypeFilter("all")
      });
    }
    if (referralSourceFilter !== "all") {
      filters.push({
        label: `Referral Source: ${referralSourceFilter}`,
        onRemove: () => setReferralSourceFilter("all")
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
  }, [searchQuery, statusFilter, caseTypeFilter, referralSourceFilter, dateFromFilter, dateToFilter]);

  return (
    <main className="min-h-screen">
      <div className="max-w-8xl mx-auto space-y-5">

{/* Page Header */}
        <div>
          <p className="text-xl font-bold text-foreground">Leads</p>
          <p className="text-muted-foreground mt-1">Manage and track all client intake leads</p>
        </div>

        {/* Summary Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            {["completed", "inProgress", "new"].map((key) => (
              <LoadingSkeleton
                key={key}
                message={null}
                rowCount={3}
                rowWidths={["w-3/4", "w-1/2", "w-2/3"]}
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">Completed Leads</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{completedCount}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="p-1 bg-green-50 dark:bg-green-900/30 rounded-sm">
                      <Sparkles className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span className="text-[15px] text-gray-500 dark:text-gray-400">{completedCount}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        <span className="text-[15px] text-gray-500 dark:text-gray-400">{newCount}</span>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">In Progress Leads</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{inProgressCount}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="p-1 bg-amber-50 dark:bg-amber-900/30 rounded-sm">
                      <Clock3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span className="text-[15px] text-gray-500 dark:text-gray-400">{inProgressCount}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        <span className="text-[15px] text-gray-500 dark:text-gray-400">{completedCount}</span>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">New Leads</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{newCount}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="p-1 bg-blue-50 dark:bg-blue-900/30 rounded-sm">
                      <BarChart3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span className="text-[15px] text-gray-500 dark:text-gray-400">{newCount}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        <span className="text-[15px] text-gray-500 dark:text-gray-400">{inProgressCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters/Search */}
        <Card className="bg-white dark:bg-gray-900">
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex-1">
                <FilterBar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  searchPlaceholder="Search by name, contact, or case type..."
                  filterValue={statusFilter}
                  setFilterValue={setStatusFilter}
                  filterOptions={[
                    { value: "all", label: "All Status" },
                    { value: "new", label: "New" },
                    { value: "in_progress", label: "In Progress" },
                    { value: "completed", label: "Completed" },
                  ]}
                  filterPlaceholder="Filter by status"
                  onMoreFilters={() => setShowFiltersSidebar(true)}
                />
              </div>
              {/* <Button
                className="bg-green-400 hover:bg-success/90 text-success-foreground"
                onClick={() => setShowQuickIntake(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Quick Intake
              </Button> */}
            </div>
          </CardContent>
        </Card>

        {/* Active Filters */}
        <ActiveFilters filters={activeFilters} />

        {/* Leads Table */}
        {loading ? (
          <LoadingSkeleton message="Loading leads..." rowCount={5} cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
          contentClassName="p-4 space-y-3" />
        ) : (
          <LeadsTable leads={paginatedLeads} onLeadUpdate={fetchLeads} />
        )}

        {/* Pagination */}
        <Pagination
          totalItems={filteredLeads.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />

        {/* Quick Intake Modal */}
        {/* {showQuickIntake && (
          <div className="fixed inset-0 bg-white dark:bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl w-full max-w-2xl shadow-lg h-[90vh] overflow-y-auto">
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowQuickIntake(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>
              <QuickIntakeForm onClose={() => setShowQuickIntake(false)} />
            </div>
          </div>
        )} */}

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
          referralSourceFilter={referralSourceFilter}
          setReferralSourceFilter={setReferralSourceFilter}
          referralSourceOptions={[
            { value: "all", label: "All Sources" },
            ...uniqueReferralSources.map((source) => ({ value: source || "", label: source || "" })),
          ]}
          onResetFilters={resetFilters}
        />

      </div>
    </main>
  );
}
