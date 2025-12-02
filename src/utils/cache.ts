/**
 * 🎯 FIRESTORE OPTIMIZATION: In-Memory Cache System
 * 
 * Reduces Firestore reads by caching frequently accessed data.
 * 
 * Optimizations:
 * - LRU (Least Recently Used) cache eviction
 * - TTL (Time To Live) for automatic expiration
 * - Cache invalidation on writes
 * - Prevents duplicate concurrent requests
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface PendingRequest {
  promise: Promise<any>;
  resolvers: Array<(value: any) => void>;
  rejectors: Array<(error: any) => void>;
}

class Cache {
  private cache: Map<string, CacheEntry<any>>;
  private accessOrder: Map<string, number>; // For LRU
  private pendingRequests: Map<string, PendingRequest>; // For deduplication
  private maxSize: number;
  private accessCounter: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.accessOrder = new Map();
    this.pendingRequests = new Map();
    this.maxSize = maxSize;
    this.accessCounter = 0;
  }

  /**
   * Get cached data or execute fetcher if not cached/expired
   * 
   * Optimization: Prevents duplicate concurrent requests for same key
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300 // Default 5 minutes
  ): Promise<T> {
    // Check if already cached and not expired
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      this.updateAccessOrder(key);
      console.log(`[CACHE] HIT: ${key}`);
      return cached.data as T;
    }

    // Check if request is already pending (deduplication)
    const pending = this.pendingRequests.get(key);
    if (pending) {
      console.log(`[CACHE] PENDING: ${key}`);
      return new Promise((resolve, reject) => {
        pending.resolvers.push(resolve);
        pending.rejectors.push(reject);
      });
    }

    // Create new pending request
    console.log(`[CACHE] MISS: ${key}`);
    const resolvers: Array<(value: any) => void> = [];
    const rejectors: Array<(error: any) => void> = [];

    const promise = fetcher()
      .then((data) => {
        // Store in cache
        this.set(key, data, ttlSeconds);
        
        // Resolve all waiting promises
        resolvers.forEach((resolve) => resolve(data));
        
        // Cleanup
        this.pendingRequests.delete(key);
        
        return data;
      })
      .catch((error) => {
        // Reject all waiting promises
        rejectors.forEach((reject) => reject(error));
        
        // Cleanup
        this.pendingRequests.delete(key);
        
        throw error;
      });

    this.pendingRequests.set(key, { promise, resolvers, rejectors });

    return promise;
  }

  /**
   * Set cache entry with TTL
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    // Evict LRU entry if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttlSeconds * 1000,
    });

    this.updateAccessOrder(key);
  }

  /**
   * Invalidate specific cache key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.accessOrder.delete(key);
    console.log(`[CACHE] INVALIDATED: ${key}`);
  }

  /**
   * Invalidate all keys matching a pattern
   */
  invalidatePattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.invalidate(key));
    console.log(`[CACHE] INVALIDATED PATTERN ${pattern}: ${keysToDelete.length} keys`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.pendingRequests.clear();
    console.log("[CACHE] CLEARED ALL");
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    this.accessCounter++;
    this.accessOrder.set(key, this.accessCounter);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestAccess = Infinity;

    for (const [key, access] of this.accessOrder.entries()) {
      if (access < oldestAccess) {
        oldestAccess = access;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      console.log(`[CACHE] EVICTED LRU: ${oldestKey}`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      pendingRequests: this.pendingRequests.size,
    };
  }
}

// Global cache instance
export const cache = new Cache(1000);

/**
 * Cache key generators for consistency
 */
export const CacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userStats: (userId: string) => `user:stats:${userId}`,
  userRooms: (userId: string) => `user:rooms:${userId}`,
  room: (roomId: string) => `room:${roomId}`,
  roomConnections: (roomId: string) => `room:connections:${roomId}`,
  roomConnection: (roomId: string, userId: string) => 
    `room:connection:${roomId}:${userId}`,
};
