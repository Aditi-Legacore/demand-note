import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const demandNoteId = id;

    // const canAccessAll =
    //   session.user.role === "Legacore User" ||
    //   session.user.role === "admin" ||
    //   session.user.role === "App admin";

    const canAccessAll = session.user.roles.some((role) =>
      ["Legacore User", "admin", "App admin"].includes(role)
    );

    // Verify the demand note exists and belongs to the user
    const demandNote = await prisma.demandNote.findFirst({
      where: {
        id: demandNoteId,
        ...(canAccessAll ? {} : { createdById: session.user.id }),
      },
    });

    if (!demandNote) {
      return NextResponse.json({ error: 'Demand note not found' }, { status: 404 });
    }

    const notes = await prisma.demandInternalNote.findMany({
      where: { demandNoteId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(notes, { status: 200 });
  } catch (err: unknown) {
    console.error("❌ GET /api/demand-notes/[id]/notes error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch notes", details: errorMessage },
      { status: 500 }
    );
  }
}

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
    const demandNoteId = id;
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

    // Verify the demand note exists and belongs to the user
    const demandNote = await prisma.demandNote.findFirst({
      where: {
        id: demandNoteId,
        ...(canAccessAll ? {} : { createdById: session.user.id }),
      },
    });

    if (!demandNote) {
      return NextResponse.json({ error: 'Demand note not found' }, { status: 404 });
    }

    const note = await prisma.demandInternalNote.create({
      data: {
        demandNoteId,
        createdById: session.user.id,
        content: content.trim(),
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Add timeline entry for note creation
    await prisma.demandTimeline.create({
      data: {
        demandNoteId,
        type: 'note-added',
        message: 'Internal note added',
        metadata: { noteId: note.id },
      },
    });

    console.log("✅ Internal note created:", note);
    return NextResponse.json(note, { status: 201 });
  } catch (err: unknown) {
    console.error("❌ POST /api/demand-notes/[id]/notes error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create note", details: errorMessage },
      { status: 500 }
    );
  }
}
