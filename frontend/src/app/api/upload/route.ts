import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { writeFile } from "fs/promises";
import path from "path";

let upload_status_post: string | null | undefined;

// export async function POST(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const formData = await request.formData();
//     const file = formData.get("file") as File;
//     const demandNoteId = formData.get("demandNoteId") as string;
//     const fileCategory = formData.get("fileCategory") as string;

//     if (!file || !demandNoteId || !fileCategory) {
//       return NextResponse.json(
//         { error: "Missing required fields: file, demandNoteId, fileCategory" },
//         { status: 400 }
//       );
//     }

//     // Validate file category
//     const validCategories = ["traffic", "medical", "bills"];
//     if (!validCategories.includes(fileCategory)) {
//       return NextResponse.json(
//         { error: "Invalid file category. Must be: traffic, medical, or bills" },
//         { status: 400 }
//       );
//     }

//     // Validate demand note exists and belongs to user
//      const canAccessAll = session.user.roles.some((role) =>
//       ["Legacore User", "admin", "App admin"].includes(role)
//     );

//     const demandNote = await prisma.demandNote.findFirst({
//       where: {
//         id: demandNoteId,
//         ...(canAccessAll ? {} : { createdById: session.user.id }),
//       },
//     });

//     if (!demandNote) {
//       return NextResponse.json(
//         { error: "Demand note not found" },
//         { status: 404 }
//       );
//     }

//     // new code to handle file upload 12/01/2026

//     const categoryFolderMap: Record<string, string> = {
//       medical: "medical reports",
//       traffic: "traffic reports",
//       bills: "medical bills",
//     };

//     const sanitizeFilename = (name: string) => {
//       return name.replace(/[^a-zA-Z0-9._-]/g, "_");
//     };

//     // Resolve folder based on category
//     const categoryFolder = categoryFolderMap[fileCategory];

//     // Build safe filename: demandId_originalFilename
//     const safeOriginalName = sanitizeFilename(file.name);
//     const finalFilename = `${demandNoteId}_${safeOriginalName}`;

//     // Directory: public/uploads/<category folder>
//     const uploadDir = path.join(
//       process.cwd(),
//       "public",
//       "uploads",
//       categoryFolder
//     );

//     // Full file path
//     const filePath = path.join(uploadDir, finalFilename);

//     // Public URL
//     const fileUrl = `/uploads/${categoryFolder}/${finalFilename}`;



//     // Convert file to buffer
//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);

//     // Ensure directory exists
//     const fs = await import("fs");
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//     }

//     // Save file to disk
//     await writeFile(filePath, buffer);

//     // Create database record
//     const demandFile = await prisma.demandFile.create({
//       data: {
//         demandNoteId,
//         fileCategory,
//         fileName: file.name,
//         size: buffer.length,
//         fileUrl,
//         filePath, // Added
//         status: "uploaded", // Added
//         uploadedById: session.user.id,
//       },
//       include: {
//         uploadedBy: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true,
//           },
//         },
//       },
//     });

//     const existingJob = await prisma.job.findUnique({
//       where: { demandNoteId },
//       select: { status: true },
//     });
//     upload_status_post = existingJob?.status;
//     console.log("upload_status", upload_status_post);
    
//     const unsummarizedCount = await prisma.demandFile.count({
//       where: { demandNoteId, summaryStatus: "not_summarized" },
//     });

//     if (existingJob) {
//       if (unsummarizedCount > 0) {
//         await prisma.job.update({
//           where: { demandNoteId },
//           data: { status: "pending" },
//         });
//       } else if (upload_status_post) {
//         await prisma.job.update({
//           where: { demandNoteId },
//           data: { status: upload_status_post },
//         });
//       }
//     }

//     // Add timeline entry
//     await prisma.demandTimeline.create({
//       data: {
//         demandNoteId,
//         type: "file_uploaded",
//         message: `Uploaded ${file.name} to ${fileCategory} category`,
//         metadata: {
//           fileName: file.name,
//           fileCategory,
//           fileSize: buffer.length,
//         },
//       },
//     });

