import { Platform } from 'react-native';

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

const DEFAULT_FALLBACK_URL = 'http://192.168.1.149:80/api';

function getDevHost(): string {
  return Platform.OS === 'ios' ? 'localhost' : '10.0.2.2';
}

function getApiBaseUrl(): string {
  if (ENV_API_URL) {
    try {
      const url = new URL(ENV_API_URL);
      if (['http:', 'https:'].includes(url.protocol) && url.pathname.endsWith('/api') && !url.search && !url.hash) {
        return ENV_API_URL;
      }
    } catch {
      // ignore parsing error and continue to fallback
    }
  }
  if (__DEV__) return `http://${getDevHost()}:80/api`;
  return DEFAULT_FALLBACK_URL;
}

function getApiBaseNoPath(): string {
  if (ENV_API_URL) return ENV_API_URL.replace(/\/api\/?$/, '');
  if (__DEV__) return `http://${getDevHost()}:80`;
  return DEFAULT_FALLBACK_URL.replace(/\/api\/?$/, '');
}

export const API_BASE_URL = getApiBaseUrl();
export const API_BASE_NO_PATH = getApiBaseNoPath();
