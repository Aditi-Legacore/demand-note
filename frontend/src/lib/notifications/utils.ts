import { NotificationStreamPayload } from "@/lib/notifications/bus";

type CreatorSummary = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type NotificationWithCreator = {
  id: string;
  userId: string;
  demandNoteId: string;
  title: string;
  message: string;
  createdById: string;
  readAt: Date | null;
  createdAt: Date;
  createdBy?: CreatorSummary | null;
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
