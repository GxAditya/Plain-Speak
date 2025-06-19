/*
# Legalese Decoder Edge Function with RAG Integration

This function processes legal documents and user queries using Google's Gemini models
enhanced with RAG (Retrieval Augmented Generation) for better context-aware responses.

## Features
- Document analysis and jargon detection
- Plain-language explanations of legal terms
- Risk assessment and red flag identification
- RAG-enhanced responses using relevant document chunks
- Dynamic model selection for optimal performance
- Persistent caching with Deno KV for cost optimization
- Advanced rate limiting and security features

## Usage
POST /functions/v1/legalese-decoder
Body: {
  "query": "string",
  "documentContent": "string (optional)",
  "forceFlashModel": "boolean (optional)"
}
*/

import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { backendCache } from "../_shared/cache.ts";
import { Middleware } from "../_shared/middleware.ts";
import { RAGRetriever } from "../_shared/ragRetriever.ts";

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

    // Process request through middleware (rate limiting, security, validation)
    const middlewareResult = await Middleware.processRequest(req, {
      functionName: 'legalese-decoder'
    });

    if (!middlewareResult.allowed) {
      return middlewareResult.response!;
    }

    const { query, documentContent, forceFlashModel } = middlewareResult.sanitizedBody!;

    // Initialize cache
    await backendCache.init();

    // Get environment variables
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!geminiApiKey) {
      return Middleware.createErrorResponse(
        "Gemini API key not configured",
        "API_KEY_MISSING",
        500,
        req.headers.get('origin') || undefined
      );
    }

    // Get user from auth header for RAG functionality
    let userId: string | null = null;
    let ragContext = '';
    
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const authHeader = req.headers.get('Authorization');
        
        if (authHeader) {
          const { data: { user }, error: authError } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
          );
          
          if (!authError && user) {
            userId = user.id;
            
            // Initialize RAG retriever with Gemini API key
            const ragRetriever = new RAGRetriever(supabaseUrl, supabaseServiceKey, geminiApiKey);
            
            // Retrieve relevant chunks for the query
            const retrievalResult = await ragRetriever.retrieveRelevantChunks(
              userId,
              query,
              undefined, // No specific document filter
              5, // Limit to top 5 chunks
              0.6 // Similarity threshold
            );
            
            if (retrievalResult.chunks.length > 0) {
              ragContext = ragRetriever.formatChunksForPrompt(retrievalResult.chunks);
              console.log(`RAG: Retrieved ${retrievalResult.chunks.length} relevant chunks for legal query`);
            }
          }
        }
      } catch (error) {
        console.warn('RAG initialization failed, proceeding without RAG:', error);
      }
    }

    // Check cache first (include RAG context in cache key if available)
    const cacheKey = backendCache.generateKey(
      "legalese-decoder", 
      query + (ragContext ? `|rag:${ragContext.substring(0, 100)}` : ''), 
      documentContent, 
      forceFlashModel
    );
    const cachedResponse = await backendCache.get(cacheKey);
    
    if (cachedResponse) {
      console.log('Serving cached response for legalese-decoder');
      return Middleware.createSuccessResponse({
        ...cachedResponse,
        fromCache: true,
        ragEnhanced: ragContext.length > 0,
        cacheKey: cacheKey.join(':').substring(0, 20) + "..."
      }, req.headers.get('origin') || undefined);
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    
    // Dynamic model selection
    // Use gemini-2.5-flash for document analysis, RAG-enhanced queries, or when deep thinking is requested
    // Use gemini-2.5-flash-lite-preview-06-17 for general queries
    const modelName = (documentContent || forceFlashModel || ragContext.length > 0) 
      ? "gemini-2.5-flash" 
      : "gemini-2.5-flash-lite-preview-06-17";
    
    const model = genAI.getGenerativeModel({ model: modelName });

    // Construct the prompt for legal document analysis
    let prompt = `You are a legal expert specializing in translating complex legal language into plain English. Your goal is to help ordinary people understand legal documents, contracts, and terminology without needing a law degree.

Guidelines:
- Explain legal terms in simple, everyday language
- Use analogies and examples when helpful
- Highlight potential risks or important considerations
- Be accurate but accessible
- If analyzing a contract clause, explain what it means for the person signing it
- Point out any red flags or unusual terms
- Provide context about why certain clauses exist
- When referencing document context, cite the source document name

User Query: ${query}`;

    // Add document content if provided
    if (documentContent) {
      prompt += `\n\nDocument Content to Analyze:\n${documentContent}`;
    }

    // Add RAG context if available
    if (ragContext) {
      prompt += ragContext;
      prompt += `\n\nNote: Use the relevant document context above to provide more accurate and specific answers. Reference the source documents when applicable.`;
    }

    // Generate response using Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const responseData = {
      response: text,
      hasDocument: !!documentContent,
      ragEnhanced: ragContext.length > 0,
      modelUsed: modelName,
      timestamp: new Date().toISOString()
    };

    // Cache the response if it should be cached
    if (backendCache.shouldCache(query, responseData)) {
      await backendCache.set(cacheKey, responseData, modelName, forceFlashModel);
    }

    return Middleware.createSuccessResponse(
      responseData,
      req.headers.get('origin') || undefined,
      {
        'X-Model-Used': modelName,
        'X-Cache-Status': 'MISS',
        'X-RAG-Enhanced': ragContext.length > 0 ? 'true' : 'false'
      }
    );

  } catch (error) {
    console.error("Error in legalese-decoder function:", error);
    
    return Middleware.createErrorResponse(
      "An error occurred while processing your request",
      "PROCESSING_ERROR",
      500,
      req.headers.get('origin') || undefined
    );
  }
});