import { useCallback, useEffect, useState } from "react";
import type { PromptVersionOption } from "@/types/summary";

type PromptVersionPayload = {
  id?: string | null;
  version?: number | null;
};
type PromptVersionCandidate = {
  id: string;
  version?: number;
};

export function usePromptVersions() {
  const [promptVersions, setPromptVersions] = useState<PromptVersionOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPromptVersions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/prompt-versions", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load prompt versions");
      }

      const payload = Array.isArray(data?.promptVersions)
        ? data.promptVersions
        : Array.isArray(data?.prompt_versions)
        ? data.prompt_versions
        : [];

      const options = payload
        .map((item: PromptVersionPayload): PromptVersionCandidate => ({
          id: typeof item?.id === "string" ? item.id : "",
          version: typeof item?.version === "number" ? item.version : undefined,
        }))
        .filter(
          (option: PromptVersionCandidate): option is PromptVersionOption =>
            option.id.length > 0 && typeof option.version === "number"
        );

      setPromptVersions(options);
    } catch (err) {
      setPromptVersions([]);
      setError(err instanceof Error ? err.message : "Failed to load prompt versions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPromptVersions();
  }, [fetchPromptVersions]);

  const refresh = useCallback(() => {
    void fetchPromptVersions();
  }, [fetchPromptVersions]);

  return { promptVersions, isLoading, error, refresh };
}
