'use client';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Filter, Download } from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchPlaceholder?: string;
  filterValue: string;
  setFilterValue: (value: string) => void;
  filterOptions: FilterOption[];
  filterPlaceholder?: string;
  onMoreFilters?: () => void;
  onExport?: () => void;
  onExportCSV?: () => void;
  onExportExcel?: () => void;
  onExportJSON?: () => void;
  showExport?: boolean;
  showExportDropdown?: boolean;
}

export default function FilterBar({
  searchQuery,
  setSearchQuery,
  searchPlaceholder = "Search...",
  filterValue,
  setFilterValue,
  filterOptions,
  filterPlaceholder = "Filter by...",
  onMoreFilters,
  onExport,
  onExportCSV,
  onExportExcel,
  onExportJSON,
  showExport = false,
  showExportDropdown = false,
}: FilterBarProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
      <div className="flex-1 md:max-w-sm relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={searchPlaceholder}
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filterValue} onValueChange={setFilterValue}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={filterPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {onMoreFilters && (
          <Button variant="outline" onClick={onMoreFilters}>
            <Filter className="w-4 h-4 mr-2" /> More Filters
          </Button>
        )}

        {showExport && onExport && !showExportDropdown && (
          <Button variant="default" className="bg-green-500 hover:bg-green-600" onClick={onExport}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        )}

        {showExportDropdown && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" className="bg-green-500 hover:bg-green-600">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onExportCSV && (
                <DropdownMenuItem onClick={onExportCSV}>
                  Export as CSV
                </DropdownMenuItem>
              )}
              {onExportExcel && (
                <DropdownMenuItem onClick={onExportExcel}>
                  Export as Excel
                </DropdownMenuItem>
              )}
              {onExportJSON && (
                <DropdownMenuItem onClick={onExportJSON}>
                  Export as JSON
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}