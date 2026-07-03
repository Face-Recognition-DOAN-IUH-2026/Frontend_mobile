import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { notificationApi } from '../api/notification';
import { getAccessToken } from '../api/secureStorage';
import { useAuth } from './AuthContext';
import { Notification } from '../types';
import { devError } from '../utils/logger';
import { queryClient } from '../lib/queryClient';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (unreadOnly?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

async function hasToken(): Promise<boolean> {
  const token = await getAccessToken();
  return !!token;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    hasToken().then((tokenExists) => {
      if (!tokenExists || !mountedRef.current) return;

      notificationApi
        .connectRealtime(
          (notification) => {
            if (!mountedRef.current) return;
            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          },
          () => {},
        )
        .then((ws) => {
          if (!mountedRef.current) { ws.close(); return; }
          wsRef.current = ws;
          ws.onclose = () => {
            wsRef.current = null;
            if (mountedRef.current) {
              reconnectTimer.current = setTimeout(connectWs, 5000);
            }
          };
          ws.onerror = () => {};
        })
        .catch(() => {
          if (mountedRef.current) {
            reconnectTimer.current = setTimeout(connectWs, 5000);
          }
        });
    });
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!(await hasToken())) return;
    try {
      const count = await notificationApi.getUnreadCount();
      setUnreadCount(count);
    } catch (err: any) {
      if (err.response?.status === 401) return;
      devError('[Notification] Failed to fetch unread count:', err);
    }
  }, []);

  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    if (!(await hasToken())) return;
    try {
      setIsLoading(true);

      const queryKey = ['notifications', unreadOnly ? 'unread' : 'all'];

      // Use react-query cache: returns cached data if still fresh, otherwise fetches
      const result = await queryClient.fetchQuery<{ items: Notification[]; unread: number }>({
        queryKey,
        queryFn: () => notificationApi.getNotifications({ unread: unreadOnly || undefined, limit: 50 }),
        staleTime: 2 * 60 * 1000, // 2 minutes for notifications
      });

      if (mountedRef.current) {
        setNotifications(result.items);
        setUnreadCount(result.unread);
      }
    } catch (err: any) {
      if (err.response?.status === 401) return;
      devError('[Notification] Failed to fetch notifications:', err);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    if (!(await hasToken())) return;
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      devError('[Notification] Failed to mark as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!(await hasToken())) return;
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      devError('[Notification] Failed to mark all as read:', err);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!isAuthenticated) {
      cleanup();
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();
    connectWs();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [isAuthenticated, fetchUnreadCount, connectWs, cleanup]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be inside NotificationProvider');
  return ctx;
}
