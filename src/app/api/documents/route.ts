import { NextRequest, NextResponse, } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";

// for fetching uploaded documents in table

// export async function GET() {
//   try {
//     const intakes = await prisma.intakeInfo.findMany({
//       include: {
//         Document: true,
//       },
//       orderBy: { createdAt: "desc" },
//     });

//     const result = intakes.map((intake) => ({
//       id: intake.id,
//       clientName: intake.clientName,
//       caseType: "Personal Injury", // as it is not in intakeinfo table
//       status: intake.isDraft ? "Draft" : "Hired", // example
//       documentStatus: intake.Document.length > 0 ? "submitted" : "pending",
//       createdDate: intake.createdAt.toISOString(),
//       files: intake.Document.map((doc) => doc.fileName),
//     }));

//     return NextResponse.json(result);
//   } catch (error) {
//     console.error("Error fetching documents:", error);
//     return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
//   }
// }

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const intakes = await prisma.intakeInfo.findMany({
      where: { userId: session.user.id },
      include: {
        Document: true, // ✅ Use uppercase — matches schema
        Lead: {
          select: {
            caseType: true, // ✅ Fetch caseType from Lead
          },
        },
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const result = intakes.map((intake) => ({
      id: intake.id,
      clientName: intake.clientName,
      caseType: intake.Lead?.caseType || "N/A",
      status: intake.isDraft ? "Draft" : "Hired",
      documentStatus: intake.Document.length > 0 ? "submitted" : "pending",
      createdDate: intake.createdAt.toISOString(),
      files: intake.Document.map((doc) => doc.fileName),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching documents:", error);
    if (error instanceof Error && 'code' in error && error.code === 'EROFS') {
      return NextResponse.json({ error: "File system is read-only. Please try again later." }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// delete all document for the user in document table

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Intake ID required" }, { status: 400 });
    }

    // 🧾 Check if intake exists
    const intake = await prisma.intakeInfo.findUnique({
      where: { id },
      include: { Document: true },
    });

    if (!intake) {
      return NextResponse.json({ error: "Intake not found" }, { status: 404 });
    }

    if (intake.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 🗑️ If there are no documents
    if (!intake.Document.length) {
      return NextResponse.json({ message: "No documents found for this intake." });
    }

    // ✅ Optionally delete each file from Vercel Blob storage
    for (const doc of intake.Document) {
      try {
        await del(doc.filePath, {
          token: process.env.legasys_dev_blob_READ_WRITE_TOKEN,
        });
      } catch (err) {
        console.warn(`Failed to delete blob for ${doc.fileName}:`, err);
      }
    }

    // 🗑️ Delete all document records for this intake from DB
    await prisma.document.deleteMany({
      where: { intakeId: id },
    });

    return NextResponse.json({
      message: "All documents deleted successfully for this intake.",
    });
  } catch (error) {
    console.error("Error deleting intake documents:", error);

    if (error instanceof Error && 'code' in error && (error as { code: string }).code === "EROFS") {
      return NextResponse.json(
        { error: "File system is read-only. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Failed to delete documents" }, { status: 500 });
  }
}

// Working on this ....
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    const body = await request.json();
    const { fileName } = body;

    if (!fileName) {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }

    // Verify the document belongs to the user
    const document = await prisma.document.findUnique({
      where: { id },
      include: { intake: true },
    });

    if (!document || document.intake.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedDoc = await prisma.document.update({
      where: { id },
      data: { fileName },
    });

    return NextResponse.json({
      message: "Document updated successfully",
      updatedDoc,
    });
  } catch (error) {
    console.error("Error updating document:", error);
    if (error instanceof Error && 'code' in error && error.code === 'EROFS') {
      return NextResponse.json({ error: "File system is read-only. Please try again later." }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}
