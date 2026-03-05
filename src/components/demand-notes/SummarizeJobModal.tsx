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

    // return (
    //     <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    //         <DialogContent className="max-w-2xl bg-white">
    //             <DialogHeader className="space-y-4">
    //                 <DialogTitle className="flex items-center gap-2 text-xl">
    //                     {isProcessing && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
    //                     {isCompleted && <CheckCircle className="h-5 w-5 text-green-500" />}
    //                     {isFailed && <XCircle className="h-5 w-5 text-red-500" />}

    //                     {isProcessing && "Analyzing Document..."}
    //                     {isCompleted && "Document Summary"}
    //                     {isFailed && "Summarization Failed"}
    //                 </DialogTitle>
    //                 {isProcessing && (
    //                     <div className="space-y-2">
    //                         <p className="text-muted-foreground text-sm">
    //                             AI is analyzing your document to generate a concise summary. This may take a moment.
    //                         </p>
    //                         {currentTask && (
    //                             <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gray-50 p-2 rounded-md">
    //                                 <FileText className="h-3 w-3" />
    //                                 <span className="truncate max-w-[300px]">{currentTask.fileName}</span>
    //                                 <span className="ml-auto capitalize">{currentTask.status.replace("_", " ")}</span>
    //                             </div>
    //                         )}
    //                     </div>
    //                 )}
    //             </DialogHeader>

    //             <div className="min-h-[200px] flex flex-col">
    //                 {error ? (
    //                     <div className="flex flex-col items-center justify-center flex-1 text-red-500 gap-2">
    //                         <AlertCircle className="h-8 w-8" />
    //                         <p>{error}</p>
    //                         <Button variant="outline" onClick={handleRetry} className="mt-4">
    //                             <RefreshCw className="h-4 w-4 mr-2" /> Try Again
    //                         </Button>
    //                     </div>
    //                 ) : isProcessing ? (
    //                     <div className="flex flex-col items-center justify-center flex-1 py-12 space-y-6">
    //                         <div className="relative">
    //                             <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
    //                             <div className="relative bg-white p-4 rounded-full border shadow-sm">
    //                                 <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    //                             </div>
    //                         </div>
    //                         <div className="text-center space-y-1">
    //                             <p className="font-medium">Processing...</p>
    //                             <p className="text-xs text-muted-foreground">Please wait while we process your request</p>
    //                         </div>
    //                     </div>
    //                 ) : isCompleted && taskWithOutput ? (
    //                     <div className="space-y-4 animate-in fade-in duration-300">
    //                         <Card className="bg-white border-none shadow-inner">
    //                             <CardContent className="p-4">
    //                                 {/* <ScrollsArea className="h-[300px] pr-4"> */}
    //                                 <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed">
    //                                     {summaryText}
    //                                 </div>
    //                                 {/* </ScrollArea> */}
    //                             </CardContent>
    //                         </Card>

    //                         <div className="flex justify-between items-center pt-2">
    //                             <div className="text-xs text-muted-foreground">
    //                                 Generated from {currentTask?.fileName}
    //                             </div>
    //                             <div className="flex gap-2">
    //                                 {/* <Button variant="outline" size="sm" onClick={handleRetry}>
    //                                     <RefreshCw className="h-3 w-3 mr-2" /> Regenerate
    //                                 </Button> */}
    //                                 <Button variant="default" size="sm" onClick={handleCopy}>
    //                                     {copied ? <Check className="h-3 w-3 mr-2" /> : <Copy className="h-3 w-3 mr-2" />}
    //                                     {copied ? "Copied" : "Copy Text"}
    //                                 </Button>
    //                             </div>
    //                         </div>
    //                     </div>
    //                 ) : null}
    //             </div>
    //         </DialogContent>
    //     </Dialog>
    // );
}
