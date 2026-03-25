import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  NotificationStreamPayload,
  subscribeToNotifications,
} from "@/lib/notifications/bus";

export const runtime = "nodejs"; // ⚠️ use nodejs runtime

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(
          `data: ${JSON.stringify(data)}\n\n`
        );
      };

      const listener = (notification: NotificationStreamPayload) => {
        if (notification.userId !== session.user.id) return;
        send({ type: "notification", payload: notification });
      };

      const unsubscribe = subscribeToNotifications(listener);

      send({ type: "connected" });

      req.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}