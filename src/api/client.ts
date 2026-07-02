import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from './secureStorage';
import { devError } from '../utils/logger';
import { API_BASE_URL } from '../config/api';
import bus from '../lib/event-bus';

let _pendingRequests: Array<{
  config: AxiosRequestConfig;
  resolve: (val: any) => void;
  reject: (err: any) => void;
}> = [];

let _showingReauth = false;

export function retryPendingRequests(newToken: string) {
  const queue = [..._pendingRequests];
  _pendingRequests = [];
  _showingReauth = false;
  if (!queue.length) return;
  queue.forEach(({ config, resolve, reject }) => {
    config.headers = { ...config.headers, Authorization: `Bearer ${newToken}` };
    (api as any)(config).then(resolve).catch(reject);
  });
}

export function cancelPendingRequests() {
  const queue = [..._pendingRequests];
  _pendingRequests = [];
  _showingReauth = false;
  queue.forEach(({ reject }) => reject(new Error('Session expired')));
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      devError('[API] Failed to get token from storage:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && !(error.config as any).__isRetry) {
      (error.config as any).__isRetry = true;

      // Try refresh first
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token: newRefreshToken } = response.data;
          await setAccessToken(access_token);
          if (newRefreshToken) {
            await setRefreshToken(newRefreshToken);
          }
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${access_token}`;
            return api.request(error.config);
          }
        } catch {
          // Refresh failed — queue for re-auth
          await clearTokens();
          await AsyncStorage.multiRemove(['patronData', 'userData']);
        }
      }

      // Queue the original request for retry after re-auth
      const config = error.config!;
      return new Promise((resolve, reject) => {
        _pendingRequests.push({ config, resolve, reject });
        if (!_showingReauth) {
          _showingReauth = true;
          bus.emit('auth:required');
        }
      });
    }
    return Promise.reject(error);
  }
);

export default api;
