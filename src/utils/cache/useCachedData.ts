import { useState, useEffect, useCallback, useRef } from 'react';
import CacheManager from './CacheManager';

interface UseCachedDataOptions<T> {
  key: string;
  ttl: number;
  fetchFn: () => Promise<T>;
  enabled?: boolean;
}

interface UseCachedDataResult<T> {
  data: T | null;
  isLoading: boolean;
  isFromCache: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useCachedData<T>({
  key,
  ttl,
  fetchFn,
  enabled = true,
}: UseCachedDataOptions<T>): UseCachedDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const cache = CacheManager.getInstance();

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    const cached = await cache.get<T>(key);
    if (cached) {
      if (mountedRef.current) {
        setData(cached);
        setIsFromCache(true);
        setIsLoading(false);
      }
    }

    try {
      const fresh = await fetchFn();
      if (mountedRef.current) {
        setData(fresh);
        setIsFromCache(false);
        await cache.set(key, fresh, ttl);
      }
    } catch (err) {
      if (!cached && mountedRef.current) {
        setError(err as Error);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [key, ttl, fetchFn, enabled, cache]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await cache.invalidate(key);
    await fetchData();
  }, [key, cache, fetchData]);

  return { data, isLoading, isFromCache, error, refresh };
}
