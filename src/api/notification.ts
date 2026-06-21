import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './client';
import { Notification, NotificationListResponse } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api';

function toWsUrl(baseUrl: string, token: string) {
  const url = new URL('/notifications/ws', baseUrl.replace(/\/api\/?$/, ''));
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', token);
  return url.toString();
}

export const notificationApi = {
  async getNotifications(params?: { unread?: boolean; skip?: number; limit?: number }): Promise<NotificationListResponse> {
    const query: Record<string, string> = {};
    if (params?.unread !== undefined) query.unread = String(params.unread);
    if (params?.skip !== undefined) query.skip = String(params.skip);
    if (params?.limit !== undefined) query.limit = String(params.limit);

    const qs = new URLSearchParams(query).toString();
    const url = `/notifications${qs ? `?${qs}` : ''}`;
    const response = await api.get(url);
    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread-count');
    return response.data.count;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await api.put(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.put('/notifications/read-all');
  },

  async connectRealtime(
    onNotification: (notification: Notification) => void,
    onStatus?: (status: 'connected' | 'closed' | 'error') => void,
  ): Promise<WebSocket> {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      onStatus?.('error');
      throw new Error('Missing access token');
    }

    const ws = new WebSocket(toWsUrl(API_BASE_URL, token));

    ws.onopen = () => onStatus?.('connected');
    ws.onclose = () => onStatus?.('closed');
    ws.onerror = () => onStatus?.('error');
    ws.onmessage = (message) => {
      try {
        const payload = JSON.parse(String(message.data));
        if (payload?.event === 'notification_created' && payload.data) {
          onNotification(payload.data as Notification);
        }
      } catch {
        // Ignore heartbeat/invalid messages
      }
    };

    return ws;
  },
};
