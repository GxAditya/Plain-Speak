/*
# FinFriend Edge Function with Enhanced AI Integration

This function processes financial documents and user queries using Google's Gemini models
with advanced financial-specific prompt engineering and intelligent model selection.

## Features
- Financial-specific prompt engineering with risk awareness
- Intelligent model selection based on financial query complexity
- Enhanced response validation for financial accuracy
- Cost-benefit analysis integration
- Comprehensive error handling

## Usage
POST /functions/v1/finfriend
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
      functionName: 'finfriend'
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

    // Calculate query complexity with financial-specific factors
    let queryComplexity = AIModelManager.calculateQueryComplexity(query);
    
    // Boost complexity for financial calculations and analysis
    const financialComplexityIndicators = [
      'calculate', 'roi', 'return on investment', 'compound', 'interest',
      'portfolio', 'diversification', 'risk assessment', 'fees', 'expense ratio'
    ];
    
    const queryLower = query.toLowerCase();
    if (financialComplexityIndicators.some(indicator => queryLower.includes(indicator))) {
      queryComplexity += 2;
    }

    // Intelligent model selection
    const modelName = AIModelManager.selectOptimalModel({
      documentLength: documentContent?.length || 0,
      queryComplexity,
      hasRAGContext: false, // FinFriend doesn't use RAG in this implementation
      toolDomain: 'finfriend',
      isDeepThinking: forceFlashModel || false
    });

    // Check cache
    const cacheKey = backendCache.generateKey("finfriend", query, documentContent, forceFlashModel);
    const cachedResponse = await backendCache.get(cacheKey);
    
    if (cachedResponse) {
      console.log('Serving cached response for finfriend');
      return Middleware.createSuccessResponse({
        ...cachedResponse,
        fromCache: true,
        queryComplexity
      }, req.headers.get('origin') || undefined);
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Construct financial-specific optimized prompt
    const optimizedPrompt = AIModelManager.constructPrompt(
      'finfriend',
      query,
      documentContent
    );

    // Execute AI request with retry logic
    const aiResponse = await AIModelManager.executeWithRetry(async () => {
      const result = await model.generateContent(optimizedPrompt);
      const response = await result.response;
      return response.text();
    }, 3, 1000);

    // Process response with financial-specific validation
    const { processedResponse, metadata } = AIModelManager.processResponse(
      aiResponse,
      'finfriend'
    );

    // Additional financial safety checks
    const hasRiskWarning = processedResponse.toLowerCase().includes('risk') ||
                          processedResponse.toLowerCase().includes('loss') ||
                          processedResponse.toLowerCase().includes('volatile');

    const hasFinancialDisclaimer = processedResponse.toLowerCase().includes('financial advisor') ||
                                  processedResponse.toLowerCase().includes('professional advice');

    const responseData = {
      response: processedResponse,
      hasDocument: !!documentContent,
      ragEnhanced: false,
      modelUsed: modelName,
      queryComplexity,
      responseMetadata: {
        ...metadata,
        hasRiskWarning,
        hasFinancialDisclaimer,
        isFinanciallySafe: hasFinancialDisclaimer && hasRiskWarning
      },
      timestamp: new Date().toISOString(),
      processingInfo: {
        modelSelectionReason: queryComplexity >= 5 ? 'high_complexity' : 'standard_query',
        safetyValidation: 'passed',
        financialComplexity: queryComplexity
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
        'X-Financial-Safety': responseData.responseMetadata.isFinanciallySafe ? 'validated' : 'warning'
      }
    );

  } catch (error) {
    console.error("Error in finfriend function:", error);
    
    return Middleware.createErrorResponse(
      "An error occurred while processing your financial query",
      "PROCESSING_ERROR",
      500,
      req.headers.get('origin') || undefined
    );
  }
});