/**
 * Simple in-memory cache for API responses
 */
export class MemoryCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Cache key generators
  static filterOptionsKey(type: 'countries' | 'political-groups' | 'committees'): string {
    return `filter_options_${type}`;
  }

  static statsKey(): string {
    return 'dashboard_stats';
  }

  static mepsKey(filters: any): string {
    return `meps_${JSON.stringify(filters)}`;
  }

  static committeesKey(page: number, limit: number): string {
    return `committees_${page}_${limit}`;
  }

  // Clean expired entries periodically
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

export const apiCache = new MemoryCache();

// Clean expired cache entries every 10 minutes
setInterval(() => {
  apiCache.cleanExpired();
}, 10 * 60 * 1000);