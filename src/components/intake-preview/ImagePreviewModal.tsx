'use client';

import React, { useState } from 'react'
import Image from "next/image";



interface ImagePreviewModalProps {
  showImagePreview: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export default function ImagePreviewModal({ showImagePreview, imageUrl, onClose }: ImagePreviewModalProps) {
  const [imageError, setImageError] = useState(false);

  if (!showImagePreview || !imageUrl) return null;

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-4xl h-5/6 flex flex-col">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h5 className="text-lg font-semibold text-slate-500 dark:text-white">Image Preview</h5>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-hidden flex items-center justify-center relative">
          {imageError ? (
            <div className="flex flex-col items-center justify-center text-gray-500">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-center">Unable to load image. The file may be corrupted or not a valid image format.</p>
            </div>
          ) : (
            <Image
              src={imageUrl}
              alt="Document Preview"
              width={800}
              height={600}
              unoptimized
              className="object-contain"
              onError={handleImageError}
            />
          )}
        </div>
      </div>
    </div>
  );
}
