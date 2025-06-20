/**
 * Custom hook for managing user history
 * Handles saving interactions and retrieving history data
 */

import { useState, useCallback } from 'react';

interface HistoryEntry {
  id: string;
  tool_id: string;
  tool_name: string;
  query_text: string;
  response_text: string;
  query_preview: string;
  response_preview: string;
  model_used: string;
  query_complexity: number;
  response_quality: string;
  processing_time: number;
  has_document: boolean;
  created_at: string;
  metadata: Record<string, any>;
}

interface UserStats {
  overview: {
    totalInteractions: number;
    toolsUsed: number;
    documentsUploaded: number;
    avgQueryComplexity: number;
    mostUsedTool: string;
    lastActivity: string | null;
  };
  toolUsage: Array<{
    toolId: string;
    toolName: string;
    count: number;
  }>;
  recentActivity: Array<{
    date: string;
    toolName: string;
  }>;
}

interface UseHistoryReturn {
  isLoading: boolean;
  error: string | null;
  saveInteraction: (data: {
    toolId: string;
    queryText: string;
    responseText: string;
    documentId?: string;
    modelUsed: string;
    queryComplexity?: number;
    responseQuality?: 'low' | 'standard' | 'high';
    processingTime?: number;
    metadata?: Record<string, any>;
  }) => Promise<void>;
  getHistory: (options?: {
    limit?: number;
    offset?: number;
    toolFilter?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => Promise<{
    history: HistoryEntry[];
    total: number;
    hasMore: boolean;
  }>;
  deleteInteraction: (interactionId: string) => Promise<void>;
  getUserStats: () => Promise<UserStats>;
  exportData: () => Promise<any>;
}

export function useHistory(): UseHistoryReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callHistoryAPI = useCallback(async (action: string, data?: any) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
      throw new Error('Supabase configuration is missing');
    }

    const { supabase } = await import('../utils/supabase');
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/user-history-manager`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, data })
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

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown error occurred');
    }

    return result.result;
  }, []);

  const saveInteraction = useCallback(async (data: {
    toolId: string;
    queryText: string;
    responseText: string;
    documentId?: string;
    modelUsed: string;
    queryComplexity?: number;
    responseQuality?: 'low' | 'standard' | 'high';
    processingTime?: number;
    metadata?: Record<string, any>;
  }) => {
    setError(null);
    
    try {
      await callHistoryAPI('save_interaction', data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save interaction';
      setError(errorMessage);
      console.error('Error saving interaction:', err);
      // Don't throw here - saving history shouldn't break the main flow
    }
  }, [callHistoryAPI]);

  const getHistory = useCallback(async (options?: {
    limit?: number;
    offset?: number;
    toolFilter?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await callHistoryAPI('get_history', options);
      return {
        history: result.history,
        total: result.total,
        hasMore: result.hasMore
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch history';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [callHistoryAPI]);

  const deleteInteraction = useCallback(async (interactionId: string) => {
    setError(null);
    setIsLoading(true);

    try {
      await callHistoryAPI('delete_interaction', { interactionId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete interaction';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [callHistoryAPI]);

  const getUserStats = useCallback(async (): Promise<UserStats> => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await callHistoryAPI('get_stats');
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user stats';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [callHistoryAPI]);

  const exportData = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await callHistoryAPI('export_data');
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export data';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [callHistoryAPI]);

  return {
    isLoading,
    error,
    saveInteraction,
    getHistory,
    deleteInteraction,
    getUserStats,
    exportData
  };
}