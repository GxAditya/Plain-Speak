/**
 * Custom hook for managing user history - Supabase removed
 * Replace with your backend implementation.
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

  const saveInteraction = useCallback(async (_data: {
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
    // Stub - replace with real backend call
    console.warn('saveInteraction is a stub. Replace with real implementation.');
  }, []);

  const getHistory = useCallback(async (_options?: {
    limit?: number;
    offset?: number;
    toolFilter?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    setError(null);
    setIsLoading(true);
    try {
      console.warn('getHistory is a stub. Replace with real implementation.');
      return { history: [], total: 0, hasMore: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteInteraction = useCallback(async (_interactionId: string) => {
    setError(null);
    console.warn('deleteInteraction is a stub. Replace with real implementation.');
  }, []);

  const getUserStats = useCallback(async (): Promise<UserStats> => {
    setError(null);
    setIsLoading(true);
    try {
      console.warn('getUserStats is a stub. Replace with real implementation.');
      return {
        overview: {
          totalInteractions: 0,
          toolsUsed: 0,
          documentsUploaded: 0,
          avgQueryComplexity: 0,
          mostUsedTool: '',
          lastActivity: null
        },
        toolUsage: [],
        recentActivity: []
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exportData = useCallback(async () => {
    setError(null);
    console.warn('exportData is a stub. Replace with real implementation.');
    return {};
  }, []);

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