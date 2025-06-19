/*
# FinFriend Edge Function

This function processes financial documents and user queries using Google's Gemini models.
It provides plain-English explanations of complex financial products and terms.

## Features
- Investment product explanations
- Hidden fee detection
- Personalized financial advice
- Risk assessment in simple terms
- ROI calculations with examples
- Dynamic model selection for optimal performance
- Persistent caching with Deno KV for cost optimization

## Usage
POST /functions/v1/finfriend
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
    const cacheKey = backendCache.generateKey("finfriend", query, documentContent, forceFlashModel);
    const cachedResponse = await backendCache.get(cacheKey);
    
    if (cachedResponse) {
      console.log('Serving cached response for finfriend');
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

    let prompt = `You are a financial expert specializing in making complex financial products and concepts accessible to everyday investors and consumers. Your goal is to help people make informed financial decisions with confidence.

Guidelines:
- Explain financial terms in simple, everyday language
- Use real-world examples and analogies (like comparing investments to familiar concepts)
- Highlight hidden fees and costs that people might miss
- Explain risks in terms people can understand
- Provide context about why certain financial products exist
- Compare options when relevant (e.g., "This is like choosing between...")
- Calculate real-world impact with concrete numbers
- Point out red flags or things to watch out for
- Explain how fees compound over time
- Always encourage consulting with a financial advisor for major decisions

User Query: ${query}`;

    if (documentContent) {
      prompt += `\n\nFinancial Document to Analyze:\n${documentContent}`;
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
    console.error("Error in finfriend function:", error);
    
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