/**
 * Custom hook for cached API calls - Supabase removed
 * Replace the API call logic with your own backend.
 */

import { useState, useCallback } from 'react';
import { frontendCache } from '../utils/cache';

interface UseCachedAPIOptions {
  toolId: string;
  onSuccess?: (data: any, fromCache: boolean) => void;
  onError?: (error: Error) => void;
}

interface UseCachedAPIReturn {
  isLoading: boolean;
  error: string | null;
  callAPI: (
    query: string,
    documentContent?: string,
    isDeepThinking?: boolean
  ) => Promise<any>;
  clearToolCache: () => void;
}

interface EnhancedAPIResponse {
  response: string;
  hasDocument: boolean;
  ragEnhanced?: boolean;
  modelUsed: string;
  queryComplexity?: number;
  responseMetadata?: {
    wordCount: number;
    hasExamples: boolean;
    hasActionableAdvice: boolean;
    citesDocuments: boolean;
    [key: string]: any;
  };
  timestamp: string;
  processingInfo?: {
    ragChunksUsed?: number;
    modelSelectionReason?: string;
    promptTokensEstimate?: number;
    [key: string]: any;
  };
  fromCache?: boolean;
}

export function useCachedAPI({ toolId, onSuccess, onError }: UseCachedAPIOptions): UseCachedAPIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callAPI = useCallback(async (
    query: string,
    documentContent?: string,
    isDeepThinking: boolean = false
  ) => {
    setError(null);

    // Check cache first
    const cachedResponse = frontendCache.get(toolId, query, documentContent, isDeepThinking);

    if (cachedResponse) {
      console.log(`Cache hit for ${toolId}:`, query.substring(0, 50) + '...');

      const enhancedCachedResponse: EnhancedAPIResponse = {
        ...cachedResponse,
        fromCache: true,
        timestamp: cachedResponse.timestamp || new Date().toISOString()
      };

      onSuccess?.(enhancedCachedResponse, true);
      return enhancedCachedResponse;
    }

    console.log(`Cache miss for ${toolId}, making API call:`, query.substring(0, 50) + '...');
    setIsLoading(true);

    const startTime = Date.now();

    try {
      // ============================================================
      // TODO: Replace this stub with your actual backend call.
      // For now we return a simulated response after a short delay.
      // ============================================================
      await new Promise((r) => setTimeout(r, 600));

      const data: EnhancedAPIResponse = {
        response: `[Stub] Simplified response for: "${query.substring(0, 80)}..."`,
        hasDocument: !!documentContent,
        modelUsed: isDeepThinking ? 'gemini-2.5-flash' : 'gemini-flash-lite',
        timestamp: new Date().toISOString(),
        fromCache: false
      };

      const processingTime = Date.now() - startTime;
      console.log(`Stub API response for ${toolId} in ${processingTime}ms`);

      // Cache the response
      frontendCache.set(toolId, query, data, documentContent, isDeepThinking, data.modelUsed);

      onSuccess?.(data, false);
      return data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error(`API Error for ${toolId}:`, err);

      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [toolId, onSuccess, onError]);

  const clearToolCache = useCallback(() => {
    frontendCache.clearCache();
    console.log(`Cache cleared for tool: ${toolId}`);
  }, [toolId]);

  return {
    isLoading,
    error,
    callAPI,
    clearToolCache
  };
}