//     return NextResponse.json({
//       success: true,
//       file: demandFile,
//       message: "File uploaded successfully",
//     });
//   } catch (error) {
//     console.error("❌ Upload error:", error);
//     return NextResponse.json(
//       { error: "Failed to upload file", details: error instanceof Error ? error.message : "Unknown error" },
//       { status: 500 }
//     );
//   }
// }

//changing the code to add sourceDocumentId field in demandFile table and also to update the demandNote with projectId and applicationType if they are provided in the request 10/03/2026
//added code for adding applicationType and projectId from plugin 10/03/2026
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const demandNoteId = formData.get("demandNoteId") as string;
    const fileCategory = formData.get("fileCategory") as string;
    
    // New fields from plugin
    const projectId = formData.get("projectId") as string;
    const applicationType = formData.get("applicationType") as string;
    const sourceDocumentId = formData.get("sourceDocumentId") as string;

    if (!file || !demandNoteId || !fileCategory) {
      return NextResponse.json(
        { error: "Missing required fields: file, demandNoteId, fileCategory" },
        { status: 400 }
      );
    }

    // Validate file category
    const validCategories = ["traffic", "medical", "bills"];
    if (!validCategories.includes(fileCategory)) {
      return NextResponse.json(
        { error: "Invalid file category. Must be: traffic, medical, or bills" },
        { status: 400 }
      );
    }

    // Validate demand note exists and belongs to user
    const canAccessAll = session.user.roles.some((role) =>
      ["Legacore User", "admin", "App admin"].includes(role)
    );

    const demandNote = await prisma.demandNote.findFirst({
      where: {
        id: demandNoteId,
        ...(canAccessAll ? {} : { createdById: session.user.id }),
      },
    });

    if (!demandNote) {
      return NextResponse.json(
        { error: "Demand note not found" },
        { status: 404 }
      );
    }

    // CHECK FOR DUPLICATE - Skip if sourceDocumentId already exists for this demandNoteId
    if (sourceDocumentId && sourceDocumentId.trim() !== "") {
      const existingFile = await prisma.demandFile.findFirst({
        where: {
          demandNoteId: demandNoteId,
          sourceDocumentId: sourceDocumentId.trim(),
        },
      });

      if (existingFile) {
        console.log(`File with sourceDocumentId ${sourceDocumentId} already exists for demand note ${demandNoteId}`);
        return NextResponse.json({
          success: false,
          skipped: true,
          message: "File already uploaded",
          existingFile: {
            id: existingFile.id,
            fileName: existingFile.fileName,
            fileCategory: existingFile.fileCategory,
            sourceDocumentId: existingFile.sourceDocumentId,
            uploadedAt: existingFile.createdAt,
          },
        }, { status: 200 }); // Using 200 to indicate successful check, but file was skipped
      }
    }

    // Update DemandNote with projectId and applicationType if provided
    if (projectId || applicationType) {
      const nextProjectId = String(projectId || '').trim() || null;
      const nextApplicationType = String(applicationType || '').trim() || null;
      
      await prisma.$executeRaw`
        UPDATE "DemandNote"
        SET
          "projectId" = COALESCE(${nextProjectId}, "projectId"),
          "applicationType" = COALESCE(${nextApplicationType}, "applicationType"),
          "updatedAt" = ${new Date()}
        WHERE id = ${demandNoteId}
      `;
    }

    // new code to handle file upload 12/01/2026

    const categoryFolderMap: Record<string, string> = {
      medical: "medical reports",
      traffic: "traffic reports",
      bills: "medical bills",
    };

    const sanitizeFilename = (name: string) => {
      return name.replace(/[^a-zA-Z0-9._-]/g, "_");
    };

    // Resolve folder based on category
    const categoryFolder = categoryFolderMap[fileCategory];

    // Build safe filename: demandId_originalFilename
    const safeOriginalName = sanitizeFilename(file.name);
    const finalFilename = `${demandNoteId}_${safeOriginalName}`;

    // Directory: public/uploads/<category folder>
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      categoryFolder
    );

    // Full file path
    const filePath = path.join(uploadDir, finalFilename);

    // Public URL
    const fileUrl = `/uploads/${categoryFolder}/${finalFilename}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure directory exists
    const fs = await import("fs");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save file to disk
    await writeFile(filePath, buffer);

    // Prepare data object for demand file creation
    const demandFileData: Prisma.DemandFileUncheckedCreateInput = {
      demandNoteId,
      fileCategory,
      fileName: file.name,
      size: buffer.length,
      fileUrl,
      filePath,
      status: "uploaded",
      uploadedById: session.user.id,
    };

    // Add sourceDocumentId if provided (this is the Filevine document ID like 430745404)
    if (sourceDocumentId && sourceDocumentId.trim() !== "") {
      demandFileData.sourceDocumentId = sourceDocumentId.trim();
      console.log(`Adding sourceDocumentId: ${sourceDocumentId} to demand file`);
    }

    // Create database record
    const demandFile = await prisma.demandFile.create({
      data: demandFileData,
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Fix the upload_status_post variable (declare it properly)
    const existingJob = await prisma.job.findUnique({
      where: { demandNoteId },
      select: { status: true },
    });
    
    const upload_status_post = existingJob?.status;
    console.log("upload_status", upload_status_post);
    
    const unsummarizedCount = await prisma.demandFile.count({
      where: { demandNoteId, summaryStatus: "not_summarized" },
    });

    if (existingJob) {
      if (unsummarizedCount > 0) {
        await prisma.job.update({
          where: { demandNoteId },
          data: { status: "pending" },
        });
      } else if (upload_status_post) {
        await prisma.job.update({
          where: { demandNoteId },
          data: { status: upload_status_post },
        });
      }
    }

    // Add timeline entry
    await prisma.demandTimeline.create({
      data: {
        demandNoteId,
        type: "file_uploaded",
        message: `Uploaded ${file.name} to ${fileCategory} category`,
        metadata: {
          fileName: file.name,
          fileCategory,
          fileSize: buffer.length,
          ...(projectId && { projectId }),
          ...(applicationType && { applicationType }),
          ...(sourceDocumentId && { sourceDocumentId }),
        },
      },
    });

    return NextResponse.json({
      success: true,
      file: demandFile,
      message: "File uploaded successfully",
      // Include updated fields in response
      updatedFields: {
        ...(projectId && { projectId }),
        ...(applicationType && { applicationType }),
        ...(sourceDocumentId && { sourceDocumentId }),
      },
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    const canAccessAll = session.user.roles.some((role) =>
      ["Legacore User", "admin", "App admin"].includes(role)
    );

    // Find the file
    const file = await prisma.demandFile.findFirst({
      where: {
        id: fileId,
        ...(canAccessAll
          ? {}
          : {
              demandNote: {
                createdById: session.user.id,
              },
            }),
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Delete from filesystem
    const fs = await import("fs");
    const filePath = file.filePath
      ? file.filePath
      : path.join(
          process.cwd(),
          "public",
          file.fileUrl.replace(/^\/+/, "")
        );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await prisma.demandFile.delete({
      where: { id: fileId },
    });

    const existingJob = await prisma.job.findUnique({
      where: { demandNoteId: file.demandNoteId },
      select: { status: true },
    });
    upload_status_post = existingJob?.status;
    console.log("upload_status line no. 244", upload_status_post);
    const unsummarizedCount = await prisma.demandFile.count({
      where: { demandNoteId: file.demandNoteId, summaryStatus: "not_summarized" },
    });

    if (existingJob) {
      if (unsummarizedCount > 0) {
        await prisma.job.update({
          where: { demandNoteId: file.demandNoteId },
          data: { status: "pending" },
        });
      } else if (upload_status_post) {
        await prisma.job.update({
          where: { demandNoteId: file.demandNoteId },
          data: { status: 'completed' },
        });
      }
    }

    // Add timeline entry
    await prisma.demandTimeline.create({
      data: {
        demandNoteId: file.demandNoteId,
        type: "file_deleted",
        message: `Deleted file: ${file.fileName}`,
        metadata: {
          fileName: file.fileName,
          fileCategory: file.fileCategory,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete file error:", error);
    return NextResponse.json(
      { error: "Failed to delete file", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
