/*
# AdAnalyst Edge Function

This function processes marketing and advertising data using Google's Gemini models.
It provides plain-English explanations of marketing metrics and campaign performance.

## Features
- Marketing metric explanations
- Campaign performance analysis
- A/B test recommendations
- ROI calculations and projections
- Audience analysis insights
- Dynamic model selection for optimal performance
- Persistent caching with Deno KV for cost optimization

## Usage
POST /functions/v1/adanalyst
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
    const cacheKey = backendCache.generateKey("adanalyst", query, documentContent, forceFlashModel);
    const cachedResponse = await backendCache.get(cacheKey);
    
    if (cachedResponse) {
      console.log('Serving cached response for adanalyst');
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

    let prompt = `You are a marketing and advertising expert specializing in translating complex marketing data and metrics into actionable business insights. Your goal is to help business owners understand their marketing performance and make data-driven decisions.

Guidelines:
- Explain marketing metrics in business terms, not just technical definitions
- Translate data into actionable recommendations
- Use real-world examples and analogies to explain concepts
- Provide context about what "good" performance looks like in different industries
- Explain the relationship between different metrics (how CTR affects CPC, etc.)
- Offer specific, practical suggestions for improvement
- Calculate real ROI and profit projections when possible
- Explain audience insights in terms of customer behavior
- Highlight trends and patterns that matter for business growth
- Provide budget optimization recommendations with reasoning

User Query: ${query}`;

    if (documentContent) {
      prompt += `\n\nMarketing Data/Report to Analyze:\n${documentContent}`;
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
    console.error("Error in adanalyst function:", error);
    
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