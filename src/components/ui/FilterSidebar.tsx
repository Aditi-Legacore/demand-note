'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  caseTypeFilter?: string;
  setCaseTypeFilter?: (value: string) => void;
  caseTypeOptions?: FilterOption[];
  dateFromFilter: string;
  setDateFromFilter: (value: string) => void;
  dateToFilter: string;
  setDateToFilter: (value: string) => void;
  referralSourceFilter?: string;
  setReferralSourceFilter?: (value: string) => void;
  referralSourceOptions?: FilterOption[];
  onResetFilters: () => void;
  showCaseType?: boolean;
  showReferralSource?: boolean;
}

export default function FilterSidebar({
  isOpen,
  onClose,
  caseTypeFilter,
  setCaseTypeFilter,
  caseTypeOptions,
  dateFromFilter,
  setDateFromFilter,
  dateToFilter,
  setDateToFilter,
  referralSourceFilter,
  setReferralSourceFilter,
  referralSourceOptions,
  onResetFilters,
  showCaseType = true,
  showReferralSource = true,
}: FilterSidebarProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-transparent bg-opacity-50 z-40"
        onClick={onClose}
      />
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-lg z-50 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">More Filters</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Case Type Filter */}
          {showCaseType && caseTypeOptions && (
            <div>
              <Label htmlFor="caseType" className="text-sm font-medium">Case Type</Label>
              <Select value={caseTypeFilter} onValueChange={setCaseTypeFilter}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="All Case Types" />
                </SelectTrigger>
                <SelectContent>
                  {caseTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Range Filters */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="dateFrom" className="text-sm font-medium">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dateTo" className="text-sm font-medium">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Referral Source Filter */}
          {showReferralSource && referralSourceOptions && (
            <div>
              <Label htmlFor="referralSource" className="text-sm font-medium">Referral Source</Label>
              <Select value={referralSourceFilter} onValueChange={setReferralSourceFilter}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  {referralSourceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={onResetFilters}
            className="flex-1"
          >
            Reset Filters
          </Button>
          <Button
            onClick={onClose}
            className="flex-1"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </>
  );
}
