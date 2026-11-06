import { NativeModules, Platform } from 'react-native';

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

const DEFAULT_FALLBACK_URL = 'http://192.168.1.96:80/api';

function getDevHost(): string {
  // Automatically extract host IP from Metro bundler's scriptURL if available (e.g. "http://192.168.1.xxx:8081/...")
  const scriptURL: string | undefined = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      return match[1];
    }
  }

  return Platform.OS === 'ios' ? 'localhost' : '10.0.2.2';
}

function getApiBaseUrl(): string {
  // In development, if connected to a remote Metro host (physical phone via Wi-Fi), prioritize that host IP
  if (__DEV__) {
    const devHost = getDevHost();
    if (devHost && devHost !== 'localhost' && devHost !== '10.0.2.2') {
      return `http://${devHost}:80/api`;
    }
  }

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
  if (__DEV__) {
    const devHost = getDevHost();
    if (devHost && devHost !== 'localhost' && devHost !== '10.0.2.2') {
      return `http://${devHost}:80`;
    }
  }

  if (ENV_API_URL) return ENV_API_URL.replace(/\/api\/?$/, '');
  if (__DEV__) return `http://${getDevHost()}:80`;
  return DEFAULT_FALLBACK_URL.replace(/\/api\/?$/, '');
}

export const API_BASE_URL = getApiBaseUrl();
export const API_BASE_NO_PATH = getApiBaseNoPath();
