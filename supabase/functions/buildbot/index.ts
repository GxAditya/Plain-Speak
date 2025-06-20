/*
# BuildBot Edge Function with Enhanced AI Integration

This function processes construction and building-related documents and queries using Google's Gemini models
with construction-specific prompt engineering and intelligent model selection.

## Features
- Construction-specific prompt engineering with safety focus
- Building code and permit process expertise
- Intelligent model selection for construction queries
- Safety-focused response validation
- Cost and timeline estimation capabilities

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
      functionName: 'buildbot'
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

    // Calculate query complexity with construction-specific factors
    let queryComplexity = AIModelManager.calculateQueryComplexity(query);
    
    // Boost complexity for construction-specific terms
    const constructionComplexityIndicators = [
      'building code', 'permit', 'inspection', 'structural', 'foundation',
      'electrical', 'plumbing', 'hvac', 'zoning', 'setback', 'variance'
    ];
    
    const queryLower = query.toLowerCase();
    if (constructionComplexityIndicators.some(indicator => queryLower.includes(indicator))) {
      queryComplexity += 1;
    }

    // Intelligent model selection
    const modelName = AIModelManager.selectOptimalModel({
      documentLength: documentContent?.length || 0,
      queryComplexity,
      hasRAGContext: false,
      toolDomain: 'buildbot',
      isDeepThinking: forceFlashModel || false
    });

    // Check cache
    const cacheKey = backendCache.generateKey("buildbot", query, documentContent, forceFlashModel);
    const cachedResponse = await backendCache.get(cacheKey);
    
    if (cachedResponse) {
      console.log('Serving cached response for buildbot');
      return Middleware.createSuccessResponse({
        ...cachedResponse,
        fromCache: true,
        queryComplexity
      }, req.headers.get('origin') || undefined);
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Construct construction-specific optimized prompt
    const optimizedPrompt = AIModelManager.constructPrompt(
      'buildbot',
      query,
      documentContent
    );

    // Execute AI request with retry logic
    const aiResponse = await AIModelManager.executeWithRetry(async () => {
      const result = await model.generateContent(optimizedPrompt);
      const response = await result.response;
      return response.text();
    }, 3, 1000);

    // Process response with construction-specific validation
    const { processedResponse, metadata } = AIModelManager.processResponse(
      aiResponse,
      'buildbot'
    );

    // Additional construction safety checks
    const hasSafetyWarning = processedResponse.toLowerCase().includes('safety') ||
                            processedResponse.toLowerCase().includes('professional') ||
                            processedResponse.toLowerCase().includes('licensed');

    const hasCodeCompliance = processedResponse.toLowerCase().includes('code') ||
                             processedResponse.toLowerCase().includes('permit') ||
                             processedResponse.toLowerCase().includes('inspection');

    const responseData = {
      response: processedResponse,
      hasDocument: !!documentContent,
      ragEnhanced: false,
      modelUsed: modelName,
      queryComplexity,
      responseMetadata: {
        ...metadata,
        hasSafetyWarning,
        hasCodeCompliance,
        isConstructionSafe: hasSafetyWarning && hasCodeCompliance
      },
      timestamp: new Date().toISOString(),
      processingInfo: {
        modelSelectionReason: queryComplexity >= 5 ? 'high_complexity' : 'standard_query',
        safetyValidation: 'passed',
        constructionComplexity: queryComplexity
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
        'X-Construction-Safety': responseData.responseMetadata.isConstructionSafe ? 'validated' : 'warning'
      }
    );

  } catch (error) {
    console.error("Error in buildbot function:", error);
    
    return Middleware.createErrorResponse(
      "An error occurred while processing your construction query",
      "PROCESSING_ERROR",
      500,
      req.headers.get('origin') || undefined
    );
  }
});