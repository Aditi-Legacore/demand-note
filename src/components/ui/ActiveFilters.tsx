'use client';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ActiveFilter {
  label: string;
  onRemove: () => void;
  className?: string;
}

interface ActiveFiltersProps {
  filters: ActiveFilter[];
}

export default function ActiveFilters({ filters }: ActiveFiltersProps) {
  if (filters.length === 0) return null;

  const getFilterBadgeClass = (filter: ActiveFilter) => {
    if (filter.className) return filter.className;

    const label = filter.label.toLowerCase();

    if (label.startsWith("status:")) {
      if (label.includes("active")) {
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      }
      if (label.includes("initialized") || label.includes("inactive")) {
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      }
      if (label.includes("deleted")) {
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      }
      if (label.includes("completed")) {
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      }
      if (label.includes("draft")) {
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      }
      if (label.includes("initiated")) {
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      }
      if (label.includes("uploading")) {
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      }
      if (label.includes("uploaded")) {
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300";
      }
      if (label.includes("verified")) {
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
      }
      if (label.includes("generated")) {
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      }
      if (label.includes("published") || label.includes("sent")) {
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
      }
      if (label.includes("for review") || label.includes("notified")) {
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      }
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }

    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  };

return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.map((filter, index) => (
        <Badge key={index} variant="secondary" className={`flex items-center gap-1 ${getFilterBadgeClass(filter)}`}>
          {filter.label}
          <Button
            variant="ghost"
            size="icon"
            className="ml-1 w-4 h-4 p-0 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
            onClick={filter.onRemove}
            aria-label={`Remove ${filter.label} filter`}
          >
            <X size={12} />
          </Button>
        </Badge>
      ))}
    </div>
  );
}
