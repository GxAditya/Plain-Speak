/*
  # Create Documents and Document Chunks Tables for RAG System

  1. New Tables
    - `documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `filename` (text)
      - `file_size` (bigint)
      - `file_type` (text)
      - `content` (text, full document content)
      - `word_count` (integer)
      - `complexity` (text)
      - `readability_score` (integer)
      - `jargon_density` (real)
      - `technical_terms` (text array)
      - `processing_time` (integer)
      - `extraction_method` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `document_chunks`
      - `id` (uuid, primary key)
      - `document_id` (uuid, foreign key to documents)
      - `chunk_text` (text)
      - `chunk_index` (integer)
      - `embedding` (vector, for similarity search)
      - `metadata` (jsonb, for additional chunk information)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to access their own documents
    - Add policies for document chunks based on document ownership

  3. Indexes
    - Add vector similarity search index on embeddings
    - Add indexes for efficient querying
*/

-- Enable the pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  content text NOT NULL,
  word_count integer NOT NULL DEFAULT 0,
  complexity text CHECK (complexity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  readability_score integer DEFAULT 0,
  jargon_density real DEFAULT 0.0,
  technical_terms text[] DEFAULT '{}',
  processing_time integer DEFAULT 0,
  extraction_method text DEFAULT 'unknown',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create document_chunks table with vector embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  chunk_text text NOT NULL,
  chunk_index integer NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Create policies for documents table
CREATE POLICY "Users can read own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for document_chunks table
CREATE POLICY "Users can read chunks of own documents"
  ON document_chunks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_chunks.document_id 
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chunks for own documents"
  ON document_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_chunks.document_id 
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update chunks of own documents"
  ON document_chunks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_chunks.document_id 
      AND documents.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_chunks.document_id 
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete chunks of own documents"
  ON document_chunks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_chunks.document_id 
      AND documents.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_complexity ON documents(complexity);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index ON document_chunks(chunk_index);

-- Create vector similarity search index
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();