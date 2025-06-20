/**
 * Enhanced Custom hook for cached API calls with history tracking
 * Integrates with the user history system to automatically save interactions
 * Now includes free tier support with conditional history saving
 */

import { useState, useCallback } from 'react';
import { frontendCache } from '../utils/cache';
import { useHistory } from './useHistory';
import { useFreeTier } from './useFreeTier';

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
  const { saveInteraction } = useHistory();
  const { freeTierInfo } = useFreeTier();

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

    const startTime = Date.now();

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
          cacheKey: cacheKey.substring(0, 50), // Truncated for logging
          userTier: freeTierInfo?.tier || 'unknown'
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
        const processingTime = Date.now() - startTime;
        
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

        // Save interaction to history (only if user is authenticated and history is saved for their tier)
        if (session?.access_token && freeTierInfo?.historySaved !== false) {
          try {
            await saveInteraction({
              toolId,
              queryText: query,
              responseText: data.response,
              documentId: undefined, // Could be enhanced to track document IDs
              modelUsed: data.modelUsed,
              queryComplexity: data.queryComplexity || 0,
              responseQuality: determineResponseQuality(data),
              processingTime,
              metadata: {
                hasDocument: !!documentContent,
                ragEnhanced: data.ragEnhanced || false,
                isDeepThinking,
                responseMetadata: data.responseMetadata,
                processingInfo: data.processingInfo,
                cacheKey: cacheKey.substring(0, 50),
                userTier: freeTierInfo?.tier || 'unknown'
              }
            });
          } catch (historyError) {
            // Don't fail the main request if history saving fails
            console.warn('Failed to save interaction to history:', historyError);
          }
        } else if (freeTierInfo?.historySaved === false) {
          console.log('History not saved for free tier user');
        }

        // Log enhanced response info for debugging
        console.log(`Enhanced API Response for ${toolId}:`, {
          modelUsed: data.modelUsed,
          queryComplexity: data.queryComplexity,
          ragEnhanced: data.ragEnhanced,
          responseQuality: data.responseMetadata?.hasActionableAdvice ? 'high' : 'standard',
          processingTime: `${processingTime}ms`,
          historySaved: freeTierInfo?.historySaved !== false
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
  }, [toolId, onSuccess, onError, saveInteraction, freeTierInfo]);

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

/**
 * Determine response quality based on metadata
 */
function determineResponseQuality(data: EnhancedAPIResponse): 'low' | 'standard' | 'high' {
  const metadata = data.responseMetadata;
  
  if (!metadata) return 'standard';
  
  let qualityScore = 0;
  
  if (metadata.hasExamples) qualityScore += 1;
  if (metadata.hasActionableAdvice) qualityScore += 2;
  if (metadata.citesDocuments) qualityScore += 1;
  if (metadata.wordCount > 200) qualityScore += 1;
  
  if (qualityScore >= 4) return 'high';
  if (qualityScore >= 2) return 'standard';
  return 'low';
}