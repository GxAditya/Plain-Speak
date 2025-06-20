/**
 * Document Management Hook
 * Handles document operations for non-free tier users
 */

import { useState, useCallback } from 'react';

interface DocumentInfo {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  word_count: number;
  complexity: string;
  readability_score: number;
  jargon_density: number;
  technical_terms: string[];
  created_at: string;
  updated_at: string;
  chunk_count: number;
}

interface DocumentListResponse {
  documents: DocumentInfo[];
  total: number;
  limit: number;
  offset: number;
}

interface UseDocumentManagementReturn {
  documents: DocumentInfo[];
  loading: boolean;
  error: string | null;
  total: number;
  loadDocuments: (options?: {
    limit?: number;
    offset?: number;
    search?: string;
  }) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  searchDocuments: (query: string) => Promise<void>;
  refreshDocuments: () => Promise<void>;
}

export function useDocumentManagement(): UseDocumentManagementReturn {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const callDocumentAPI = useCallback(async (action: string, data?: any) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
      throw new Error('Supabase configuration is missing');
    }

    const { supabase } = await import('../utils/supabase');
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/document-manager`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...data })
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

  const loadDocuments = useCallback(async (options?: {
    limit?: number;
    offset?: number;
    search?: string;
  }) => {
    setError(null);
    setLoading(true);

    try {
      const result: DocumentListResponse = await callDocumentAPI('list', {
        limit: options?.limit || 20,
        offset: options?.offset || 0
      });
      
      setDocuments(result.documents);
      setTotal(result.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load documents';
      setError(errorMessage);
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  }, [callDocumentAPI]);

  const deleteDocument = useCallback(async (documentId: string) => {
    setError(null);

    try {
      await callDocumentAPI('delete', { documentId });
      
      // Remove the document from the local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      setTotal(prev => prev - 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete document';
      setError(errorMessage);
      throw err;
    }
  }, [callDocumentAPI]);

  const searchDocuments = useCallback(async (query: string) => {
    setError(null);
    setLoading(true);

    try {
      const result: DocumentListResponse = await callDocumentAPI('search', {
        query,
        limit: 50,
        offset: 0
      });
      
      setDocuments(result.documents);
      setTotal(result.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search documents';
      setError(errorMessage);
      console.error('Error searching documents:', err);
    } finally {
      setLoading(false);
    }
  }, [callDocumentAPI]);

  const refreshDocuments = useCallback(async () => {
    await loadDocuments();
  }, [loadDocuments]);

  return {
    documents,
    loading,
    error,
    total,
    loadDocuments,
    deleteDocument,
    searchDocuments,
    refreshDocuments
  };
}