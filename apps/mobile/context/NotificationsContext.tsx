import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { notificationService } from '../services/notificationService';
import { toast } from '../lib/toast';
import { createNotificationsWSClient, type WSClient } from '../lib/websocket';
import { useAuthStore } from '../stores/authStore';
import type { AppNotification } from '../types';

// ── Context shape ─────────────────────────────────────────────────────────────

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  fetchNotifications: () => Promise<void>;
  fetchNextPage: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const CONTEXT_NOT_PROVIDED = Symbol('NOTIFICATIONS_CONTEXT_NOT_PROVIDED');

const NotificationsContext = createContext<NotificationsContextType | typeof CONTEXT_NOT_PROVIDED>(
  CONTEXT_NOT_PROVIDED,
);

// ── Provider ──────────────────────────────────────────────────────────────────

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { accessToken, isAuthenticated } = useAuthStore();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const wsClientRef = useRef<WSClient | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const [response, count] = await Promise.all([
        notificationService.getNotifications(1),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(response.data);
      setUnreadCount(count);
      setCurrentPage(1);
      setHasMore(response.pagination.hasNext);
    } catch {
      // Fail silently — don't crash the app
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Fetch next page ───────────────────────────────────────────────────────

  const fetchNextPage = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await notificationService.getNotifications(nextPage);
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const newItems = response.data.filter((n) => !existingIds.has(n.id));
        return [...prev, ...newItems];
      });
      setCurrentPage(nextPage);
      setHasMore(response.pagination.hasNext);
    } catch {
      // Fail silently
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, currentPage]);

  // ── Mark one read ─────────────────────────────────────────────────────────

  const markRead = useCallback(async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.isRead) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await notificationService.markNotificationRead(id);
    } catch {
      // Roll back on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
      );
      setUnreadCount((prev) => prev + 1);
    }
  }, []);

  // ── Mark all read ─────────────────────────────────────────────────────────

  const markAllRead = useCallback(async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await notificationService.markAllNotificationsRead();
    } catch {
      setNotifications(previous);
      setUnreadCount(previous.filter((n) => !n.isRead).length);
    }
  }, [notifications]);

  // ── Delete ────────────────────────────────────────────────────────────────

  const deleteNotification = useCallback(async (id: string) => {
    const removed = notifications.find((n) => n.id === id);

    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (removed && !removed.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await notificationService.deleteNotification(id);
    } catch {
      // Roll back
      if (removed) {
        setNotifications((prev) => [removed, ...prev]);
        if (!removed.isRead) {
          setUnreadCount((prev) => prev + 1);
        }
      }
    }
  }, [notifications]);

  // ── WebSocket ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      wsClientRef.current?.disconnect();
      wsClientRef.current = null;
      return;
    }

    // Disconnect any previous client before creating a new one
    wsClientRef.current?.disconnect();

    wsClientRef.current = createNotificationsWSClient({
      token: accessToken,
      onNotification: (notification) => {
        setNotifications((prev) => {
          // Avoid duplicates
          if (prev.some((n) => n.id === notification.id)) return prev;
          return [notification, ...prev];
        });
        if (!notification.isRead) {
          setUnreadCount((prev) => prev + 1);
        }
        toast.info(`${notification.title}: ${notification.body}`);
      },
    });

    return () => {
      wsClientRef.current?.disconnect();
      wsClientRef.current = null;
    };
  }, [isAuthenticated, accessToken]);

  // ── Initial fetch when authenticated ─────────────────────────────────────

  useEffect(() => {
    if (isAuthenticated) {
      void fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchNotifications]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        isLoadingMore,
        hasMore,
        fetchNotifications,
        fetchNextPage,
        markRead,
        markAllRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNotificationsContext(): NotificationsContextType {
  const ctx = useContext(NotificationsContext);
  if (__DEV__ && ctx === CONTEXT_NOT_PROVIDED) {
    throw new Error(
      'useNotificationsContext must be used inside <NotificationsProvider>',
    );
  }
  return ctx as NotificationsContextType;
}
