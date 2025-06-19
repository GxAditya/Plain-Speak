/*
# Document Manager Edge Function

This function provides document management capabilities for users.
It allows users to view, search, and manage their uploaded documents.

## Features
- List user documents with metadata
- Search documents by content or metadata
- Delete documents and associated chunks
- Document statistics and analytics

## Usage
GET /functions/v1/document-manager?action=list
GET /functions/v1/document-manager?action=search&query=term
POST /functions/v1/document-manager
Body: {
  "action": "delete" | "get" | "search",
  "documentId": "string (for delete/get)",
  "query": "string (for search)"
}
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { Middleware } from "../_shared/middleware.ts";

interface DocumentManagerRequest {
  action: 'list' | 'get' | 'delete' | 'search';
  documentId?: string;
  query?: string;
  limit?: number;
  offset?: number;
}

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return Middleware.handleCORS(req.headers.get('origin') || undefined);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return Middleware.createErrorResponse(
        "Supabase configuration missing",
        "CONFIG_ERROR",
        500,
        req.headers.get('origin') || undefined
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Middleware.createErrorResponse(
        "Authentication required",
        "AUTH_REQUIRED",
        401,
        req.headers.get('origin') || undefined
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return Middleware.createErrorResponse(
        "Invalid authentication",
        "AUTH_INVALID",
        401,
        req.headers.get('origin') || undefined
      );
    }

    let action: string;
    let documentId: string | undefined;
    let query: string | undefined;
    let limit: number = 20;
    let offset: number = 0;

    if (req.method === "GET") {
      const url = new URL(req.url);
      action = url.searchParams.get('action') || 'list';
      documentId = url.searchParams.get('documentId') || undefined;
      query = url.searchParams.get('query') || undefined;
      limit = parseInt(url.searchParams.get('limit') || '20');
      offset = parseInt(url.searchParams.get('offset') || '0');
    } else if (req.method === "POST") {
      const body: DocumentManagerRequest = await req.json();
      action = body.action;
      documentId = body.documentId;
      query = body.query;
      limit = body.limit || 20;
      offset = body.offset || 0;
    } else {
      return Middleware.createErrorResponse(
        "Method not allowed",
        "METHOD_NOT_ALLOWED",
        405,
        req.headers.get('origin') || undefined
      );
    }

    let result: any;

    switch (action) {
      case 'list':
        result = await listUserDocuments(supabase, user.id, limit, offset);
        break;

      case 'get':
        if (!documentId) {
          return Middleware.createErrorResponse(
            "Document ID is required for get action",
            "MISSING_DOCUMENT_ID",
            400,
            req.headers.get('origin') || undefined
          );
        }
        result = await getDocument(supabase, user.id, documentId);
        break;

      case 'delete':
        if (!documentId) {
          return Middleware.createErrorResponse(
            "Document ID is required for delete action",
            "MISSING_DOCUMENT_ID",
            400,
            req.headers.get('origin') || undefined
          );
        }
        result = await deleteDocument(supabase, user.id, documentId);
        break;

      case 'search':
        if (!query) {
          return Middleware.createErrorResponse(
            "Query is required for search action",
            "MISSING_QUERY",
            400,
            req.headers.get('origin') || undefined
          );
        }
        result = await searchDocuments(supabase, user.id, query, limit, offset);
        break;

      default:
        return Middleware.createErrorResponse(
          "Invalid action. Supported actions: list, get, delete, search",
          "INVALID_ACTION",
          400,
          req.headers.get('origin') || undefined
        );
    }

    return Middleware.createSuccessResponse({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    }, req.headers.get('origin') || undefined);

  } catch (error) {
    console.error("Error in document-manager function:", error);
    
    return Middleware.createErrorResponse(
      "An error occurred while processing the document management request",
      "PROCESSING_ERROR",
      500,
      req.headers.get('origin') || undefined
    );
  }
});

async function listUserDocuments(supabase: any, userId: string, limit: number, offset: number) {
  const { data: documents, error, count } = await supabase
    .from('documents')
    .select(`
      id,
      filename,
      file_type,
      file_size,
      word_count,
      complexity,
      readability_score,
      jargon_density,
      technical_terms,
      created_at,
      updated_at
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }

  // Get chunk counts for each document
  const documentIds = documents?.map(doc => doc.id) || [];
  let chunkCounts: Record<string, number> = {};

  if (documentIds.length > 0) {
    const { data: chunks, error: chunkError } = await supabase
      .from('document_chunks')
      .select('document_id')
      .in('document_id', documentIds);

    if (!chunkError && chunks) {
      chunkCounts = chunks.reduce((acc: Record<string, number>, chunk: any) => {
        acc[chunk.document_id] = (acc[chunk.document_id] || 0) + 1;
        return acc;
      }, {});
    }
  }

  // Add chunk counts to documents
  const documentsWithChunks = documents?.map(doc => ({
    ...doc,
    chunk_count: chunkCounts[doc.id] || 0
  })) || [];

  return {
    documents: documentsWithChunks,
    total: count || 0,
    limit,
    offset
  };
}

async function getDocument(supabase: any, userId: string, documentId: string) {
  const { data: document, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .eq('id', documentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Document not found');
    }
    throw new Error(`Failed to fetch document: ${error.message}`);
  }

  // Get associated chunks
  const { data: chunks, error: chunkError } = await supabase
    .from('document_chunks')
    .select(`
      id,
      chunk_text,
      chunk_index,
      metadata,
      created_at
    `)
    .eq('document_id', documentId)
    .order('chunk_index');

  if (chunkError) {
    console.warn('Failed to fetch document chunks:', chunkError);
  }

  return {
    document,
    chunks: chunks || [],
    chunk_count: chunks?.length || 0
  };
}

async function deleteDocument(supabase: any, userId: string, documentId: string) {
  // First verify the document belongs to the user
  const { data: document, error: fetchError } = await supabase
    .from('documents')
    .select('id, filename')
    .eq('user_id', userId)
    .eq('id', documentId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      throw new Error('Document not found');
    }
    throw new Error(`Failed to verify document ownership: ${fetchError.message}`);
  }

  // Delete document chunks first (due to foreign key constraint)
  const { error: chunkError } = await supabase
    .from('document_chunks')
    .delete()
    .eq('document_id', documentId);

  if (chunkError) {
    throw new Error(`Failed to delete document chunks: ${chunkError.message}`);
  }

  // Delete the document
  const { error: docError } = await supabase
    .from('documents')
    .delete()
    .eq('user_id', userId)
    .eq('id', documentId);

  if (docError) {
    throw new Error(`Failed to delete document: ${docError.message}`);
  }

  return {
    message: `Document "${document.filename}" deleted successfully`,
    documentId,
    filename: document.filename
  };
}

async function searchDocuments(supabase: any, userId: string, query: string, limit: number, offset: number) {
  // Search in both document content and filenames
  const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
  
  if (searchTerms.length === 0) {
    return {
      documents: [],
      total: 0,
      query,
      limit,
      offset
    };
  }

  // Build search conditions
  const filenameConditions = searchTerms.map(term => `filename.ilike.%${term}%`);
  const contentConditions = searchTerms.map(term => `content.ilike.%${term}%`);
  const allConditions = [...filenameConditions, ...contentConditions];

  const { data: documents, error, count } = await supabase
    .from('documents')
    .select(`
      id,
      filename,
      file_type,
      file_size,
      word_count,
      complexity,
      readability_score,
      jargon_density,
      technical_terms,
      created_at,
      updated_at
    `, { count: 'exact' })
    .eq('user_id', userId)
    .or(allConditions.join(','))
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Search failed: ${error.message}`);
  }

  return {
    documents: documents || [],
    total: count || 0,
    query,
    limit,
    offset
  };
}