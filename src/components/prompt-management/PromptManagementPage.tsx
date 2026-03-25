"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import type { MouseEvent } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Copy,
  Eye,
  EyeOff,
  Filter,
  Loader2,
  RefreshCcw,
  Save,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Undo2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { isAppAdminSession } from "@/lib/roles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoadingSkeleton from "@/components/ui/loading-skeleton";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSummaries } from "@/hooks/use-summaries";
import { formatPromptVersionLabel } from "@/lib/format-prompt-version";
import type { SummaryCommentRow } from "@/types/summary";

type PromptItem = {
  id: string;
  doc_type: string;
  prompt: string;
  version: number;
  active_flag: boolean;
  deleted_flag: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  created_by_name: string | null;
};

type PendingAction =
  | { type: "docType"; value: string }
  | { type: "version"; value: string }
  | { type: "revert" };

const DOC_TYPE_SUGGESTIONS = ["demand_note", "medical", "traffic", "bills"];

export default function PromptManagementPage() {
  const { data: session } = useSession();
  const docTypeAlertRef = useRef<string | null>(null);
  const [docType, setDocType] = useState(DOC_TYPE_SUGGESTIONS[0]);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [promptText, setPromptText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isApplyingRevert, setIsApplyingRevert] = useState(false);
  const isReverting = isApplyingRevert;
  const [dialogMode, setDialogMode] = useState<"unsaved" | "revertConfirm">(
    "unsaved"
  );
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [expandedPromptIds, setExpandedPromptIds] = useState<string[]>([]);
  const [deleteDialogPrompt, setDeleteDialogPrompt] = useState<PromptItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedSummaryId, setExpandedSummaryId] = useState<string | null>(null);
  const [isMainCommentHovered, setIsMainCommentHovered] = useState(false);

  const canUseRevert = isAppAdminSession(session);
  const {
    summaries,
    filters,
    updateFilters,
    resetFilters,
    isLoading: summariesLoading,
    error: summariesError,
    refresh: refreshSummaries,
  } = useSummaries();
  const [isSummaryExplorerOpen, setIsSummaryExplorerOpen] = useState(false);
  const selectedPrompt = useMemo(
    () => prompts.find((p) => p.id === selectedPromptId) ?? null,
    [prompts, selectedPromptId]
  );

  const activePrompt = useMemo(
    () => prompts.find((p) => p.active_flag && !p.deleted_flag) ?? null,
    [prompts]
  );

  const historyList = useMemo(
    () =>
      [...prompts].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [prompts]
  );

  const nonDeletedPrompts = useMemo(
    () => historyList.filter((p) => !p.deleted_flag),
    [historyList]
  );

  const nonDeletedCount = nonDeletedPrompts.length;
  const currentEditorPromptId = selectedPrompt?.id ?? activePrompt?.id ?? "";
  const previousPrompt = useMemo(() => {
    if (!activePrompt) return null;
    const activeIndex = historyList.findIndex((prompt) => prompt.id === activePrompt.id);
    if (activeIndex === -1) return historyList[0] ?? null;
    return historyList[activeIndex + 1] ?? null;
  }, [activePrompt, historyList]);
  // const currentVersionNumber = selectedPrompt?.version ?? activePrompt?.version ?? null;

  useEffect(() => {
    setExpandedSummaryId(null);
  }, [summaries]);

  const copyCommentToClipboard = useCallback(async (text: string) => {
    if (!text) {
      toast.error("Nothing to copy");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast.error("Clipboard access is unavailable");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Comment copied");
    } catch (error) {
      console.error("Failed to copy comment", error);
      toast.error("Failed to copy comment");
    }
  }, []);

  function renderCommentCell(
    summary: SummaryCommentRow,
    className = "px-3 py-3",
    onHoverChange?: (hovering: boolean) => void
  ) {
    const commentText = summary.comment ?? "No comment available.";
    const commenter =
      summary.user?.firstName ??
      summary.user?.email ??
      "Unknown user";
    const relativeTime = formatDistanceToNow(new Date(summary.createdAt), {
      addSuffix: true,
    });
    const handleMouseEnter = () => onHoverChange?.(true);
    const handleMouseLeave = () => onHoverChange?.(false);

    return (
      <td className={className}>
        <div
          className="group relative inline-flex max-w-[240px] flex-col gap-1"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="space-y-1">
            <p className="text-sm text-slate-700 truncate">{commentText}</p>
            <span className="text-xs text-slate-400">
              {commenter} · {relativeTime}
            </span>
          </div>
          <div className="pointer-events-none absolute left-0 top-full z-40 mt-2 w-[320px] scale-95 opacity-0 transition-all duration-150 ease-out group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Comment
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-0"
                  aria-label="Copy comment"
                  onClick={() => copyCommentToClipboard(commentText)}
                  type="button"
                >
                  <Copy className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
              <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap break-words">
                {commentText}
              </p>
            </div>
          </div>
        </div>
      </td>
    );
  };

  const summaryExplorerSection = (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xl font-bold text-foreground">Summary Explorer</p>
          <p className="mt-1 text-sm text-slate-500">
            Filter summary comments by date or prompt version and inspect each entry&apos;s context.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Summary comments: {summaries.length}</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshSummaries}
            disabled={summariesLoading}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="summary-from-date">From date</Label>
          <input
            id="summary-from-date"
            type="date"
            value={filters.fromDate}
            onChange={(event) => updateFilters({ fromDate: event.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="summary-to-date">To date</Label>
          <input
            id="summary-to-date"
            type="date"
            value={filters.toDate}
            onChange={(event) => updateFilters({ toDate: event.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="summary-prompt-version">Prompt version</Label>
          <select
            id="summary-prompt-version"
            value={filters.promptVersionId}
            onChange={(event) =>
              updateFilters({ promptVersionId: event.target.value })
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All versions</option>
            {prompts.map((option) => (
              <option key={option.id} value={option.id}>
                {formatPromptVersionLabel(option.version)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label className="opacity-0 md:block">Action</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              disabled={summariesLoading}
            >
              Clear filters
            </Button>
          </div>
        </div>
      </div>
      {summariesLoading ? (
        <LoadingSkeleton
          message="Loading summary records..."
          rowCount={4}
          cardClassName="mt-4 rounded-lg border border-slate-200 shadow-sm"
          contentClassName="p-4 space-y-3"
        />
      ) : (
        <div className="mt-4 overflow-visible rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Prompt version</th>
                <th className="px-3 py-2">Summary</th>
                <th className="px-3 py-2">Comment</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {summaries.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-sm text-slate-500"
                  >
                    No summaries match the filters.
                  </td>
                </tr>
              )}
              {summaries.map((summary) => {
                const summaryText =
                  summary.editedSummary ??
                  summary.outputSummary ??
                  "No summary available.";
                const commentText = summary.comment ?? "No comment available.";
                const commenter =
                  summary.user?.firstName ??
                  summary.user?.email ??
                  "Unknown user";
                const isExpanded = expandedSummaryId === summary.id;
                return (
                  <Fragment key={summary.id}>
                    <tr className="border-b border-slate-200">
                      <td className="px-3 py-3 font-medium">
                        {format(new Date(summary.createdAt), "MMM d, yyyy h:mm a")}
                      </td>
                      <td className="px-3 py-3">
                        {summary.demandNote?.clientName ??
                          summary.demandFile?.clientName ??
                          "Unknown client"}
                      </td>
                      <td className="px-3 py-3">
                        {summary.promptVersionNumber != null
                          ? formatPromptVersionLabel(summary.promptVersionNumber)
                          : summary.promptVersionId ?? "—"}
                      </td>
                      <td className="px-3 py-3 max-w-[220px]">
                        <p className="text-sm text-slate-700 truncate">{summaryText}</p>
                      </td>
                      {renderCommentCell(summary)}
                      <td className="px-3 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setExpandedSummaryId(isExpanded ? null : summary.id)
                          }
                        >
                          {isExpanded ? "Hide" : "View"}
                        </Button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="px-3 py-5 bg-slate-50">
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Full summary
                              </p>
                              <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                                {summaryText}
                              </p>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Comment
                                </p>
                                <span className="text-xs text-slate-500">{commenter}</span>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  <p className="font-semibold text-slate-900">{commenter}</p>
                                  <span>
                                    {formatDistanceToNow(new Date(summary.createdAt), {
                                      addSuffix: true,
                                    })}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                                  {commentText}
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>

          </table>
        </div>
      )}
      {summariesError && (
        <p className="mt-3 text-sm text-rose-600">{summariesError}</p>
      )}
    </section>
  );

  const selectedPromptBusy = selectedPrompt ? actionLoadingId === selectedPrompt.id : false;
  const disableActivateButton =
    !selectedPrompt || selectedPromptBusy || (selectedPrompt && selectedPrompt.active_flag);
  const disableDeleteButton =
    !selectedPrompt ||
    selectedPromptBusy ||
    (selectedPrompt?.active_flag && nonDeletedCount <= 1);

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedPrompt) {
      return promptText.trim().length > 0;
    }
    return selectedPrompt.prompt.trim() !== promptText.trim();
  }, [promptText, selectedPrompt]);

  const applyVersionSelection = (nextId: string) => {
    setSelectedPromptId(nextId);
    const nextPrompt = prompts.find((p) => p.id === nextId);
    setPromptText(nextPrompt?.prompt ?? "");
  };

  const applyPendingAction = (action: PendingAction) => {
    if (!action) return;
    if (action.type === "docType") {
      setDocType(action.value);
      return;
    }
    if (action.type === "version") {
      applyVersionSelection(action.value);
      return;
    }
    if (action.type === "revert") {
      openRevertDialog({ skipUnsavedCheck: true });
    }
  };

  const handleDocTypeSelection = (nextDocType: string) => {
    if (nextDocType === docType) return;
    if (hasUnsavedChanges) {
      setPendingAction({ type: "docType", value: nextDocType });
      setDialogMode("unsaved");
      setIsSaveDialogOpen(true);
      return;
    }
    setDocType(nextDocType);
  };

  const handleVersionSelectionChange = (nextId: string) => {
    if (nextId === selectedPromptId) return;
    if (hasUnsavedChanges) {
      setPendingAction({ type: "version", value: nextId });
      setDialogMode("unsaved");
      setIsSaveDialogOpen(true);
      return;
    }
    applyVersionSelection(nextId);
  };

  const handleSaveDialogSave = async () => {
    if (!pendingAction) return;
    const action = pendingAction;
    const saved = await handleSaveOrUpdate();
    if (!saved) return;
    setPendingAction(null);
    setIsSaveDialogOpen(false);
    applyPendingAction(action);
  };

  const handleSaveDialogDiscard = () => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    setIsSaveDialogOpen(false);
    applyPendingAction(action);
  };

  const toggleExpandedPrompt = (id: string) => {
    setExpandedPromptIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopyPrompt = async (value: string) => {
    if (!navigator?.clipboard) {
      toast.error("Clipboard access not available");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Prompt copied");
    } catch {
      toast.error("Clipboard access denied");
    }
  };

  const fetchPrompts = async (targetDocType: string) => {
    const normalized = targetDocType.trim();
    if (!normalized) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/prompts?doc_type=${encodeURIComponent(normalized)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch prompts");

      const list: PromptItem[] = data.prompts || [];
      setPrompts(list);
      setExpandedPromptIds([]);
      if (list.length === 0) {
        docTypeAlertRef.current = null;
        toast.info(`Doc type ${normalized} has at least one prompt`);
      } else if (docTypeAlertRef.current !== normalized) {
        docTypeAlertRef.current = normalized;
      }

      const active = list.find((p) => p.active_flag && !p.deleted_flag) ?? null;
      if (active) {
        setSelectedPromptId(active.id);
        setPromptText(active.prompt);
      } else {
        setSelectedPromptId("");
        setPromptText("");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch prompts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts(docType);
  }, [docType]);

  const handleSaveOrUpdate = async () => {
    const normalizedDocType = docType.trim();
    const normalizedPrompt = promptText.trim();
    if (!normalizedDocType || !normalizedPrompt) {
      toast.error("doc_type and prompt are required");
      return false;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_type: normalizedDocType,
          prompt: normalizedPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save prompt");

      if (data?.capped_to_v5) {
        toast.success("Reached v5 cap. Updated v5 as active.");
      } else {
        toast.success("Created new prompt version");
      }
      await fetchPrompts(normalizedDocType);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save prompt");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // const handleLoad = (item: PromptItem) => {
  //   applyVersionSelection(item.id);
  // };

  const openRevertDialog = (options?: { skipUnsavedCheck?: boolean }) => {
    if (!canUseRevert) {
      toast.error("Only App Admin can revert versions.");
      return;
    }
    if (!previousPrompt) {
      toast.error("No previous version available to revert.");
      return;
    }
    if (!options?.skipUnsavedCheck && hasUnsavedChanges) {
      setPendingAction({ type: "revert" });
      setDialogMode("unsaved");
      setIsSaveDialogOpen(true);
      return;
    }
    setPendingAction({ type: "revert" });
    setDialogMode("revertConfirm");
    setIsSaveDialogOpen(true);
  };

  const handleOpenRevertDialog = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    openRevertDialog();
  };

  const logRevertAudit = async (item: PromptItem) => {
    try {
      await fetch("/api/prompts/revert-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_id: item.id,
          doc_type: item.doc_type,
          version: item.version,
        }),
      });
    } catch {
      // Avoid blocking the editor-load flow if audit logging fails.
    }
  };

  const handleApplyRevert = async () => {
    if (!previousPrompt) {
      toast.error("No previous version available to revert.");
      return;
    }

    const normalizedDocType = docType.trim();
    if (!normalizedDocType) {
      toast.error("doc_type is required");
      return;
    }

    setIsApplyingRevert(true);
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_type: normalizedDocType,
          prompt: previousPrompt.prompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to apply revert");

      await fetchPrompts(normalizedDocType);
      setIsSaveDialogOpen(false);
      setPendingAction(null);
      setDialogMode("unsaved");
      void logRevertAudit(previousPrompt);

      if (data?.capped_to_v5) {
        toast.success(
          `Reverted to v${previousPrompt.version}. Version cap reached, active prompt updated at v5.`
        );
      } else {
        toast.success(
          `Reverted to v${previousPrompt.version}. A new active version was created.`
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply revert");
    } finally {
      setIsApplyingRevert(false);
    }
  };

  const handleDialogConfirm = async () => {
    if (dialogMode === "revertConfirm") {
      await handleApplyRevert();
      return;
    }
    await handleSaveDialogSave();
  };

  const handleDialogCancel = () => {
    if (dialogMode === "revertConfirm") {
      setIsSaveDialogOpen(false);
      setPendingAction(null);
      setDialogMode("unsaved");
      return;
    }
    handleSaveDialogDiscard();
  };

  const handleToggleActive = async (item: PromptItem) => {
    if (item.deleted_flag) return;
    setActionLoadingId(item.id);
    try {
      const endpoint = item.active_flag
        ? `/api/prompts/${item.id}/deactivate`
        : `/api/prompts/${item.id}/activate`;
      const res = await fetch(endpoint, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error ||
          (item.active_flag ? "Failed to set version inactive" : "Failed to set version active")
        );
      }
      toast.success(
        item.active_flag
          ? `Version v${item.version} set inactive`
          : `Version v${item.version} set active`
      );
      await fetchPrompts(docType);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : item.active_flag
            ? "Failed to set version inactive"
            : "Failed to set version active"
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const openDeleteDialog = (item: PromptItem) => {
    if (item.deleted_flag) return;
    if (item.active_flag && nonDeletedCount <= 1) {
      toast.error(
        "Cannot delete the only active version. Create or activate another version first."
      );
      return;
    }
    setDeleteDialogPrompt(item);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeleteDialogPrompt(null);
  };

  const performDelete = async (item: PromptItem) => {
    if (item.deleted_flag) return false;
    if (item.active_flag && nonDeletedCount <= 1) {
      toast.error(
        "Cannot delete the only active version. Create or activate another version first."
      );
      return false;
    }
    setActionLoadingId(item.id);
    try {
      const res = await fetch(`/api/prompts/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete version");
      toast.success(`Version v${item.version} permanently deleted`);
      await fetchPrompts(docType);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete version");
      return false;
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialogPrompt) return;
    setIsDeleting(true);
    const deleted = await performDelete(deleteDialogPrompt);
    setIsDeleting(false);
    if (deleted) {
      closeDeleteDialog();
    }
  };

  return (
    <main className="min-h-screen">
      <Sheet
        open={isSummaryExplorerOpen}
        onOpenChange={setIsSummaryExplorerOpen}
        modal={true}
      >
        <SheetContent side="right" className="p-0 max-w-5xl w-full">
          <div className="h-full w-full max-h-screen overflow-y-auto bg-transparent px-6 py-6">
            {summaryExplorerSection}
          </div>
        </SheetContent>
      </Sheet>
      <div className="mx-auto max-w-8xl space-y-5 ">
        <section className="hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-gray-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xl font-bold text-foreground">Summary Explorer</p>
              <p className="mt-1 text-sm text-slate-500">
                Filter summary comments by date or prompt version and drill in on each entry.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Summary comments: {summaries.length}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshSummaries}
                disabled={summariesLoading}
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="summary-from-date">From date</Label>
              <input
                id="summary-from-date"
                type="date"
                value={filters.fromDate}
                onChange={(event) => updateFilters({ fromDate: event.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary-to-date">To date</Label>
              <input
                id="summary-to-date"
                type="date"
                value={filters.toDate}
                onChange={(event) => updateFilters({ toDate: event.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary-prompt-version">Prompt version</Label>
              <select
                id="summary-prompt-version"
                value={filters.promptVersionId}
                onChange={(event) =>
                  updateFilters({ promptVersionId: event.target.value })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All versions</option>
                {prompts.map((option) => (
                  <option key={option.id} value={option.id}>
                    {formatPromptVersionLabel(option.version)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="opacity-0 md:block">Action</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  disabled={summariesLoading}
                >
                  Clear filters
                </Button>
              </div>
            </div>
          </div>
          {summariesLoading ? (
            <LoadingSkeleton
              message="Loading summary records..."
              rowCount={4}
              cardClassName="mt-4 rounded-lg border border-slate-200 shadow-sm"
              contentClassName="p-4 space-y-3"
            />
          ) : (
          <div
            className={`mt-4 ${
              isMainCommentHovered ? "overflow-x-visible" : "overflow-x-auto"
            } overflow-y-visible rounded-lg border border-slate-200 bg-white`}
          >
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Demand note</th>
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2">Prompt ID</th>
                    <th className="px-3 py-2">Prompt version</th>
                    <th className="px-3 py-2">Summary</th>
                    <th className="px-3 py-2">Comment</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-6 text-center text-sm text-slate-500"
                      >
                        No summaries match the filters.
                      </td>
                    </tr>
                  )}
                  {summaries.map((summary) => {
                    const summaryText =
                      summary.editedSummary ??
                      summary.outputSummary ??
                      "No summary available.";
                    const commentText = summary.comment ?? "No comment available.";
                    const commenter =
                      summary.user?.firstName ??
                      summary.user?.email ??
                      "Unknown user";
                    const isExpanded = expandedSummaryId === summary.id;
                    return (
                      <Fragment key={summary.id}>
                        <tr className="border-b border-slate-200">
                          <td className="px-3 py-3 font-medium">
                            {format(new Date(summary.createdAt), "MMM d, yyyy h:mm a")}
                          </td>
                          <td className="px-3 py-3">
                            {summary.demandFile?.demandNoteId ?? "—"}
                          </td>
                          <td className="px-3 py-3">
                            {summary.demandFile?.clientName ?? "Unknown client"}
                          </td>
                          <td className="px-3 py-3">{summary.promptId ?? "—"}</td>
                          <td className="px-3 py-3">
                            {summary.promptVersionNumber != null
                              ? formatPromptVersionLabel(summary.promptVersionNumber)
                              : summary.promptVersionId ?? "—"}
                          </td>
                          <td className="px-3 py-3 max-w-[220px]">
                            <p className="text-sm text-slate-700 truncate">{summaryText}</p>
                          </td>
                           {renderCommentCell(summary, undefined, setIsMainCommentHovered)}
                          <td className="px-3 py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setExpandedSummaryId(isExpanded ? null : summary.id)
                              }
                            >
                              {isExpanded ? "Hide" : "View"}
                            </Button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="px-3 py-5 bg-slate-50">
                              <div className="space-y-4">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Full summary
                                  </p>
                                  <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                                    {summaryText}
                                  </p>
                                </div>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Comment
                                    </p>
                                    <span className="text-xs text-slate-500">{commenter}</span>
                                  </div>
                                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                      <p className="font-semibold text-slate-900">{commenter}</p>
                                      <span>
                                        {formatDistanceToNow(new Date(summary.createdAt), {
                                          addSuffix: true,
                                        })}
                                      </span>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                                      {commentText}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>

              </table>
            </div>
          )}
          {summariesError && (
            <p className="mt-3 text-sm text-rose-600">{summariesError}</p>
          )}
        </section>
        {isLoading ? (
          <LoadingSkeleton
            message={null}
            rowCount={3}
            cardClassName="rounded-xl border border-slate-200 shadow-sm dark:bg-gray-900"
            contentClassName="p-5 space-y-3"
          />
        ) : (
          <div className="rounded-xl border  p-5 dark:bg-gray-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xl font-bold text-foreground">Prompt Management</p>
                <p className="mt-1 text-sm text-slate-600">
                  Versioned prompts with App Admin controls and active/inactive state management.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSummaryExplorerOpen(true)}
              >
                <Filter className="h-4 w-4" />
                <span className="sr-only">Open Summary Explorer</span>
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">Version Cap: v5</Badge>
              <Badge variant="secondary">
                Active: {activePrompt ? `v${activePrompt.version}` : "None"}
              </Badge>
              <Badge variant="secondary">Total Versions: {prompts.length}</Badge>
            </div>
          </div>
        )}

        {isLoading ? (
          <LoadingSkeleton
            message="Preparing prompt editor..."
            rowCount={4}
            cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
            contentClassName="p-2.5 space-y-3"
          />
        ) : (
          <Card className="shadow-sm dark:bg-gray-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Save className="h-5 w-5 text-emerald-600" />
                Prompt Editor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="docType">Doc Type</Label>
                  <select
                    id="docType"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={docType}
                    onChange={(e) => handleDocTypeSelection(e.target.value)}
                  >
                    {DOC_TYPE_SUGGESTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="versionSelect">Version</Label>
                  </div>
                  <select
                    id="versionSelect"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedPromptId}
                    onChange={(e) => handleVersionSelectionChange(e.target.value)}
                  >
                    <option value="">Select version</option>
                    {prompts.map((item) => (
                      <option key={item.id} value={item.id}>
                        v{item.version > 5 ? item.version - 5 : item.version}
                        {item.id === currentEditorPromptId ? "" : ""}
                        {item.active_flag ? " (active)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Textarea
                  id="prompt"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Enter prompt text"
                  className="min-h-[240px] border-slate-300 bg-slate-50/30"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleSaveOrUpdate} disabled={isSaving || isLoading}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create New Version
                    </>
                  )}
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fetchPrompts(docType)}
                    disabled={isLoading}
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                  {selectedPrompt && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(selectedPrompt)}
                        disabled={disableActivateButton}
                      >
                        {selectedPrompt.active_flag ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(selectedPrompt)}
                        disabled={disableDeleteButton}
                        className="text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {canUseRevert && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleOpenRevertDialog}
                          disabled={!previousPrompt}
                          title="Revert to previous version"
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <LoadingSkeleton
            message="Loading version history..."
            rowCount={4}
            cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
            contentClassName="p-2.5 space-y-3"
          />
        ) : (
          <Card className="shadow-sm dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-lg">Version History ({docType})</CardTitle>
          </CardHeader>
          <CardContent>
            {prompts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No versions found.</p>
            ) : (
              <div className="space-y-3">
                {historyList.map((item) => {
                  const busy = actionLoadingId === item.id;
                  // const cannotDeleteOnlyActive = item.active_flag && nonDeletedCount <= 1;
                  const expanded = expandedPromptIds.includes(item.id);
                  const creatorDisplay = item.created_by_name
                    ? item.created_by
                      ? `${item.created_by_name} (${item.created_by})`
                      : item.created_by_name
                    : item.created_by;

                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:bg-gray-900 "
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between dark:text-gray-200">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">v{item.version > 5 ? item.version - 5 : item.version}</p>
                            {item.active_flag ? (
                              <Badge className="bg-emerald-600">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                            {item.deleted_flag && <Badge variant="destructive">Deleted</Badge>}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-gray-400">
                            {item.prompt}
                          </p>
                          <div className="mt-2 text-xs text-slate-500">
                            <p>Created: {new Date(item.created_at).toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            title={expanded ? "Collapse view" : "View prompt"}
                            onClick={() => toggleExpandedPrompt(item.id)}
                          >
                            {expanded ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          {/* <Button
                            size="icon"
                            variant="outline"
                            title="Load"
                            onClick={() => handleLoad(item)}
                            disabled={item.deleted_flag || busy}
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileInput className="h-4 w-4" />}
                          </Button> */}
                          <Button
                            size="icon"
                            variant="outline"
                            title={item.active_flag ? "Set Inactive" : "Set Active"}
                            onClick={() => handleToggleActive(item)}
                            disabled={item.deleted_flag || busy}
                            className={item.active_flag ? "text-amber-700" : "text-emerald-700"}
                          >
                            {item.active_flag ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                          {/* <Button
                            size="icon"
                            variant="outline"
                            title="Delete"
                            onClick={() => openDeleteDialog(item)}
                            disabled={item.deleted_flag || cannotDeleteOnlyActive || busy}
                            className="text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button> */}
                        </div>
                      </div>
                      {expanded && (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center justify-between">
                            {creatorDisplay && (
                              <p className="mt-2 text-xs text-slate-500">
                                Created by: {creatorDisplay}
                              </p>
                            )}
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleCopyPrompt(item.prompt)}
                              title="Copy prompt"
                            >
                              <Copy className="h-4 w-4" />
                              <span className="sr-only">Copy prompt</span>
                            </Button>
                          </div>
                          <Textarea
                            value={item.prompt}
                            readOnly
                            className="mt-2 min-h-[120px] bg-white"
                          />
                          {/* {item.created_by && (
                            <p className="mt-2 text-xs text-slate-500">
                              Created by: {item.created_by}
                            </p>
                          )} */}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        )}
        <Dialog
          open={isSaveDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsSaveDialogOpen(false);
              setPendingAction(null);
              setDialogMode("unsaved");
            }
          }}
        >
          <DialogContent className="bg-white dark:bg-white">
            <DialogHeader>
              <DialogTitle>
                {pendingAction?.type === "revert"
                  ? "Revert to previous version"
                  : "Unsaved changes"}
              </DialogTitle>
              <DialogDescription>
                {/* {pendingAction?.type === "revert"
                  ? `Reverting will create a new active version based on v${previousPrompt?.version ?? "?"}.`
                  : "Save your editor changes before navigating away?"} */}
                  {
                    pendingAction?.type === "revert"
                      ? `Reverting will create a new active version based on v${
                          previousPrompt?.version != null
                            ? previousPrompt.version > 5
                              ? previousPrompt.version - 5
                              : previousPrompt.version
                            : "?"
                        }.`
                      : "Save your editor changes before navigating away?"
                  }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                onClick={() => void handleDialogConfirm()}
                disabled={isSaving || isReverting}
              >
                {dialogMode === "revertConfirm" ? (
                  isReverting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reverting...
                    </>
                  ) : (
                    "Revert"
                  )
                ) : isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleDialogCancel}
                disabled={isReverting}
              >
                Don&apos;t Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            if (!open && !isDeleting) {
              closeDeleteDialog();
            }
          }}
        >
          <DialogContent className="bg-white dark:bg-white">
            <DialogHeader>
              <DialogTitle>
                Permanently delete version v{deleteDialogPrompt?.version}?
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. Delete version v{deleteDialogPrompt?.version} from {deleteDialogPrompt?.doc_type}?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={closeDeleteDialog}
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>

    </main>
  );
}
