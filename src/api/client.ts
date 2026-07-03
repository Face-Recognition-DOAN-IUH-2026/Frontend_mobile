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

      const endpoint = error.config?.url || 'unknown';
      const method = error.config?.method?.toUpperCase() || 'GET';
      devError(`[API] 401 received for ${method} ${endpoint}`);

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
        } catch (refreshError) {
          devError(`[API] First refresh failed for ${method} ${endpoint}, retrying...`);
          // First refresh attempt failed - wait and retry once
          await new Promise((resolve) => setTimeout(resolve, 1000));
          try {
            const retryResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refresh_token: refreshToken,
            });
            const { access_token: newAccessToken, refresh_token: newRefreshToken } = retryResponse.data;
            await setAccessToken(newAccessToken);
            if (newRefreshToken) {
              await setRefreshToken(newRefreshToken);
            }
            if (error.config) {
              error.config.headers.Authorization = `Bearer ${newAccessToken}`;
              return api.request(error.config);
            }
          } catch (retryError) {
            devError(`[API] Retry refresh failed for ${method} ${endpoint} - showing reauth modal`);
            // Both refresh attempts failed - clear and show reauth modal
            await clearTokens();
            await AsyncStorage.multiRemove(['patronData', 'userData']);
          }
        }
      } else {
        devError(`[API] No refresh token available for ${method} ${endpoint} - showing reauth modal`);
      }

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
