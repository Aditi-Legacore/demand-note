import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const COOLDOWN_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const demandNoteId = searchParams.get("demandNoteId");

    if (!demandNoteId) {
      return NextResponse.json({ error: "demandNoteId is required" }, { status: 400 });
    }

    const demandNote = await prisma.demandNote.findFirst({
      where: { id: demandNoteId, createdById: session.user.id },
      select: { id: true },
    });

    if (!demandNote) {
      return NextResponse.json({ error: "Demand note not found" }, { status: 404 });
    }

    const lastNotify = await prisma.notification.findFirst({
      where: {
        demandNoteId,
        createdById: session.user.id,
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const now = Date.now();
    const nextAllowedAt = lastNotify
      ? new Date(lastNotify.createdAt.getTime() + COOLDOWN_MS)
      : null;
    const canNotify = !nextAllowedAt || now >= nextAllowedAt.getTime();

    return NextResponse.json({
      lastNotifyAt: lastNotify?.createdAt || null,
      nextAllowedAt: nextAllowedAt ? nextAllowedAt.toISOString() : null,
      canNotify,
    });
  } catch (error) {
    console.error("❌ GET /api/notifications/customer-status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notify status" },
      { status: 500 }
    );
  }
}
