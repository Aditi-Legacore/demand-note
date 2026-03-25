'use client';

import { useState, useEffect, useMemo } from "react";
import { Plus, Loader2, ClipboardList, CheckCircle2, FileClock } from 'lucide-react';
import CaseIntakeManagement from "@/components/table/IntakeTable";
import FilterBar from "@/components/ui/FilterBar";
import FilterSidebar from "@/components/ui/FilterSidebar";
import ActiveFilters from "@/components/ui/ActiveFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import NewIntakeModal from '@/components/NewIntakeModal';
import Pagination from "@/components/ui/pagination";
import LoadingSkeleton from "@/components/ui/loading-skeleton";
import { useGlobalSearch } from "@/contexts/GlobalSearchContext";

interface IntakeData {
  id: string;
  clientName: string;
  isDraft: boolean;
  createdAt: string;
  accidentDate: string;
  accidentDescription: string | null | undefined;
  Lead?: { caseType: string };
}

export default function IntakeList() {
  const [intakesData, setIntakesData] = useState<IntakeData[]>([]);
  const [loading, setLoading] = useState(true);
  const { query: searchQuery, setQuery: setSearchQuery } = useGlobalSearch();
  const [filterValue, setFilterValue] = useState("all");
  const [caseTypeFilter, setCaseTypeFilter] = useState("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [showFiltersSidebar, setShowFiltersSidebar] = useState(false);
  const [loadingNew] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Fetch intake data
  useEffect(() => {
    async function fetchIntakes() {
      try {
        const res = await fetch("/api/intake");
        const data = await res.json();
        if (Array.isArray(data)) {
          setIntakesData(data);
        }
      } catch (err) {
        console.error("Error fetching intakes:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchIntakes();
  }, []);

  // Get unique case types for filter options
  const uniqueCaseTypes = useMemo(() => {
    const caseTypes = [...new Set(intakesData.map(intake => intake.Lead?.caseType || "N/A"))].filter(Boolean);
    return caseTypes.sort();
  }, [intakesData]);

  // Filtered intakes based on search and filters
  const filteredIntakes = useMemo(() => {
    return intakesData.filter((intake) => {
      const matchesSearch =
        intake.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intake.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intake.Lead?.caseType.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filterValue === "all" ||
        (filterValue === "completed" && !intake.isDraft) ||
        (filterValue === "draft" && intake.isDraft);

      const matchesCaseType = caseTypeFilter === "all" ||
        intake.Lead?.caseType === caseTypeFilter;

      // Date range filtering
      let matchesDateRange = true;
      if (dateFromFilter || dateToFilter) {
        const intakeDate = new Date(intake.createdAt);
        if (dateFromFilter) {
          const fromDate = new Date(dateFromFilter);
          matchesDateRange = matchesDateRange && intakeDate >= fromDate;
        }
        if (dateToFilter) {
          const toDate = new Date(dateToFilter);
          matchesDateRange = matchesDateRange && intakeDate <= toDate;
        }
      }

      return matchesSearch && matchesStatus && matchesCaseType && matchesDateRange;
    });
  }, [intakesData, searchQuery, filterValue, caseTypeFilter, dateFromFilter, dateToFilter]);

  // Paginated intakes
  const paginatedIntakes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredIntakes.slice(startIndex, endIndex);
  }, [filteredIntakes, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterValue, caseTypeFilter, dateFromFilter, dateToFilter]);

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
      const statusLabel = filterValue === "completed" ? "Completed" : "Drafts";
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
  }, [searchQuery, filterValue, caseTypeFilter, dateFromFilter, dateToFilter, setSearchQuery]);

  // Reset filters function
  const resetFilters = () => {
    setCaseTypeFilter("all");
    setDateFromFilter("");
    setDateToFilter("");
  };

  const handleNewIntake = () => {
    setShowIntakeModal(true);
  };

  // Calculate counts for display
  const totalCount = intakesData.length;
  const completedCount = intakesData.filter(i => !i.isDraft).length;
  const draftCount = intakesData.filter(i => i.isDraft).length;

  return (
    <main className="min-h-screen">
      <div className="max-w-8xl mx-auto space-y-5">
        {/* Page Header */}
        <div className="flex justify-between items-start  dark:border-gray-600">
          <div>
            <p className="text-xl font-bold text-foreground">Case Intake Management</p>
            <p className="text-muted-foreground mt-1">Manage and track all case intakes</p>
          </div>
          <Button
            onClick={handleNewIntake}
            disabled={loadingNew}
            variant="default"
          >
            {loadingNew ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            {loadingNew ? 'Loading...' : 'Intake'}
          </Button>
        </div>

        {/* Summary Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            {["total", "completed", "drafts"].map((key) => (
              <LoadingSkeleton
                key={key}
                message={null}
                rowCount={3}
                cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
                contentClassName="p-2.5 space-y-3"
                rowWidths={["w-3/4", "w-5/6", "w-2/3"]}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm">
              <CardContent className="p-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Intakes</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{totalCount}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="p-1 bg-blue-50 dark:bg-blue-900/30 rounded-sm">
                      <ClipboardList className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span className="text-[15px] text-gray-500 dark:text-gray-400">{completedCount}</span>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{completedCount}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="p-1 bg-green-50 dark:bg-green-900/30 rounded-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span className="text-[15px] text-gray-500 dark:text-gray-400">{completedCount}</span>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">Drafts</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{draftCount}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="p-1 bg-amber-50 dark:bg-amber-900/30 rounded-sm">
                      <FileClock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span className="text-[15px] text-gray-500 dark:text-gray-400">{draftCount}</span>
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
          </div>
        )}

        {/* Filter Bar Card */}
        {/* {loading ? (
          <LoadingSkeleton
            message={null}
            rowCount={3}
            cardClassName="shadow-sm"
            contentClassName="p-6 space-y-3"
            rowWidths={["w-full", "w-4/6", "w-5/6"]}
          />
        ) : ( */}
          <Card className="bg-white dark:bg-gray-900">
            <CardContent>
              <FilterBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchPlaceholder="Search by client name or case type..."
                filterValue={filterValue}
                setFilterValue={setFilterValue}
                filterOptions={[
                  { value: "all", label: "All Intakes" },
                  { value: "completed", label: "Completed" },
                  { value: "draft", label: "Drafts" },
                ]}
                filterPlaceholder="Filter by status"
                onMoreFilters={() => setShowFiltersSidebar(true)}
              />
            </CardContent>
          </Card>
        {/* )} */}

        {!loading && <ActiveFilters filters={activeFilters} />}

        {/* Main Table */}
        {loading ? (
          <LoadingSkeleton
            message="Loading intakes..."
            rowCount={5}
            cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
            contentClassName="p-4 space-y-3"
            rowWidths={["w-full", "w-5/6", "w-full", "w-3/4", "w-4/6"]}
          />
        ) : (
          <CaseIntakeManagement
            intakes={paginatedIntakes}
            onDelete={(id: string) => setIntakesData(prev => prev.filter(intake => intake.id !== id))}
          />
        )}

        {/* Pagination */}
        {!loading && (
          <Pagination
            totalItems={filteredIntakes.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        )}

        {/* Filter Sidebar */}
        <FilterSidebar
          isOpen={showFiltersSidebar}
          onClose={() => setShowFiltersSidebar(false)}
          caseTypeFilter={caseTypeFilter}
          setCaseTypeFilter={setCaseTypeFilter}
          caseTypeOptions={[
            { value: "all", label: "All Case Types" },
            ...uniqueCaseTypes.map((caseType) => ({ value: caseType, label: caseType })),
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

        {/* New Intake Modal */}
        {showIntakeModal && <NewIntakeModal onClose={() => setShowIntakeModal(false)} />}
      </div>
    </main>
  );
}
