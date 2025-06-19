/*
# PolicyPal Edge Function

This function processes insurance documents and queries using Google's Gemini models.
It provides plain-English explanations of insurance policies, coverage, and claims processes.

## Features
- Insurance policy explanations
- Coverage analysis with real scenarios
- Claims process guidance
- Premium optimization advice
- Deductible impact calculations
- Dynamic model selection for optimal performance
- Persistent caching with Deno KV for cost optimization

## Usage
POST /functions/v1/policypal
Body: {
  "query": "string",
  "documentContent": "string (optional)",
  "forceFlashModel": "boolean (optional)"
}
*/

import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { backendCache } from "../_shared/cache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface RequestPayload {
  query: string;
  documentContent?: string;
  forceFlashModel?: boolean;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize cache
    await backendCache.init();

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { query, documentContent, forceFlashModel }: RequestPayload = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check cache first
    const cacheKey = backendCache.generateKey("policypal", query, documentContent, forceFlashModel);
    const cachedResponse = await backendCache.get(cacheKey);
    
    if (cachedResponse) {
      console.log('Serving cached response for policypal');
      return new Response(
        JSON.stringify({
          ...cachedResponse,
          fromCache: true
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    
    // Dynamic model selection
    const modelName = (documentContent || forceFlashModel) 
      ? "gemini-2.5-flash" 
      : "gemini-2.5-flash-lite-preview-06-17";
    
    const model = genAI.getGenerativeModel({ model: modelName });

    let prompt = `You are an insurance expert specializing in helping consumers understand their insurance policies, coverage options, and claims processes. Your goal is to make insurance accessible and help people get the protection they need.

Guidelines:
- Explain insurance terms and coverage in simple, everyday language
- Use real-world scenarios to illustrate what is and isn't covered
- Explain the claims process step-by-step with realistic timelines
- Highlight important exclusions and limitations
- Provide context about why certain coverage exists
- Calculate real-world impact of deductibles and coverage limits
- Compare different policy options with pros and cons
- Explain how premiums are calculated and ways to optimize costs
- Point out common misconceptions about coverage
- Provide actionable advice for policy selection and claims

User Query: ${query}`;

    if (documentContent) {
      prompt += `\n\nInsurance Policy/Document to Analyze:\n${documentContent}`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const responseData = {
      response: text,
      hasDocument: !!documentContent,
      modelUsed: modelName
    };

    // Cache the response
    if (backendCache.shouldCache(query, responseData)) {
      await backendCache.set(cacheKey, responseData, modelName, forceFlashModel);
    }

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in policypal function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "An error occurred while processing your request",
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});