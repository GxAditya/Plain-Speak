/*
# Get Tier Info Edge Function

This function retrieves user tier information including upload limits and API key status.

## Features
- User tier information retrieval
- Upload limit checking
- API key status verification
- Comprehensive tier details

## Usage
POST /functions/v1/get-tier-info
Body: {
  "action": "get_tier_info"
}
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { Middleware } from "../_shared/middleware.ts";

interface TierInfoRequest {
  action: 'get_tier_info';
}

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return Middleware.handleCORS(req.headers.get('origin') || undefined);
    }

    if (req.method !== "POST") {
      return Middleware.createErrorResponse(
        "Method not allowed",
        "METHOD_NOT_ALLOWED",
        405,
        req.headers.get('origin') || undefined
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return Middleware.createErrorResponse(
        "Supabase configuration missing",
        "CONFIG_ERROR",
        500,
        req.headers.get('origin') || undefined
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Middleware.createErrorResponse(
        "Authentication required",
        "AUTH_REQUIRED",
        401,
        req.headers.get('origin') || undefined
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return Middleware.createErrorResponse(
        "Invalid authentication",
        "AUTH_INVALID",
        401,
        req.headers.get('origin') || undefined
      );
    }

    // Get user tier information using the database function
    const { data: tierInfo, error: tierError } = await supabase
      .rpc('get_user_tier_info', { user_id: user.id });

    if (tierError) {
      console.error('Error fetching tier info:', tierError);
      return Middleware.createErrorResponse(
        "Failed to fetch tier information",
        "TIER_INFO_ERROR",
        500,
        req.headers.get('origin') || undefined
      );
    }

    if (tierInfo.error) {
      return Middleware.createErrorResponse(
        tierInfo.error,
        "USER_NOT_FOUND",
        404,
        req.headers.get('origin') || undefined
      );
    }

    return Middleware.createSuccessResponse({
      success: true,
      result: tierInfo,
      timestamp: new Date().toISOString()
    }, req.headers.get('origin') || undefined);

  } catch (error) {
    console.error("Error in get-tier-info function:", error);
    
    return Middleware.createErrorResponse(
      "An error occurred while fetching tier information",
      "PROCESSING_ERROR",
      500,
      req.headers.get('origin') || undefined
    );
  }
});