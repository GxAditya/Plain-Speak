/*
# PolicyPal Edge Function with Enhanced AI Integration

This function processes insurance documents and queries using Google's Gemini models
with insurance-specific prompt engineering and intelligent model selection.

## Features
- Insurance-specific prompt engineering with coverage focus
- Policy analysis and claims process expertise
- Intelligent model selection for insurance queries
- Coverage-focused response validation
- Risk and cost analysis capabilities

## Usage
POST /functions/v1/policypal
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
      functionName: 'policypal'
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

    // Calculate query complexity with insurance-specific factors
    let queryComplexity = AIModelManager.calculateQueryComplexity(query);
    
    // Boost complexity for insurance terms
    const insuranceComplexityIndicators = [
      'coverage', 'deductible', 'premium', 'claim', 'exclusion',
      'policy', 'liability', 'underwriting', 'rider', 'beneficiary'
    ];
    
    const queryLower = query.toLowerCase();
    if (insuranceComplexityIndicators.some(indicator => queryLower.includes(indicator))) {
      queryComplexity += 1;
    }

    // Intelligent model selection
    const modelName = AIModelManager.selectOptimalModel({
      documentLength: documentContent?.length || 0,
      queryComplexity,
      hasRAGContext: false,
      toolDomain: 'policypal',
      isDeepThinking: forceFlashModel || false
    });

    // Check cache
    const cacheKey = backendCache.generateKey("policypal", query, documentContent, forceFlashModel);
    const cachedResponse = await backendCache.get(cacheKey);
    
    if (cachedResponse) {
      console.log('Serving cached response for policypal');
      return Middleware.createSuccessResponse({
        ...cachedResponse,
        fromCache: true,
        queryComplexity
      }, req.headers.get('origin') || undefined);
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Construct insurance-specific optimized prompt
    const optimizedPrompt = AIModelManager.constructPrompt(
      'policypal',
      query,
      documentContent
    );

    // Execute AI request with retry logic
    const aiResponse = await AIModelManager.executeWithRetry(async () => {
      const result = await model.generateContent(optimizedPrompt);
      const response = await result.response;
      return response.text();
    }, 3, 1000);

    // Process response with insurance-specific validation
    const { processedResponse, metadata } = AIModelManager.processResponse(
      aiResponse,
      'policypal'
    );

    // Additional insurance quality checks
    const hasCoverageInfo = processedResponse.toLowerCase().includes('covered') ||
                           processedResponse.toLowerCase().includes('coverage') ||
                           processedResponse.toLowerCase().includes('protection');

    const hasExclusionWarning = processedResponse.toLowerCase().includes('exclusion') ||
                               processedResponse.toLowerCase().includes('not covered') ||
                               processedResponse.toLowerCase().includes('limitation');

    const responseData = {
      response: processedResponse,
      hasDocument: !!documentContent,
      ragEnhanced: false,
      modelUsed: modelName,
      queryComplexity,
      responseMetadata: {
        ...metadata,
        hasCoverageInfo,
        hasExclusionWarning,
        isInsuranceOptimized: hasCoverageInfo && metadata.hasActionableAdvice
      },
      timestamp: new Date().toISOString(),
      processingInfo: {
        modelSelectionReason: queryComplexity >= 5 ? 'high_complexity' : 'standard_query',
        insuranceComplexity: queryComplexity,
        coverageFocus: 'applied'
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
        'X-Insurance-Quality': responseData.responseMetadata.isInsuranceOptimized ? 'optimized' : 'standard'
      }
    );

  } catch (error) {
    console.error("Error in policypal function:", error);
    
    return Middleware.createErrorResponse(
      "An error occurred while processing your insurance query",
      "PROCESSING_ERROR",
      500,
      req.headers.get('origin') || undefined
    );
  }
});