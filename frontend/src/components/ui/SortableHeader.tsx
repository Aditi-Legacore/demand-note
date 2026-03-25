"use client";

import { ChevronUp, ChevronDown } from "lucide-react";
import React from "react";

export type SortDirection = "asc" | "desc" | null;

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  currentDirection: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

export default function SortableHeader({
  label,
  sortKey,
  currentSortKey,
  currentDirection,
  onSort,
  className = "",
}: SortableHeaderProps) {
  const isActive = currentSortKey === sortKey;
  const iconColor = isActive ? "text-blue-600 dark:text-blue-400" : "text-black";

  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`cursor-pointer select-none px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition ${className}`}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className={iconColor}>
          {isActive ? (
            currentDirection === "asc" ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )
          ) : (
            <ChevronUp size={14} className="opacity-25" />
          )}
        </span>
      </div>
    </th>
  );
}
