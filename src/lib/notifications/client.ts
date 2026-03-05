import { NotificationStreamPayload } from "@/lib/notifications/bus";

type NotificationListener = (notification: NotificationStreamPayload) => void;

const listeners = new Set<NotificationListener>();
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let stopReconnecting = false;

const notifyListeners = (payload: NotificationStreamPayload) => {
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.error("Notification listener error:", error);
    }
  });
};

const getWebSocketUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/api/notifications/stream`;
};

const handleMessage = (event: MessageEvent<string>) => {
  try {
    const data = JSON.parse(event.data);
    if (data?.type === "notification" && data.payload) {
      notifyListeners(data.payload as NotificationStreamPayload);
    }
  } catch (error) {
    console.error("Failed to parse notification payload:", error);
  }
};

const handleClose = () => {
  socket = null;
  if (stopReconnecting) {
    stopReconnecting = false;
    return;
  }
  if (typeof window === "undefined" || listeners.size === 0) {
    return;
  }
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 2000);
};

const handleError = () => {
  socket?.close();
};

const cleanupSocket = () => {
  stopReconnecting = true;
  if (typeof window !== "undefined" && reconnectTimer) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (!socket) return;
  socket.removeEventListener("message", handleMessage);
  socket.removeEventListener("close", handleClose);
  socket.removeEventListener("error", handleError);
  socket.close();
  socket = null;
};

const connect = () => {
  if (typeof window === "undefined" || socket) return;
  stopReconnecting = false;
  const url = getWebSocketUrl();
  const ws = new WebSocket(url);
  ws.addEventListener("message", handleMessage);
  ws.addEventListener("close", handleClose);
  ws.addEventListener("error", handleError);
  socket = ws;
};

export function subscribeToNotificationSocket(listener: NotificationListener) {
  if (typeof window === "undefined") {
    return () => {};
  }
  listeners.add(listener);
  connect();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      cleanupSocket();
    }
  };
}
