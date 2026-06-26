import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private static instance: CacheManager;
  private maxCacheSize = 10 * 1024 * 1024;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);
      const now = Date.now();

      if (now - entry.timestamp > entry.ttl) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // Silent fail - cache write failure is non-critical
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Silent fail
    }
  }

  async invalidateAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch {
      // Silent fail
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith('cache_'));
      const stores = await AsyncStorage.multiGet(cacheKeys);
      let totalSize = 0;
      for (const [, value] of stores) {
        if (value) totalSize += value.length;
      }
      return totalSize;
    } catch {
      return 0;
    }
  }

  async evictOldest(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith('cache_'));
      const stores = await AsyncStorage.multiGet(cacheKeys);

      let oldestKey = '';
      let oldestTimestamp = Date.now();

      for (const [key, value] of stores) {
        if (value) {
          const entry = JSON.parse(value);
          if (entry.timestamp < oldestTimestamp) {
            oldestTimestamp = entry.timestamp;
            oldestKey = key;
          }
        }
      }

      if (oldestKey) {
        await AsyncStorage.removeItem(oldestKey);
      }
    } catch {
      // Silent fail
    }
  }
}

export default CacheManager;
