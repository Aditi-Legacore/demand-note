'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Bell, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { subscribeToNotificationSocket } from "@/lib/notifications/client";

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  demandNoteId: string;
  createdBy?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
}

const NOTIFICATIONS_PAGE_LIMIT = 20;

const mergeAndSortNotifications = (
  existing: Notification[],
  additions: Notification[]
) => {
  const map = new Map<string, Notification>();
  existing.forEach((notification) => {
    map.set(notification.id, notification);
  });
  additions.forEach((notification) => {
    map.set(notification.id, notification);
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

interface NotificationsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<"today" | "all">("today");
  const listContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(
    async ({
      cursor,
      append = false,
    }: {
      cursor?: string;
      append?: boolean;
    } = {}) => {
      const params = new URLSearchParams({
        limit: NOTIFICATIONS_PAGE_LIMIT.toString(),
      });
      if (cursor) {
        params.set("cursor", cursor);
      }
      const res = await fetch(`/api/notifications?${params}`);
      if (!res.ok) {
        throw new Error("Failed to load notifications");
      }
      const data = await res.json();
      const fetched: Notification[] = Array.isArray(data.notifications)
        ? data.notifications
        : [];
      setNotifications((prev) => {
        const base = append ? prev : [];
        return mergeAndSortNotifications(base, fetched);
      });
      setNextCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.nextCursor));
      return data;
    },
    []
  );

  const loadInitialNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchNotifications]);

  const loadMoreNotifications = useCallback(() => {
    if (!nextCursor || isLoading || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    fetchNotifications({ cursor: nextCursor, append: true })
      .catch((error) => {
        console.error("Failed to load more notifications:", error);
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  }, [fetchNotifications, hasMore, isLoading, isLoadingMore, nextCursor]);

  useEffect(() => {
    if (!isOpen) return;
    setNotifications([]);
    setHasMore(true);
    setNextCursor(null);
    void loadInitialNotifications();
  }, [isOpen, loadInitialNotifications]);

  useEffect(() => {
    if (!isOpen) return;
    let isActive = true;
    const unsubscribe = subscribeToNotificationSocket((notification) => {
      if (!isActive) return;
      setNotifications((prev) =>
        mergeAndSortNotifications(prev, [notification])
      );
    });
    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab("today");
  }, [isOpen]);

  useEffect(() => {
    if (
      activeTab !== "all" ||
      isLoading ||
      isLoadingMore ||
      !hasMore ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const container = listContainerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreNotifications();
        }
      },
      {
        root: container ?? undefined,
        rootMargin: "150px",
      }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
      observer.disconnect();
    };
  }, [
    activeTab,
    hasMore,
    isLoading,
    isLoadingMore,
    loadMoreNotifications,
  ]);

  const tabs = [
    { id: "today", label: "Today" },
    { id: "all", label: "All" },
  ] as const;

  const todayNotifications = useMemo(() => {
    if (!notifications.length) return [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return notifications.filter((notification) => {
      const createdAt = new Date(notification.createdAt);
      return createdAt >= start && createdAt < end;
    });
  }, [notifications]);

  const displayedNotifications =
    activeTab === "today" ? todayNotifications : notifications;
  const emptyStateMessage =
    activeTab === "today" ? "No notifications for today" : "No notifications yet";

  const handleOpenNotification = async (notification: Notification) => {
    try {
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
    onClose();
    router.push(`/demand-notes/${notification.demandNoteId}`);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Notifications
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-6 w-6"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-3 flex gap-2" role="tablist" aria-label="Notification tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                activeTab === tab.id
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-white border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={listContainerRef}
        className="max-h-96 overflow-y-auto"
      >
        {isLoading ? (
          <div className="p-6 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {emptyStateMessage}
          </div>
        ) : (
          <>
            {displayedNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleOpenNotification(notification)}
                className={`p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                  notification.readAt ? "" : "bg-blue-50 dark:bg-blue-900/10"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p
                      className={`truncate text-sm ${
                        notification.readAt
                          ? "font-normal text-gray-700 dark:text-gray-300"
                          : "font-semibold text-gray-900 dark:text-white"
                      }`}
                    >
                      {notification.title}
                    </p>
                    <p
                      className={`mt-1 line-clamp-2 text-xs ${
                        notification.readAt
                          ? "font-normal text-gray-500 dark:text-gray-400"
                          : "font-medium text-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notification.readAt && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1 flex-shrink-0"></div>
                  )}
                </div>
              </div>
            ))}
            {activeTab === "all" && (
              <>
                <div ref={sentinelRef} className="h-1" />
                {isLoadingMore && (
                  <div className="p-3 text-center text-xs text-gray-500 dark:text-gray-400">
                    Loading more...
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          className="w-full text-sm"
          onClick={() => setActiveTab("all")}
          disabled={activeTab === "all"}
        >
          View All Notifications
        </Button>
      </div>
    </div>
  );
};

export default NotificationsDropdown;
