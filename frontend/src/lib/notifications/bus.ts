export interface NotificationCreator {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export interface NotificationStreamPayload {
  id: string;
  userId: string;
  demandNoteId: string;
  title: string;
  message: string;
  createdById: string;
  readAt: string | null;
  createdAt: string;
  createdBy?: NotificationCreator | null;
}

type NotificationListener = (notification: NotificationStreamPayload) => void;

const listeners = new Set<NotificationListener>();

export function subscribeToNotifications(listener: NotificationListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function broadcastNotification(notification: NotificationStreamPayload) {
  for (const listener of listeners) {
    try {
      listener(notification);
    } catch (error) {
      console.error("Failed to broadcast notification:", error);
    }
  }
}
