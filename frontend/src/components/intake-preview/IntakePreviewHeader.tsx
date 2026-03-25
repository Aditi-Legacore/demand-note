'use client';

import React from 'react';
import { Edit, Trash2, Download, ArrowLeft } from 'lucide-react';
// import { Button } from '@/components/ui/button';

interface IntakePreviewHeaderProps {
  onBack: () => void;
  onUpdate: () => void;
  onPreview: () => void;
  onDelete: () => void;
  loadingPdf: boolean;
  loadingDelete: boolean;
}

export default function IntakePreviewHeader({
  onBack,
  onUpdate,
  onPreview,
  onDelete,
  loadingPdf,
  loadingDelete,
}: IntakePreviewHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6 lg:mb-8">
      <button
        onClick={onBack}
        className="flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors duration-200"
        title="Back"
      >
        <ArrowLeft size={20} />
      </button>
      <div className="flex-1 text-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white">
          Case Intake Preview
        </h1>
        <p className="text-slate-600 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
          Review and manage case intake details
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onUpdate}
          className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors duration-200"
          title="Update"
        >
          <Edit size={16} />
        </button>
        <button
          onClick={onPreview}
          disabled={loadingPdf}
          className="flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors duration-200 disabled:opacity-50"
          title="Preview PDF"
        >
          {loadingPdf ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Download size={16} />
          )}
        </button>
        <button
          onClick={onDelete}
          disabled={loadingDelete}
          className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors duration-200 disabled:opacity-50"
          title="Delete"
        >
          {loadingDelete ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Trash2 size={16} />
          )}
        </button>
      </div>
    </div>
  );
}
