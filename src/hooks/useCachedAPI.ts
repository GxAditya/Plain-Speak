/**
 * Enhanced Custom hook for cached API calls with RAG support
 * Integrates with the refined AI model system and handles enhanced response metadata
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
    [key: string]: any; // Allow for tool-specific metadata
  };
  timestamp: string;
  processingInfo?: {
    ragChunksUsed?: number;
    modelSelectionReason?: string;
    promptTokensEstimate?: number;
    [key: string]: any; // Allow for tool-specific processing info
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

    // Check cache first with enhanced key generation
    const cacheKey = generateEnhancedCacheKey(toolId, query, documentContent, isDeepThinking);
    const cachedResponse = frontendCache.get(toolId, query, documentContent, isDeepThinking);
    
    if (cachedResponse) {
      console.log(`Cache hit for ${toolId}:`, query.substring(0, 50) + '...');
      
      // Enhance cached response with additional metadata
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

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration is missing. Please check your environment variables.');
      }

      // Map tool IDs to their corresponding edge function names
      const functionMap: Record<string, string> = {
        'legalese': 'legalese-decoder',
        'medispeak': 'medispeak',
        'finfriend': 'finfriend',
        'buildbot': 'buildbot',
        'edusimplify': 'edusimplify',
        'homelingo': 'homelingo',
        'techtalk': 'techtalk',
        'adanalyst': 'adanalyst',
        'policypal': 'policypal'
      };

      const functionName = functionMap[toolId];
      if (!functionName) {
        throw new Error('Invalid tool selected');
      }

      const apiUrl = `${supabaseUrl}/functions/v1/${functionName}`;

      // Get current session for authentication (needed for RAG)
      const { supabase } = await import('../utils/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if user is authenticated (for RAG functionality)
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const requestBody = {
        query,
        documentContent: documentContent || undefined,
        forceFlashModel: isDeepThinking,
        // Add metadata for enhanced processing
        clientMetadata: {
          timestamp: new Date().toISOString(),
          toolId,
          cacheKey: cacheKey.substring(0, 50) // Truncated for logging
        }
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data: EnhancedAPIResponse = await response.json();
      
      if (data.response) {
        // Enhance response with client-side metadata
        const enhancedData: EnhancedAPIResponse = {
          ...data,
          fromCache: false,
          timestamp: data.timestamp || new Date().toISOString()
        };

        // Cache the successful response with enhanced metadata
        frontendCache.set(
          toolId, 
          query, 
          enhancedData, 
          documentContent, 
          isDeepThinking, 
          data.modelUsed
        );

        // Log enhanced response info for debugging
        console.log(`Enhanced API Response for ${toolId}:`, {
          modelUsed: data.modelUsed,
          queryComplexity: data.queryComplexity,
          ragEnhanced: data.ragEnhanced,
          responseQuality: data.responseMetadata?.hasActionableAdvice ? 'high' : 'standard',
          processingTime: data.processingInfo?.promptTokensEstimate ? `~${data.processingInfo.promptTokensEstimate} tokens` : 'unknown'
        });

        onSuccess?.(enhancedData, false);
        return enhancedData;
      } else {
        throw new Error('Invalid response format from API');
      }

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
    // Clear cache entries for the specific tool
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

/**
 * Generate enhanced cache key that includes complexity and metadata
 */
function generateEnhancedCacheKey(
  toolId: string, 
  query: string, 
  documentContent?: string, 
  isDeepThinking?: boolean
): string {
  const components = [
    toolId,
    isDeepThinking ? 'deep' : 'standard',
    hashString(query),
    documentContent ? hashString(documentContent.substring(0, 1000)) : '', // Use first 1000 chars for hashing
    new Date().toISOString().split('T')[0] // Add date for daily cache invalidation
  ].filter(Boolean);

  return components.join(':');
}

/**
 * Simple hash function for cache key generation
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}