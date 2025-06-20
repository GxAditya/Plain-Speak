/*
# EduSimplify Edge Function with Enhanced AI Integration

This function processes academic papers and educational content using Google's Gemini models
with education-specific prompt engineering and intelligent model selection.

## Features
- Academic-specific prompt engineering with learning optimization
- Research paper analysis and concept explanation
- Intelligent model selection for educational queries
- Learning-focused response validation
- Study aid generation capabilities

## Usage
POST /functions/v1/edusimplify
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
      functionName: 'edusimplify'
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

    // Calculate query complexity with academic-specific factors
    let queryComplexity = AIModelManager.calculateQueryComplexity(query);
    
    // Boost complexity for academic terms and research concepts
    const academicComplexityIndicators = [
      'research', 'study', 'theory', 'hypothesis', 'methodology', 'analysis',
      'peer review', 'citation', 'abstract', 'conclusion', 'literature review'
    ];
    
    const queryLower = query.toLowerCase();
    if (academicComplexityIndicators.some(indicator => queryLower.includes(indicator))) {
      queryComplexity += 1;
    }

    // Intelligent model selection
    const modelName = AIModelManager.selectOptimalModel({
      documentLength: documentContent?.length || 0,
      queryComplexity,
      hasRAGContext: false,
      toolDomain: 'edusimplify',
      isDeepThinking: forceFlashModel || false
    });

    // Check cache
    const cacheKey = backendCache.generateKey("edusimplify", query, documentContent, forceFlashModel);
    const cachedResponse = await backendCache.get(cacheKey);
    
    if (cachedResponse) {
      console.log('Serving cached response for edusimplify');
      return Middleware.createSuccessResponse({
        ...cachedResponse,
        fromCache: true,
        queryComplexity
      }, req.headers.get('origin') || undefined);
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Construct education-specific optimized prompt
    const optimizedPrompt = AIModelManager.constructPrompt(
      'edusimplify',
      query,
      documentContent
    );

    // Execute AI request with retry logic
    const aiResponse = await AIModelManager.executeWithRetry(async () => {
      const result = await model.generateContent(optimizedPrompt);
      const response = await result.response;
      return response.text();
    }, 3, 1000);

    // Process response with education-specific validation
    const { processedResponse, metadata } = AIModelManager.processResponse(
      aiResponse,
      'edusimplify'
    );

    // Additional educational quality checks
    const hasLearningAids = processedResponse.toLowerCase().includes('key points') ||
                           processedResponse.toLowerCase().includes('summary') ||
                           processedResponse.toLowerCase().includes('remember');

    const hasConceptConnections = processedResponse.toLowerCase().includes('relates to') ||
                                 processedResponse.toLowerCase().includes('similar to') ||
                                 processedResponse.toLowerCase().includes('connects');

    const responseData = {
      response: processedResponse,
      hasDocument: !!documentContent,
      ragEnhanced: false,
      modelUsed: modelName,
      queryComplexity,
      responseMetadata: {
        ...metadata,
        hasLearningAids,
        hasConceptConnections,
        isEducationallyOptimized: hasLearningAids && metadata.hasExamples
      },
      timestamp: new Date().toISOString(),
      processingInfo: {
        modelSelectionReason: queryComplexity >= 5 ? 'high_complexity' : 'standard_query',
        educationalComplexity: queryComplexity,
        learningOptimization: 'applied'
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
        'X-Educational-Quality': responseData.responseMetadata.isEducationallyOptimized ? 'optimized' : 'standard'
      }
    );

  } catch (error) {
    console.error("Error in edusimplify function:", error);
    
    return Middleware.createErrorResponse(
      "An error occurred while processing your educational query",
      "PROCESSING_ERROR",
      500,
      req.headers.get('origin') || undefined
    );
  }
});