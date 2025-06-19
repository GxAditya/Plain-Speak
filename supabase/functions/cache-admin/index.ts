/*
# Cache Admin Edge Function

This function provides administrative capabilities for managing the persistent cache.
It allows for cache statistics, cleanup operations, and cache management.

## Features
- Cache statistics and monitoring
- Manual cache cleanup
- Cache entry inspection
- Performance metrics
- Cache health monitoring

## Usage
GET /functions/v1/cache-admin?action=stats
GET /functions/v1/cache-admin?action=cleanup
POST /functions/v1/cache-admin
Body: {
  "action": "clear" | "stats" | "cleanup" | "inspect",
  "key": "string (optional, for inspect action)"
}
*/

import { backendCache } from "../_shared/cache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface AdminRequest {
  action: 'clear' | 'stats' | 'cleanup' | 'inspect';
  key?: string;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Initialize cache
    await backendCache.init();

    let action: string;
    let key: string | undefined;

    if (req.method === "GET") {
      const url = new URL(req.url);
      action = url.searchParams.get('action') || 'stats';
      key = url.searchParams.get('key') || undefined;
    } else if (req.method === "POST") {
      const body: AdminRequest = await req.json();
      action = body.action;
      key = body.key;
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
        result = await backendCache.getStats();
        break;

      case 'cleanup':
        const deletedCount = await backendCache.cleanup();
        result = {
          message: `Cache cleanup completed`,
          deletedEntries: deletedCount,
          timestamp: new Date().toISOString()
        };
        break;

      case 'clear':
        await backendCache.clearAll();
        result = {
          message: "All cache entries cleared",
          timestamp: new Date().toISOString()
        };
        break;

      case 'inspect':
        if (!key) {
          return new Response(
            JSON.stringify({ error: "Key is required for inspect action" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        const entry = await backendCache.getEntry(key);
        result = {
          key,
          entry,
          found: !!entry
        };
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Supported actions: stats, cleanup, clear, inspect" }),
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
    console.error("Error in cache-admin function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "An error occurred while processing the admin request",
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});