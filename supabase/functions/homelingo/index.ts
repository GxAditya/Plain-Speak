/*
# HomeLingo Edge Function with Enhanced AI Integration

This function processes real estate documents and queries using Google's Gemini models
with real estate-specific prompt engineering and intelligent model selection.

## Features
- Real estate-specific prompt engineering with market awareness
- Property transaction and contract expertise
- Intelligent model selection for real estate queries
- Market-focused response validation
- Cost and timeline estimation for real estate processes

## Usage
POST /functions/v1/homelingo
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
      functionName: 'homelingo'
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

    // Calculate query complexity with real estate-specific factors
    let queryComplexity = AIModelManager.calculateQueryComplexity(query);
    
    // Boost complexity for real estate terms
    const realEstateComplexityIndicators = [
      'contract', 'closing', 'escrow', 'contingency', 'appraisal',
      'inspection', 'mortgage', 'deed', 'title', 'earnest money'
    ];
    
    const queryLower = query.toLowerCase();
    if (realEstateComplexityIndicators.some(indicator => queryLower.includes(indicator))) {
      queryComplexity += 1;
    }

    // Intelligent model selection
    const modelName = AIModelManager.selectOptimalModel({
      documentLength: documentContent?.length || 0,
      queryComplexity,
      hasRAGContext: false,
      toolDomain: 'homelingo',
      isDeepThinking: forceFlashModel || false
    });

    // Check cache
    const cacheKey = backendCache.generateKey("homelingo", query, documentContent, forceFlashModel);
    const cachedResponse = await backendCache.get(cacheKey);
    
    if (cachedResponse) {
      console.log('Serving cached response for homelingo');
      return Middleware.createSuccessResponse({
        ...cachedResponse,
        fromCache: true,
        queryComplexity
      }, req.headers.get('origin') || undefined);
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Construct real estate-specific optimized prompt
    const optimizedPrompt = AIModelManager.constructPrompt(
      'homelingo',
      query,
      documentContent
    );

    // Execute AI request with retry logic
    const aiResponse = await AIModelManager.executeWithRetry(async () => {
      const result = await model.generateContent(optimizedPrompt);
      const response = await result.response;
      return response.text();
    }, 3, 1000);

    // Process response with real estate-specific validation
    const { processedResponse, metadata } = AIModelManager.processResponse(
      aiResponse,
      'homelingo'
    );

    // Additional real estate quality checks
    const hasMarketContext = processedResponse.toLowerCase().includes('market') ||
                            processedResponse.toLowerCase().includes('typical') ||
                            processedResponse.toLowerCase().includes('common');

    const hasTimelineInfo = processedResponse.toLowerCase().includes('days') ||
                           processedResponse.toLowerCase().includes('weeks') ||
                           processedResponse.toLowerCase().includes('timeline');

    const responseData = {
      response: processedResponse,
      hasDocument: !!documentContent,
      ragEnhanced: false,
      modelUsed: modelName,
      queryComplexity,
      responseMetadata: {
        ...metadata,
        hasMarketContext,
        hasTimelineInfo,
        isRealEstateOptimized: hasMarketContext && metadata.hasActionableAdvice
      },
      timestamp: new Date().toISOString(),
      processingInfo: {
        modelSelectionReason: queryComplexity >= 5 ? 'high_complexity' : 'standard_query',
        realEstateComplexity: queryComplexity,
        marketAwareness: 'applied'
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
        'X-RealEstate-Quality': responseData.responseMetadata.isRealEstateOptimized ? 'optimized' : 'standard'
      }
    );

  } catch (error) {
    console.error("Error in homelingo function:", error);
    
    return Middleware.createErrorResponse(
      "An error occurred while processing your real estate query",
      "PROCESSING_ERROR",
      500,
      req.headers.get('origin') || undefined
    );
  }
});