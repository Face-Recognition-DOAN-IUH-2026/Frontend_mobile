const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;

function getApiBaseUrl(): string {
  if (ENV_API_URL) return ENV_API_URL;
  if (__DEV__) return 'http://10.0.2.2:80/api';
  throw new Error('EXPO_PUBLIC_API_URL is not set. Application cannot start without a configured API URL.');
}

function getApiBaseNoPath(): string {
  if (ENV_API_URL) return ENV_API_URL.replace(/\/api\/?$/, '');
  if (__DEV__) return 'http://10.0.2.2:80';
  throw new Error('EXPO_PUBLIC_API_URL is not set.');
}

export const API_BASE_URL = getApiBaseUrl();
export const API_BASE_NO_PATH = getApiBaseNoPath();
