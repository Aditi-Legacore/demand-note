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

    const timeline = await prisma.demandTimeline.findMany({
      where: { demandNoteId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(timeline, { status: 200 });
  } catch (err: unknown) {
    console.error("❌ GET /api/demand-notes/[id]/timeline error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch timeline", details: errorMessage },
      { status: 500 }
    );
  }
}
