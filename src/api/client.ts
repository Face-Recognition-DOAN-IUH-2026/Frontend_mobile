import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, setAccessToken, clearTokens } from './secureStorage';
import { devError } from '../utils/logger';
import { API_BASE_URL } from '../config/api';
import bus from '../lib/event-bus';

let _pendingRequests: Array<{
  config: AxiosRequestConfig;
  resolve: (val: unknown) => void;
  reject: (err: unknown) => void;
}> = [];

let _isRefreshing = false;
let _refreshSubscribers: Array<(token: string) => void> = [];

function onTokenRefreshed(newToken: string) {
  _refreshSubscribers.forEach((cb) => cb(newToken));
  _refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  _refreshSubscribers.push(cb);
}

export function cancelPendingRequests() {
  const queue = [..._pendingRequests];
  _pendingRequests = [];
  _isRefreshing = false;
  _refreshSubscribers = [];
  queue.forEach(({ reject }) => reject(new Error('Session expired')));
}

const AUTH_SKIP_REFRESH_ENDPOINTS = [
  '/auth/login',
  '/patrons/login',
  '/auth/refresh',
  '/patrons/register',
  '/auth/pre-register-otp',
  '/auth/pre-register-verify',
  '/patrons/check-exists',
  '/patrons/check-code',
  '/auth/forgot-password',
  '/auth/verify-reset-code',
  '/auth/reset-password',
  '/auth/face-login',
];

export function shouldSkipAuthRefresh(url?: string): boolean {
  if (!url) return false;
  return AUTH_SKIP_REFRESH_ENDPOINTS.some((p) => url.includes(p));
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

const refreshApi: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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
  (response) => {
    if (response.headers['x-legacy-routed'] === 'true') {
      bus.emit('app:legacy-routed');
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const endpoint = originalRequest?.url || 'unknown';
      const method = originalRequest?.method?.toUpperCase() || 'GET';
      devError(`[API] 401 received for ${method} ${endpoint}`);

      if (shouldSkipAuthRefresh(originalRequest.url)) {
        devError(`[API] Skipping refresh for auth endpoint: ${endpoint}`);
        return Promise.reject(error);
      }

      if (_isRefreshing) {
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${token}` };
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      _isRefreshing = true;

      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          const { data } = await refreshApi.post('/auth/refresh', { refresh_token: refreshToken });
          const newAccessToken = data.access_token;
          await setAccessToken(newAccessToken);
          _isRefreshing = false;
          onTokenRefreshed(newAccessToken);
          originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${newAccessToken}` };
          return api(originalRequest);
        } catch (refreshErr: any) {
          devError('[API] Refresh token failed:', refreshErr);
        }
      }

      _isRefreshing = false;
      cancelPendingRequests();
      try { await clearTokens(); } catch { /* ignore */ }
      bus.emit('auth:expired');
    }
    return Promise.reject(error);
  }
);

export default api;
