"use client";

import React, { useState } from "react";
import { Eye, Trash2, FileText, Upload } from "lucide-react";
import Pagination from "@/components/ui/pagination";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import CommonTable, { Column, Action } from "@/components/ui/CommonTable";
import UploadDocumentsModal from "@/components/modal/UploadDocumentsModal";

interface Document {
  id: string;
  clientName: string;
  caseType: string;
  status: string;
  documentStatus: string;
  createdDate: string;
  files: string[];
}

interface DocumentsTableProps {
  documents: Document[];
  onView?: (doc: Document) => void;
  onUploadSuccess?: () => void;
}

export default function DocumentsTable({ documents, onView, onUploadSuccess }: DocumentsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [tableDocs, setTableDocs] = useState<Document[]>(documents);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Update tableDocs when documents prop changes
  React.useEffect(() => {
    setTableDocs(documents);
    setCurrentPage(1); // Reset to first page when documents change
  }, [documents]);

  const router = useRouter();

  // Sort data based on current sort state
  const sortedDocuments = React.useMemo(() => {
    if (!sortColumn) return tableDocs;

    return [...tableDocs].sort((a, b) => {
      const aValue = a[sortColumn as keyof Document];
      const bValue = b[sortColumn as keyof Document];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

      // Handle date sorting
      if (sortColumn === 'createdDate') {
        const aDate = new Date(aValue as string);
        const bDate = new Date(bValue as string);
        return sortDirection === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
      }

      // Handle document status sorting (custom order: submitted, pending, other)
      if (sortColumn === 'documentStatus') {
        const statusOrder = { 'submitted': 1, 'pending': 2 };
        const aOrder = statusOrder[aValue as keyof typeof statusOrder] || 3;
        const bOrder = statusOrder[bValue as keyof typeof statusOrder] || 3;
        return sortDirection === 'asc' ? aOrder - bOrder : bOrder - aOrder;
      }

      // Handle string sorting
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tableDocs, sortColumn, sortDirection]);

  const itemsPerPage = 5;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocuments = sortedDocuments.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => setCurrentPage(page);

  // Delete handler
  const handleDelete = async (doc: Document) => {
    const confirmed = confirm(`Are you sure you want to delete "${doc.clientName}" s document?`);
    if (!confirmed) return;

    setDeletingId(doc.id);

    try {
      const res = await fetch(`/api/documents?id=${doc.id}`, { method: "DELETE" });

      if (res.ok) {
        setTableDocs((prev) => prev.filter((d) => d.id !== doc.id));
        toast.success(`Deleted "${doc.clientName}"s document successfully.`);
        onUploadSuccess?.();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete document.");
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Something went wrong while deleting.");
    } finally {
      setDeletingId(null);
    }
  };

  // Define columns
  const columns: Column<Document>[] = [
    {
      key: 'clientName',
      label: 'Client Name',
      className: 'px-4 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400',
      sortable: true,
      link: (row) => `/intake-preview/${row.id}`
    },
    {
      key: 'caseType',
      label: 'Case Type',
      className: 'px-4 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400',
      sortable: true
    },
    {
      key: 'createdDate',
      label: 'Created Date',
      className: 'px-4 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden sm:table-cell',
      sortable: true,
      render: (value): React.ReactNode => new Date(value as string).toLocaleDateString()
    },
    {
      key: 'documentStatus',
      label: 'Document Status',
      className: 'px-4 py-4',
      sortable: true,
      render: (value): React.ReactNode => (
        <Badge
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            value === "submitted"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : value === "pending"
              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}
        >
          {value as string}
        </Badge>
      )
    },
    {
      key: 'files',
      label: 'Files',
      className: 'px-4 py-4 text-center',
      render: (value, row): React.ReactNode => (
        row.documentStatus === "submitted" ? (
          <button
            onClick={() => router.push(`/documents/${row.id}`)}
            className="p-2 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg text-blue-600 dark:text-blue-400 transition"
            title="View Uploaded Files"
          >
            <FileText size={16} />
          </button>
        ) : (
          <span className="text-gray-400 text-xs italic">—</span>
        )
      )
    }
  ];

  // Define actions
  const actions: Action<Document>[] = [
    {
      label: 'View',
      icon: Eye,
      onClick: (row) => onView?.(row),
      className: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'Upload',
      icon: Upload,
      onClick: (row) => {
        setSelectedDocId(row.id);
        setUploadModalOpen(true);
      },
      className: 'text-green-600 dark:text-green-400'
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: (row) => handleDelete(row),
      disabled: (row) => deletingId === row.id,
      className: 'text-red-600 dark:text-red-400'
    }
  ];

  const DocumentTable = CommonTable as unknown as React.ComponentType<{
    columns: Column<Document>[];
    data: Document[];
    actions?: Action<Document>[];
    showSerialNumber?: boolean;
    emptyMessage?: string;
    onSort?: (column: string, direction: 'asc' | 'desc') => void;
  }>;

  return (
    <>
      <DocumentTable
        columns={columns}
        data={paginatedDocuments}
        actions={actions}
        showSerialNumber={true}
        emptyMessage="No documents found."
        onSort={(column, direction) => {
          setSortColumn(column);
          setSortDirection(direction);
        }}
      />

      {/* Pagination */}
      {tableDocs.length > itemsPerPage && (
        <div className="mt-6">
          <Pagination
            totalItems={tableDocs.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Upload Documents Modal */}
      {selectedDocId && (
        <UploadDocumentsModal
          isOpen={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            setSelectedDocId(null);
          }}
          intakeId={selectedDocId}
          onUploadSuccess={() => {
            // Refresh documents or handle success
            onUploadSuccess?.();
            setUploadModalOpen(false);
            setSelectedDocId(null);
          }}
        />
      )}
    </>
  );
}