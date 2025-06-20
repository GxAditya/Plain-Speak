/*
# Update Profile Key Edge Function

This function securely stores a user's Gemini API key in their profile.
It validates the key and encrypts it before storage.

## Features
- Gemini API key validation
- Secure encryption using pgsodium
- User authentication verification
- Comprehensive error handling

## Usage
POST /functions/v1/update-profile-key
Body: {
  "geminiApiKey": "string"
}
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { Middleware } from "../_shared/middleware.ts";

interface UpdateKeyRequest {
  geminiApiKey: string;
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

    const { geminiApiKey }: UpdateKeyRequest = await req.json();

    // Validate input
    if (!geminiApiKey || typeof geminiApiKey !== 'string') {
      return Middleware.createErrorResponse(
        "Valid Gemini API key is required",
        "INVALID_INPUT",
        400,
        req.headers.get('origin') || undefined
      );
    }

    // Validate the API key by testing it with Gemini
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-06-17" });
      
      // Test the key with a simple request
      const result = await model.generateContent("Test");
      const response = await result.response;
      
      if (!response.text()) {
        throw new Error("Invalid API key response");
      }
    } catch (error) {
      console.error('Gemini API key validation failed:', error);
      return Middleware.createErrorResponse(
        "Invalid Gemini API key. Please check your key and try again.",
        "INVALID_API_KEY",
        400,
        req.headers.get('origin') || undefined
      );
    }

    // Store the encrypted key using the database function
    const { data: storeResult, error: storeError } = await supabase
      .rpc('store_user_gemini_key', {
        user_id: user.id,
        api_key: geminiApiKey
      });

    if (storeError || !storeResult) {
      console.error('Error storing Gemini API key:', storeError);
      return Middleware.createErrorResponse(
        "Failed to store API key. Please try again.",
        "STORAGE_ERROR",
        500,
        req.headers.get('origin') || undefined
      );
    }

    return Middleware.createSuccessResponse({
      success: true,
      message: "Gemini API key stored successfully",
      hasKey: true,
      timestamp: new Date().toISOString()
    }, req.headers.get('origin') || undefined);

  } catch (error) {
    console.error("Error in update-profile-key function:", error);
    
    return Middleware.createErrorResponse(
      "An error occurred while updating your API key",
      "PROCESSING_ERROR",
      500,
      req.headers.get('origin') || undefined
    );
  }
});