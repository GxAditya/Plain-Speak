/*
# AdAnalyst Edge Function with Enhanced AI Integration

This function processes marketing and advertising data using Google's Gemini models
with marketing-specific prompt engineering and intelligent model selection.

## Features
- Marketing-specific prompt engineering with ROI focus
- Campaign analysis and optimization expertise
- Intelligent model selection for marketing queries
- Business-focused response validation
- Performance metric interpretation

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
      functionName: 'adanalyst'
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

    // Calculate query complexity with marketing-specific factors
    let queryComplexity = AIModelManager.calculateQueryComplexity(query);
    
    // Boost complexity for marketing analysis terms
    const marketingComplexityIndicators = [
      'campaign', 'roi', 'conversion', 'ctr', 'cpc', 'cpm',
      'audience', 'targeting', 'optimization', 'a/b test', 'funnel'
    ];
    
    const queryLower = query.toLowerCase();
    if (marketingComplexityIndicators.some(indicator => queryLower.includes(indicator))) {
      queryComplexity += 1;
    }

    // Intelligent model selection
    const modelName = AIModelManager.selectOptimalModel({
      documentLength: documentContent?.length || 0,
      queryComplexity,
      hasRAGContext: false,
      toolDomain: 'adanalyst',
      isDeepThinking: forceFlashModel || false
    });

    // Check cache
    const cacheKey = backendCache.generateKey("adanalyst", query, documentContent, forceFlashModel);
    const cachedResponse = await backendCache.get(cacheKey);
    
    if (cachedResponse) {
      console.log('Serving cached response for adanalyst');
      return Middleware.createSuccessResponse({
        ...cachedResponse,
        fromCache: true,
        queryComplexity
      }, req.headers.get('origin') || undefined);
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Construct marketing-specific optimized prompt
    const optimizedPrompt = AIModelManager.constructPrompt(
      'adanalyst',
      query,
      documentContent
    );

    // Execute AI request with retry logic
    const aiResponse = await AIModelManager.executeWithRetry(async () => {
      const result = await model.generateContent(optimizedPrompt);
      const response = await result.response;
      return response.text();
    }, 3, 1000);

    // Process response with marketing-specific validation
    const { processedResponse, metadata } = AIModelManager.processResponse(
      aiResponse,
      'adanalyst'
    );

    // Additional marketing quality checks
    const hasROIAnalysis = processedResponse.toLowerCase().includes('roi') ||
                          processedResponse.toLowerCase().includes('return') ||
                          processedResponse.toLowerCase().includes('profit');

    const hasActionableInsights = processedResponse.toLowerCase().includes('recommend') ||
                                 processedResponse.toLowerCase().includes('optimize') ||
                                 processedResponse.toLowerCase().includes('improve');

    const responseData = {
      response: processedResponse,
      hasDocument: !!documentContent,
      ragEnhanced: false,
      modelUsed: modelName,
      queryComplexity,
      responseMetadata: {
        ...metadata,
        hasROIAnalysis,
        hasActionableInsights,
        isMarketingOptimized: hasROIAnalysis && hasActionableInsights
      },
      timestamp: new Date().toISOString(),
      processingInfo: {
        modelSelectionReason: queryComplexity >= 5 ? 'high_complexity' : 'standard_query',
        marketingComplexity: queryComplexity,
        businessFocus: 'applied'
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
        'X-Marketing-Quality': responseData.responseMetadata.isMarketingOptimized ? 'optimized' : 'standard'
      }
    );

  } catch (error) {
    console.error("Error in adanalyst function:", error);
    
    return Middleware.createErrorResponse(
      "An error occurred while processing your marketing query",
      "PROCESSING_ERROR",
      500,
      req.headers.get('origin') || undefined
    );
  }
});