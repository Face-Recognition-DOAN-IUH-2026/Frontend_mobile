import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
let generation = 0;
let writes: Promise<void> = Promise.resolve();
export const getSessionGeneration = () => generation;
function enqueue(write: () => Promise<void>) {
  const result = writes.then(write);
  writes = result.catch(() => {});
  return result;
}
export function saveSessionTokens(access: string, refresh: string | undefined, expectedGeneration: number) {
  return enqueue(async () => {
    if (generation !== expectedGeneration) throw new Error('Session changed');
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
    if (refresh) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
    if (generation !== expectedGeneration) throw new Error('Session changed');
  });
}

export async function setAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  generation++;
  await enqueue(async () => {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  });
}
