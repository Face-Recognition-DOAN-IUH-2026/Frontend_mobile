import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { notificationApi } from '../api/notification';
import { getAccessToken } from '../api/secureStorage';
import { useAuth } from './AuthContext';
import { Notification } from '../types';
import { devError, devWarn } from '../utils/logger';
import { queryClient } from '../lib/queryClient';

// ─── Guard: expo-notifications needs native modules not available in Expo Go ───
function isNotificationsAvailable(): boolean {
  try {
    // If the native module is missing this will throw
    require('expo-notifications/build/NotificationPermissionsModule');
    return true;
  } catch {
    return false;
  }
}

const NOTIFS_AVAILABLE = isNotificationsAvailable();

import { HazardAlertData } from '../components/EmergencyFireAlertModal';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  activeHazard: HazardAlertData | null;
  dismissHazard: () => void;
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
  const [activeHazard, setActiveHazard] = useState<HazardAlertData | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const reconnectAttempts = useRef(0);

  const dismissHazard = useCallback(() => {
    setActiveHazard(null);
  }, []);

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

  const registerPushToken = useCallback(async () => {
    if (!NOTIFS_AVAILABLE) return; // Skip in Expo Go
    if (!(await hasToken())) return;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const expoPushToken = tokenData.data;

      await notificationApi.registerDeviceToken(expoPushToken, Platform.OS as 'ios' | 'android');
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (
        msg.includes('FirebaseApp is not initialized') ||
        msg.includes('googleServicesFile') ||
        msg.includes('Firebase Messaging') ||
        msg.includes('DEFAULT_APP_NOT_INITIALIZED')
      ) {
        devWarn('[Notification] Push token registration skipped (FCM not configured in dev build)');
      } else {
        devError('[Notification] Failed to register push token:', err);
      }
    }
  }, []);

  const unregisterPushToken = useCallback(async () => {
    if (!NOTIFS_AVAILABLE) return; // Skip in Expo Go
    if (!(await hasToken())) return;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      await notificationApi.unregisterDeviceToken(tokenData.data);
    } catch {}
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

            // Khi nhận cảnh báo cháy từ WebSocket
            if (notification.type === 'hazard_fire' || notification.data?.type === 'hazard_fire') {
              const hazardInfo: HazardAlertData = (notification.data as HazardAlertData) || {
                location: notification.body,
                hazard_type: 'fire',
              };
              setActiveHazard(hazardInfo);
            }
          },
          (status) => { if (status === 'connected') reconnectAttempts.current = 0; },
        )
        .then((ws) => {
          if (!mountedRef.current) { ws.close(); return; }
          wsRef.current = ws;
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

    // Only set up native notification listeners when the module is available
    let sub: { remove: () => void } | null = null;
    if (NOTIFS_AVAILABLE) {
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        sub = Notifications.addNotificationReceivedListener((notification: Notifications.Notification) => {
          const data = notification.request.content.data as Record<string, any> | undefined;
          if (data?.id) {
            const notif: Notification = {
              id: String(data.id),
              userId: String(data.userId || ''),
              type: String(data.type || 'info'),
              title: String(notification.request.content.title || ''),
              body: String(notification.request.content.body || ''),
              data: data,
              isRead: false,
              createdAt: new Date().toISOString(),
            };
            setNotifications((prev) => [notif, ...prev]);
            setUnreadCount((prev) => prev + 1);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }

          // Kiểm tra xem push notification này có phải cảnh báo cháy không
          if (data?.type === 'hazard_fire' || data?.hazard_type) {
            setActiveHazard(data as HazardAlertData);
          }
        });
      } catch (err) {
        devError('[Notification] Native module unavailable:', err);
      }
    }

    registerPushToken();
    fetchUnreadCount();
    connectWs();

    return () => {
      mountedRef.current = false;
      sub?.remove();
      cleanup();
    };
  }, [isAuthenticated, fetchUnreadCount, connectWs, cleanup, registerPushToken]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        activeHazard,
        dismissHazard,
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
