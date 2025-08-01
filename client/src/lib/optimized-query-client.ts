import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Optimized QueryClient with better defaults
export const optimizedQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
      retry: (failureCount, error: any) => {
        // Don't retry 4xx errors
        if (error?.message?.includes('4')) return false;
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
      // Optimistic updates for better UX
      onMutate: async () => {
        // Cancel any outgoing refetches to avoid overwriting optimistic update
        await optimizedQueryClient.cancelQueries();
      },
    },
  },
});

// Enhanced cache management
export const cacheUtils = {
  // Invalidate specific query patterns
  invalidateMEPs: () => optimizedQueryClient.invalidateQueries({ queryKey: ['/api/meps'] }),
  invalidateCommittees: () => optimizedQueryClient.invalidateQueries({ queryKey: ['/api/committees'] }),
  invalidateDashboard: () => optimizedQueryClient.invalidateQueries({ queryKey: ['/api/dashboard'] }),
  invalidateFilters: () => optimizedQueryClient.invalidateQueries({ queryKey: ['/api/filters'] }),
  
  // Prefetch common queries
  prefetchMEPs: (filters: any = {}) => 
    optimizedQueryClient.prefetchQuery({
      queryKey: ['/api/meps', filters],
      staleTime: 5 * 60 * 1000,
    }),
    
  prefetchCommittees: (page = 1, limit = 50) =>
    optimizedQueryClient.prefetchQuery({
      queryKey: ['/api/committees', page, limit],
      staleTime: 5 * 60 * 1000,
    }),
    
  // Clear all cached data
  clearAll: () => optimizedQueryClient.clear(),
  
  // Get cache statistics
  getCacheStats: () => {
    const queryCache = optimizedQueryClient.getQueryCache();
    return {
      queryCount: queryCache.getAll().length,
      queries: queryCache.getAll().map(query => ({
        queryKey: query.queryKey,
        state: query.state.status,
        lastUpdated: query.state.dataUpdatedAt,
        staleTime: query.options.staleTime,
      }))
    };
  }
};