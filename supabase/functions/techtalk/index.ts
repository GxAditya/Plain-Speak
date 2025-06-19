/*
# TechTalk Edge Function

This function processes technical support queries and IT-related documents using Google's Gemini models.
It provides plain-English explanations of technical problems and solutions.

## Features
- Error message translation
- Troubleshooting guidance
- Hardware/software explanations
- Step-by-step technical solutions
- Technology recommendations
- Dynamic model selection for optimal performance
- Persistent caching with Deno KV for cost optimization

## Usage
POST /functions/v1/techtalk
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
    const cacheKey = backendCache.generateKey("techtalk", query, documentContent, forceFlashModel);
    const cachedResponse = await backendCache.get(cacheKey);
    
    if (cachedResponse) {
      console.log('Serving cached response for techtalk');
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

    let prompt = `You are a technical support expert specializing in translating complex IT problems and solutions into language that non-technical users can understand and follow. Your goal is to solve tech problems without the frustration.

Guidelines:
- Translate error messages into plain English explanations
- Provide step-by-step troubleshooting instructions that anyone can follow
- Use analogies to explain technical concepts (like comparing networks to roads)
- Explain what went wrong and why, not just how to fix it
- Offer multiple solution approaches when possible (easy, intermediate, advanced)
- Include preventive measures to avoid future problems
- Explain when to seek professional help vs. DIY solutions
- Use simple language and avoid technical jargon
- Provide context about why certain solutions work
- Include safety warnings when relevant (data backup, etc.)

User Query: ${query}`;

    if (documentContent) {
      prompt += `\n\nTechnical Document/Error Log to Analyze:\n${documentContent}`;
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
    console.error("Error in techtalk function:", error);
    
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