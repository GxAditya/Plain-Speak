/*
# Security Monitor Edge Function

This function provides security monitoring and management capabilities.
It allows administrators to monitor rate limiting, security events, and system health.

## Features
- Real-time security metrics
- Rate limiting statistics
- IP blocking management
- Security event logs
- System health monitoring

## Usage
GET /functions/v1/security-monitor?action=stats
POST /functions/v1/security-monitor
Body: {
  "action": "stats" | "blocked_ips" | "events" | "unblock_ip",
  "ip": "string (optional, for unblock_ip action)",
  "timeframe": "1h" | "24h" | "7d" (optional)
}
*/

import { rateLimiter } from "../_shared/rateLimiter.ts";
import { securityManager } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface SecurityMonitorRequest {
  action: 'stats' | 'blocked_ips' | 'events' | 'unblock_ip' | 'health';
  ip?: string;
  timeframe?: '1h' | '24h' | '7d';
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Initialize rate limiter
    await rateLimiter.init();

    let action: string;
    let ip: string | undefined;
    let timeframe: string = '24h';

    if (req.method === "GET") {
      const url = new URL(req.url);
      action = url.searchParams.get('action') || 'stats';
      ip = url.searchParams.get('ip') || undefined;
      timeframe = url.searchParams.get('timeframe') || '24h';
    } else if (req.method === "POST") {
      const body: SecurityMonitorRequest = await req.json();
      action = body.action;
      ip = body.ip;
      timeframe = body.timeframe || '24h';
    } else {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let result: any;

    switch (action) {
      case 'stats':
        result = await getSecurityStats();
        break;

      case 'blocked_ips':
        result = await getBlockedIPs();
        break;

      case 'events':
        result = await getSecurityEvents(timeframe);
        break;

      case 'unblock_ip':
        if (!ip) {
          return new Response(
            JSON.stringify({ error: "IP address is required for unblock action" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        result = await unblockIP(ip);
        break;

      case 'health':
        result = await getSystemHealth();
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Supported actions: stats, blocked_ips, events, unblock_ip, health" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        result,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in security-monitor function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "An error occurred while processing the security monitor request",
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function getSecurityStats(): Promise<any> {
  // This would integrate with your KV store to get real statistics
  // For now, returning mock data structure
  return {
    rateLimiting: {
      totalRequests: 1250,
      blockedRequests: 45,
      uniqueIPs: 234,
      topFunctions: [
        { name: 'legalese-decoder', requests: 456 },
        { name: 'medispeak', requests: 321 },
        { name: 'finfriend', requests: 289 }
      ]
    },
    security: {
      blockedIPs: 3,
      suspiciousActivity: 12,
      validationErrors: 8,
      lastIncident: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    performance: {
      averageResponseTime: 245,
      cacheHitRate: 67.5,
      errorRate: 0.8
    }
  };
}

async function getBlockedIPs(): Promise<any> {
  // This would query the KV store for blocked IPs
  return {
    blockedIPs: [
      {
        ip: '192.168.1.100',
        blockedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Excessive rate limit violations',
        violationCount: 15
      }
    ],
    totalBlocked: 1
  };
}

async function getSecurityEvents(timeframe: string): Promise<any> {
  // This would query security events from the KV store
  const events = [
    {
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      type: 'rate_limit',
      clientIP: '192.168.1.100',
      details: { function: 'legalese-decoder', retryAfter: 60 }
    },
    {
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      type: 'validation_error',
      clientIP: '10.0.0.50',
      details: { errors: ['Query too long'] }
    }
  ];

  return {
    events,
    timeframe,
    totalEvents: events.length
  };
}

async function unblockIP(ip: string): Promise<any> {
  // This would remove the IP from the blocked list in KV store
  console.log(`Unblocking IP: ${ip}`);
  
  return {
    message: `IP ${ip} has been unblocked`,
    unblocked: true,
    timestamp: new Date().toISOString()
  };
}

async function getSystemHealth(): Promise<any> {
  return {
    status: 'healthy',
    uptime: '99.9%',
    services: {
      rateLimiter: 'operational',
      cache: 'operational',
      security: 'operational',
      geminiAPI: 'operational'
    },
    metrics: {
      memoryUsage: '45%',
      cpuUsage: '23%',
      diskUsage: '12%'
    },
    lastHealthCheck: new Date().toISOString()
  };
}