/*
# MediSpeak Edge Function with Enhanced AI Integration

This function processes medical documents and user queries using Google's Gemini models
with advanced prompt engineering, intelligent model selection, and RAG integration.

## Features
- Medical-specific prompt engineering with empathetic communication
- Intelligent model selection based on medical query complexity
- Enhanced RAG integration with medical document context
- Patient-safety focused response validation
- Comprehensive error handling and retry mechanisms

## Usage
POST /functions/v1/medispeak
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

    // Process request through middleware
    const middlewareResult = await Middleware.processRequest(req, {
      functionName: 'medispeak'
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

    // Calculate query complexity with medical-specific factors
    let queryComplexity = AIModelManager.calculateQueryComplexity(query);
    
    // Boost complexity for medical-specific terms
    const medicalTerms = [
      'diagnosis', 'treatment', 'medication', 'symptoms', 'side effects',
      'lab results', 'test results', 'procedure', 'surgery', 'therapy'
    ];
    
    const queryLower = query.toLowerCase();
    if (medicalTerms.some(term => queryLower.includes(term))) {
      queryComplexity += 1;
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
            
            // Initialize RAG retriever
            const ragRetriever = new RAGRetriever(supabaseUrl, supabaseServiceKey, geminiApiKey);
            
            // Retrieve relevant medical chunks
            const retrievalResult = await ragRetriever.retrieveRelevantChunks(
              userId,
              query,
              undefined,
              5,
              0.65 // Slightly lower threshold for medical content to capture more context
            );
            
            if (retrievalResult.chunks.length > 0) {
              ragContext = ragRetriever.formatChunksForPrompt(retrievalResult.chunks);
              console.log(`RAG: Retrieved ${retrievalResult.chunks.length} relevant medical chunks`);
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
      toolDomain: 'medispeak',
      isDeepThinking: forceFlashModel || false
    });

    // Generate cache key
    const cacheKey = backendCache.generateKey(
      "medispeak",
      query + (ragContext ? `|rag:${ragContext.substring(0, 100)}` : ''),
      documentContent,
      forceFlashModel
    );

    const cachedResponse = await backendCache.get(cacheKey);
    
    if (cachedResponse) {
      console.log('Serving cached response for medispeak');
      return Middleware.createSuccessResponse({
        ...cachedResponse,
        fromCache: true,
        ragEnhanced: ragContext.length > 0,
        queryComplexity
      }, req.headers.get('origin') || undefined);
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Construct medical-specific optimized prompt
    const optimizedPrompt = AIModelManager.constructPrompt(
      'medispeak',
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

    // Process response with medical-specific validation
    const { processedResponse, metadata } = AIModelManager.processResponse(
      aiResponse,
      'medispeak'
    );

    // Additional medical safety check
    const hasMedicalDisclaimer = processedResponse.toLowerCase().includes('healthcare provider') ||
                                processedResponse.toLowerCase().includes('medical advice') ||
                                processedResponse.toLowerCase().includes('consult');

    const responseData = {
      response: processedResponse,
      hasDocument: !!documentContent,
      ragEnhanced: ragContext.length > 0,
      modelUsed: modelName,
      queryComplexity,
      responseMetadata: {
        ...metadata,
        hasMedicalDisclaimer,
        isPatientSafe: hasMedicalDisclaimer && !processedResponse.toLowerCase().includes('diagnose')
      },
      timestamp: new Date().toISOString(),
      processingInfo: {
        ragChunksUsed: ragContext ? ragContext.split('---').length - 1 : 0,
        modelSelectionReason: queryComplexity >= 5 ? 'high_complexity' : 'standard_query',
        safetyValidation: 'passed'
      }
    };

    // Cache the response
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
        'X-Medical-Safety': responseData.responseMetadata.isPatientSafe ? 'validated' : 'warning'
      }
    );

  } catch (error) {
    console.error("Error in medispeak function:", error);
    
    return Middleware.createErrorResponse(
      "An error occurred while processing your medical query",
      "PROCESSING_ERROR",
      500,
      req.headers.get('origin') || undefined
    );
  }
});