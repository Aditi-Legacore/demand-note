import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileUrl: string;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  fileName,
  fileUrl,
}: DocumentPreviewModalProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if file is a PDF
  const isPdf = fileName.toLowerCase().endsWith('.pdf');

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full max-w-3xl border-0 p-0">
        <SheetHeader className="flex flex-row items-center justify-between w-full px-2 py-2 border-b border-gray-200">
          <SheetTitle className="text-gray-900 font-normal text-sm truncate max-w-[60%] m-0">
            {fileName}
          </SheetTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-2 shrink-0 bg-gray-200"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onClose}
              className="flex items-center gap-2 shrink-0 bg-red-600 hover:bg-red-700 text-white"
            >
              <X className="w-4 h-4" />
              Close
            </Button>
          </div>
        </SheetHeader>
        <div className="flex-1 p-6 pt-4">
          {fileUrl ? (
            <div className="w-full h-[85vh] border border-gray-200 rounded-lg overflow-auto bg-gray-500">
              {isPdf ? (
                <iframe
                  src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  className="w-full h-full min-h-[80vh]"
                  title={`Preview of ${fileName}`}
                />
              ) : (
                <iframe
                  src={fileUrl}
                  className="w-full h-full border-0"
                  title={`Preview of ${fileName}`}
                />
              )}
            </div>
          ) : (
            <div className="w-full h-[85vh] border border-gray-200 rounded-lg flex items-center justify-center bg-gray-500">
              <p className="text-muted-foreground">No preview available</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
