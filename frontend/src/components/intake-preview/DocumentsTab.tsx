'use client';

import React, { useRef } from 'react';
import { Eye, User, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PlaintiffInformationCard from './PlaintiffInformationCard';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import { IntakeData } from '@/types/intake';

interface Document {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  filePath: string;
  uploadedBy: string;
  fileUrl: string;
}

interface DocumentsTabProps {
  documents: Document[];
  loadingDocuments: boolean;
  formatDate: (dateString: string | null) => string;
  intake: IntakeData;
  showPlaintiffCard: boolean;
  setShowPlaintiffCard: (show: boolean) => void;
  onPreview: (fileUrl: string, type: string) => void;
  onDelete: (documentId: string) => void;
  onUpload?: (files: FileList) => void;
}

export default function DocumentsTab({
  documents,
  loadingDocuments,
  formatDate,
  intake,
  showPlaintiffCard,
  setShowPlaintiffCard,
  onPreview,
  onDelete,
  onUpload,
}: DocumentsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0 && onUpload) {
      onUpload(files);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onUpload) {
      onUpload(files);
    }
  };

  return (
    <div className="relative">
      {/* Plaintiff Info Button at top right */}
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPlaintiffCard(!showPlaintiffCard)}
          className="bg-green-600 text-white hover:bg-green-700 rounded-full p-3 shadow-lg lg:hidden"
          title="Plaintiff Info Button"
        >
          <User className="w-5 h-5" />
        </Button>
      </div>

    <>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4 text-center"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <p className="text-gray-600 mb-4">Drag and drop files here or click to upload</p>
          <Button onClick={handleButtonClick} className="mx-auto">
            <Upload className="w-4 h-4 mr-2" />
            Upload Documents
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
          />
        </div>
      <Card className="w-full dark:bg-gray-900 bg-white shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>

    {/* Sliding Plaintiff Info Card */}
    {showPlaintiffCard && (
      <div className="fixed inset-0 z-50 lg:hidden">
        {/* Centered Responsive Card */}
        <div className="absolute top-1/2 left-1/2 w-[90vw] h-[80vh] bg-white dark:bg-gray-900 shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 ease-in-out rounded-lg overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPlaintiffCard(false)}
            className="absolute top-2 right-2 z-10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </Button>
          <div className="p-4 overflow-y-auto h-full pt-10">
            <PlaintiffInformationCard intake={intake} formatDate={formatDate} />
          </div>
        </div>
      </div>
    )}

    {/* Desktop small card */}
    {showPlaintiffCard && (
      <div className="hidden lg:block absolute top-0 right-0 w-80 bg-white dark:bg-gray-900 shadow-lg rounded-lg transform transition-transform duration-300 ease-in-out z-10">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-green-600">Plaintiff Information</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPlaintiffCard(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </Button>
        </div>
        <div className="p-4 overflow-y-auto max-h-96">
          <PlaintiffInformationCard intake={intake} formatDate={formatDate} />
        </div>
      </div>
    )}
          {loadingDocuments ? (
            <LoadingSkeleton
              message={null}
              rowCount={4}
              cardClassName="shadow-none border-none bg-transparent"
              contentClassName="p-0 space-y-3"
              rowWidths={["w-full", "w-5/6", "w-4/6", "w-3/5"]}
            />
          ) : documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  {/* <TableHead>Type</TableHead> */}
                  <TableHead>Uploaded At</TableHead>
                  <TableHead>Uploaded by</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{doc.name}</TableCell>
                    {/* <TableCell>{doc.type}</TableCell> */}
                    <TableCell>{formatDate(doc.uploadedAt)}</TableCell>
                    <TableCell>{doc.uploadedBy}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPreview(doc.fileUrl, doc.type)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDelete(doc.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-gray-500">No documents uploaded</p>
          )}
        </CardContent>
      </Card>
    </>
    </div>
  );
  }
