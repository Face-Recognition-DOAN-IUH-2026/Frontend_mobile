import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraEvent } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api';

function toWsUrl(baseUrl: string, token: string) {
  const url = new URL('/api/access/ws', baseUrl.replace(/\/api\/?$/, ''));
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', token);
  return url.toString();
}

export async function connectAccessRealtime(
  onEvent: (event: CameraEvent) => void,
  onStatus?: (status: 'connected' | 'closed' | 'error') => void,
) {
  const token = await AsyncStorage.getItem('accessToken');
  if (!token) {
    throw new Error('Missing access token');
  }

  const ws = new WebSocket(toWsUrl(API_BASE_URL, token));

  ws.onopen = () => onStatus?.('connected');
  ws.onclose = () => onStatus?.('closed');
  ws.onerror = () => onStatus?.('error');
  ws.onmessage = (message) => {
    try {
      const payload = JSON.parse(String(message.data));
      if (payload?.event === 'camera_event' && payload.data) {
        onEvent(payload.data as CameraEvent);
      }
    } catch {
      // Ignore heartbeat/invalid messages.
    }
  };

  return ws;
}
