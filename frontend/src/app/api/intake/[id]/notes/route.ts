import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type NoteWithCreatedBy = {
  id: string;
  content: string | null;
  createdAt: Date;
  createdBy: {
    firstName: string | null;
    lastName: string | null;
  } | null;
};

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

    // Verify the intake belongs to the user
    // const intake = await prisma.intakeInfo.findUnique({
    //   where: { id },
    //   select: { userId: true },
    // });

    // if (!intake || intake.userId !== session.user.id) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const notes = (await prisma.note.findMany({
      where: { intakeId: id },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })) as NoteWithCreatedBy[];
    const transformedNotes = notes.map((note) => {
      const creator = note.createdBy;
      const createdBy = creator
        ? `${creator.firstName || ""} ${creator.lastName || ""}`.trim() || "Unknown"
        : "Unknown";

      return {
        id: note.id,
        content: note.content,
        createdAt: note.createdAt,
        createdBy,
      };
    });
    return NextResponse.json(transformedNotes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Verify the intake belongs to the user
    // const intake = await prisma.intakeInfo.findUnique({
    //   where: { id },
    //   select: { userId: true },
    // });

    // if (!intake || intake.userId !== session.user.id) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const note = await prisma.note.create({
      data: {
        intakeId: id,
        content,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { noteId } = await request.json();

    if (!noteId) {
      return NextResponse.json({ error: "Note ID is required" }, { status: 400 });
    }

    // Verify the note belongs to the user
    // const note = await prisma.note.findUnique({
    //   where: { id: noteId },
    //   include: { intake: true },
    // });

    // if (!note || note.intake.userId !== session.user.id) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    await prisma.note.delete({
      where: { id: noteId },
    });

    return NextResponse.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
