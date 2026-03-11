"use client";

type ReactQuillComponent = typeof import("react-quill-new")["default"];

import { useState, useEffect, useRef, useCallback, use } from "react";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Bell,
  Download,
  Edit,
  FileText,
  Calendar,
  Clock,
  Eye,
  Loader2,
  Pencil,
  Upload,
  Trash2,
  Sparkles,
  Copy,
  X,
  Save,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, DemandNoteStatus } from "@/components/demand-notes/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { DocumentPreviewModal } from "@/components/demand-notes/DocumentPreviewModal";
import { SummarizeJobModal } from "@/components/demand-notes/SummarizeJobModal";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HorizontalScrollContainer } from "@/components/ui/HorizontalScrollContainer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DefaultCardComponent from "@/components/default-card-component";
import { Textarea } from "@/components/ui/textarea";
import LoadingSkeleton from "@/components/ui/loading-skeleton";

interface FileType {
  createdAt: string | null;
  id: string;
  fileName: string;
  size: number;
  fileCategory: string;
  fileUrl: string;
  uploadedAt: string | null;
  summaryStatus?: string | null;
  tasks?: Array<{
    status?: string;
    outputSummary?: string | null;
    editedSummary?: string | null;
    endTs?: string | null;
    editedSummaryTs?: string | null;
  }>;
  status?: string;
}

interface DemandNote {
  id: string;
  title: string;
  description: string | null;
  status: DemandNoteStatus;
  totalAmount: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  clientName: string | null;
  salutation: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  clients: Array<{
    id: string;
    salutation: string | null;
    firstName: string | null;
    middleName: string | null;
    lastName: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
  }>;
  defendantPhoneEmail: string | null;
  defendantName: string | null;
  claimNumber: string | null;
  insuranceName: string | null;
  adjuster: string | null;
  insuranceAddress: string | null;
  phone: string | null;
  fax: string | null;
  claimType: string | null;
  additionalNotes: string | null;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  files: FileType[];
  internalNotes: Array<{
    id: string;
    content: string;
    createdAt: string;
    createdBy: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
  timeline: Array<{
    id: string;
    type: string;
    message: string;
    createdAt: string;
    metadata?: unknown;
  }>;
}

interface TimelineEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  metadata?: unknown;
}

interface DemandNoteViewProps {
  params: Promise<{ id: string }>;
}

interface JobState {
  publishStatus?: string;
  status?: string;
}

interface PublishDetails {
  allFilesSummarized: boolean;
  tasksSynced: boolean;
  unsummarizedCount: number;
}

export default function DemandNoteView({ params }: DemandNoteViewProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { id } = use(params);
  // const contentRef = useRef<HTMLDivElement | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [demandNote, setDemandNote] = useState<DemandNote | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const initialDemandNoteLoadRef = useRef(true);
  // const [notes, setNotes] = useState<any[]>([]);
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null);
  // const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("traffic");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  // const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [summarizeFileId, setSummarizeFileId] = useState<string | null>(null);
  // const [editingSummaryId, setEditingSummaryId] = useState<string | null>(null);
  // const [summaryText, setSummaryText] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [editedBasicInfo, setEditedBasicInfo] = useState({
    demandCreatedDate: "",
    dateOfLoss: "",
    clients: [] as Array<{
      id?: string;
      salutation: string;
      firstName: string;
      middleName: string;
      lastName: string;
      email?: string;
      phone?: string;
    }>,
    clientPhoneEmail: "",
    defendantName: "",
    claimNumber: "",
    insuranceName: "",
    adjuster: "",
    insuranceAddress: "",
    phone: "",
    fax: "",
    claimType: "",
    additionalNotes: "",
  });
  const [showAllActivities, setShowAllActivities] = useState(false);
  // const [summaryPanelFileId, setSummaryPanelFileId] = useState<string | null>(null);
  // const [panelSummaryText, setPanelSummaryText] = useState<string>("");

  // New state for collapse/expand
  const [isActivityTimelineOpen, setIsActivityTimelineOpen] = useState(false);
  // const [isSystemInfoOpen, setIsSystemInfoOpen] = useState(false);

  // New state for summary loading
  // const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryLoadingFileId] = useState<string | null>(null);

  // New state for summary modes
  // const [summaryMode, setSummaryMode] = useState<"ai" | "edited">("ai");
  // const [aiSummary, setAiSummary] = useState<string>("");
  // const [editedSummary, setEditedSummary] = useState<string>("");
  // const [aiSummaryTs, setAiSummaryTs] = useState<string | null>(null);
  // const [editedSummaryTs, setEditedSummaryTs] = useState<string | null>(null);

  // Right column ordering state
  // const [rightColumnSections, setRightColumnSections] = useState(['timeline', 'info', 'summary', 'notes']);
  // const [draggedSection, setDraggedSection] = useState<string | null>(null);

  // Draft tab states
  const [draftContent, setDraftContent] = useState<string>("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const [isPublishable, setIsPublishable] = useState(false);
  const [publishDetails, setPublishDetails] = useState<PublishDetails | null>(null);
  // const [showFloatingDownload, setShowFloatingDownload] = useState(false);
  const [job, setJob] = useState<JobState | null>(null);
  const [isDraftEdited, setIsDraftEdited] = useState(false);
  // const [hasCustomerChanges, setHasCustomerChanges] = useState(true);
  const [notifyCooldownUntil, setNotifyCooldownUntil] = useState<string | null>(null);
  const [isNotifyLocked, setIsNotifyLocked] = useState(false);
  const [lastCustomerEditAt, setLastCustomerEditAt] = useState<string | null>(null);
  const [isNotifying, setIsNotifying] = useState(false);
  const [otherEditors, setOtherEditors] = useState<Array<{ userName: string; updatedAt: string }>>([]);

  // Indexing and Summary states
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState<'idle' | 'indexing' | 'in-progress' | 'complete'>('idle');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryStatuses] = useState<Record<string, 'pending' | 'in-progress' | 'complete'>>({});
  // const [expandedSummaries, setExpandedSummaries] = useState<Record<string, boolean>>({});
  const [isProcessingDisabled, setIsProcessingDisabled] = useState(false);
  // const [summaryModalFileId, setSummaryModalFileId] = useState<string | null>(null);
  // const [summarizationJobId, setSummarizationJobId] = useState<string | null>(null);
  const [summarizationProgress, setSummarizationProgress] = useState<string>('0%');

  // NEW: Summary Modal States
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryModalFile, setSummaryModalFile] = useState<{ id: string; name: string } | null>(null);
  const [modalAiSummary, setModalAiSummary] = useState<string>("");
  const [modalEditedSummary, setModalEditedSummary] = useState<string>("");
  const [modalSummaryMode, setModalSummaryMode] = useState<"ai" | "edited">("ai");
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isSavingSummary, setIsSavingSummary] = useState(false);

  // Tab/action coordination
  const [activeTab, setActiveTab] = useState<"upload" | "indexing" | "draft">("upload");
  const [tabLock, setTabLock] = useState<"tab1" | "tab2" | "tab3" | null>(null);
  const [tab3Mode, setTab3Mode] = useState<"idle" | "summary" | "draft" | "publish" | "export">("idle");
  const [summaryInvalidated, setSummaryInvalidated] = useState(false);
  const [isDraftPrefetching, setIsDraftPrefetching] = useState(false);

  // Dynamic import for ReactQuill to avoid SSR issues
