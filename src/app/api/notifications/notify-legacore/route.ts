import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastNotification } from "@/lib/notifications/bus";
import { toNotificationPayload } from "@/lib/notifications/utils";

const COOLDOWN_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRoles = session.user.roles ?? [];
    const isCustomer = userRoles.includes("Customer");
    if (!isCustomer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { demandNoteId } = await request.json();
    if (!demandNoteId) {
      return NextResponse.json({ error: "demandNoteId is required" }, { status: 400 });
    }

    const demandNote = await prisma.demandNote.findFirst({
      where: { id: demandNoteId, createdById: session.user.id },
      select: { id: true, clientName: true },
    });

    if (!demandNote) {
      return NextResponse.json({ error: "Demand note not found" }, { status: 404 });
    }

    const lastNotify = await prisma.notification.findFirst({
      where: {
        demandNoteId: demandNote.id,
        createdById: session.user.id,
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (lastNotify) {
      const nextAllowedAt = new Date(lastNotify.createdAt.getTime() + COOLDOWN_MS);
      if (Date.now() < nextAllowedAt.getTime()) {
        return NextResponse.json(
          { error: "You can notify again after 5 minutes." },
          { status: 429 }
        );
      }
    }

    const legacoreUsers = await prisma.user.findMany({
      where: {
        roles: { hasSome: ["Legacore User", "admin"] },
        status: true,
      },
      select: { id: true },
    });

    if (legacoreUsers.length === 0) {
      return NextResponse.json({ error: "No legacore users found" }, { status: 404 });
    }

    const title = "Customer Requested Review";
    const message = `Customer requested review for demand note ${demandNote.clientName || ""}`.trim();

    const legacoreNotifications = await Promise.all(
      legacoreUsers.map((user) =>
        prisma.notification.create({
          data: {
            userId: user.id,
            demandNoteId: demandNote.id,
            title,
            message,
            createdById: session.user.id,
          },
        })
      )
    );

    legacoreNotifications.forEach((notification) => {
      broadcastNotification(toNotificationPayload(notification));
    });

    // Also record a single notification for the customer who initiates the request
    const customerNotification = await prisma.notification.create({
      data: {
        userId: session.user.id,
        demandNoteId: demandNote.id,
        title: "Legacore Notified",
        message: "Your request has been sent to Legacore.",
        createdById: session.user.id,
      },
    });

    broadcastNotification(toNotificationPayload(customerNotification));

    await prisma.demandNote.update({
      where: { id: demandNote.id },
      data: { status: "notified" }
    });

    return NextResponse.json({ success: true, count: legacoreNotifications.length + 1 });
  } catch (error) {
    console.error("POST /api/notifications/notify-legacore error:", error);
    return NextResponse.json(
      { error: "Failed to notify legacore users" },
      { status: 500 }
    );
  }
}
