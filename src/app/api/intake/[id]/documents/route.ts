import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// for uploading documents to db and uploads/documents folder

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    console.log("Upload request for intake ID:", id);

    if (!id) return NextResponse.json({ error: "Invalid intake ID" }, { status: 400 });

    const intake = await prisma.intakeInfo.findUnique({ where: { id } });
    if (!intake) return NextResponse.json({ error: "Intake not found" }, { status: 404 });

    const data = await request.formData();
    const files = data.getAll("files") as File[];
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
        where: { intakeId: id, fileName: file.name },
      });

      if (existing) {
        console.log("Duplicate file skipped:", file.name);
        duplicateFiles.push(file.name);
        continue;
      }

      const timestamp = Date.now();
      const storedFileName = `${id}_${timestamp}_${file.name.replace(/\s+/g, "_")}`;

      // ✅ Upload to Vercel Blob
      const blob = await put(storedFileName, file, {
        access: "public",
        token: process.env.legasys_dev_blob_READ_WRITE_TOKEN,
      });

      console.log("Creating document record...");
      const doc = await prisma.document.create({
        data: {
          intakeId: id,
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


// for viewing the uploaded documents image in page.tsx

// export async function GET(
//   _request: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params;

//     const documents = await prisma.document.findMany({
//       where: { intakeId: id },
//       select: {
//         id: true,
//         fileName: true,
//         filePath: true,
//         mimeType: true,
//       },
//     });

//     if (!documents || documents.length === 0) {
//       return NextResponse.json([], { status: 200 });
//     }

//     return NextResponse.json(documents);
//   } catch (error) {
//     console.error("Error fetching document files:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch document files" },
//       { status: 500 }
//     );
//   }
// }

// for viewing the uploaded documents image in page.tsx


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the intake belongs to the user
    const intake = await prisma.intakeInfo.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!intake || intake.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const documents = await prisma.document.findMany({
      where: { intakeId: id },
      select: {
        id: true,
        fileName: true,
        filePath: true,
        mimeType: true,
        uploadedAt: true, // ✅ add this line
        intake: {
          select: {
            clientName: true,
          },
        },
      },
      orderBy: { uploadedAt: "desc" }, // optional, newest first
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching document files:", error);
    return NextResponse.json(
      { error: "Failed to fetch document files" },
      { status: 500 }
    );
  }
}

// for deleting a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    // ✅ Verify the document exists for this intake
    const document = await prisma.document.findFirst({
      where: { id: documentId, intakeId: id },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Verify the intake belongs to the user
    // const intake = await prisma.intakeInfo.findUnique({
    //   where: { id },
    //   select: { userId: true },
    // });

    // if (!intake || intake.userId !== session.user.id) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    // ✅ Delete file from Vercel Blob storage
    await del(document.filePath, {
      token: process.env.legasys_dev_blob_READ_WRITE_TOKEN, // ✅ same token as POST route
    });

    // ✅ Remove database record
    await prisma.document.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
