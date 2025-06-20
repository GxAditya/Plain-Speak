/*
# Check Upload Limit Edge Function

This function checks if a user can upload documents based on their tier and daily limits.

## Features
- Daily upload limit checking for free tier
- Gemini API key validation
- Tier-based access control
- Detailed limit information

## Usage
POST /functions/v1/check-upload-limit
Body: {
  "action": "check_limit"
}
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { Middleware } from "../_shared/middleware.ts";

interface CheckLimitRequest {
  action: 'check_limit';
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

    // Check daily upload limit using the database function
    const { data: limitCheck, error: limitError } = await supabase
      .rpc('check_daily_upload_limit', { user_id: user.id });

    if (limitError) {
      console.error('Error checking upload limit:', limitError);
      return Middleware.createErrorResponse(
        "Failed to check upload limit",
        "LIMIT_CHECK_ERROR",
        500,
        req.headers.get('origin') || undefined
      );
    }

    return Middleware.createSuccessResponse({
      success: true,
      result: limitCheck,
      timestamp: new Date().toISOString()
    }, req.headers.get('origin') || undefined);

  } catch (error) {
    console.error("Error in check-upload-limit function:", error);
    
    return Middleware.createErrorResponse(
      "An error occurred while checking upload limit",
      "PROCESSING_ERROR",
      500,
      req.headers.get('origin') || undefined
    );
  }
});