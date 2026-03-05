import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNotificationPayload } from "@/lib/notifications/utils";

const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get("limit") ?? "20");
    const normalizedLimit = Number.isFinite(requestedLimit) ? requestedLimit : 20;
    const limit = Math.min(Math.max(normalizedLimit, 1), MAX_LIMIT);
    const cursorId = searchParams.get("cursor");

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: limit,
      cursor: cursorId ? { id: cursorId } : undefined,
      skip: cursorId ? 1 : 0,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    const serialized = notifications.map(toNotificationPayload);
    const nextCursor =
      notifications.length === limit
        ? notifications[notifications.length - 1]?.id ?? null
        : null;

    const unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, readAt: null },
    });

    return NextResponse.json({
      notifications: serialized,
      unreadCount,
      nextCursor,
    });
  } catch (error) {
    console.error("❌ GET /api/notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
