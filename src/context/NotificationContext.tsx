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
  const reconnectAttempts = useRef(0);

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
            reconnectAttempts.current = 0;
            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          },
          () => {},
        )
        .then((ws) => {
          if (!mountedRef.current) { ws.close(); return; }
          wsRef.current = ws;
          reconnectAttempts.current = 0;
          ws.onclose = () => {
            wsRef.current = null;
            if (mountedRef.current) {
              const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
              reconnectAttempts.current++;
              reconnectTimer.current = setTimeout(connectWs, delay);
            }
          };
          ws.onerror = () => {};
        })
        .catch(() => {
          if (mountedRef.current) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            reconnectAttempts.current++;
            reconnectTimer.current = setTimeout(connectWs, delay);
          }
        });
    });
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!(await hasToken())) return;
    let lastErr: any;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const count = await notificationApi.getUnreadCount();
        setUnreadCount(count);
        return;
      } catch (err: any) {
        lastErr = err;
        if (err.response?.status === 401) return;
        if (attempt < 1) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    }
    devError('[Notification] Failed to fetch unread count:', lastErr);
  }, []);

  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    if (!(await hasToken())) return;
    try {
      setIsLoading(true);

      const queryKey = ['notifications', unreadOnly ? 'unread' : 'all'];

      queryClient.invalidateQueries({ queryKey });

      const result = await queryClient.fetchQuery<{ items: Notification[]; unread: number }>({
        queryKey,
        queryFn: () => notificationApi.getNotifications({ unread: unreadOnly || undefined, limit: 50 }),
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
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
