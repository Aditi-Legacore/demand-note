import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ACTIVE_WINDOW_MS = 45 * 1000;
const LEGACORE_ROLES = ["Legacore User", "admin", "App admin"];

const isLegacore = (roles?: string[] | null) => {
  return Boolean(roles?.some((role) => LEGACORE_ROLES.includes(role)));
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isLegacore(session.user.roles ?? null)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: demandNoteId } = await params;
    const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS);

    const locks = await prisma.demandNoteEditLock.findMany({
      where: {
        demandNoteId,
        updatedAt: { gte: cutoff },
        userId: { not: session.user.id },
      },
      orderBy: { updatedAt: "desc" },
      select: { userId: true, userName: true, updatedAt: true },
    });

    return NextResponse.json({ locks });
  } catch (error) {
    console.error("❌ GET /api/demand-notes/[id]/edit-lock error:", error);
    return NextResponse.json(
      { error: "Failed to fetch edit locks" },
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isLegacore(session.user.roles ?? null)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: demandNoteId } = await params;
    const userName =
      session.user.name ||
      session.user.email ||
      "Legacore User";

    const lock = await prisma.demandNoteEditLock.upsert({
      where: {
        demandNoteId_userId: {
          demandNoteId,
          userId: session.user.id,
        },
      },
      update: { userName },
      create: {
        demandNoteId,
        userId: session.user.id,
        userName,
      },
    });

    return NextResponse.json({ success: true, lock });
  } catch (error) {
    console.error("❌ POST /api/demand-notes/[id]/edit-lock error:", error);
    return NextResponse.json(
      { error: "Failed to update edit lock" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isLegacore(session.user.roles ?? null)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: demandNoteId } = await params;
    await prisma.demandNoteEditLock.deleteMany({
      where: { demandNoteId, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ DELETE /api/demand-notes/[id]/edit-lock error:", error);
    return NextResponse.json(
      { error: "Failed to remove edit lock" },
      { status: 500 }
    );
  }
}
