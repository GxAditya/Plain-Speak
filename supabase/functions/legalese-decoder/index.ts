/*
# Legalese Decoder Edge Function with Enhanced AI Integration

This function processes legal documents and user queries using Google's Gemini models
with advanced prompt engineering, intelligent model selection, and RAG integration.

## Features
- Intelligent model selection based on query complexity and context
- Advanced prompt engineering with domain-specific expertise
- Enhanced RAG integration with legal document context
- Robust error handling with retry mechanisms
- Response quality analysis and optimization
- Comprehensive caching with intelligent cache keys

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
import { AIModelManager } from "../_shared/aiModelManager.ts";

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

    // Calculate query complexity for intelligent model selection
    const queryComplexity = AIModelManager.calculateQueryComplexity(query);

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
            
            // Retrieve relevant chunks for the query with higher similarity threshold for legal content
            const retrievalResult = await ragRetriever.retrieveRelevantChunks(
              userId,
              query,
              undefined, // No specific document filter
              5, // Limit to top 5 chunks
              0.7 // Higher similarity threshold for legal precision
            );
            
            if (retrievalResult.chunks.length > 0) {
              ragContext = ragRetriever.formatChunksForPrompt(retrievalResult.chunks);
              console.log(`RAG: Retrieved ${retrievalResult.chunks.length} relevant legal chunks (avg similarity: ${retrievalResult.avgSimilarity.toFixed(3)})`);
            }
          }
        }
      } catch (error) {
        console.warn('RAG initialization failed, proceeding without RAG:', error);
      }
    }

    // Intelligent model selection
    const modelName = AIModelManager.selectOptimalModel({
      documentLength: documentContent?.length || 0,
      queryComplexity,
      hasRAGContext: ragContext.length > 0,
      toolDomain: 'legalese-decoder',
      isDeepThinking: forceFlashModel || false
    });

    console.log(`Selected model: ${modelName} (complexity: ${queryComplexity}, hasRAG: ${ragContext.length > 0})`);

    // Generate intelligent cache key
    const cacheKeyComponents = [
      'legalese-decoder',
      `q:${AIModelManager.calculateQueryComplexity(query)}`,
      ragContext ? `rag:${ragContext.substring(0, 50)}` : '',
      documentContent ? `doc:${documentContent.substring(0, 50)}` : '',
      forceFlashModel ? 'deep' : 'standard'
    ].filter(Boolean);

    const cacheKey = backendCache.generateKey(
      cacheKeyComponents[0],
      cacheKeyComponents.slice(1).join('|'),
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
        modelUsed: cachedResponse.modelUsed || modelName,
        queryComplexity,
        cacheKey: cacheKey.join(':').substring(0, 30) + "..."
      }, req.headers.get('origin') || undefined);
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Construct optimized prompt using AI Model Manager
    const optimizedPrompt = AIModelManager.constructPrompt(
      'legalese-decoder',
      query,
      documentContent,
      ragContext
    );

    // Execute AI request with retry logic
    const aiResponse = await AIModelManager.executeWithRetry(async () => {
      const result = await model.generateContent(optimizedPrompt);
      const response = await result.response;
      return response.text();
    }, 3, 1000);

    // Process and validate response
    const { processedResponse, metadata } = AIModelManager.processResponse(
      aiResponse,
      'legalese-decoder'
    );

    const responseData = {
      response: processedResponse,
      hasDocument: !!documentContent,
      ragEnhanced: ragContext.length > 0,
      modelUsed: modelName,
      queryComplexity,
      responseMetadata: metadata,
      timestamp: new Date().toISOString(),
      processingInfo: {
        ragChunksUsed: ragContext ? ragContext.split('---').length - 1 : 0,
        modelSelectionReason: queryComplexity >= 5 ? 'high_complexity' : 'standard_query',
        promptTokensEstimate: Math.ceil(optimizedPrompt.length / 4) // Rough estimate
      }
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
        'X-RAG-Enhanced': ragContext.length > 0 ? 'true' : 'false',
        'X-Query-Complexity': queryComplexity.toString(),
        'X-Response-Quality': metadata.hasActionableAdvice ? 'high' : 'standard'
      }
    );

  } catch (error) {
    console.error("Error in legalese-decoder function:", error);
    
    return Middleware.createErrorResponse(
      "An error occurred while processing your legal query",
      "PROCESSING_ERROR",
      500,
      req.headers.get('origin') || undefined
    );
  }
});