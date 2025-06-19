/**
 * Frontend Cache Utility
 * Implements intelligent caching with TTL, compression, and storage management
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  hash: string;
  modelUsed?: string;
  compressed?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  lastCleanup: number;
}

class FrontendCache {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    lastCleanup: Date.now()
  };
  
  // Cache configuration
  private readonly MAX_CACHE_SIZE = 50; // Maximum number of entries
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly DEEP_THINKING_TTL = 60 * 60 * 1000; // 1 hour for deep thinking
  private readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

  constructor() {
    // Load cache from localStorage on initialization
    this.loadFromStorage();
    
    // Set up periodic cleanup
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  /**
   * Generate cache key from query parameters
   */
  private generateKey(toolId: string, query: string, documentContent?: string, isDeepThinking?: boolean): string {
    const content = documentContent ? this.hashString(documentContent) : '';
    const mode = isDeepThinking ? 'deep' : 'fast';
    return `${toolId}:${mode}:${this.hashString(query)}:${content}`;
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
   * Compress data using simple JSON stringification with optimization
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
  get(toolId: string, query: string, documentContent?: string, isDeepThinking?: boolean): any | null {
    const key = this.generateKey(toolId, query, documentContent, isDeepThinking);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    
    // Return decompressed data if it was compressed
    return entry.compressed ? this.decompress(entry.data) : entry.data;
  }

  /**
   * Set cached response
   */
  set(
    toolId: string, 
    query: string, 
    response: any, 
    documentContent?: string, 
    isDeepThinking?: boolean,
    modelUsed?: string
  ): void {
    const key = this.generateKey(toolId, query, documentContent, isDeepThinking);
    const ttl = isDeepThinking ? this.DEEP_THINKING_TTL : this.DEFAULT_TTL;
    
    // Compress large responses
    const shouldCompress = JSON.stringify(response).length > 1000;
    const data = shouldCompress ? this.compress(response) : response;

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl,
      hash: this.hashString(JSON.stringify(response)),
      modelUsed,
      compressed: shouldCompress
    };

    // Ensure cache doesn't exceed maximum size
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;
    
    // Save to localStorage
    this.saveToStorage();
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.stats.size = this.cache.size;
    this.stats.lastCleanup = now;
    
    if (keysToDelete.length > 0) {
      this.saveToStorage();
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    try {
      const cacheData = Array.from(this.cache.entries());
      localStorage.setItem('plainspeak_cache', JSON.stringify({
        data: cacheData,
        stats: this.stats
      }));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('plainspeak_cache');
      if (stored) {
        const { data, stats } = JSON.parse(stored);
        this.cache = new Map(data);
        this.stats = { ...this.stats, ...stats };
        
        // Clean up any expired entries on load
        this.cleanup();
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
      this.clearCache();
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      lastCleanup: Date.now()
    };
    localStorage.removeItem('plainspeak_cache');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Prefetch common queries for a tool
   */
  async prefetch(toolId: string, commonQueries: string[]): Promise<void> {
    // This would be implemented to pre-populate cache with common queries
    // For now, it's a placeholder for future enhancement
    console.log(`Prefetching ${commonQueries.length} queries for ${toolId}`);
  }
}

// Export singleton instance
export const frontendCache = new FrontendCache();

// Export types for use in components
export type { CacheStats };