const [ReactQuill, setReactQuill] = useState<ReactQuillComponent | null>(null);
  useEffect(() => {
    import('react-quill-new').then((mod) => {
      setReactQuill(() => mod.default);
    });
    import('react-quill-new/dist/quill.snow.css');
  }, []);

  // Safe date formatting function
  const formatDate = (dateString: string | null | undefined, formatStr: string = 'MM/dd/yyyy') => {
    if (!dateString) return "Unknown date";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      return format(date, formatStr);
    } catch (error) {
      console.error("Date formatting error:", error, dateString);
      return "Invalid date";
    }
  };

  const toDateInputValue = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return format(date, "yyyy-MM-dd");
    } catch (error) {
      console.error("Date input formatting error:", error, dateString);
      return "";
    }
  };

  const files = demandNote?.files ?? [];
  const hasFiles = files.length > 0;
  const allFilesSummarized = hasFiles && files.every((f) => f.summaryStatus === "summarized");
  // const summaryActionEnabled = hasFiles && (!allFilesSummarized || summaryInvalidated);
  // const summaryChanged = files.some((f) => {
  //   const task = f.tasks?.[0];
  //   if (!task) return false;
  //   if (task.editedSummary && task.outputSummary) {
  //     return task.editedSummary !== task.outputSummary;
  //   }
  //   return !!task.editedSummary;
  // });

  const isBusy =
    isIndexing ||
    isSummarizing ||
    (isDraftLoading && tab3Mode !== "idle") ||
    isPublishing ||
    isSavingSummary ||
    isUploading;

  const tab1Disabled = isBusy || (tabLock !== null && tabLock !== "tab1");
  const tab2Disabled = isBusy || (tabLock !== null && tabLock !== "tab2");
  const tab3Disabled = isBusy || (tabLock !== null && tabLock !== "tab3");

  const draftEditingDisabled =
    tab3Disabled || isDraftLoading || isPublishing || tab3Mode === "summary" || tab3Mode === "publish" || tab3Mode === "export";

  const userRoles = status === "authenticated" ? session?.user?.roles ?? [] : [];
  const isCustomer = userRoles.includes("Customer");
  const isLegacoreUser = userRoles.some((role) =>
    ["Legacore User", "admin", "App admin"].includes(role)
  );
  const showInternalTabs = status === "authenticated" && !isCustomer;

  useEffect(() => {
    if (isCustomer && activeTab !== "upload") {
      setActiveTab("upload");
    }
  }, [isCustomer, activeTab]);

  const publishEnabled =
    !tab3Disabled &&
    !isPublishing &&
    !isDraftLoading &&
    !isDraftPrefetching &&
    !!draftContent &&
    draftContent.trim() !== "<p><br></p>" &&
    draftContent.trim() !== "" &&
    job?.publishStatus !== "published" &&
    job?.publishStatus !== "draft" &&
    job?.publishStatus !== "edit_basic_info" &&
    job?.status !== "pending" &&
    job?.status !== "in_progress";

  const ensureTabLock = (lock: "tab1" | "tab2" | "tab3") => {
    if (tabLock && tabLock !== lock) {
      const msg =
        tabLock === "tab1"
          ? "Finish actions in Tab-1 before switching."
          : tabLock === "tab2"
            ? "Finish actions in Tab-2 before switching."
            : "Finish actions in Tab-3 before switching.";
      toast.error(msg);
      return false;
    }
    if (!tabLock) setTabLock(lock);
    return true;
  };

  // Fetch demand note data with polling
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    initialDemandNoteLoadRef.current = true;

    const fetchData = async (silent = false) => {
      try {
        if (!silent && initialDemandNoteLoadRef.current) {
          setIsLoading(true);
        }

        const [demandResponse, timelineResponse, notesResponse] = await Promise.all([
          fetch(`/api/demand-notes/${id}`),
          fetch(`/api/demand-notes/${id}/timeline`),
          fetch(`/api/demand-notes/${id}/notes`),
        ]);

        if (!demandResponse.ok) {
          throw new Error('Failed to fetch demand note');
        }

        const demandData = await demandResponse.json();

        const processedData = {
          ...demandData,
          files: Array.from(
            new Map(
              (demandData.files || []).map((file: FileType) => [
                file.id,
                {
                  ...file,
                  uploadedAt: file.uploadedAt || file.createdAt || new Date().toISOString(),
                },
              ])
            ).values()
          ),
        };

        setDemandNote(processedData);

        if (timelineResponse.ok) {
          const timelineData = await timelineResponse.json();
          setTimeline(timelineData);
        }

        if (notesResponse.ok) {
          // const notesData = await notesResponse.json();
          // setNotes(notesData);
        }

        // Draft is fetched only on Tab-3 selection
      } catch (error) {
        console.error('Error fetching data:', error);
        if (!silent) toast.error('Failed to load demand note');
      } finally {
        if (!silent) setIsLoading(false);
        initialDemandNoteLoadRef.current = false;
      }
    };

    if (id) {
      fetchData();
      intervalId = setInterval(() => {
        fetchData(true);
      }, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [id]);

  const handleCheckPublishStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/demand-notes/${id}/publish/status`);
      if (response.ok) {
        const data = await response.json();
        setIsPublishable(data.isPublishable);
        setPublishDetails(data.details);
      }
    } catch (error) {
      console.error("Error checking publish status:", error);
    }
  }, [id]);

  useEffect(() => {
    if (demandNote?.id) {
      handleCheckPublishStatus();
    }
  }, [demandNote?.id, handleCheckPublishStatus]);

  useEffect(() => {
    if (tabLock !== "tab1") return;
    const hasTab1Activity = isEditingBasicInfo || isUploading || uploadFiles.length > 0;
    if (!hasTab1Activity) setTabLock(null);
  }, [tabLock, isEditingBasicInfo, isUploading, uploadFiles.length]);

  useEffect(() => {
    if (tabLock !== "tab2") return;
    const hasTab2Activity = isIndexing || isSummarizing || isSummaryModalOpen || isModalLoading || isSavingSummary;
    if (!hasTab2Activity) setTabLock(null);
  }, [tabLock, isIndexing, isSummarizing, isSummaryModalOpen, isModalLoading, isSavingSummary]);

  useEffect(() => {
    if (tabLock !== "tab3") return;
    const hasTab3Activity = isDraftLoading || isPublishing || tab3Mode !== "idle";
    if (!hasTab3Activity) setTabLock(null);
  }, [tabLock, isDraftLoading, isPublishing, isDraftEdited, tab3Mode]);

  useEffect(() => {
    if (!isDraftLoading && !isPublishing && !isDraftEdited && tab3Mode !== "idle") {
      setTab3Mode("idle");
    }
  }, [isDraftLoading, isPublishing, isDraftEdited, tab3Mode]);

  useEffect(() => {
    if (!id || !isLegacoreUser) return;

    const ping = async () => {
      try {
        await fetch(`/api/demand-notes/${id}/edit-lock`, { method: "POST" });
        const res = await fetch(`/api/demand-notes/${id}/edit-lock`);
        if (res.ok) {
          const data = await res.json();
          setOtherEditors(data.locks || []);
        }
      } catch (error) {
        console.error("Failed to sync edit lock:", error);
      }
    };

    ping();
    const intervalId = setInterval(ping, 15000);

    return () => {
      clearInterval(intervalId);
      fetch(`/api/demand-notes/${id}/edit-lock`, { method: "DELETE" }).catch(() => undefined);
    };
  }, [id, isLegacoreUser]);

  useEffect(() => {
    if (allFilesSummarized && summaryInvalidated) {
      setSummaryInvalidated(false);
    }
  }, [allFilesSummarized, summaryInvalidated]);

  useEffect(() => {
    if (!id || !isCustomer) return;
    const editKey = `customerEditAt:${id}`;
    const storedEditAt = localStorage.getItem(editKey);
    if (storedEditAt) {
      setLastCustomerEditAt(storedEditAt);
    }

    const loadNotifyStatus = async () => {
      try {
        const res = await fetch(`/api/notifications/customer-status?demandNoteId=${id}`);
        if (!res.ok) return;
        const data = await res.json();
        setNotifyCooldownUntil(data?.nextAllowedAt || null);
        setIsNotifyLocked(!data?.canNotify);
      } catch (error) {
        console.error("Failed to load notify status:", error);
      }
    };

    loadNotifyStatus();
    const intervalId = setInterval(loadNotifyStatus, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [id, isCustomer]);

  useEffect(() => {
    if (!id || !isCustomer || demandNote?.status !== "sent") return;
    const loadCustomerDraft = async () => {
      try {
        const res = await fetch(`/api/demand-notes/${id}/draft`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.summaries) {
          setDraftContent(data.summaries);
          setJob({ publishStatus: data.publishStatus || "draft", status: data.status || "pending" });
        }
      } catch (error) {
        console.error("Failed to load published draft:", error);
      }
    };
    loadCustomerDraft();
  }, [id, isCustomer, demandNote?.status]);

  const showDownloadButton =
    job?.status == "completed" && job?.publishStatus == "published";

  const showNotifyButton = isCustomer && !showDownloadButton;
  console.log("showNotifyButton", showNotifyButton);

  console.log("isNotifyLocked", isNotifyLocked, "notifyCooldownUntil", notifyCooldownUntil, "lastCustomerEditAt", lastCustomerEditAt);
  const ONE_HOUR_MS = 5 * 60 * 1000;

  const notifyDisabled =
    isNotifyLocked ||
    (notifyCooldownUntil
      ? Date.now() < new Date(notifyCooldownUntil).getTime()
      : false) ||
    (lastCustomerEditAt
      ? Date.now() < new Date(lastCustomerEditAt).getTime() + ONE_HOUR_MS
      : false);

  const allActivityEvents = timeline.map((event) => ({
    id: event.id,
    type: event.type as string,
    description: event.message,
    timestamp: formatDate(event.createdAt, 'yyyy-MM-dd HH:mm'),
    user: 'System',
  }));

  const activityEvents = showAllActivities
    ? allActivityEvents
    : allActivityEvents.slice(0, 3);

  // const groupedFiles = {
  //   traffic: demandNote?.files?.filter((f: FileType) => f.fileCategory === "traffic") || [],
  //   medical: demandNote?.files?.filter((f: FileType) => f.fileCategory === "medical") || [],
  //   bills: demandNote?.files?.filter((f: FileType) => f.fileCategory === "bills") || [],
  // };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleFileUpload = async () => {
    if (!uploadFiles.length || !demandNote) {
      toast.error("Please select files to upload");
      return;
    }
    if (!ensureTabLock("tab1")) return;

    setIsUploading(true);

    try {
    const uploadedFiles: FileType[] = [];

      for (const file of uploadFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("demandNoteId", demandNote.id);
        formData.append("fileCategory", selectedCategory);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const result = await response.json();
        uploadedFiles.push(result.file as FileType);
      }

      setDemandNote((prev) =>
        prev
          ? {
            ...prev,
            files: [...prev.files, ...uploadedFiles],
          }
          : null
      );

      const timelineResponse = await fetch(
        `/api/demand-notes/${id}/timeline`
      );
      if (timelineResponse.ok) {
        const timelineData = await timelineResponse.json();
        setTimeline(timelineData);
      }

      setUploadFiles([]);
      // setIsUploadOpen(false);
      setSummaryInvalidated(true);
      setJob((prev) => ({ ...(prev ?? {}), status: "pending" }));
      // setHasCustomerChanges(true);
      markCustomerEdit();
      toast.success("Files uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload one or more files");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    if (!ensureTabLock("tab1")) return;
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    if (!ensureTabLock("tab1")) return;

    try {
      const response = await fetch(`/api/upload?fileId=${fileId}`, {
        method: "DELETE",
      });

      console.log("Delete response:", response);

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      setDemandNote(prev => prev ? {
        ...prev,
        files: prev.files.filter(f => f.id !== fileId)
      } : null);

      const timelineResponse = await fetch(`/api/demand-notes/${id}/timeline`);
      if (timelineResponse.ok) {
        const timelineData = await timelineResponse.json();
        setTimeline(timelineData);
      }

      setSummaryInvalidated(true);
      setJob((prev) => ({ ...(prev ?? {}), status: "pending" }));
      // setHasCustomerChanges(true);
      markCustomerEdit();
      toast.success("File deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete file");
    }
  };

  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreviewFile = (fileUrl: string, fileName: string) => {
    setPreviewFile({ name: fileName, url: fileUrl });
  };

  // const handleExportPDF = async () => {
  //   setIsExporting(true);
  //   try {
  //     const element = document.getElementById("demand-note-content") || contentRef.current;
  //     if (!element) throw new Error("Content element not found");

  //     const canvas = await html2canvas(element as HTMLElement, {
  //       scale: 2,
  //       useCORS: true,
  //       logging: false,
  //     });

  //     const imgData = canvas.toDataURL("image/png");
  //     const pdf = new jsPDF("p", "mm", "a4");
  //     const pdfWidth = 210;
  //     const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  //     if (pdfHeight <= 297) {
  //       pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  //     } else {
  //       let remainingHeight = canvas.height;
  //       const pageCanvas = document.createElement("canvas");
  //       const pageCtx = pageCanvas.getContext("2d")!;
  //       const pageHeightPx = Math.floor((297 * canvas.width) / pdfWidth);
  //       let offsetY = 0;

  //       while (remainingHeight > 0) {
  //         pageCanvas.width = canvas.width;
  //         pageCanvas.height = Math.min(pageHeightPx, remainingHeight);

  //         pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
  //         pageCtx.drawImage(
  //           canvas,
  //           0,
  //           offsetY,
  //           pageCanvas.width,
  //           pageCanvas.height,
  //           0,
  //           0,
  //           pageCanvas.width,
  //           pageCanvas.height
  //         );

  //         const pageData = pageCanvas.toDataURL("image/png");
  //         const h = (pageCanvas.height * pdfWidth) / pageCanvas.width;

  //         if (offsetY > 0) pdf.addPage();
  //         pdf.addImage(pageData, "PNG", 0, 0, pdfWidth, h);

  //         remainingHeight -= pageCanvas.height;
  //         offsetY += pageCanvas.height;
  //       }
  //     }

  //     pdf.save(`demand_note_${demandNote?.id}.pdf`);
  //     toast.success("Demand note exported as PDF.");
  //   } catch (err) {
  //     console.error(err);
  //     toast.error("Failed to export PDF. Try again.");
  //   } finally {
  //     setIsExporting(false);
  //   }
  // };

  const handleNotifyLegacore = async () => {
    if (!id) return;
    if (notifyDisabled) return;
    setIsNotifying(true);
    try {
      const res = await fetch("/api/notifications/notify-legacore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demandNoteId: id }),
      });

      if (res.ok) {
        toast.success("Legacore users notified");
        // setHasCustomerChanges(false);
        const next = new Date(Date.now() + ONE_HOUR_MS).toISOString();
        setNotifyCooldownUntil(next);
        setIsNotifyLocked(true);
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to notify legacore users");
      }
    } catch (error) {
      console.error("Notify error:", error);
      toast.error("Failed to notify legacore users");
    } finally {
      setIsNotifying(false);
    }
  };

  const markCustomerEdit = () => {
    if (!id || !isCustomer) return;
    const now = new Date().toISOString();
    setLastCustomerEditAt(now);
    localStorage.setItem(`customerEditAt:${id}`, now);
  };

  const handleBack = () => {
    router.back();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (!ensureTabLock("tab1")) return;
      const files = Array.from(e.dataTransfer.files);
      setUploadFiles(prev => [...prev, ...files]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!ensureTabLock("tab1")) return;
    setUploadFiles(e.target.files ? Array.from(e.target.files) : []);
  };

  // const handleSaveSummary = async (fileId: string) => {
  //   try {
  //     toast.success("Summary saved successfully");
  //     // setEditingSummaryId(null);
  //     // setSummaryText("");
  //   } catch (error) {
  //     toast.error("Failed to save summary");
  //   }
  // };

  const handleEditBasicInfo = () => {
    if (!ensureTabLock("tab1")) return;
    markCustomerEdit();
    if (demandNote) {
      const defaultClientPhoneEmail =
        demandNote.defendantPhoneEmail ||
        demandNote.clients[0]?.email ||
        demandNote.clients[0]?.phone ||
        "";

      setEditedBasicInfo({
        demandCreatedDate: toDateInputValue(demandNote.createdAt),
        dateOfLoss: toDateInputValue(demandNote.dueDate),
        clients: (demandNote.clients || []).map(c => ({
          id: c.id,
          salutation: c.salutation || "Mr.",
          firstName: c.firstName || "",
          middleName: c.middleName || "",
          lastName: c.lastName || "",
          email: c.email || "",
          phone: c.phone || "",
        })),
        clientPhoneEmail: defaultClientPhoneEmail,
        defendantName: demandNote.defendantName || "",
        claimNumber: demandNote.claimNumber || "",
        insuranceName: demandNote.insuranceName || "",
        adjuster: demandNote.adjuster || "",
        insuranceAddress: demandNote.insuranceAddress || "",
        phone: demandNote.phone || "",
        fax: demandNote.fax || "",
        claimType: demandNote.claimType || "",
        additionalNotes: demandNote.additionalNotes || "",
      });
      setIsEditingBasicInfo(true);
      // Set status to "editing" when Legacore user starts editing
      if (isLegacoreUser) {
        setDemandNote(prev => prev ? { ...prev, status: "editing" } : null);
      }
    }
  };

  const handleSaveBasicInfo = async () => {
    try {
      if (!ensureTabLock("tab1")) return;
      // const computedClientName = `${editedBasicInfo.salutation} ${editedBasicInfo.firstName} ${editedBasicInfo.middleName ? `${editedBasicInfo.middleName} ` : ""}${editedBasicInfo.lastName}`.trim();
      // const clientName = computedClientName || demandNote?.client.name || "";

      const response = await fetch(`/api/demand-notes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clients: editedBasicInfo.clients,
          clientPhoneEmail: editedBasicInfo.clientPhoneEmail,
          dateOfLoss: editedBasicInfo.dateOfLoss,
          defendantName: editedBasicInfo.defendantName,
          claimNumber: editedBasicInfo.claimNumber,
          insuranceName: editedBasicInfo.insuranceName,
          adjuster: editedBasicInfo.adjuster,
          insuranceAddress: editedBasicInfo.insuranceAddress,
          phone: editedBasicInfo.phone,
          fax: editedBasicInfo.fax,
          claimType: editedBasicInfo.claimType,
          additionalNotes: editedBasicInfo.additionalNotes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update demand note");
      }

      const updatedData = await response.json();

      setDemandNote(prev => prev ? {
        ...prev,
        ...updatedData,
      } : null);

      setJob((prev) => ({ ...(prev ?? {}), publishStatus: "edit_basic_info" }));
      setSummaryInvalidated(true);
      // setHasCustomerChanges(true);
      markCustomerEdit();
      toast.success("Basic information updated successfully");
      setIsEditingBasicInfo(false);
    } catch (error) {
      console.error("Error updating basic info:", error);
      toast.error("Failed to update basic information");
    }
  };

  const handleCancelEditBasicInfo = () => {
    setIsEditingBasicInfo(false);
    setEditedBasicInfo({
      demandCreatedDate: "",
      dateOfLoss: "",
      clients: [],
      clientPhoneEmail: "",
      defendantName: "",
      claimNumber: "",
      insuranceName: "",
      adjuster: "",
      insuranceAddress: "",
      phone: "",
      fax: "",
      claimType: "",
      additionalNotes: "",
    });
    // Reset status when canceling edit
    if (isLegacoreUser && demandNote?.status === "editing") {
      setDemandNote(prev => prev ? { ...prev, status: "notified" } : null);
    }
    if (tabLock === "tab1") setTabLock(null);
  };

  // NEW: Open Summary Modal
  const handleOpenSummaryModal = async (fileId: string, fileName: string) => {
    if (!ensureTabLock("tab2")) return;
    setSummaryModalFile({ id: fileId, name: fileName });
    setIsSummaryModalOpen(true);
    setIsModalLoading(true);
    setModalSummaryMode("ai");

    try {
      const response = await fetch(`/api/demand-files/${fileId}/summary`);

      if (response.ok) {
        const data = await response.json();
        const ai = data.summary || "";
        const edited = data.editedSummary || "";

        setModalAiSummary(ai);
        setModalEditedSummary(edited);
      } else {
        // Fallback to existing summary if API fails
        const file = demandNote?.files.find(f => f.id === fileId);
        const task = (file as FileType)?.tasks?.[0];
        const existingSummary = task?.outputSummary || "";
        const existingEdited = task?.editedSummary || "";

        setModalAiSummary(existingSummary);
        setModalEditedSummary(existingEdited);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
      // Fallback to existing summary
      const file = demandNote?.files.find(f => f.id === fileId);
      const task = (file as FileType)?.tasks?.[0];
      const existingSummary = task?.outputSummary || "";
      const existingEdited = task?.editedSummary || "";

      setModalAiSummary(existingSummary);
      setModalEditedSummary(existingEdited);
    } finally {
      setIsModalLoading(false);
    }
  };

  // NEW: Close Summary Modal
  const handleCloseSummaryModal = () => {
    setIsSummaryModalOpen(false);
    setSummaryModalFile(null);
    setModalAiSummary("");
    setModalEditedSummary("");
    setModalSummaryMode("ai");
  };

  // NEW: Save Edited Summary
  const handleSaveEditedSummary = async () => {
    if (!summaryModalFile) return;
    if (!ensureTabLock("tab2")) return;

    setIsSavingSummary(true);
    try {
      const response = await fetch(`/api/demand-files/${summaryModalFile.id}/summary`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: modalEditedSummary })
      });

      if (!response.ok) throw new Error("Failed to save");

      const data = await response.json();
      setModalEditedSummary(data.editedSummary);

      setJob((prev) => ({ ...(prev ?? {}), publishStatus: "summarized" }));
      setSummaryInvalidated(false);
      markCustomerEdit();
      toast.success("Summary saved successfully");
    } catch (error) {
      toast.error("Failed to save summary");
      console.log(error);
    } finally {
      setIsSavingSummary(false);
    }
  };

  // NEW: Copy Summary to Clipboard
  const handleCopySummaryModal = () => {
    const textToCopy = modalSummaryMode === "ai" ? modalAiSummary : modalEditedSummary;
    navigator.clipboard.writeText(textToCopy);
    toast.success("Summary copied to clipboard");
  };

  // NEW: Export Summary
  const handleExportSummaryModal = () => {
    const textToExport = modalSummaryMode === "ai" ? modalAiSummary : modalEditedSummary;
    const fileName = summaryModalFile ? `summary_${summaryModalFile.name}.txt` : 'summary.txt';

    const blob = new Blob([textToExport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Summary exported successfully");
  };

  // const handleOpenSummaryPanel = async (fileId: string, fileName: string) => {
  //   // Use the new modal instead
  //   handleOpenSummaryModal(fileId, fileName);
  // };

  // const handleCloseSummaryPanel = () => {
  //   setSummaryPanelFileId(null);
  //   setPanelSummaryText("");
  //   // setIsSummaryLoading(false);
  //   setSummaryLoadingFileId(null);
  // };

  // const handleSavePanelSummary = async () => {
  //   try {
  //     if (!summaryPanelFileId) return;
  //     if (!ensureTabLock("tab2")) return;

  //     const response = await fetch(`/api/demand-files/${summaryPanelFileId}/summary`, {
  //       method: "PUT",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ summary: panelSummaryText })
  //     });

  //     if (!response.ok) throw new Error("Failed to save");

  //     const data = await response.json();
  //     // setEditedSummary(data.editedSummary);
  //     // setEditedSummaryTs(data.editedSummaryTs);

  //     // If we were in AI mode, switch to edited mode
  //     if (summaryMode === "ai") {
  //       setSummaryMode("edited");
  //     }

  //     setJob((prev) => ({ ...(prev ?? {}), publishStatus: "summarized" }));
  //     setSummaryInvalidated(false);
  //     markCustomerEdit();
  //     toast.success("Summary saved successfully");
  //   } catch (error) {
  //     toast.error("Failed to save summary");
  //   }
  // };

  // const handleCopySummary = () => {
  //   navigator.clipboard.writeText(panelSummaryText);
  //   toast.success("Summary copied to clipboard");
  // };

  // const handleExportSummary = () => {
  //   const currentFile = demandNote?.files.find(f => f.id === summaryPanelFileId);
  //   const fileName = currentFile ? `summary_${currentFile.fileName}.txt` : 'summary.txt';

  //   const blob = new Blob([panelSummaryText], { type: 'text/plain' });
  //   const url = URL.createObjectURL(blob);
  //   const link = document.createElement('a');
  //   link.href = url;
  //   link.download = fileName;
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  //   URL.revokeObjectURL(url);

  //   toast.success("Summary exported successfully");
  // };

  const handleFetchDraftSummary = async (useDummy = false) => {
    if (!ensureTabLock("tab3")) return;
    setTab3Mode("summary");
    setIsDraftLoading(true);
    try {
      const url = `/api/demand-notes/${id}/draft`;
      let response;

      if (useDummy) {
        response = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ useDummy: true, status: "summarized" })
        });
      } else {
        response = await fetch(url);
      }
      console.log("Draft summary response:", response);

      if (response.ok) {
        const data = await response.json();
        if (useDummy) {
          // After setting dummy, we need to fetch the updated content
          const getResponse = await fetch(url);
          if (getResponse.ok) {
            const newData = await getResponse.json();
            setDraftContent(newData.summaries || "");
            setJob({ publishStatus: newData.publishStatus || "draft", status: newData.status || "pending" });
            setIsDraftEdited(false);
            toast.success("Draft updated with uploaded files summary");
          }
        } else {
          setDraftContent(data.summaries || "");
          setJob({ publishStatus: data.publishStatus || "draft", status: data.status || "pending" });
          setIsDraftEdited(false);
          if (data.isExisting) {
            toast.success("Draft loaded from previous save");
          } else {
            toast.success("All summaries aggregated");
          }
        }
      } else {
        throw new Error("Failed to fetch draft");
      }
    } catch (error) {
      console.error("Error fetching draft:", error);
      toast.error("Failed to fetch summaries");
    } finally {
      setIsDraftLoading(false);
      if (tab3Mode === "summary" && !isDraftEdited) {
        setTab3Mode("idle");
        if (tabLock === "tab3") setTabLock(null);
      }
    }
  };

  const handleLoadDraftOnTab = useCallback(async () => {
    if (!id) return;
    setIsDraftPrefetching(true);
    try {
      const response = await fetch(`/api/demand-notes/${id}/draft`);
      if (!response.ok) throw new Error("Failed to fetch draft");
      const data = await response.json();
      setDraftContent(data.summaries || "");
      setJob({ publishStatus: data.publishStatus || "draft", status: data.status || "pending" });
      setIsDraftEdited(false);
    } catch (error) {
      console.error("Error fetching draft:", error);
      toast.error("Failed to fetch draft");
    } finally {
      setIsDraftPrefetching(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    handleLoadDraftOnTab();
  }, [id, handleLoadDraftOnTab]);

  const handleSaveDraft = async () => {
    if (!ensureTabLock("tab3")) return;
    setTab3Mode("draft");
    setIsDraftLoading(true);
    try {
      const response = await fetch(`/api/demand-notes/${id}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaries: draftContent, status: "edit_draft" })
      });

      if (response.ok) {
        setJob((prev) => ({ ...(prev ?? {}), publishStatus: "edit_draft" }));
        setIsDraftEdited(false);
        toast.success("Draft saved successfully");
      } else {
        throw new Error("Failed to save draft");
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft");
    } finally {
      setIsDraftLoading(false);
      if (tab3Mode === "draft" && !isDraftEdited) {
        setTab3Mode("idle");
        if (tabLock === "tab3") setTabLock(null);
      }
    }
  };

  // const handleSectionDragStart = (e: React.DragEvent, sectionId: string) => {
  //   setDraggedSection(sectionId);
  //   e.dataTransfer.setData('text/plain', sectionId);
  //   e.dataTransfer.effectAllowed = 'move';
  // };

  // const handleSectionDragOver = (e: React.DragEvent) => {
  //   e.preventDefault();
  //   e.dataTransfer.dropEffect = 'move';
  // };

  // const handleSectionDrop = (e: React.DragEvent, targetSectionId: string) => {
  //   e.preventDefault();
  //   if (!draggedSection || draggedSection === targetSectionId) return;

  //   const newOrder = [...rightColumnSections];
  //   const draggedIdx = newOrder.indexOf(draggedSection);
  //   const targetIdx = newOrder.indexOf(targetSectionId);

  //   newOrder.splice(draggedIdx, 1);
  //   newOrder.splice(targetIdx, 0, draggedSection);

  //   setRightColumnSections(newOrder);
  //   setDraggedSection(null);
  // };

  const handleExportDraft = async () => {
    if (!ensureTabLock("tab3")) return;
    setTab3Mode("export");
    try {
      const blob = new Blob([draftContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `demand_note_draft_${id}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Draft exported successfully");
    } catch (error) {
      toast.error("Export failed");
      console.log(error);
    } finally {
      if (tab3Mode === "export") {
        setTab3Mode("idle");
        if (tabLock === "tab3") setTabLock(null);
      }
    }
  };

  const handlePublish = async () => {
    if (!ensureTabLock("tab3")) return;
    setTab3Mode("publish");
    setIsPublishing(true);
    try {
      // 1. Update DemandNote status
      const response = await fetch(`/api/demand-notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "sent"
        })
      });

      if (response.ok) {
        // 2. Update Job publishStatus to "published"
        await fetch(`/api/demand-notes/${id}/draft`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summaries: draftContent, status: "published" })
        });

        await fetch("/api/notifications/notify-customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demandNoteId: id }),
        });

        setJob((prev) => ({ ...(prev ?? {}), publishStatus: "published" }));
        setDemandNote(prev => prev ? { ...prev, status: "sent" } : null);
        toast.success("Demand note published successfully");
        setTab3Mode("idle");
        setTabLock(null);
        // setShowFloatingDownload(true);
        handleCheckPublishStatus(); // Refresh status
        await handleLoadDraftOnTab();
      } else {
        throw new Error("Publish failed");
      }
    } catch (error) {
      console.error("Error publishing:", error);
      toast.error("Failed to publish");
    } finally {
      setIsPublishing(false);
      if (tab3Mode === "publish") {
        setTab3Mode("idle");
        if (tabLock === "tab3") setTabLock(null);
      }
    }
  };

  const handleDownloadDoc = () => {
    if (!draftContent) return;

    // Simple HTML to Word conversion using blob
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><meta charset='utf-8'><title>Export HTML to Word</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + draftContent + footer;

    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileLink = document.createElement("a");
    document.body.appendChild(fileLink);
    fileLink.href = source;
    fileLink.download = `demand_note_${id}.doc`;
    fileLink.click();
    document.body.removeChild(fileLink);
    toast.success("Document downloaded as .doc");
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  // Handle common indexing operation
  const handleCommonIndexing = async () => {
    if (!ensureTabLock("tab2")) return;
    setIsIndexing(true);
    setIsProcessingDisabled(true);
    setIndexingProgress('indexing');

    try {
      // Simulate indexing process
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIndexingProgress('in-progress');

      await new Promise(resolve => setTimeout(resolve, 2000));
      setIndexingProgress('complete');

      toast.success("Indexing completed successfully");

      // Reset after 2 seconds
      setTimeout(() => {
        setIndexingProgress('idle');
        setIsIndexing(false);
        setIsProcessingDisabled(false);
      }, 2000);
    } catch (error) {
      console.error("Indexing error:", error);
      toast.error("Failed to complete indexing");
      setIndexingProgress('idle');
      setIsIndexing(false);
      setIsProcessingDisabled(false);
    }
  };

  // Handle common summary operation
  const handleCommonSummary = async () => {
    if (!demandNote?.files || demandNote.files.length === 0) {
      toast.error("No files to summarize");
      return;
    }
    if (!ensureTabLock("tab2")) return;

    setIsSummarizing(true);
    setIsProcessingDisabled(true);
    setSummarizationProgress('0%');

    try {
      // Start a job for all files
      const response = await fetch("/api/job/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demandNoteId: demandNote.id,
          demandFileIds: demandNote.files.map(f => f.id)
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start summarization job");
      }

      const data = await response.json();
      // setSummarizationJobId(data.jobId);

      // Poll for job status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/job/status?jobId=${data.jobId}`);
          if (!statusResponse.ok) throw new Error("Failed to fetch status");

          const statusData = await statusResponse.json();
          const jobStatus = statusData.job.status;

          // Update progress based on job status
          if (jobStatus === "pending") {
            setSummarizationProgress('5%'); // 0-10% range, using 5%
          } else if (jobStatus === "in_progress") {
            setSummarizationProgress('45%');
          } else if (jobStatus === "completed") {
            setSummarizationProgress('100%');
            clearInterval(pollInterval);
            // Close progress bar after 2 seconds
            setTimeout(() => {
              setIsSummarizing(false);
              setIsProcessingDisabled(false);
              // setSummarizationJobId(null);
              setSummarizationProgress('0%');
              setSummaryInvalidated(false);
            }, 2000);
            toast.success("All summaries completed");
          } else if (jobStatus === "failed") {
            clearInterval(pollInterval);
            setIsSummarizing(false);
            setIsProcessingDisabled(false);
            // setSummarizationJobId(null);
            setSummarizationProgress('0%');
            toast.error("Summarization failed");
          }
        } catch (error) {
          console.error("Polling error:", error);
          clearInterval(pollInterval);
          setIsSummarizing(false);
          setIsProcessingDisabled(false);
          // setSummarizationJobId(null);
          setSummarizationProgress('0%');
          toast.error("Failed to check summarization status");
        }
      }, 3000);

    } catch (error) {
      console.error("Summary error:", error);
      toast.error("Failed to start summarization");
      setIsSummarizing(false);
      setIsProcessingDisabled(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto p-3 space-y-4">
          <LoadingSkeleton
            message={null}
            rowCount={3}
            cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
            contentClassName="p-4 space-y-3"
          />
          <LoadingSkeleton
            message={null}
            rowCount={8}
            cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
            contentClassName="p-4 space-y-3"
          />
        </div>
      </div>
    );
  }

  if (!demandNote) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Demand note not found</h2>
          <Button onClick={() => router.push('/demand-notes')}>
            Back to Demand Notes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background ">
      <div className="mx-auto p-3">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Button
                variant="ghost"
                onClick={handleBack}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Demand Notes
              </Button>
              <div className="flex items-center gap-3 ">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold">{getInitials(demandNote.clients[0]?.name || "N C")}</span>
                  </div>
                  <div>
                    <h2 className="text-md text-foreground">
                      {demandNote.clients[0]?.name || "No Client"}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Badge variant="outline" className="font-mono text-xs">
                        {demandNote.id}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(demandNote.dueDate, 'MM/dd/yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Updated {formatDate(demandNote.updatedAt, 'MM/dd/yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ml-auto">
                  <StatusBadge status={demandNote.status} />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {/* Actions can be added here */}
            </div>
          </div>
        </div>

        {isLegacoreUser && otherEditors.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-medium">Editing in progress:</span>{" "}
            {otherEditors.map((e) => e.userName).join(", ")}
          </div>
        )}


        {/* Content Layout: Modified Grid */}
        <div className="w-full ">
          <DefaultCardComponent title="Demand Note Details">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4 ">
              {/* Basic Information - 12 columns */}
              <div className="lg:col-span-12">
                <Card className="h-full relative dark:bg-gray-900 ">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle>Basic Information</CardTitle>
                      {!isEditingBasicInfo ? (
                        <div className="flex items-center gap-2">
                          <Button onClick={handleEditBasicInfo} size="sm" variant="outline" disabled={tab1Disabled}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => {
                              const nextOpen = !isActivityTimelineOpen;
                              setIsActivityTimelineOpen(nextOpen);
                              if (nextOpen) setShowAllActivities(false);
                            }}
                            size="sm"
                            variant="outline"
                            disabled={tab1Disabled}
                          >
                            Activity Timeline
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button onClick={handleSaveBasicInfo} size="sm" disabled={tab1Disabled}>
                            OK
                          </Button>
                          <Button onClick={handleCancelEditBasicInfo} size="sm" variant="outline" disabled={tab1Disabled}>
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  {isActivityTimelineOpen && (
                    <div className="absolute right-6 top-16 z-20 w-[360px] max-w-[calc(100%-3rem)]">
                      <Card className="shadow-lg border">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Activity Timeline</CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setIsActivityTimelineOpen(false);
                                setShowAllActivities(false);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="max-h-[300px] overflow-y-auto">
                            {activityEvents.length > 0 ? (
                              <div className="space-y-4">
                                {activityEvents.map((event) => (
                                  <div key={event.id} className="flex gap-3">
                                    <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-500" />
                                    <div className="flex-1 space-y-1">
                                      <p className="text-sm text-foreground">{event.description}</p>
                                      <p className="text-xs text-muted-foreground">{event.timestamp}</p>
                                    </div>
                                  </div>
                                ))}
                                {allActivityEvents.length > 3 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAllActivities(!showAllActivities)}
                                    className="text-xs w-full"
                                  >
                                    {showAllActivities ? "Show Less" : `Show All (${allActivityEvents.length})`}
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No activity yet</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  <CardContent className="pt-0 pb-4">
                    {!isEditingBasicInfo ? (
                      <div className="grid gap-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 h-full">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Demand Created Date</p>
                          <p className="text-sm font-medium">{formatDate(demandNote.createdAt, 'MM/dd/yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Date of Loss (DOL)</p>
                          <p className="text-sm font-medium">{formatDate(demandNote.dueDate, 'MM/dd/yyyy')}</p>
                        </div>
                        <div className="md:col-span-2 lg:col-span-3">
                          <p className="text-sm text-muted-foreground mb-1">Clients</p>
                          <div className="space-y-2">
                            {(demandNote.clients || []).map((client, idx) => (
                              <div key={client.id || idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 border-b border-border/30 pb-2 last:border-0 last:pb-0">
                                <div>
                                  <p className="text-xs text-muted-foreground">Salutation</p>
                                  <p className="text-sm font-medium">{client.salutation || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">First Name</p>
                                  <p className="text-sm font-medium">{client.firstName || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Middle Name</p>
                                  <p className="text-sm font-medium">{client.middleName || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Last Name</p>
                                  <p className="text-sm font-medium">{client.lastName || "-"}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Client Phone/Email</p>
                          <p className="text-sm font-medium">
                            {demandNote.defendantPhoneEmail || demandNote.clients[0]?.email || demandNote.clients[0]?.phone || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Defendant Name</p>
                          <p className="text-sm font-medium truncate" title={demandNote.defendantName || ""}>
                            {demandNote.defendantName || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Claim Number</p>
                          <p className="text-sm font-medium truncate" title={demandNote.claimNumber || ""}>
                            {demandNote.claimNumber || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Insurance Company Name</p>
                          <p className="text-sm font-medium truncate" title={demandNote.insuranceName || ""}>
                            {demandNote.insuranceName || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Adjuster</p>
                          <p className="text-sm font-medium truncate" title={demandNote.adjuster || ""}>
                            {demandNote.adjuster || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Insurance Company Address</p>
                          <p className="text-sm font-medium truncate" title={demandNote.insuranceAddress || ""}>
                            {demandNote.insuranceAddress || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Phone</p>
                          <p className="text-sm font-medium truncate" title={demandNote.phone || ""}>
                            {demandNote.phone || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Fax</p>
                          <p className="text-sm font-medium truncate" title={demandNote.fax || ""}>
                            {demandNote.fax || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Claim Type</p>
                          <p className="text-sm font-medium truncate" title={demandNote.claimType || ""}>
                            {demandNote.claimType || "-"}
                          </p>
                        </div>
                        <div className="md:col-span-2 lg:col-span-3">
                          <p className="text-sm text-muted-foreground mb-1">Additional Notes</p>
                          <p className="text-sm font-medium whitespace-pre-wrap">
                            {demandNote.additionalNotes || "-"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 h-full">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="demandCreatedDate">Demand Created Date</Label>
                            <Input
                              id="demandCreatedDate"
                              type="date"
                              value={editedBasicInfo.demandCreatedDate}
                              readOnly
                              className="bg-muted/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="dateOfLoss">Date of Loss (DOL)</Label>
                            <Input
                              id="dateOfLoss"
                              type="date"
                              value={editedBasicInfo.dateOfLoss}
                              onChange={(e) => setEditedBasicInfo({ ...editedBasicInfo, dateOfLoss: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-4 border-t border-border pt-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Clients</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newClients = [...editedBasicInfo.clients, { salutation: "Mr.", firstName: "", middleName: "", lastName: "" }];
                                setEditedBasicInfo({ ...editedBasicInfo, clients: newClients });
                              }}
                            >
                              + Add Client
                            </Button>
                          </div>
                          {editedBasicInfo.clients.map((client, idx) => (
                            <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 border rounded-md relative bg-muted/20">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute -right-2 -top-2 h-6 w-6 p-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => {
                                  const newClients = editedBasicInfo.clients.filter((_, i) => i !== idx);
                                  setEditedBasicInfo({ ...editedBasicInfo, clients: newClients });
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <div className="space-y-2">
                                <Label htmlFor={`salutation-${idx}`}>Salutation</Label>
                                <select
                                  id={`salutation-${idx}`}
                                  value={client.salutation}
                                  onChange={(e) => {
                                    const newClients = [...editedBasicInfo.clients];
                                    newClients[idx].salutation = e.target.value;
                                    setEditedBasicInfo({ ...editedBasicInfo, clients: newClients });
                                  }}
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                  <option value="Mr.">Mr.</option>
                                  <option value="Mrs.">Mrs.</option>
                                  <option value="Ms.">Ms.</option>
                                  <option value="Miss">Miss</option>
                                  <option value="Dr.">Dr.</option>
                                  <option value="Prof.">Prof.</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`firstName-${idx}`}>First Name</Label>
                                <Input
                                  id={`firstName-${idx}`}
                                  value={client.firstName}
                                  onChange={(e) => {
                                    const newClients = [...editedBasicInfo.clients];
                                    newClients[idx].firstName = e.target.value;
                                    setEditedBasicInfo({ ...editedBasicInfo, clients: newClients });
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`middleName-${idx}`}>Middle Name</Label>
                                <Input
                                  id={`middleName-${idx}`}
                                  value={client.middleName}
                                  onChange={(e) => {
                                    const newClients = [...editedBasicInfo.clients];
                                    newClients[idx].middleName = e.target.value;
                                    setEditedBasicInfo({ ...editedBasicInfo, clients: newClients });
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`lastName-${idx}`}>Last Name</Label>
                                <Input
                                  id={`lastName-${idx}`}
                                  value={client.lastName}
                                  onChange={(e) => {
                                    const newClients = [...editedBasicInfo.clients];
                                    newClients[idx].lastName = e.target.value;
                                    setEditedBasicInfo({ ...editedBasicInfo, clients: newClients });
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="clientPhoneEmail">Client Phone/Email</Label>
                            <Input
                              id="clientPhoneEmail"
                              value={editedBasicInfo.clientPhoneEmail}
                              onChange={(e) => setEditedBasicInfo({ ...editedBasicInfo, clientPhoneEmail: e.target.value })}
                              placeholder="Enter phone or email"
                            />
                          </div>
                        </div>

                        <Separator />
                        <p className="text-sm font-medium">Additional Information</p>

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="defendantName">Defendant Name</Label>
                              <Input
                                id="defendantName"
                                value={editedBasicInfo.defendantName}
                                onChange={(e) => setEditedBasicInfo({ ...editedBasicInfo, defendantName: e.target.value })}
                                placeholder="Enter defendant name"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="claimNumber">Claim Number</Label>
                              <Input
                                id="claimNumber"
                                value={editedBasicInfo.claimNumber}
                                onChange={(e) => setEditedBasicInfo({ ...editedBasicInfo, claimNumber: e.target.value })}
                                placeholder="Enter claim number"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="insuranceName">Insurance Company Name</Label>
                              <Input
                                id="insuranceName"
                                value={editedBasicInfo.insuranceName}
                                onChange={(e) => setEditedBasicInfo({ ...editedBasicInfo, insuranceName: e.target.value })}
                                placeholder="Enter insurance company name"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="adjuster">Adjuster</Label>
                              <Input
                                id="adjuster"
                                value={editedBasicInfo.adjuster}
                                onChange={(e) => setEditedBasicInfo({ ...editedBasicInfo, adjuster: e.target.value })}
                                placeholder="Enter adjuster name"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="insuranceAddress">Insurance Company Address</Label>
                            <Input
                              id="insuranceAddress"
                              value={editedBasicInfo.insuranceAddress}
                              onChange={(e) => setEditedBasicInfo({ ...editedBasicInfo, insuranceAddress: e.target.value })}
                              placeholder="Enter insurance company address"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="phone">Phone</Label>
                              <Input
                                id="phone"
                                value={editedBasicInfo.phone}
                                onChange={(e) => setEditedBasicInfo({ ...editedBasicInfo, phone: e.target.value })}
                                placeholder="Enter phone number"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="fax">Fax</Label>
                              <Input
                                id="fax"
                                value={editedBasicInfo.fax}
                                onChange={(e) => setEditedBasicInfo({ ...editedBasicInfo, fax: e.target.value })}
                                placeholder="Enter fax number"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="claimType">Claim Type</Label>
                              <select
                                id="claimType"
                                value={editedBasicInfo.claimType}
                                onChange={(e) => setEditedBasicInfo({ ...editedBasicInfo, claimType: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              >
                                <option value="">Select claim type</option>
                                <option value="auto">Auto Accident</option>
                                <option value="property">Property Damage</option>
                                <option value="liability">General Liability</option>
                                <option value="workers-comp">Workers Compensation</option>
                                <option value="medical">Medical Malpractice</option>
                                <option value="product">Product Liability</option>
                                <option value="premises">Premises Liability</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="additionalNotes">Additional Notes</Label>
                            <Textarea
                              id="additionalNotes"
                              value={editedBasicInfo.additionalNotes}
                              onChange={(e) => setEditedBasicInfo({ ...editedBasicInfo, additionalNotes: e.target.value })}
                              placeholder="Enter any additional notes"
                              className="min-h-[100px] font-sans text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

            </div>
          </DefaultCardComponent>
        </div>

        {/* Full Width Document Section */}
        <div className="w-full mt-3">
          {/* Tab Navigation using DefaultCardComponent and Tabs */}
          <DefaultCardComponent title="Demand Note Documents">
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                if (isCustomer && value !== "upload") {
                  return;
                }
                if (value === "upload" && tab1Disabled) {
                  toast.error("Tab-1 is disabled while another tab is active.");
                  return;
                }
                if (value === "indexing" && tab2Disabled) {
                  toast.error("Tab-2 is disabled while another tab is active.");
                  return;
                }
                if (value === "draft" && tab3Disabled) {
                  toast.error("Tab-3 is disabled while another tab is active.");
                  return;
                }
                if (value === "draft") {
                  handleLoadDraftOnTab();
                }
                setActiveTab(value as "upload" | "indexing" | "draft");
              }}
              className="gap-0"
            >
              {/* TAB HEADER */}
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-slate-600">
                <TabsList className="bg-transparent rounded-none h-[50px] p-0 inline-flex items-center gap-0">
                  <TabsTrigger
                    value="upload"
                    disabled={tab1Disabled}
                    className="!flex-none py-2.5 px-4 font-medium text-base text-neutral-600
                      hover:text-primary border-0 border-b-2 border-transparent
                      data-[state=active]:text-primary
                      data-[state=active]:border-primary
                      rounded-none shadow-none"
                  >
                    Document Upload
                  </TabsTrigger>

                  {showInternalTabs && (
                    <>
                      <span
                        className="px-2 text-xs font-semibold text-neutral-500 select-none animate-pulse"
                        aria-hidden="true"
                      >
                        &gt;&gt;
                      </span>
                      <TabsTrigger
                        value="indexing"
                        disabled={tab2Disabled}
                        className="!flex-none py-2.5 px-4 font-medium text-base text-neutral-600
                          hover:text-primary border-0 border-b-2 border-transparent
                          data-[state=active]:text-primary
                          data-[state=active]:border-primary
                          rounded-none shadow-none"
                      >
                        Indexing & Summary
                      </TabsTrigger>

                      <span
                        className="px-2 text-xs font-semibold text-neutral-500 select-none animate-pulse"
                        aria-hidden="true"
                      >
                        &gt;&gt;
                      </span>
                      <TabsTrigger
                        value="draft"
                        disabled={tab3Disabled}
                        className="!flex-none py-2.5 px-4 font-medium text-base text-neutral-600
                          hover:text-primary border-0 border-b-2 border-transparent
                          data-[state=active]:text-primary
                          data-[state=active]:border-primary
                          rounded-none shadow-none"
                      >
                        Draft123
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>
              </div>

              {/* TAB CONTENT */}
              <div className="pt-6 ">
                {/* ---------------- UPLOAD TAB ---------------- */}
                <TabsContent value="upload" className="p-0 space-y-6">
                  {/* Upload Section */}
                  <Card className="dark:bg-gray-900">
                    <CardHeader>
                      <CardTitle>Upload Documents</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Drag and drop files or click to select
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Category Selection */}
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                          <Label className="text-sm font-medium">Document Type:</Label>
                          <Select
                            value={selectedCategory}
                            onValueChange={setSelectedCategory}
                            disabled={tab1Disabled}
                          >
                            <SelectTrigger className="w-full lg:w-48">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="traffic">🚗 Traffic Reports</SelectItem>
                              <SelectItem value="medical">🏥 Medical Reports</SelectItem>
                              <SelectItem value="bills">💊 Medical Bills</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Drag and Drop Zone */}
                        <div
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          className={`
                              relative dark:bg-gray-900 border-2 border-dashed rounded-lg p-8 lg:p-12 text-center transition-colors
                              ${dragActive
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-300 bg-gray-50 hover:border-gray-400"
                            }
                            `}
                        >
                          <input
                            id="file-upload"
                            type="file"
                            multiple
                            onChange={handleFileInputChange}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer "
                            disabled={tab1Disabled}
                          />
                          <div className="flex flex-col items-center gap-3 ">
                            <Upload className="h-10 w-10 lg:h-12 lg:w-12 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                Drop files here or click to browse
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Supports PDF, DOC, DOCX, JPG, PNG
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Selected Files */}
                        {uploadFiles.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Selected Files ({uploadFiles.length})</Label>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {uploadFiles.map((file, idx) => (
                                <div
                                  key={`${file.name}-${idx}`}
                                  className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50"
                                >
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">{file.name}</p>
                                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile(idx)}
                                    className="p-1.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                                    aria-label={`Remove ${file.name}`}
                                    disabled={tab1Disabled}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <Button
                              onClick={handleFileUpload}
                              disabled={tab1Disabled || uploadFiles.length === 0 || isUploading}
                              className="w-full"
                              size="lg"
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Upload {uploadFiles.length} file(s)
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Uploaded Documents Table */}
                  <Card className="dark:bg-gray-900">
                    <CardHeader>
                      <CardTitle>Uploaded Documents</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        All documents uploaded to this demand note
                      </p>
                    </CardHeader>
                    <CardContent>
                      {demandNote?.files && demandNote.files.length > 0 ? (
                        <HorizontalScrollContainer>
                          <table className="w-full border-collapse">
                            <thead className="sticky top-0 bg-gray-50 border-b">
                              <tr className="text-left text-xs font-medium text-gray-600 uppercase tracking-wider dark:bg-gray-700 dark:text-gray-300">
                                <th className="px-4 py-2">Document Name</th>
                                <th className="px-4 py-2">Document Type</th>
                                <th className="px-4 py-2">Upload Date</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {[...demandNote.files]
                                .sort((a, b) => new Date(b.uploadedAt || b.createdAt || "").getTime() - new Date(a.uploadedAt || a.createdAt || "").getTime())
                                .map(file => (
                                  <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-2">
                                      <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                        <span className="text-sm font-medium text-gray-900">
                                          {file.fileName}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2">
                                      <Badge variant="outline" className="capitalize">
                                        {file.fileCategory === "traffic" && "🚗 Traffic"}
                                        {file.fileCategory === "medical" && "🏥 Medical"}
                                        {file.fileCategory === "bills" && "💊 Bills"}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-2">
                                      <div className="flex items-center gap-1 text-sm text-gray-500">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {formatDate(file.uploadedAt, 'MM/dd/yyyy')}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2">
                                      <Badge variant="secondary" className="text-xs">
                                        {file.status}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-2">
                                      <div className="flex gap-1 justify-end">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handlePreviewFile(file.fileUrl, file.fileName)}
                                          className="h-7 w-7"
                                          title="Preview"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDownloadFile(file.fileUrl, file.fileName)}
                                          className="h-7 w-7"
                                          title="Download"
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDeleteFile(file.id)}
                                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          title="Delete"
                                          disabled={tab1Disabled}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </HorizontalScrollContainer>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">No documents uploaded yet</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Use the upload section above to add documents
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ---------------- INDEXING TAB ---------------- */}
                {showInternalTabs && (
                  <TabsContent value="indexing" className="p-0">
                    <Card className="dark:bg-gray-900">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Document Indexing & Summary</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Documents ordered by upload date with editable summaries
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleCommonIndexing}
                              disabled={tab2Disabled || isIndexing || isProcessingDisabled}
                              variant="outline"
                              className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:text-white"
                            >
                              {isIndexing ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  {indexingProgress === 'indexing' && 'Indexing...'}
                                  {indexingProgress === 'in-progress' && 'Processing...'}
                                  {indexingProgress === 'complete' && 'Complete!'}
                                </>
                              ) : (
                                <>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Indexing
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={handleCommonSummary}
                              disabled={tab2Disabled || isSummarizing || isProcessingDisabled}
                              // isabled={tab2Disabled || isSummarizing || isProcessingDisabled || !summaryActionEnabled || job?.publishStatus === "edit_basic_info" || job?.status === "completed"}
                              // disabled={tab2Disabled || isSummarizing || isProcessingDisabled || !summaryActionEnabled || job?.status !== "completed"}
                              variant="outline"
                              className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 dark:text-white"
                            >
                              {isSummarizing ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Summarizing...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Summary456
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* NEW: Progress Bar */}
                        {(isIndexing || isSummarizing) && (
                          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                <span className="text-sm font-medium text-blue-900">
                                  {isIndexing && 'Indexing in progress...'}
                                  {isSummarizing && 'Summarizing documents...'}
                                </span>
                              </div>
                              <span className="text-xs text-blue-700">
                                {isSummarizing && summarizationProgress}
                                {isIndexing && (
                                  <>
                                    {indexingProgress === 'indexing' && '33%'}
                                    {indexingProgress === 'in-progress' && '66%'}
                                    {indexingProgress === 'complete' && '100%'}
                                  </>
                                )}
                              </span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
                                style={{
                                  width: isIndexing
                                    ? (indexingProgress === 'indexing' ? '33%' : indexingProgress === 'in-progress' ? '66%' : '100%')
                                    : isSummarizing
                                      ? summarizationProgress  // Use the direct progress value
                                      : '0%'
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {demandNote?.files && demandNote.files.length > 0 ? (
                          <HorizontalScrollContainer>
                            <table className="w-full">
                            <thead className="sticky top-0 bg-gray-50 border-b">
                              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <th className="px-4 py-2">Document Name</th>
                                <th className="px-4 py-2">Document Type</th>
                                <th className="px-4 py-2">Chronology</th>
                                {/* <th className="px-4 py-2">Status</th> */}
                                <th
                                  className={`px-4 py-2 w-2/5 ${isSummaryModalOpen ? "bg-indigo-50 text-indigo-600" : ""}`}
                                >
                                  Summary
                                </th>
                              </tr>
                            </thead>
                              <tbody className="divide-y divide-gray-200">
                                {[...demandNote.files]
                                  .sort((a, b) => new Date(b.uploadedAt || b.createdAt || "").getTime() - new Date(a.uploadedAt || a.createdAt || "").getTime())
                                  .map((file, index) => {
                                    const isActiveSummary = summaryModalFile?.id === file.id;
                                    return (
                                      <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                                        <td
                                          className={`px-4 py-3 ${isActiveSummary ? "bg-indigo-50 ring-2 ring-indigo-500" : ""}`}
                                        >
                                          <div className="flex items-center gap-3">
                                            <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                            <span className="text-sm font-medium text-gray-900">
                                              {file.fileName}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <Badge variant="outline" className="capitalize">
                                            {file.fileCategory === "traffic" && "Traffic"}
                                            {file.fileCategory === "medical" && "Medical"}
                                            {file.fileCategory === "bills" && "Bills"}
                                          </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="flex items-center gap-2">
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                                              {index + 1}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                              {formatDate(file.uploadedAt, 'MM/dd/yyyy')}
                                            </div>
                                          </div>
                                        </td>
                                        <td
                                          className={`px-4 py-3 transition-colors ${isSummaryModalOpen ? "bg-indigo-50/70" : ""} ${isActiveSummary ? "ring-2 ring-indigo-200 bg-white shadow-inner" : ""}`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                              {summaryStatuses[file.id] === 'in-progress' ? (
                                                <div className="flex items-center gap-2">
                                                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                                  <span className="text-sm text-indigo-600">Generating summary...</span>
                                                </div>
                                              ) : (
                                                <>
                                                  <p
                                                    className="text-sm text-gray-600 truncate max-w-[200px]"
                                                    title={(file as FileType).tasks?.[0]?.outputSummary || "No summary available"}
                                                  >
                                                    {(() => {
                                                      const summary = (file as FileType).tasks?.[0]?.outputSummary || (file as FileType).tasks?.[0]?.editedSummary || "No summary available";
                                                      return summary.length > 25 ? summary.substring(0, 25) + "..." : summary;
                                                    })()}
                                                  </p>
                                                  <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    {(() => {
                                                      const task = (file as FileType).tasks?.[0];
                                                      if (!task) return "No data";
                                                      const ts = task.endTs;
                                                      return ts ? formatDistanceToNow(new Date(ts), { addSuffix: true }) : "No timestamp";
                                                    })()}
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleOpenSummaryModal(file.id, file.fileName)}
                                              disabled={tab2Disabled || summaryLoadingFileId === file.id || summaryStatuses[file.id] === 'in-progress'}
                                              className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 flex-shrink-0"
                                              title="View/Edit Summary"
                                            >
                                              {summaryLoadingFileId === file.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <Pencil className="h-4 w-4" />
                                              )}
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </HorizontalScrollContainer>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm">No documents available</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Upload documents to view indexing and add summaries
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* ---------------- DRAFT TAB ---------------- */}
                {showInternalTabs && (
                  <TabsContent value="draft" className="p-0 space-y-6">
                    <Card className="dark:bg-gray-900">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Draft Summary</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              Aggregate summaries from all files and refine the final draft
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleFetchDraftSummary(true)}
                              disabled={
                                tab3Disabled ||
                                isDraftLoading ||
                                tab3Mode === "draft" ||
                                tab3Mode === "publish" ||
                                job?.publishStatus === "published" ||
                                (job?.publishStatus !== "edit_basic_info" &&
                                  (job?.status === "pending" || job?.status === "in_progress" || job?.status !== "completed"))
                              }
                              variant="outline"
                            >
                              {isDraftLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                              Summary123
                            </Button>
                            <Button
                              onClick={handleSaveDraft}
                              disabled={tab3Disabled || isDraftLoading || !draftContent || !isDraftEdited || summaryInvalidated || tab3Mode === "summary" || tab3Mode === "publish"}
                              variant="outline"
                              className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:text-white"
                            >
                              {isDraftLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                              Draft
                            </Button>
                            <Button
                              onClick={handleExportDraft}
                              disabled={tab3Disabled || !draftContent}
                              variant="outline"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Export
                            </Button>
                            <Button
                              onClick={handlePublish}
                              disabled={!publishEnabled}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isPublishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                              Publish123
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="min-h-[500px] border rounded-md p-4 bg-white prose max-w-none dark:bg-gray-900">
                          {ReactQuill ? (
                            <ReactQuill
                              theme="snow"
                              value={draftContent}
                              onChange={(content: string) => {
                                setDraftContent(content);
                                setIsDraftEdited(true);
                              }}
                              readOnly={draftEditingDisabled}
                              className="h-[400px] mb-12"
                            />
                          ) : (
                            <textarea
                              value={draftContent}
                              onChange={(e) => {
                                setDraftContent(e.target.value);
                                setIsDraftEdited(true);
                              }}
                              className="w-full h-[400px] p-2 border-none focus:ring-0 resize-none font-sans"
                              placeholder="Start drafting your summary here..."
                              disabled={draftEditingDisabled}
                            />
                          )}
                        </div>

                        {!isPublishable && publishDetails && (
                          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                            <p className="font-semibold mb-1">Publish Requirements:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {!publishDetails.allFilesSummarized && (
                                <li>All files must be summarized (Found {publishDetails.unsummarizedCount} unsummarized)</li>
                              )}
                              {!publishDetails.tasksSynced && (
                                <li>All summarization tasks must be completed</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </DefaultCardComponent>
        </div>

      </div>

      {/* Modals */}
      {previewFile && (
        <DocumentPreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileName={previewFile.name}
          fileUrl={previewFile.url}
        />
      )}

      {demandNote && (
        <SummarizeJobModal
          isOpen={!!summarizeFileId}
          onClose={() => setSummarizeFileId(null)}
          demandNoteId={demandNote.id}
          demandFileId={summarizeFileId}
        />
      )}

      {/* NEW: Summary Panel */}
      {isSummaryModalOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 transition-opacity duration-300"
            onClick={handleCloseSummaryModal}
            aria-hidden="true"
          />
          <div className="relative ml-auto flex h-full w-full max-w-[720px]">
            <div className="relative flex h-full w-full flex-col overflow-hidden rounded-l-3xl border border-slate-200 bg-white text-gray-900 shadow-2xl animate-in slide-in-from-right-2">
              <div className="flex items-center justify-between gap-3 border-b px-6 py-5 bg-gradient-to-r from-indigo-50 via-white to-slate-50">
                <div>
                  <p className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                    Document Summary
                  </p>
                  {summaryModalFile && (
                    <p className="text-sm text-muted-foreground">{summaryModalFile.name}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 hover:text-slate-900"
                  onClick={handleCloseSummaryModal}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isModalLoading ? (
                <div className="flex flex-1 items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <span className="ml-3 text-muted-foreground">Loading summary...</span>
                </div>
              ) : (
                <div className="flex flex-1 flex-col overflow-y-auto px-6 py-5 space-y-6">
                  <Tabs value={modalSummaryMode} onValueChange={(v) => setModalSummaryMode(v as "ai" | "edited")}>
                    <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-full">
                      <TabsTrigger
                        value="ai"
                        className="flex items-center gap-2 rounded-full data-[state=active]:bg-white data-[state=active]:shadow"
                      >
                        <Sparkles className="h-4 w-4" />
                        AI Summary
                      </TabsTrigger>
                      <TabsTrigger
                        value="edited"
                        className="flex items-center gap-2 rounded-full data-[state=active]:bg-white data-[state=active]:shadow"
                      >
                        <Edit className="h-4 w-4" />
                        Edited Summary
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="ai" className="space-y-4">
                      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-5 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 mb-2">
                              AI-Generated Summary
                            </p>
                            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-6">
                              {modalAiSummary || "No AI summary available. Please generate a summary first."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="edited" className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <Label htmlFor="edited-summary" className="text-sm font-semibold uppercase tracking-wide text-slate-600 mb-3 block">
                          Edit Summary
                        </Label>
                        <Textarea
                          id="edited-summary"
                          value={modalEditedSummary}
                          onChange={(e) => setModalEditedSummary(e.target.value)}
                          placeholder="Edit the summary here..."
                          className="min-h-[280px] font-sans text-sm bg-slate-50 border-slate-200 focus:border-indigo-400 focus:ring-indigo-200"
                          disabled={tab2Disabled}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              <div className="px-6 py-4 border-t bg-white/80 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopySummaryModal}
                      className="bg-white"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportSummaryModal}
                      className="bg-white"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    {modalSummaryMode === "edited" && (
                      <Button
                        onClick={handleSaveEditedSummary}
                        disabled={tab2Disabled || isSavingSummary}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        {isSavingSummary ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    )}
                    <Button variant="outline" onClick={handleCloseSummaryModal} className="bg-white">
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top-right Notify Button (Customer Only) */}
      {showNotifyButton && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <Button
            onClick={handleNotifyLegacore}
            // disabled={isNotifying || notifyDisabled || demandNote?.status === "editing"}
            disabled={demandNote?.status === "editing"}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-full px-5 py-2.5 h-auto flex items-center gap-2 border border-blue-500/70 backdrop-blur supports-[backdrop-filter]:bg-blue-600/95"
          >
            {isNotifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Notifying...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                Notify to Legacore
              </>
            )}
          </Button>
        </div>
      )}

      {/* Floating Download Button */}
      {showDownloadButton && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <Button
            onClick={handleDownloadDoc}
            size="sm"
            className="bg-primary text-white hover:text-blue-900 shadow-2xl rounded-full px-4 py-2 h-auto flex items-center gap-3 group"
          >
            <div className="bg-white/20 p-2 rounded-full group-hover:scale-110 transition-transform">
              <Download className="h-5 w-5" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs opacity-80 font-normal">Ready to download</span>
              <span className="text-sm font-semibold">Download Formatted Doc</span>
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}
