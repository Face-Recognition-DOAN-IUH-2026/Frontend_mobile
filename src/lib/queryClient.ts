import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient for @tanstack/react-query.
 * Replaces the custom CacheManager singleton.
 *
 * Default cache config:
 * - staleTime: 5 min — data considered fresh for 5 minutes (no background refetch)
 * - gcTime: 10 min — unused cache entries are garbage-collected after 10 minutes
 * - retry: 1 — retry failed queries once before reporting error
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      gcTime: 10 * 60 * 1000,    // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
