/**
 * Security utilities for edge functions
 * Implements input validation, sanitization, and security headers
 */

interface SecurityConfig {
  maxQueryLength: number;
  maxDocumentSize: number;
  allowedOrigins: string[];
  enableCSP: boolean;
  enableHSTS: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedInput?: any;
}

export class SecurityManager {
  private config: SecurityConfig = {
    maxQueryLength: 5000,
    maxDocumentSize: 1024 * 1024, // 1MB
    allowedOrigins: ['*'], // Configure based on your domain
    enableCSP: true,
    enableHSTS: true
  };

  /**
   * Validate and sanitize request input
   */
  validateRequest(body: any): ValidationResult {
    const errors: string[] = [];
    const sanitized: any = {};

    // Validate query
    if (!body.query || typeof body.query !== 'string') {
      errors.push('Query is required and must be a string');
    } else if (body.query.length > this.config.maxQueryLength) {
      errors.push(`Query too long. Maximum length is ${this.config.maxQueryLength} characters`);
    } else {
      sanitized.query = this.sanitizeText(body.query);
    }

    // Validate document content if present
    if (body.documentContent !== undefined) {
      if (typeof body.documentContent !== 'string') {
        errors.push('Document content must be a string');
      } else if (body.documentContent.length > this.config.maxDocumentSize) {
        errors.push(`Document too large. Maximum size is ${this.config.maxDocumentSize} characters`);
      } else {
        sanitized.documentContent = this.sanitizeText(body.documentContent);
      }
    }

    // Validate forceFlashModel flag
    if (body.forceFlashModel !== undefined) {
      if (typeof body.forceFlashModel !== 'boolean') {
        errors.push('forceFlashModel must be a boolean');
      } else {
        sanitized.forceFlashModel = body.forceFlashModel;
      }
    }

    // Check for suspicious patterns
    const suspiciousPatterns = this.detectSuspiciousPatterns(body);
    if (suspiciousPatterns.length > 0) {
      errors.push(`Suspicious content detected: ${suspiciousPatterns.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedInput: errors.length === 0 ? sanitized : undefined
    };
  }

  /**
   * Sanitize text input
   */
  private sanitizeText(text: string): string {
    return text
      // Remove potential script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove potential HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove potential SQL injection patterns
      .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Detect suspicious patterns in input
   */
  private detectSuspiciousPatterns(body: any): string[] {
    const patterns: string[] = [];
    const content = JSON.stringify(body).toLowerCase();

    // Check for common attack patterns
    const suspiciousPatterns = [
      { pattern: /javascript:/gi, name: 'JavaScript protocol' },
      { pattern: /data:text\/html/gi, name: 'Data URI HTML' },
      { pattern: /vbscript:/gi, name: 'VBScript protocol' },
      { pattern: /<iframe/gi, name: 'Iframe injection' },
      { pattern: /eval\s*\(/gi, name: 'Eval function' },
      { pattern: /document\.cookie/gi, name: 'Cookie access' },
      { pattern: /window\.location/gi, name: 'Location manipulation' },
      { pattern: /\bunion\s+select\b/gi, name: 'SQL injection' },
      { pattern: /\bdrop\s+table\b/gi, name: 'SQL drop table' },
      { pattern: /\bexec\s*\(/gi, name: 'Code execution' }
    ];

    for (const { pattern, name } of suspiciousPatterns) {
      if (pattern.test(content)) {
        patterns.push(name);
      }
    }

    return patterns;
  }

  /**
   * Generate security headers
   */
  getSecurityHeaders(origin?: string): Record<string, string> {
    const headers: Record<string, string> = {
      // CORS headers
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
      
      // Security headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };

    // Set CORS origin
    if (origin && this.isOriginAllowed(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
    } else {
      headers['Access-Control-Allow-Origin'] = '*';
    }

    // Content Security Policy
    if (this.config.enableCSP) {
      headers['Content-Security-Policy'] = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self' https:",
        "font-src 'self'",
        "object-src 'none'",
        "media-src 'self'",
        "frame-src 'none'"
      ].join('; ');
    }

    // HTTP Strict Transport Security
    if (this.config.enableHSTS) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
    }

    return headers;
  }

  /**
   * Check if origin is allowed
   */
  private isOriginAllowed(origin: string): boolean {
    if (this.config.allowedOrigins.includes('*')) {
      return true;
    }
    return this.config.allowedOrigins.includes(origin);
  }

  /**
   * Validate API key format (if using custom API keys)
   */
  validateApiKey(apiKey: string): boolean {
    if (!apiKey) return false;
    
    // Basic API key format validation
    // Adjust pattern based on your API key format
    const apiKeyPattern = /^[a-zA-Z0-9_-]{32,}$/;
    return apiKeyPattern.test(apiKey);
  }

  /**
   * Generate request fingerprint for tracking
   */
  generateRequestFingerprint(req: Request): string {
    const userAgent = req.headers.get('user-agent') || '';
    const acceptLanguage = req.headers.get('accept-language') || '';
    const acceptEncoding = req.headers.get('accept-encoding') || '';
    
    const fingerprint = [userAgent, acceptLanguage, acceptEncoding].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: {
    type: 'rate_limit' | 'validation_error' | 'suspicious_activity' | 'blocked_request';
    clientIP: string;
    userAgent?: string;
    details: any;
  }): void {
    console.warn('Security Event:', {
      timestamp: new Date().toISOString(),
      ...event
    });
  }

  /**
   * Check for bot/crawler patterns
   */
  isBotRequest(req: Request): boolean {
    const userAgent = req.headers.get('user-agent')?.toLowerCase() || '';
    
    const botPatterns = [
      'bot', 'crawler', 'spider', 'scraper',
      'curl', 'wget', 'python-requests',
      'postman', 'insomnia', 'httpie'
    ];
    
    return botPatterns.some(pattern => userAgent.includes(pattern));
  }

  /**
   * Validate request size
   */
  validateRequestSize(req: Request): boolean {
    const contentLength = req.headers.get('content-length');
    if (!contentLength) return true; // Allow if no content-length header
    
    const size = parseInt(contentLength, 10);
    return size <= this.config.maxDocumentSize;
  }
}

// Export singleton instance
export const securityManager = new SecurityManager();