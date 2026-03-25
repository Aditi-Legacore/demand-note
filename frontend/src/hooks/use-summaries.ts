import { useCallback, useEffect, useState } from "react";
import type { SummaryCommentRow, SummaryFilters } from "@/types/summary";

const initialFilters: SummaryFilters = {
  fromDate: "",
  toDate: "",
  promptVersionId: "",
};

const sortRows = (items: SummaryCommentRow[]) =>
  [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

export function useSummaries() {
  const [filters, setFilters] = useState<SummaryFilters>(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<SummaryCommentRow[]>([]);

  const fetchSummaries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.fromDate) params.set("fromDate", filters.fromDate);
      if (filters.toDate) params.set("toDate", filters.toDate);
      if (filters.promptVersionId) params.set("promptVersionId", filters.promptVersionId);

      const query = params.toString();
      const url = query ? `/api/summaries?${query}` : "/api/summaries";
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load summaries");
      }

      const rows: SummaryCommentRow[] = Array.isArray(data?.summaries)
        ? sortRows(data.summaries)
        : [];

      setSummaries(rows);
    } catch (err) {
      setSummaries([]);
      setError(err instanceof Error ? err.message : "Failed to load summaries");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchSummaries();
  }, [fetchSummaries]);

  const updateFilters = useCallback((changes: Partial<SummaryFilters>) => {
    setFilters((prev) => ({ ...prev, ...changes }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const refresh = useCallback(() => {
    void fetchSummaries();
  }, [fetchSummaries]);

  return {
    summaries,
    filters,
    updateFilters,
    resetFilters,
    isLoading,
    error,
    refresh,
  };
}
