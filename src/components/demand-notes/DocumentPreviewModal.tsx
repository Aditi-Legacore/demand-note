import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-medium truncate max-w-[70%]">
              {fileName}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-2 shrink-0"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 p-6 pt-4">
          {fileUrl ? (
            <div className="w-full h-[75vh] border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              {isPdf ? (
                <object
                  data={`${fileUrl}#view=FitH&toolbar=0&navpanes=0`}
                  type="application/pdf"
                  className="w-full h-full"
                  title={`Preview of ${fileName}`}
                >
                  <div className="w-full h-full flex flex-col items-center justify-center p-4">
                    <p className="text-muted-foreground mb-4">
                      Unable to display PDF. Please download it instead.
                    </p>
                    <Button onClick={handleDownload} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </object>
              ) : (
                <iframe
                  src={fileUrl}
                  className="w-full h-full border-0"
                  title={`Preview of ${fileName}`}
                />
              )}
            </div>
          ) : (
            <div className="w-full h-[75vh] border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
              <p className="text-muted-foreground">No preview available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 