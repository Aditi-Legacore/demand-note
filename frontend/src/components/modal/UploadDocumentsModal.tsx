"use client";

// import React, { useState } from "react";
import IntakeDocuments from "../forms/intakeDocuments/intakeDocuments";

interface UploadDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  intakeId: string;
  onUploadSuccess: () => void;
}

const UploadDocumentsModal: React.FC<UploadDocumentsModalProps> = ({
  isOpen,
  onClose,
  intakeId,
  onUploadSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Upload Documents
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        <div className="p-6">
          <IntakeDocuments
            submittedIntakeId={intakeId}
            onUploadSuccess={onUploadSuccess}
          />
        </div>
      </div>
    </div>
  );
};

export default UploadDocumentsModal;
