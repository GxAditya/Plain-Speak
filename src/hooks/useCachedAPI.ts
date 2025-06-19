/**
 * Custom hook for cached API calls with RAG support
 * Integrates with the frontend cache system and handles document context
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
      console.log('Cache hit for query:', query.substring(0, 50) + '...');
      onSuccess?.(cachedResponse, true);
      return cachedResponse;
    }

    console.log('Cache miss, making API call for query:', query.substring(0, 50) + '...');
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

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          documentContent: documentContent || undefined,
          forceFlashModel: isDeepThinking,
          // Add cache headers for backend
          'x-cache-key': frontendCache['generateKey'](toolId, query, documentContent, isDeepThinking)
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Cache the successful response
      frontendCache.set(toolId, query, data, documentContent, isDeepThinking, data.modelUsed);

      onSuccess?.(data, false);
      return data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [toolId, onSuccess, onError]);

  const clearToolCache = useCallback(() => {
    // This would clear cache entries for the specific tool
    // For now, we'll clear the entire cache
    frontendCache.clearCache();
  }, []);

  return {
    isLoading,
    error,
    callAPI,
    clearToolCache
  };
}