"use client";

import { cn } from "@/lib/utils";
import type { ChangeEvent } from "react";

export interface CalendarProps {
  mode?: "single";
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  initialFocus?: boolean;
  className?: string;
}

export function Calendar({
  selected,
  onSelect,
  className = "",
}: CalendarProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (!value) {
      onSelect?.(undefined);
      return;
    }
    const nextDate = new Date(value);
    if (!Number.isNaN(nextDate.getTime())) {
      onSelect?.(nextDate);
    }
  };

  return (
    <div className={cn("px-4 py-3", className)}>
      <input
        type="date"
        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        value={selected ? selected.toISOString().substring(0, 10) : ""}
        onChange={handleChange}
      />
    </div>
  );
}
