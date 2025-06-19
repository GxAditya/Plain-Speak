/**
 * Advanced Rate Limiting System for Supabase Edge Functions
 * Implements multiple rate limiting strategies with security features
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

interface SecurityMetrics {
  suspiciousActivity: number;
  blockedRequests: number;
  lastViolation: number;
}

export class RateLimiter {
  private kv: Deno.Kv | null = null;
  private config: RateLimitConfig;
  
  // Rate limiting tiers
  private static readonly TIERS = {
    // Per IP address limits
    IP_MINUTE: { windowMs: 60 * 1000, maxRequests: 20 },
    IP_HOUR: { windowMs: 60 * 60 * 1000, maxRequests: 100 },
    IP_DAY: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 500 },
    
    // Per function limits (more restrictive for expensive operations)
    FUNCTION_MINUTE: { windowMs: 60 * 1000, maxRequests: 10 },
    FUNCTION_HOUR: { windowMs: 60 * 60 * 1000, maxRequests: 50 },
    
    // Deep thinking mode (most expensive)
    DEEP_THINKING_MINUTE: { windowMs: 60 * 1000, maxRequests: 3 },
    DEEP_THINKING_HOUR: { windowMs: 60 * 60 * 1000, maxRequests: 15 },
    
    // Document processing limits
    DOCUMENT_MINUTE: { windowMs: 60 * 1000, maxRequests: 5 },
    DOCUMENT_HOUR: { windowMs: 60 * 60 * 1000, maxRequests: 20 }
  };

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Initialize KV store
   */
  async init(): Promise<void> {
    try {
      this.kv = await Deno.openKv();
      console.log('Rate limiter KV store initialized');
    } catch (error) {
      console.warn('Failed to initialize rate limiter KV store:', error);
    }
  }

  /**
   * Check if request should be rate limited
   */
  async checkRateLimit(req: Request, functionName: string, isDeepThinking: boolean = false, hasDocument: boolean = false): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    if (!this.kv) {
      await this.init();
      if (!this.kv) {
        // Fail open if KV is not available
        return { allowed: true, remaining: 999, resetTime: Date.now() + 60000 };
      }
    }

    const clientIP = this.getClientIP(req);
    const now = Date.now();
    
    // Check multiple rate limit tiers
    const checks = [
      // IP-based limits
      { key: `ip:${clientIP}:minute`, config: RateLimiter.TIERS.IP_MINUTE },
      { key: `ip:${clientIP}:hour`, config: RateLimiter.TIERS.IP_HOUR },
      { key: `ip:${clientIP}:day`, config: RateLimiter.TIERS.IP_DAY },
      
      // Function-specific limits
      { key: `function:${functionName}:${clientIP}:minute`, config: RateLimiter.TIERS.FUNCTION_MINUTE },
      { key: `function:${functionName}:${clientIP}:hour`, config: RateLimiter.TIERS.FUNCTION_HOUR }
    ];

    // Add special limits for expensive operations
    if (isDeepThinking) {
      checks.push(
        { key: `deep:${clientIP}:minute`, config: RateLimiter.TIERS.DEEP_THINKING_MINUTE },
        { key: `deep:${clientIP}:hour`, config: RateLimiter.TIERS.DEEP_THINKING_HOUR }
      );
    }

    if (hasDocument) {
      checks.push(
        { key: `doc:${clientIP}:minute`, config: RateLimiter.TIERS.DOCUMENT_MINUTE },
        { key: `doc:${clientIP}:hour`, config: RateLimiter.TIERS.DOCUMENT_HOUR }
      );
    }

    // Check all rate limits
    for (const check of checks) {
      const result = await this.checkSingleLimit(check.key, check.config, now);
      if (!result.allowed) {
        // Log rate limit violation
        await this.logViolation(clientIP, functionName, check.key);
        return result;
      }
    }

    // All checks passed, increment counters
    for (const check of checks) {
      await this.incrementCounter(check.key, check.config, now);
    }

    return { allowed: true, remaining: 999, resetTime: now + 60000 };
  }

  /**
   * Check a single rate limit
   */
  private async checkSingleLimit(key: string, config: RateLimitConfig, now: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const rateLimitKey = ['rate_limit', key];
    const entry = await this.kv!.get(rateLimitKey);
    
    if (!entry.value) {
      // No existing entry, allow request
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      };
    }

    const rateLimitEntry = entry.value as RateLimitEntry;
    
    // Check if window has expired
    if (now >= rateLimitEntry.resetTime) {
      // Window expired, reset counter
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      };
    }

    // Check if limit exceeded
    if (rateLimitEntry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: rateLimitEntry.resetTime,
        retryAfter: Math.ceil((rateLimitEntry.resetTime - now) / 1000)
      };
    }

    return {
      allowed: true,
      remaining: config.maxRequests - rateLimitEntry.count - 1,
      resetTime: rateLimitEntry.resetTime
    };
  }

  /**
   * Increment rate limit counter
   */
  private async incrementCounter(key: string, config: RateLimitConfig, now: number): Promise<void> {
    const rateLimitKey = ['rate_limit', key];
    const entry = await this.kv!.get(rateLimitKey);
    
    let rateLimitEntry: RateLimitEntry;
    
    if (!entry.value || now >= (entry.value as RateLimitEntry).resetTime) {
      // Create new entry or reset expired entry
      rateLimitEntry = {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now
      };
    } else {
      // Increment existing entry
      const existing = entry.value as RateLimitEntry;
      rateLimitEntry = {
        ...existing,
        count: existing.count + 1
      };
    }

    // Set with TTL
    await this.kv!.set(rateLimitKey, rateLimitEntry, {
      expireIn: config.windowMs
    });
  }

  /**
   * Log rate limit violation for security monitoring
   */
  private async logViolation(clientIP: string, functionName: string, limitType: string): Promise<void> {
    try {
      const violationKey = ['security', 'violations', clientIP];
      const entry = await this.kv!.get(violationKey);
      
      let metrics: SecurityMetrics;
      if (!entry.value) {
        metrics = {
          suspiciousActivity: 1,
          blockedRequests: 1,
          lastViolation: Date.now()
        };
      } else {
        const existing = entry.value as SecurityMetrics;
        metrics = {
          suspiciousActivity: existing.suspiciousActivity + 1,
          blockedRequests: existing.blockedRequests + 1,
          lastViolation: Date.now()
        };
      }

      await this.kv!.set(violationKey, metrics, {
        expireIn: 24 * 60 * 60 * 1000 // 24 hours
      });

      console.warn(`Rate limit violation: IP=${clientIP}, Function=${functionName}, Limit=${limitType}, Total violations=${metrics.suspiciousActivity}`);
      
      // Auto-block IPs with excessive violations
      if (metrics.suspiciousActivity >= 10) {
        await this.blockIP(clientIP, 60 * 60 * 1000); // Block for 1 hour
      }
    } catch (error) {
      console.error('Failed to log rate limit violation:', error);
    }
  }

  /**
   * Block an IP address temporarily
   */
  private async blockIP(clientIP: string, durationMs: number): Promise<void> {
    const blockKey = ['security', 'blocked', clientIP];
    await this.kv!.set(blockKey, {
      blockedAt: Date.now(),
      expiresAt: Date.now() + durationMs,
      reason: 'Excessive rate limit violations'
    }, {
      expireIn: durationMs
    });
    
    console.warn(`IP ${clientIP} blocked for ${durationMs}ms due to excessive violations`);
  }

  /**
   * Check if IP is blocked
   */
  async isIPBlocked(clientIP: string): Promise<boolean> {
    if (!this.kv) {
      await this.init();
      if (!this.kv) return false;
    }

    const blockKey = ['security', 'blocked', clientIP];
    const entry = await this.kv.get(blockKey);
    
    if (!entry.value) return false;
    
    const blockInfo = entry.value as any;
    return Date.now() < blockInfo.expiresAt;
  }

  /**
   * Extract client IP from request
   */
  private getClientIP(req: Request): string {
    // Try various headers for IP detection
    const headers = req.headers;
    
    return (
      headers.get('cf-connecting-ip') || // Cloudflare
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headers.get('x-real-ip') ||
      headers.get('x-client-ip') ||
      'unknown'
    );
  }

  /**
   * Get rate limit status for monitoring
   */
  async getRateLimitStatus(clientIP: string): Promise<any> {
    if (!this.kv) return null;

    const keys = [
      `ip:${clientIP}:minute`,
      `ip:${clientIP}:hour`,
      `ip:${clientIP}:day`
    ];

    const status: any = {};
    
    for (const key of keys) {
      const entry = await this.kv.get(['rate_limit', key]);
      if (entry.value) {
        status[key] = entry.value;
      }
    }

    return status;
  }

  /**
   * Clean up expired entries (maintenance function)
   */
  async cleanup(): Promise<number> {
    if (!this.kv) return 0;

    let cleanedCount = 0;
    const now = Date.now();

    try {
      // Clean up rate limit entries
      const rateLimitIter = this.kv.list({ prefix: ['rate_limit'] });
      for await (const entry of rateLimitIter) {
        const rateLimitEntry = entry.value as RateLimitEntry;
        if (rateLimitEntry && now >= rateLimitEntry.resetTime) {
          await this.kv.delete(entry.key as string[]);
          cleanedCount++;
        }
      }

      // Clean up security entries
      const securityIter = this.kv.list({ prefix: ['security'] });
      for await (const entry of securityIter) {
        const securityEntry = entry.value as any;
        if (securityEntry && securityEntry.expiresAt && now >= securityEntry.expiresAt) {
          await this.kv.delete(entry.key as string[]);
          cleanedCount++;
        }
      }

      console.log(`Rate limiter cleanup: ${cleanedCount} expired entries removed`);
    } catch (error) {
      console.error('Rate limiter cleanup error:', error);
    }

    return cleanedCount;
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20
});