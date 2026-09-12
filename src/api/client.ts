import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from './secureStorage';
import { devError } from '../utils/logger';
import { API_BASE_URL } from '../config/api';
import bus from '../lib/event-bus';
import { getSessionGeneration, saveSessionTokens } from './secureStorage';

let _isRefreshing = false;
let refreshController: AbortController | null = null;
let _refreshSubscribers: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = [];

function onTokenRefreshed(newToken: string) {
  const subscribers = _refreshSubscribers;
  _refreshSubscribers = [];
  subscribers.forEach(({ resolve }) => resolve(newToken));
}

export function cancelPendingRequests() {
  refreshController?.abort();
  refreshController = null;
  const queue = _refreshSubscribers;
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

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const endpoint = originalRequest?.url || 'unknown';
      const method = originalRequest?.method?.toUpperCase() || 'GET';
      devError(`[API] 401 received for ${method} ${endpoint}`);

      if (shouldSkipAuthRefresh(originalRequest.url)) {
        devError(`[API] Skipping refresh for auth endpoint: ${endpoint}`);
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      if (_isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          _refreshSubscribers.push({ resolve, reject });
        }).then((token) => {
            originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${token}` };
            return api(originalRequest);
        });
      }

      _isRefreshing = true;
      const controller = new AbortController();
      const generation = getSessionGeneration();
      refreshController = controller;

      try {
        // Fast-path: if both tokens are already gone the user has intentionally
        // logged out. Do NOT attempt a refresh and do NOT emit auth:expired —
        // the navigation to login is already handled by the logout() call.
        const [existingAccess, existingRefresh] = await Promise.all([
          getAccessToken(),
          getRefreshToken(),
        ]);
        if (!existingAccess && !existingRefresh) {
          _isRefreshing = false;
          refreshController = null;
          cancelPendingRequests();
          return Promise.reject(error);
        }

        const refreshToken = existingRefresh ?? await getRefreshToken();
        if (controller.signal.aborted) throw new Error('Session expired');
        if (!refreshToken) throw { response: { status: 401 } };
        const { data } = await refreshApi.post(
          '/auth/refresh',
          { refresh_token: refreshToken },
          { headers: { Authorization: undefined }, signal: controller.signal },
        );
        const newAccessToken = data.access_token;
        if (controller.signal.aborted) throw new Error('Session expired');
        if (typeof newAccessToken !== 'string' || !newAccessToken) throw new Error('Invalid refresh response');
        const newRefreshToken = data.refresh_token;
        await saveSessionTokens(newAccessToken, newRefreshToken, generation);
        if (controller.signal.aborted || generation !== getSessionGeneration()) throw new Error('Session changed');
        _isRefreshing = false;
        refreshController = null;
        onTokenRefreshed(newAccessToken);
        originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${newAccessToken}` };
        return api(originalRequest);
      } catch (refreshErr: any) {
        _isRefreshing = false;
        refreshController = null;
        if (controller.signal.aborted) return Promise.reject(refreshErr);
        devError('[API] Refresh token failed:', refreshErr);
        cancelPendingRequests();
        if (refreshErr?.response?.status === 401 || refreshErr?.response?.status === 403) {
          try { await clearTokens(); } catch { /* ignore */ }
          bus.emit('auth:expired');
        }
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
