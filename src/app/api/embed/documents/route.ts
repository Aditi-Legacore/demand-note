import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

// for uploading documents to db and uploads/documents folder

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const intakeId = formData.get("intakeId") as string;
    console.log("Upload request for intake ID:", intakeId);

    if (!intakeId) return NextResponse.json({ error: "Invalid intake ID" }, { status: 400 });

    const intake = await prisma.intakeInfo.findUnique({ where: { id: intakeId } });
    if (!intake) return NextResponse.json({ error: "Intake not found" }, { status: 404 });

    const files = formData.getAll("files") as File[];
    console.log("Files received:", files.length);

    if (!files.length)
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });

    const allowedTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/plain", // .txt
];

    const totalMaxSize = 5 * 1024 * 1024; // 5MB
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    if (totalSize > totalMaxSize)
      return NextResponse.json(
        { error: "Total upload size exceeds 5MB" },
        { status: 400 }
      );

    const uploadedDocs = [];
    const duplicateFiles = [];

    for (const file of files) {
      console.log("Processing file:", file.name, "Type:", file.type, "Size:", file.size);

      if (!allowedTypes.includes(file.type)) {
        console.log("Skipping invalid type:", file.type);
        continue;
      }

      // ✅ Check for duplicate file name for the same intakeId
      const existing = await prisma.document.findFirst({
        where: { intakeId: intakeId, fileName: file.name },
      });

      if (existing) {
        console.log("Duplicate file skipped:", file.name);
        duplicateFiles.push(file.name);
        continue;
      }

      const timestamp = Date.now();
      const storedFileName = `${intakeId}_${timestamp}_${file.name.replace(/\s+/g, "_")}`;

      // ✅ Upload to Vercel Blob
      const blob = await put(storedFileName, file, {
        access: "public",
        token: process.env.legasys_dev_blob_READ_WRITE_TOKEN,
      });

      console.log("Creating document record...");
      const doc = await prisma.document.create({
        data: {
          intakeId: intakeId,
          fileName: file.name,
          filePath: blob.url,
          mimeType: file.type,
        },
      });

      console.log("Document record created:", doc.id);
      uploadedDocs.push(doc);
    }

    // ✅ Return appropriate response
    // ✅ Return appropriate response
if (duplicateFiles.length && uploadedDocs.length === 0) {
  return NextResponse.json(
    {
      success: false,
      message: "Duplicate file(s) detected. No new files uploaded.",
      duplicates: duplicateFiles,
    },
    { status: 409 }
  );
}

if (duplicateFiles.length && uploadedDocs.length > 0) {
  return NextResponse.json(
    {
      success: true,
      message:
        "Some files were uploaded, but some duplicates were skipped.",
      duplicates: duplicateFiles,
      uploadedDocs,
    },
    { status: 207 }
  );
}

return NextResponse.json(
  { success: true, message: "Documents uploaded successfully", uploadedDocs },
  { status: 201 }
);

 } catch (error) {
  console.error("Upload error:", error);

  return NextResponse.json(
    {
      success: false,
      message: "Failed to upload documents",
      error: error instanceof Error ? error.message : "Unknown error",
    },
    { status: 500 }
  );
}

}
