"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner"; // or any toast lib you use
// import { useSession } from "next-auth/react";

interface IntakeDocumentsProps {
  submittedIntakeId: string;
  onUploadSuccess?: () => void;
  isEmbedded?: boolean;
}

const IntakeDocuments: React.FC<IntakeDocumentsProps> = ({ submittedIntakeId, onUploadSuccess, isEmbedded = false }) => {
  const router = useRouter();
  // const { data: session } = useSession();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // ✅ Combine previous and new files
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]); // ✅ append instead of replace
  };

  const handleMultiFileUpload = async () => {
    if (!submittedIntakeId) {
      toast.error("Missing intake ID.");
      return;
    }
    if (selectedFiles.length === 0) {
      toast.error("Please select files to upload.");
      return;
    }

    const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    const totalMaxSize = 5 * 1024 * 1024; // 5MB
    if (totalSize > totalMaxSize) {
      toast.warning("Total upload size exceeds 5MB. Please remove some files.");
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));

    if (isEmbedded) {
      formData.append("intakeId", submittedIntakeId);
    }

  try {
  setIsUploading(true);

  const apiUrl = isEmbedded ? `/api/embed/documents` : `/api/intake/${submittedIntakeId}/documents`;
  const response = await fetch(apiUrl, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (response.status === 409 && data.duplicates?.length) {
    toast.warning(
      `⚠️ Duplicate files detected: ${data.duplicates.join(", ")}`
    );
  } else if (response.status === 207 && data.duplicates?.length) {
    toast.success("✅ Some files uploaded successfully!");
    toast.warning(
      `⚠️ Skipped duplicates: ${data.duplicates.join(", ")}`
    );
  } else if (response.ok) {
    toast.success("✅ Documents uploaded successfully!");
  } else {
    toast.error(`❌ Upload failed: ${data.message || data.error || "Unknown error"}`);
  }

  setSelectedFiles([]);
  onUploadSuccess?.();

  // Log activity only if some were uploaded
  if (response.ok || response.status === 207) {
    await fetch(isEmbedded ? "/api/embed/activity-log" : "/api/activity-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refId: submittedIntakeId,
        activityType: "document_upload",
        shortDescription: "Document Uploaded",
        longDescription: `uploaded ${selectedFiles.length} document(s)`,
      }),
    });

    // Redirect to intake-list after successful upload only if not embedded
    if (!isEmbedded) {
      router.push("/intake-list");
    }
  }
} catch (err) {
  console.error(err);
  toast.error("❌ Failed to upload files. Please try again.");
} finally {
  setIsUploading(false);
}


  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full  bg-white dark:bg-gray-900 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <h6 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
        Upload Supporting Documents
      </h6>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        You can upload multiple files (PDF,word, JPG, PNG). Total upload size must not exceed <b>5 MB</b>.
      </p>

      {/* File selector */}
      <div className="flex items-center gap-4 mb-6">
        <label
          htmlFor="file-upload"
          className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg shadow transition-all"
        >
          Choose Files
        </label>
        <input
          id="file-upload"
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        {selectedFiles.length > 0 && (
          <button
            onClick={() => setSelectedFiles([])}
            className="text-sm text-red-500 hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

      {/* File preview list */}
      {selectedFiles.length > 0 && (
        <div className="border-t border-gray-300 dark:border-gray-700 pt-4">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">
            Selected Files
          </h2>
          <ul className="space-y-3">
            {selectedFiles.map((file, index) => (
              <li
                key={index}
                className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 px-4 py-3 rounded-lg"
              >
                <div className="flex flex-col text-sm">
                  <span className="font-medium text-gray-800 dark:text-gray-100">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={handleMultiFileUpload}
            disabled={isUploading}
            className="mt-6 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-6 rounded-lg transition disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload Documents"}
          </button>
        </div>
      )}

      {/* Back link */}
      {!isEmbedded && (
        <div className="mt-6 text-center">
          <Link
            href="/intake-list"
            className="text-indigo-600 hover:text-indigo-800 font-medium transition"
          >
            ← Back to Intake List
          </Link>
        </div>
      )}
      
    </div>
    
  );
};

export default IntakeDocuments;
