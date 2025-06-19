/*
# BuildBot Edge Function

This function processes construction and building-related documents and queries using Google's Gemini models.
It provides plain-English explanations of building codes, permits, and construction processes.

## Features
- Building permit requirement explanations
- Construction code interpretations
- Step-by-step application guidance
- Timeline estimations
- Local regulation compliance
- Dynamic model selection for optimal performance
- Persistent caching with Deno KV for cost optimization

## Usage
POST /functions/v1/buildbot
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
    const cacheKey = backendCache.generateKey("buildbot", query, documentContent, forceFlashModel);
    const cachedResponse = await backendCache.get(cacheKey);
    
    if (cachedResponse) {
      console.log('Serving cached response for buildbot');
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

    let prompt = `You are a construction and building expert specializing in helping homeowners and contractors navigate building codes, permits, and construction processes. Your goal is to make complex building regulations accessible and actionable.

Guidelines:
- Explain building codes and regulations in simple, practical terms
- Break down permit processes into clear, step-by-step instructions
- Provide realistic timelines and cost estimates when possible
- Explain why certain codes exist (safety, structural integrity, etc.)
- Highlight common mistakes or oversights to avoid
- Use analogies to explain technical concepts
- Provide checklists and actionable next steps
- Explain the consequences of not following proper procedures
- Mention when professional help (architect, engineer, contractor) is recommended
- Include typical costs and timeframes for permits and inspections

User Query: ${query}`;

    if (documentContent) {
      prompt += `\n\nBuilding/Construction Document to Analyze:\n${documentContent}`;
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
    console.error("Error in buildbot function:", error);
    
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