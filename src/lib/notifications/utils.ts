import type { Notification as PrismaNotification, User } from "@prisma/client";
import { NotificationStreamPayload } from "@/lib/notifications/bus";

type NotificationWithCreator = PrismaNotification & {
  createdBy?: Pick<User, "id" | "firstName" | "lastName" | "email"> | null;
};

export function toNotificationPayload(
  notification: NotificationWithCreator
): NotificationStreamPayload {
  return {
    id: notification.id,
    userId: notification.userId,
    demandNoteId: notification.demandNoteId,
    title: notification.title,
    message: notification.message,
    createdById: notification.createdById,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    createdAt: notification.createdAt.toISOString(),
    createdBy: notification.createdBy
      ? {
          id: notification.createdBy.id,
          firstName: notification.createdBy.firstName ?? null,
          lastName: notification.createdBy.lastName ?? null,
          email: notification.createdBy.email ?? null,
        }
      : null,
  };
}
