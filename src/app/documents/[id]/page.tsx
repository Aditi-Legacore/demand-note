"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import Image from "next/image";

interface FileItem {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string;
}

export default function DocumentFilesPage() {
  const router = useRouter();
  const { id } = useParams();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch(`/api/intake/${id}/documents`);
        if (res.ok) {
          const data = await res.json();
          setFiles(data);
        }
      } catch (error) {
        console.error("Error fetching files:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchFiles();
  }, [id]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button
        onClick={() => router.push("/documents")}
        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4"
      >
        <ArrowLeft size={16} /> Back to Documents
      </button>

      <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
        Uploaded Files
      </h1>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading files...</p>
      ) : files.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No files found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white dark:bg-gray-900 rounded-lg shadow p-3 flex flex-col items-center justify-center"
            >
              {file.mimeType.startsWith("image/") ? (
                <Image
                src={file.filePath}
                alt={file.fileName}
                width={300}
                height={200}
                unoptimized
                className="w-full h-40 object-cover rounded-md"
              />

              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500 dark:text-gray-400">
                  <FileText size={32} />
                  <p className="text-xs mt-2 truncate">{file.fileName}</p>
                </div>
              )}

              <a
                href={file.filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                View / Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
