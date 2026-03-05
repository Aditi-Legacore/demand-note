import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const demandNoteId = params.id;
    const noteId = params.noteId;
    const { content } = await request.json();

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // const canAccessAll =
    //   session.user.role === "Legacore User" ||
    //   session.user.role === "admin" ||
    //   session.user.role === "App admin";

     const canAccessAll = session.user.roles.some((role) =>
            ["Legacore User", "admin", "App admin"].includes(role)
        );

    // Verify the note exists and belongs to the user's demand note
    const note = await prisma.demandInternalNote.findFirst({
      where: {
        id: noteId,
        demandNoteId,
        demandNote: {
          ...(canAccessAll ? {} : { createdById: session.user.id }),
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const updatedNote = await prisma.demandInternalNote.update({
      where: { id: noteId },
      data: {
        content: content.trim(),
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Add timeline entry for note update
    await prisma.demandTimeline.create({
      data: {
        demandNoteId,
        type: 'note-updated',
        message: 'Internal note updated',
        metadata: { noteId },
      },
    });

    console.log("✅ Internal note updated:", updatedNote);
    return NextResponse.json(updatedNote, { status: 200 });
  } catch (err: unknown) {
    console.error("❌ PUT /api/demand-notes/[id]/notes/[noteId] error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update note", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const demandNoteId = params.id;
    const noteId = params.noteId;

    // const canAccessAll =
    //   session.user.role === "Legacore User" ||
    //   session.user.role === "admin" ||
    //   session.user.role === "App admin";

     const canAccessAll = session.user.roles.some((role) =>
            ["Legacore User", "admin", "App admin"].includes(role)
        );

    // Verify the note exists and belongs to the user's demand note
    const note = await prisma.demandInternalNote.findFirst({
      where: {
        id: noteId,
        demandNoteId,
        demandNote: {
          ...(canAccessAll ? {} : { createdById: session.user.id }),
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    await prisma.demandInternalNote.delete({
      where: { id: noteId },
    });

    // Add timeline entry for note deletion
    await prisma.demandTimeline.create({
      data: {
        demandNoteId,
        type: 'note-deleted',
        message: 'Internal note deleted',
        metadata: { noteId },
      },
    });

    console.log("✅ Internal note deleted:", noteId);
    return NextResponse.json({ message: 'Note deleted successfully' }, { status: 200 });
  } catch (err: unknown) {
    console.error("❌ DELETE /api/demand-notes/[id]/notes/[noteId] error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete note", details: errorMessage },
      { status: 500 }
    );
  }
}
