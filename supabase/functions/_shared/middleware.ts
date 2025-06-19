/**
 * Middleware utilities for edge functions
 * Combines rate limiting, security, and monitoring
 */

import { rateLimiter } from './rateLimiter.ts';
import { securityManager } from './security.ts';

interface MiddlewareOptions {
  functionName: string;
  requireAuth?: boolean;
  customRateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

interface MiddlewareResult {
  allowed: boolean;
  response?: Response;
  sanitizedBody?: any;
  clientIP?: string;
  fingerprint?: string;
}

export class Middleware {
  /**
   * Process incoming request through security and rate limiting middleware
   */
  static async processRequest(req: Request, options: MiddlewareOptions): Promise<MiddlewareResult> {
    const startTime = Date.now();
    
    try {
      // Initialize rate limiter
      await rateLimiter.init();
      
      // Extract client information
      const clientIP = req.headers.get('cf-connecting-ip') || 
                      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      'unknown';
      const fingerprint = securityManager.generateRequestFingerprint(req);
      const userAgent = req.headers.get('user-agent') || '';
      
      // Check if IP is blocked
      if (await rateLimiter.isIPBlocked(clientIP)) {
        securityManager.logSecurityEvent({
          type: 'blocked_request',
          clientIP,
          userAgent,
          details: { reason: 'IP blocked due to previous violations' }
        });
        
        return {
          allowed: false,
          response: new Response(
            JSON.stringify({ 
              error: 'Access denied',
              code: 'IP_BLOCKED',
              message: 'Your IP address has been temporarily blocked due to suspicious activity'
            }),
            {
              status: 429,
              headers: {
                ...securityManager.getSecurityHeaders(req.headers.get('origin') || undefined),
                'Content-Type': 'application/json',
                'Retry-After': '3600' // 1 hour
              }
            }
          )
        };
      }

      // Validate request size
      if (!securityManager.validateRequestSize(req)) {
        return {
          allowed: false,
          response: new Response(
            JSON.stringify({ 
              error: 'Request too large',
              code: 'REQUEST_TOO_LARGE'
            }),
            {
              status: 413,
              headers: {
                ...securityManager.getSecurityHeaders(req.headers.get('origin') || undefined),
                'Content-Type': 'application/json'
              }
            }
          )
        };
      }

      // Parse and validate request body for POST requests
      let sanitizedBody: any = {};
      let isDeepThinking = false;
      let hasDocument = false;

      if (req.method === 'POST') {
        try {
          const body = await req.json();
          const validation = securityManager.validateRequest(body);
          
          if (!validation.isValid) {
            securityManager.logSecurityEvent({
              type: 'validation_error',
              clientIP,
              userAgent,
              details: { errors: validation.errors }
            });
            
            return {
              allowed: false,
              response: new Response(
                JSON.stringify({ 
                  error: 'Invalid request',
                  code: 'VALIDATION_ERROR',
                  details: validation.errors
                }),
                {
                  status: 400,
                  headers: {
                    ...securityManager.getSecurityHeaders(req.headers.get('origin') || undefined),
                    'Content-Type': 'application/json'
                  }
                }
              )
            };
          }
          
          sanitizedBody = validation.sanitizedInput!;
          isDeepThinking = sanitizedBody.forceFlashModel || false;
          hasDocument = !!sanitizedBody.documentContent;
          
        } catch (error) {
          return {
            allowed: false,
            response: new Response(
              JSON.stringify({ 
                error: 'Invalid JSON',
                code: 'INVALID_JSON'
              }),
              {
                status: 400,
                headers: {
                  ...securityManager.getSecurityHeaders(req.headers.get('origin') || undefined),
                  'Content-Type': 'application/json'
                }
              }
            )
          };
        }
      }

      // Check rate limits
      const rateLimitResult = await rateLimiter.checkRateLimit(
        req, 
        options.functionName, 
        isDeepThinking, 
        hasDocument
      );
      
      if (!rateLimitResult.allowed) {
        securityManager.logSecurityEvent({
          type: 'rate_limit',
          clientIP,
          userAgent,
          details: { 
            function: options.functionName,
            isDeepThinking,
            hasDocument,
            retryAfter: rateLimitResult.retryAfter
          }
        });
        
        return {
          allowed: false,
          response: new Response(
            JSON.stringify({ 
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Please try again later.',
              retryAfter: rateLimitResult.retryAfter
            }),
            {
              status: 429,
              headers: {
                ...securityManager.getSecurityHeaders(req.headers.get('origin') || undefined),
                'Content-Type': 'application/json',
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
                'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
              }
            }
          )
        };
      }

      // Log successful request processing
      const processingTime = Date.now() - startTime;
      console.log(`Request processed: IP=${clientIP}, Function=${options.functionName}, ProcessingTime=${processingTime}ms`);

      return {
        allowed: true,
        sanitizedBody,
        clientIP,
        fingerprint
      };
      
    } catch (error) {
      console.error('Middleware error:', error);
      
      return {
        allowed: false,
        response: new Response(
          JSON.stringify({ 
            error: 'Internal server error',
            code: 'MIDDLEWARE_ERROR'
          }),
          {
            status: 500,
            headers: {
              ...securityManager.getSecurityHeaders(req.headers.get('origin') || undefined),
              'Content-Type': 'application/json'
            }
          }
        )
      };
    }
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(
    error: string, 
    code: string, 
    status: number = 500,
    origin?: string
  ): Response {
    return new Response(
      JSON.stringify({ 
        error,
        code,
        timestamp: new Date().toISOString()
      }),
      {
        status,
        headers: {
          ...securityManager.getSecurityHeaders(origin),
          'Content-Type': 'application/json'
        }
      }
    );
  }

  /**
   * Create standardized success response
   */
  static createSuccessResponse(
    data: any,
    origin?: string,
    additionalHeaders?: Record<string, string>
  ): Response {
    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: {
          ...securityManager.getSecurityHeaders(origin),
          'Content-Type': 'application/json',
          ...additionalHeaders
        }
      }
    );
  }

  /**
   * Handle CORS preflight requests
   */
  static handleCORS(origin?: string): Response {
    return new Response(null, {
      status: 200,
      headers: securityManager.getSecurityHeaders(origin)
    });
  }
}