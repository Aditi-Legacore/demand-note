"use client";

import { useState, useEffect, useCallback } from "react";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Loader2, CheckCircle, XCircle, FileText, AlertCircle, RefreshCw, Copy, Check } from "lucide-react";
// import { Badge } from "@/components/ui/badge";
// import { toast } from "sonner";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { Card, CardContent } from "@/components/ui/card";

interface SummarizeJobModalProps {
    isOpen: boolean;
    onClose: () => void;
    demandNoteId: string;
    demandFileId?: string | null;
}

interface JobTask {
    id: string;
    fileName: string;
    status: "pending" | "in_progress" | "completed" | "failed";
    outputSummary: unknown; // Can be string or object, handle accordingly
}

interface JobStatus {
    id: string;
    status: "pending" | "in_progress" | "completed" | "failed";
    tasks: JobTask[];
}

export function SummarizeJobModal({ isOpen, demandNoteId, demandFileId }: SummarizeJobModalProps) {
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // const [error, setError] = useState<string | null>(null);
    // const [copied, setCopied] = useState(false);

    // Function to start a new job
    const startJob = useCallback(async () => {
        setIsLoading(true);
        // setError(null);
        try {
            const res = await fetch("/api/job/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    demandNoteId,
                    demandFileId // Pass file ID
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to start job");
            }

            setJobId(data.jobId);
            // toast.success("Summarization started"); 
        } catch (err) {
            console.error(err);
            // setError(err.message);
            // toast.error(err.message);
        } finally {
            // Loading state continues until we get status back in the poll
        }
    }, [demandNoteId, demandFileId]);

    // Initial check and auto-start logic
    useEffect(() => {
        if (!isOpen) {
            setJobId(null);
            setJobStatus(null);
            // setError(null);
            setIsLoading(false);
            return;
        }

        const init = async () => {
            if (!demandFileId) return; // Should generally have a file ID in this new flow

            setIsLoading(true);
            try {
                // Check if job exists
                const res = await fetch(`/api/demand-files/${demandFileId}/status`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.job) {
                        setJobId(data.job.id);
                        setJobStatus(data.job);
                        setIsLoading(false);
                        return;
                    }
                }

                // If NO job exists, auto-start
                await startJob();
            } catch (err) {
                console.error("Initialization error:", err);
                // setError("Failed to initialize summarization.");
                setIsLoading(false);
            }
        };

        init();
    }, [isOpen, demandFileId, startJob]);


    // Poll for status
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (jobId && isOpen && jobStatus?.status !== "completed" && jobStatus?.status !== "failed") {
            const fetchStatus = async () => {
                try {
                    const res = await fetch(`/api/job/status?jobId=${jobId}`);
                    if (!res.ok) throw new Error("Failed to fetch status");
                    const data = await res.json();
                    setJobStatus(data.job);

                    if (isLoading && data.job) {
                        setIsLoading(false);
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            };

            // Poll immediately if we don't have status yet, then interval
            if (!jobStatus) fetchStatus();
            intervalId = setInterval(fetchStatus, 3000);
        }

        return () => clearInterval(intervalId);
    }, [jobId, isOpen, jobStatus?.status, isLoading, jobStatus]);


    // Helper to find the relevant task
    // const taskWithOutput = jobStatus?.tasks?.find(t => t.outputSummary);
    // const currentTask = jobStatus?.tasks?.[0]; // Assuming single file job
    // const isProcessing = !jobStatus || jobStatus.status === "pending" || jobStatus.status === "in_progress";
    // const isFailed = jobStatus?.status === "failed";
    // const isCompleted = jobStatus?.status === "completed";

    // const summaryText = (() => {
    //     if (!taskWithOutput?.outputSummary) return "";
    //     if (typeof taskWithOutput.outputSummary === "string") {
    //         return taskWithOutput.outputSummary || "";
    //     }
    //     try {
    //         return taskWithOutput.outputSummary || "";
    //     } catch {
    //         return "";
    //     }
    // })();

    // const handleCopy = () => {
    //     if (summaryText) {
    //         navigator.clipboard.writeText(summaryText);
    //         setCopied(true);
    //         setTimeout(() => setCopied(false), 2000);
    //         toast.success("Summary copied to clipboard");
    //     }
    // };

    // const handleRetry = () => {
    //     setJobId(null);
    //     setJobStatus(null);
    //     startJob();
    // };

    return null;
}
