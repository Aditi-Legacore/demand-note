import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastNotification } from "@/lib/notifications/bus";
import { toNotificationPayload } from "@/lib/notifications/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isLegacore =
      session.user.role === "Legacore User" ||
      session.user.role === "admin" ||
      session.user.role === "App admin";
    if (!isLegacore) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { demandNoteId } = await request.json();
    if (!demandNoteId) {
      return NextResponse.json({ error: "demandNoteId is required" }, { status: 400 });
    }

    const demandNote = await prisma.demandNote.findUnique({
      where: { id: demandNoteId },
      select: { id: true, clientName: true, createdById: true },
    });

    if (!demandNote) {
      return NextResponse.json({ error: "Demand note not found" }, { status: 404 });
    }

    const title = "Demand Note Published";
    const message = `Your demand note ${demandNote.clientName || ""} is ready to download.`.trim();

    const createdNotification = await prisma.notification.create({
      data: {
        userId: demandNote.createdById,
        demandNoteId: demandNote.id,
        title,
        message,
        createdById: session.user.id,
      },
    });

    broadcastNotification(toNotificationPayload(createdNotification));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ POST /api/notifications/notify-customer error:", error);
    return NextResponse.json(
      { error: "Failed to notify customer" },
      { status: 500 }
    );
  }
}
