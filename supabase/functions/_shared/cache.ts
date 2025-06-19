/**
 * Backend Cache Utility for Supabase Edge Functions
 * Implements server-side caching with Deno KV for true persistence
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  modelUsed: string;
  hash: string;
  compressed?: boolean;
}

interface CacheConfig {
  defaultTTL: number;
  deepThinkingTTL: number;
  maxEntries: number;
  compressionThreshold: number;
  cleanupInterval: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  lastCleanup: number;
}

export class BackendCache {
  private kv: Deno.Kv | null = null;
  private config: CacheConfig = {
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    deepThinkingTTL: 60 * 60 * 1000, // 1 hour
    maxEntries: 1000,
    compressionThreshold: 5000, // Compress responses larger than 5KB
    cleanupInterval: 60 * 60 * 1000 // Cleanup every hour
  };

  /**
   * Initialize the KV store connection
   */
  async init(): Promise<void> {
    try {
      this.kv = await Deno.openKv();
      console.log('Deno KV cache initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize Deno KV cache:', error);
      this.kv = null;
    }
  }

  /**
   * Ensure KV is initialized
   */
  private async ensureKV(): Promise<Deno.Kv | null> {
    if (!this.kv) {
      await this.init();
    }
    return this.kv;
  }

  /**
   * Generate cache key from request parameters
   */
  generateKey(
    functionName: string,
    query: string,
    documentContent?: string,
    forceFlashModel?: boolean
  ): string[] {
    const contentHash = documentContent ? this.hashString(documentContent) : '';
    const mode = forceFlashModel ? 'flash' : 'lite';
    const queryHash = this.hashString(query);
    
    // Return as array for Deno KV key structure
    return ['cache', functionName, mode, queryHash, contentHash].filter(Boolean);
  }

  /**
   * Simple hash function for strings
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Compress data for storage efficiency
   */
  private compress(data: any): string {
    return JSON.stringify(data);
  }

  /**
   * Decompress data
   */
  private decompress(data: string): any {
    return JSON.parse(data);
  }

  /**
   * Get cached response
   */
  async get(key: string | string[]): Promise<any | null> {
    const kv = await this.ensureKV();
    if (!kv) return null;

    try {
      const keyArray = Array.isArray(key) ? key : this.parseKeyString(key);
      const result = await kv.get(keyArray);
      
      if (!result.value) {
        await this.incrementStats('misses');
        return null;
      }

      const entry = result.value as CacheEntry;
      
      // Check if entry has expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        // Clean up expired entry
        await kv.delete(keyArray);
        await this.incrementStats('misses');
        return null;
      }

      await this.incrementStats('hits');
      console.log(`Cache hit for key: ${keyArray.join(':').substring(0, 50)}...`);
      
      // Return decompressed data if it was compressed
      return entry.compressed ? this.decompress(entry.data) : entry.data;
    } catch (error) {
      console.warn('Cache get error:', error);
      await this.incrementStats('misses');
      return null;
    }
  }

  /**
   * Set cached response
   */
  async set(
    key: string | string[],
    data: any,
    modelUsed: string,
    forceFlashModel?: boolean
  ): Promise<void> {
    const kv = await this.ensureKV();
    if (!kv) return;

    try {
      const keyArray = Array.isArray(key) ? key : this.parseKeyString(key);
      const ttl = forceFlashModel ? this.config.deepThinkingTTL : this.config.defaultTTL;
      
      // Compress large responses
      const dataString = JSON.stringify(data);
      const shouldCompress = dataString.length > this.config.compressionThreshold;
      const storedData = shouldCompress ? this.compress(data) : data;

      const entry: CacheEntry = {
        data: storedData,
        timestamp: Date.now(),
        ttl,
        modelUsed,
        hash: this.hashString(dataString),
        compressed: shouldCompress
      };

      // Set expiration time for automatic cleanup
      const expiresAt = Date.now() + ttl;
      
      await kv.set(keyArray, entry, { expireIn: ttl });
      
      console.log(`Cached response for key: ${keyArray.join(':').substring(0, 50)}... (TTL: ${ttl}ms)`);
      
      // Update cache size stats
      await this.updateCacheSize();
      
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  /**
   * Parse key string into array format
   */
  private parseKeyString(key: string): string[] {
    return key.split(':');
  }

  /**
   * Check if response should be cached
   */
  shouldCache(query: string, response: any): boolean {
    // Don't cache very short queries or responses
    if (query.length < 10 || JSON.stringify(response).length < 50) {
      return false;
    }

    // Don't cache error responses
    if (response.error) {
      return false;
    }

    return true;
  }

  /**
   * Increment cache statistics
   */
  private async incrementStats(type: 'hits' | 'misses'): Promise<void> {
    const kv = await this.ensureKV();
    if (!kv) return;

    try {
      const statsKey = ['cache_stats', type];
      const result = await kv.get(statsKey);
      const currentValue = (result.value as number) || 0;
      await kv.set(statsKey, currentValue + 1);
    } catch (error) {
      console.warn('Failed to update cache stats:', error);
    }
  }

  /**
   * Update cache size statistics
   */
  private async updateCacheSize(): Promise<void> {
    const kv = await this.ensureKV();
    if (!kv) return;

    try {
      // Count entries with cache prefix
      let size = 0;
      const iter = kv.list({ prefix: ['cache'] });
      for await (const _entry of iter) {
        size++;
      }
      
      await kv.set(['cache_stats', 'size'], size);
      await kv.set(['cache_stats', 'lastCleanup'], Date.now());
    } catch (error) {
      console.warn('Failed to update cache size:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const kv = await this.ensureKV();
    if (!kv) {
      return { hits: 0, misses: 0, size: 0, lastCleanup: Date.now() };
    }

    try {
      const [hits, misses, size, lastCleanup] = await Promise.all([
        kv.get(['cache_stats', 'hits']),
        kv.get(['cache_stats', 'misses']),
        kv.get(['cache_stats', 'size']),
        kv.get(['cache_stats', 'lastCleanup'])
      ]);

      return {
        hits: (hits.value as number) || 0,
        misses: (misses.value as number) || 0,
        size: (size.value as number) || 0,
        lastCleanup: (lastCleanup.value as number) || Date.now()
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return { hits: 0, misses: 0, size: 0, lastCleanup: Date.now() };
    }
  }

  /**
   * Clear expired entries and manage cache size
   */
  async cleanup(): Promise<number> {
    const kv = await this.ensureKV();
    if (!kv) return 0;

    try {
      let deletedCount = 0;
      const now = Date.now();
      
      // Iterate through all cache entries
      const iter = kv.list({ prefix: ['cache'] });
      const entriesToDelete: string[][] = [];
      
      for await (const entry of iter) {
        const cacheEntry = entry.value as CacheEntry;
        
        // Check if entry has expired
        if (cacheEntry && now - cacheEntry.timestamp > cacheEntry.ttl) {
          entriesToDelete.push(entry.key as string[]);
        }
      }

      // Delete expired entries in batches
      for (const key of entriesToDelete) {
        await kv.delete(key);
        deletedCount++;
      }

      // Update cleanup timestamp
      await kv.set(['cache_stats', 'lastCleanup'], now);
      
      console.log(`Cache cleanup completed: ${deletedCount} expired entries removed`);
      return deletedCount;
    } catch (error) {
      console.warn('Cache cleanup error:', error);
      return 0;
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    const kv = await this.ensureKV();
    if (!kv) return;

    try {
      const iter = kv.list({ prefix: ['cache'] });
      for await (const entry of iter) {
        await kv.delete(entry.key as string[]);
      }
      
      // Reset stats
      await kv.set(['cache_stats', 'hits'], 0);
      await kv.set(['cache_stats', 'misses'], 0);
      await kv.set(['cache_stats', 'size'], 0);
      await kv.set(['cache_stats', 'lastCleanup'], Date.now());
      
      console.log('All cache entries cleared');
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Get cache entry by key for debugging
   */
  async getEntry(key: string | string[]): Promise<CacheEntry | null> {
    const kv = await this.ensureKV();
    if (!kv) return null;

    try {
      const keyArray = Array.isArray(key) ? key : this.parseKeyString(key);
      const result = await kv.get(keyArray);
      return result.value as CacheEntry | null;
    } catch (error) {
      console.warn('Failed to get cache entry:', error);
      return null;
    }
  }

  /**
   * Prefetch common queries for a tool
   */
  async prefetch(toolId: string, commonQueries: string[]): Promise<void> {
    console.log(`Prefetching ${commonQueries.length} queries for ${toolId}`);
    // Implementation would involve pre-populating cache with common responses
    // This is a placeholder for future enhancement
  }
}

// Export singleton instance
export const backendCache = new BackendCache();