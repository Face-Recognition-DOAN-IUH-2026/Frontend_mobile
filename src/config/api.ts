import { Platform } from 'react-native';

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

function getDevHost(): string {
  return Platform.OS === 'ios' ? 'localhost' : '10.0.2.2';
}

function getApiBaseUrl(): string {
  if (ENV_API_URL) {
    const url = new URL(ENV_API_URL);
    if (!['http:', 'https:'].includes(url.protocol) || !url.pathname.endsWith('/api') || url.search || url.hash) {
      throw new Error('EXPO_PUBLIC_API_URL must be an HTTP(S) URL ending in /api, without query or fragment.');
    }
    return ENV_API_URL;
  }
  if (__DEV__) return `http://${getDevHost()}:80/api`;
  throw new Error('EXPO_PUBLIC_API_URL is not set. Application cannot start without a configured API URL.');
}

function getApiBaseNoPath(): string {
  if (ENV_API_URL) return ENV_API_URL.replace(/\/api\/?$/, '');
  if (__DEV__) return `http://${getDevHost()}:80`;
  throw new Error('EXPO_PUBLIC_API_URL is not set.');
}

export const API_BASE_URL = getApiBaseUrl();
export const API_BASE_NO_PATH = getApiBaseNoPath();
