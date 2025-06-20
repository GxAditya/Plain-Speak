/*
# TechTalk Edge Function with Enhanced AI Integration

This function processes technical support queries and IT-related documents using Google's Gemini models
with tech support-specific prompt engineering and intelligent model selection.

## Features
- Technical support-specific prompt engineering with solution focus
- Error message translation and troubleshooting expertise
- Intelligent model selection for technical queries
- Solution-focused response validation
- Multi-level difficulty solutions

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
import { Middleware } from "../_shared/middleware.ts";
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
      functionName: 'techtalk'
    });

    if (!middlewareResult.allowed) {
      return middlewareResult.response!;
    }

    const { query, documentContent, forceFlashModel } = middlewareResult.sanitizedBody!;

    // Initialize cache
    await backendCache.init();

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return Middleware.createErrorResponse(
        "Gemini API key not configured",
        "API_KEY_MISSING",
        500,
        req.headers.get('origin') || undefined
      );
    }

    // Calculate query complexity with tech support-specific factors
    let queryComplexity = AIModelManager.calculateQueryComplexity(query);
    
    // Boost complexity for technical troubleshooting
    const techComplexityIndicators = [
      'error', 'troubleshoot', 'fix', 'install', 'configure',
      'network', 'driver', 'software', 'hardware', 'system'
    ];
    
    const queryLower = query.toLowerCase();
    if (techComplexityIndicators.some(indicator => queryLower.includes(indicator))) {
      queryComplexity += 1;
    }

    // Intelligent model selection
    const modelName = AIModelManager.selectOptimalModel({
      documentLength: documentContent?.length || 0,
      queryComplexity,
      hasRAGContext: false,
      toolDomain: 'techtalk',
      isDeepThinking: forceFlashModel || false
    });

    // Check cache
    const cacheKey = backendCache.generateKey("techtalk", query, documentContent, forceFlashModel);
    const cachedResponse = await backendCache.get(cacheKey);
    
    if (cachedResponse) {
      console.log('Serving cached response for techtalk');
      return Middleware.createSuccessResponse({
        ...cachedResponse,
        fromCache: true,
        queryComplexity
      }, req.headers.get('origin') || undefined);
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Construct tech support-specific optimized prompt
    const optimizedPrompt = AIModelManager.constructPrompt(
      'techtalk',
      query,
      documentContent
    );

    // Execute AI request with retry logic
    const aiResponse = await AIModelManager.executeWithRetry(async () => {
      const result = await model.generateContent(optimizedPrompt);
      const response = await result.response;
      return response.text();
    }, 3, 1000);

    // Process response with tech support-specific validation
    const { processedResponse, metadata } = AIModelManager.processResponse(
      aiResponse,
      'techtalk'
    );

    // Additional tech support quality checks
    const hasStepByStep = processedResponse.toLowerCase().includes('step') ||
                         processedResponse.toLowerCase().includes('first') ||
                         processedResponse.toLowerCase().includes('next');

    const hasSafetyWarning = processedResponse.toLowerCase().includes('backup') ||
                            processedResponse.toLowerCase().includes('caution') ||
                            processedResponse.toLowerCase().includes('warning');

    const responseData = {
      response: processedResponse,
      hasDocument: !!documentContent,
      ragEnhanced: false,
      modelUsed: modelName,
      queryComplexity,
      responseMetadata: {
        ...metadata,
        hasStepByStep,
        hasSafetyWarning,
        isTechOptimized: hasStepByStep && metadata.hasActionableAdvice
      },
      timestamp: new Date().toISOString(),
      processingInfo: {
        modelSelectionReason: queryComplexity >= 5 ? 'high_complexity' : 'standard_query',
        techComplexity: queryComplexity,
        solutionFocus: 'applied'
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
        'X-Query-Complexity': queryComplexity.toString(),
        'X-Tech-Quality': responseData.responseMetadata.isTechOptimized ? 'optimized' : 'standard'
      }
    );

  } catch (error) {
    console.error("Error in techtalk function:", error);
    
    return Middleware.createErrorResponse(
      "An error occurred while processing your technical query",
      "PROCESSING_ERROR",
      500,
      req.headers.get('origin') || undefined
    );
  }
});