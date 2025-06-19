/*
  # Add RAG functionality to existing document system

  1. New Features
    - Enable pgvector extension for embeddings
    - Update document_chunks table to use Gemini embedding dimensions (768)
    - Add vector similarity search index
    - Add helper function for document chunking

  2. Changes
    - Modify existing document_chunks.embedding column to use vector(768)
    - Add vector similarity search index optimized for Gemini embeddings
    - Add utility functions for RAG operations
*/

-- Enable the pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Check if document_chunks table exists and update embedding column
DO $$
BEGIN
  -- Update embedding column to use Gemini's 768-dimensional vectors
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_chunks' AND column_name = 'embedding'
  ) THEN
    -- Drop existing vector index if it exists
    DROP INDEX IF EXISTS idx_document_chunks_embedding;
    
    -- Update the embedding column to use 768 dimensions (Gemini)
    ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(768);
  END IF;
END $$;

-- Create vector similarity search index optimized for Gemini embeddings
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add helper function for vector similarity search
CREATE OR REPLACE FUNCTION search_document_chunks(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_text text,
  chunk_index integer,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.document_id,
    dc.chunk_text,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.metadata
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE 
    dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    AND (filter_user_id IS NULL OR d.user_id = filter_user_id)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add function to get document context for RAG
CREATE OR REPLACE FUNCTION get_document_context(
  doc_id uuid,
  query_text text DEFAULT NULL,
  max_chunks int DEFAULT 5
)
RETURNS TABLE (
  chunk_text text,
  chunk_index integer,
  relevance_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF query_text IS NULL THEN
    -- Return first few chunks if no query provided
    RETURN QUERY
    SELECT 
      dc.chunk_text,
      dc.chunk_index,
      1.0 as relevance_score
    FROM document_chunks dc
    WHERE dc.document_id = doc_id
    ORDER BY dc.chunk_index
    LIMIT max_chunks;
  ELSE
    -- Return chunks ranked by text similarity (basic implementation)
    RETURN QUERY
    SELECT 
      dc.chunk_text,
      dc.chunk_index,
      CASE 
        WHEN dc.chunk_text ILIKE '%' || query_text || '%' THEN 1.0
        ELSE 0.5
      END as relevance_score
    FROM document_chunks dc
    WHERE dc.document_id = doc_id
    ORDER BY 
      CASE 
        WHEN dc.chunk_text ILIKE '%' || query_text || '%' THEN 1.0
        ELSE 0.5
      END DESC,
      dc.chunk_index
    LIMIT max_chunks;
  END IF;
END;
$$;

-- Add function to calculate document statistics
CREATE OR REPLACE FUNCTION calculate_document_stats(doc_id uuid)
RETURNS TABLE (
  total_chunks integer,
  avg_chunk_length float,
  has_embeddings boolean,
  embedding_coverage float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::integer as total_chunks,
    AVG(LENGTH(chunk_text))::float as avg_chunk_length,
    COUNT(embedding) > 0 as has_embeddings,
    (COUNT(embedding)::float / COUNT(*)::float * 100) as embedding_coverage
  FROM document_chunks
  WHERE document_id = doc_id;
END;
$$;

-- Create index for faster text-based searches (fallback when embeddings not available)
CREATE INDEX IF NOT EXISTS idx_document_chunks_text_search 
ON document_chunks 
USING gin(to_tsvector('english', chunk_text));

-- Add metadata index for filtering
CREATE INDEX IF NOT EXISTS idx_document_chunks_metadata 
ON document_chunks 
USING gin(metadata);

-- Add composite index for user-specific searches
CREATE INDEX IF NOT EXISTS idx_documents_user_created 
ON documents(user_id, created_at DESC);