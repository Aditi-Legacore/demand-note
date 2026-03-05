'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { IntakeData } from '@/types/intake';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NotesTab from '@/components/intake-preview/NotesTab';
import ActivityLogTab from '@/components/intake-preview/ActivityLogTab';
import DocumentsTab from '@/components/intake-preview/DocumentsTab';
import InformationTab from '@/components/intake-preview/InformationTab';
import { ArrowLeft, FileText, Calendar, User, Scale, Download, Share2, Trash2 } from "lucide-react";
import ImagePreviewModal from '@/components/intake-preview/ImagePreviewModal';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import PDFPreviewModal from '@/components/intake-preview/PDFPreviewModal';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import { email } from 'zod';

interface DocumentRecord {
  id: string;
  fileName: string;
  mimeType?: string;
  uploadedAt?: string;
  filePath: string;
  intake?: {
    clientName?: string;
  };
}


export default function IntakePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [intake, setIntake] = useState<IntakeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  // const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ id: string; content: string; createdAt: string; createdBy: string }[]>([]);
  const [activityLogs, setActivityLogs] = useState<{ id: string; shortDescription: string; longDescription?: string; createdAt: string; createdBy: string; createdByName?: string }[]>([]);
  const [documents, setDocuments] = useState<{ id: string; name: string; type: string; uploadedAt: string; filePath: string; uploadedBy: string }[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newActivityAction, setNewActivityAction] = useState('');
  const [newActivityDetails, setNewActivityDetails] = useState('');
  const [activeTab, setActiveTab] = useState('information');



  const id = params.id as string;

  useEffect(() => {
    const fetchIntake = async () => {
      try {
        // First try to fetch by ID (for intake table links)
        let res = await fetch(`/api/intake/${id}`);
        if (res.status === 404) {
          // If not found by ID, try to fetch by referenceId (for leads table links)
          res = await fetch(`/api/intake/reference/${id}`);
        }
        if (res.status === 404) {
          // If not found, try embed API for embedded intakes
          res = await fetch(`/api/intake/reference/${email(id)}`);
        }
        if (res.status === 404) {
          setIntake(null);
          return;
        }
        if (!res.ok) {
          console.log(`Fetch failed with status: ${res.status} ${res.statusText}`);
          throw new Error('Failed to fetch intake');
        }
        const data = await res.json();
        setIntake(data);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load intake details.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchIntake();
  }, [id]);

  const fetchNotes = useCallback(async () => {
    if (!intake?.id) return;
    setLoadingNotes(true);
    try {
      const res = await fetch(`/api/intake/${intake.id}/notes`);
      if (!res.ok) throw new Error('Failed to fetch notes');
      const data = await res.json();
      setNotes(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load notes.');
    } finally {
      setLoadingNotes(false);
    }
  }, [intake?.id]);

  const fetchActivityLogs = useCallback(async () => {
    if (!intake?.id) return;
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/intake/${intake.id}/activity-logs`);
      if (!res.ok) throw new Error('Failed to fetch activity logs');
      const data = await res.json();
      setActivityLogs(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load activity logs.');
    } finally {
      setLoadingActivity(false);
    }
  }, [intake?.id]);

  const fetchDocuments = useCallback(async () => {
    if (!intake?.id) return;
    setLoadingDocuments(true);
    try {
      const res = await fetch(`/api/intake/${intake.id}/documents`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();

      const formattedDocs = data.map((doc: DocumentRecord) => ({
        id: doc.id,
        name: doc.fileName,
        type: doc.mimeType?.split("/")[1]?.toUpperCase() || "N/A",
        uploadedAt: doc.uploadedAt || new Date().toISOString(),
        filePath: doc.filePath,
        uploadedBy: doc.intake?.clientName || "Unknown",
      }));

      setDocuments(formattedDocs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents.");
    } finally {
      setLoadingDocuments(false);
    }
  }, [intake?.id]);

  useEffect(() => {
    if (!intake?.id) return;

    const run = async () => {
      if (activeTab === 'notes') {
        await fetchNotes();
      } else if (activeTab === 'activity' || activeTab === 'information') {
        await fetchActivityLogs();
      } else if (activeTab === 'documents') {
        await fetchDocuments();
      }
    };

    run();
  }, [activeTab, fetchActivityLogs, fetchDocuments, fetchNotes, intake?.id]);

  const addNote = async () => {
    if (!newNote.trim() || !intake?.id) return;
    console.log("session", session);

    try {
      const res = await fetch(`/api/intake/${intake.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote, createdBy: session?.user?.name || 'User' }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      setNewNote('');
      fetchNotes();
      toast.success('Note added successfully.');

      // Log activity for adding note
      await fetch('/api/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeId: intake.id,
          activityType: 'add_note',
          shortDescription: 'Note Added',
          longDescription: 'added a note',
        }),
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to add note.');
    }
  };

  const addActivityLog = async () => {
    if (!newActivityAction.trim() || !intake?.id) return;
    try {
      const res = await fetch(`/api/intake/${intake.id}/activity-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: newActivityAction, details: newActivityDetails, createdBy: session?.user?.name || 'User' }),
      });
      if (!res.ok) throw new Error('Failed to add activity log');
      setNewActivityAction('');
      setNewActivityDetails('');
      fetchActivityLogs();
      toast.success('Activity log added successfully.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to add activity log.');
    }
  };



  const deleteNote = async (noteId: string) => {
    if (!intake?.id) return;
    try {
      const res = await fetch(`/api/intake/${intake.id}/notes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      });
      if (!res.ok) throw new Error('Failed to delete note');
      fetchNotes();
      toast.success('Note deleted successfully.');

      // Log activity for deleting note
      await fetch('/api/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeId: intake.id,
          activityType: 'delete_note',
          shortDescription: 'Note Deleted',
          longDescription: 'deleted a note',
        }),
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete note.');
    }
  };

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);


  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this intake?') || !intake?.id) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/intake/${intake.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete intake');
      toast.success('Intake deleted successfully.');
      router.push('/forms');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete intake.');
    } finally {
      setIsDeleting(false);
    }
  };

  const generatePdf = async () => {
    if (!intake?.id) return null;
    // setLoadingPdf(true);
    try {
      const res = await fetch(`/api/intake/${intake.id}/pdf`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to generate PDF');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      setPdfUrl(url);
      toast.success('PDF generated successfully.');
      return url;
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF.');
      return null;
    } finally {
      // setLoadingPdf(false);
    }
  };


  const handleDownload = async () => {
    let url = pdfUrl;
    if (!url) {
      url = await generatePdf();
    }

    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `intake-${intake?.id || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('PDF downloaded successfully.');
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard.');
  };

  // added for viewing the image by clicking eye button in intake-preview page

  // const handleDocumentPreview = (filePath: string, type: string) => {
  //   if (type === 'PNG' || type === 'JPEG' || type === 'JPG') {
  //     setImageUrl(filePath);
  //     setShowImagePreview(true);
  //   } else {
  //     toast.error('Preview not supported for this file type.');
  //   }
  // };
  const handleDocumentPreview = (filePath: string, type: string) => {
    const normalizedType = type.toLowerCase();

    // ✅ Image Preview
    if (["image/png", "image/jpeg", "image/jpg"].includes(normalizedType)) {
      setImageUrl(filePath);
      setShowImagePreview(true);
      return;
    }

    // ✅ PDF Preview
    if (normalizedType === "application/pdf" || filePath.endsWith(".pdf")) {
      window.open(filePath, "_blank"); // open directly in a new tab
      return;
    }

    // ✅ Plain Text Preview
    if (normalizedType === "text/plain" || filePath.endsWith(".txt")) {
      window.open(filePath, "_blank");
      return;
    }

    // ✅ Word Docs (open in Office Viewer)
    if (
      normalizedType === "application/msword" ||
      normalizedType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      filePath.endsWith(".doc") ||
      filePath.endsWith(".docx")
    ) {
      // Use Office Online Viewer for a better experience
      const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(filePath)}`;
      window.open(officeViewerUrl, "_blank");
      return;
    }

    // ⚠️ Unsupported File Type
    toast.error("Preview not supported for this file type.");
  };


  const handleDocumentDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?') || !intake?.id) return;

    try {
      const res = await fetch(`/api/intake/${intake.id}/documents`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });
      if (!res.ok) throw new Error('Failed to delete document');
      fetchDocuments();
      toast.success('Document deleted successfully.');

      // Log activity for deleting document
      await fetch('/api/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeId: intake.id,
          activityType: 'delete_document',
          shortDescription: 'Document Deleted',
          longDescription: 'deleted a document',
        }),
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete document.');
    }
  };

  const handleDocumentUpload = async (files: FileList) => {
    if (!intake?.id) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch(`/api/intake/${intake.id}/documents`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        if (res.status === 409 && data.duplicates?.length) {
          toast.warning(`⚠️ Duplicate files detected: ${data.duplicates.join(", ")}`);
        } else if (res.status === 207 && data.duplicates?.length) {
          toast.success("✅ Some files uploaded successfully!");
          toast.warning(`⚠️ Skipped duplicates: ${data.duplicates.join(", ")}`);
        } else {
          toast.error(`❌ Upload failed: ${data.message || data.error || "Unknown error"}`);
        }

        // Stop execution — don’t throw or log console error
        return;
      }

      // ✅ Success
      toast.success("✅ Documents uploaded successfully!");
      fetchDocuments();


      // Log activity for uploading document
      await fetch('/api/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeId: intake.id,
          activityType: 'upload_document',
          shortDescription: 'Document Uploaded',
          longDescription: 'uploaded documents',
        }),
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload documents.');
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-1">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <LoadingSkeleton
            message={null}
            rowCount={4}
            cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm" contentClassName="p-4 space-y-3"
            // rowWidths={["w-3/4", "w-5/6", "w-4/6", "w-3/5"]}
          />
          <LoadingSkeleton
            message={null}
            rowCount={3}
            cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm" contentClassName="p-4 space-y-3"

          />
          <LoadingSkeleton
            message={null}
            rowCount={4}
            cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm" contentClassName="p-4 space-y-3"

            // rowWidths={["w-full", "w-5/6", "w-3/4", "w-2/3"]}
          />
        </div>
      </div>
    );
  }

  if (!intake) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <p className="text-slate-500">Intake not found.</p>
      </div>
    );
  }



  const handleBack = () => {
    router.back();
  };

  const handleDownloadNew = async () => {
    await handleDownload();
  };

  const handleShareNew = () => {
    handleShare();
  };

  const handleDeleteNew = async () => {
    if (confirm("Are you sure you want to delete this intake?")) {
      setIsDeleting(true);
      await handleDelete();
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-success text-success-foreground";
      case "pending":
        return "bg-warning text-warning-foreground";
      case "closed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-info text-info-foreground";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <>
      <div className="min-h-screen ">
        {/* Header Section */}
        <div className="bg-primary text-primary-foreground rounded-md dark:bg-gray-900 dark:text-white">
          <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-primary-foreground hover:bg-primary-foreground/10 dark:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadNew}
                  className="text-primary-foreground hover:bg-primary-foreground/10 dark:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShareNew}
                  className="text-primary-foreground hover:bg-primary-foreground/10 dark:text-white"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteNew}
                  disabled={isDeleting}
                  className="text-primary-foreground hover:bg-destructive/90 hover:text-destructive-foreground dark:text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Avatar className="w-20 h-20">
                <div className="w-full h-full rounded-full border-4 border-white/30 shadow-lg flex items-center justify-center bg-white/20">
                  <span className="text-white text-4xl font-bold leading-none">
                    {getInitials(intake.clientName)}
                  </span>
                </div>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-white">{intake.clientName}</h2>
                  <Badge className={getStatusColor("Active")}>
                    Active
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-primary-foreground/90 dark:text-white/90">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{intake.gender || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    <span>Personal Injury</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>ID: {intake.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Incident Date: {formatDate(intake.accidentDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-8xl mx-auto px-2 sm:px-2 lg:px-1 py-4 ">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full dark:bg-gray-900 bg-white rounded-md border border-gray-200 dark:border-gray-700">
            <TabsList className="grid w-full grid-cols-4 dark:bg-gray-800 bg-gray-200 rounded-t-md border-b border-gray-200 dark:border-gray-700">
              <TabsTrigger value="information">Information</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="activity">Activity Logs</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>
            <TabsContent value="information" className="mt-1 ">
              <InformationTab
                intake={intake}
                activityLogs={activityLogs}
                loadingActivity={loadingActivity}
                formatDate={formatDate}
                setActiveTab={setActiveTab}
              />
            </TabsContent>
            <TabsContent value="notes" className="mt-1">
              <NotesTab
                notes={notes}
                loadingNotes={loadingNotes}
                newNote={newNote}
                setNewNote={setNewNote}
                addNote={addNote}
                deleteNote={deleteNote}
                formatDate={formatDate} intake={intake!} showPlaintiffCard={false} setShowPlaintiffCard={function (): void {
                  throw new Error('Function not implemented.');
                }} />
            </TabsContent>
            <TabsContent value="activity" className="mt-1">
              <ActivityLogTab
                activityLogs={activityLogs}
                loadingActivity={loadingActivity}
                newActivityAction={newActivityAction}
                setNewActivityAction={setNewActivityAction}
                newActivityDetails={newActivityDetails}
                setNewActivityDetails={setNewActivityDetails}
                addActivityLog={addActivityLog}
                formatDate={formatDate}
                intake={intake}
                showPlaintiffCard={false}
                setShowPlaintiffCard={function (): void {
                  throw new Error('Function not implemented.');
                }}
              />
            </TabsContent>
            <TabsContent value="documents" className="mt-1">
              <DocumentsTab
                documents={documents}
                loadingDocuments={loadingDocuments}
                formatDate={formatDate}
                onPreview={handleDocumentPreview}
                onDelete={handleDocumentDelete}
                onUpload={handleDocumentUpload} intake={intake!} showPlaintiffCard={false} setShowPlaintiffCard={function (): void {
                  throw new Error('Function not implemented.');
                }} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <PDFPreviewModal
        showPdfPreview={showPdfPreview}
        pdfUrl={pdfUrl}
        onClose={() => setShowPdfPreview(false)}
      />

      <ImagePreviewModal
        showImagePreview={showImagePreview}
        imageUrl={imageUrl}
        onClose={() => setShowImagePreview(false)}
      />
    </>
  );
}
