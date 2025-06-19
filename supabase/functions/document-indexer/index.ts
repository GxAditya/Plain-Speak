/*
# Document Indexer Edge Function

This function processes uploaded documents and creates vector embeddings for RAG.
It chunks the document content and stores embeddings in the database for similarity search.

## Features
- Document content chunking with overlap
- Vector embedding generation using Google Gemini
- Intelligent chunk boundary detection
- Metadata extraction and storage
- Progress tracking and error handling

## Usage
POST /functions/v1/document-indexer
Body: {
  "documentContent": "string",
  "documentMetadata": {
    "fileName": "string",
    "fileSize": number,
    "fileType": "string",
    "wordCount": number,
    "complexity": "string",
    "readabilityScore": number,
    "jargonDensity": number,
    "technicalTerms": string[],
    "processingTime": number,
    "extractionMethod": "string"
  }
}
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { Middleware } from "../_shared/middleware.ts";

interface DocumentMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  wordCount: number;
  complexity: string;
  readabilityScore: number;
  jargonDensity: number;
  technicalTerms: string[];
  processingTime: number;
  extractionMethod: string;
}

interface RequestPayload {
  documentContent: string;
  documentMetadata: DocumentMetadata;
}

interface DocumentChunk {
  text: string;
  index: number;
  metadata: {
    startChar: number;
    endChar: number;
    wordCount: number;
    hasHeading: boolean;
    section?: string;
  };
}

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return Middleware.handleCORS(req.headers.get('origin') || undefined);
    }

    if (req.method !== "POST") {
      return Middleware.createErrorResponse(
        "Method not allowed",
        "METHOD_NOT_ALLOWED",
        405,
        req.headers.get('origin') || undefined
      );
    }

    // Process request through middleware
    const middlewareResult = await Middleware.processRequest(req, {
      functionName: 'document-indexer'
    });

    if (!middlewareResult.allowed) {
      return middlewareResult.response!;
    }

    const { documentContent, documentMetadata } = middlewareResult.sanitizedBody! as RequestPayload;

    // Validate required fields
    if (!documentContent || !documentMetadata) {
      return Middleware.createErrorResponse(
        "Document content and metadata are required",
        "MISSING_REQUIRED_FIELDS",
        400,
        req.headers.get('origin') || undefined
      );
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

    // Store document in database
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        filename: documentMetadata.fileName,
        file_size: documentMetadata.fileSize,
        file_type: documentMetadata.fileType,
        content: documentContent,
        word_count: documentMetadata.wordCount,
        complexity: documentMetadata.complexity,
        readability_score: documentMetadata.readabilityScore,
        jargon_density: documentMetadata.jargonDensity,
        technical_terms: documentMetadata.technicalTerms,
        processing_time: documentMetadata.processingTime,
        extraction_method: documentMetadata.extractionMethod
      })
      .select()
      .single();

    if (docError) {
      console.error('Error storing document:', docError);
      return Middleware.createErrorResponse(
        "Failed to store document",
        "STORAGE_ERROR",
        500,
        req.headers.get('origin') || undefined
      );
    }

    // Chunk the document content
    const chunks = chunkDocument(documentContent);
    console.log(`Created ${chunks.length} chunks for document ${document.id}`);

    // Generate embeddings for chunks using Gemini
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.warn('Gemini API key not found, skipping embedding generation');
      
      // Store chunks without embeddings
      const chunkInserts = chunks.map(chunk => ({
        document_id: document.id,
        chunk_text: chunk.text,
        chunk_index: chunk.index,
        metadata: chunk.metadata
      }));

      const { error: chunkError } = await supabase
        .from('document_chunks')
        .insert(chunkInserts);

      if (chunkError) {
        console.error('Error storing chunks:', chunkError);
        return Middleware.createErrorResponse(
          "Failed to store document chunks",
          "CHUNK_STORAGE_ERROR",
          500,
          req.headers.get('origin') || undefined
        );
      }

      return Middleware.createSuccessResponse({
        documentId: document.id,
        chunksCreated: chunks.length,
        embeddingsGenerated: false,
        message: "Document indexed successfully (without embeddings)"
      }, req.headers.get('origin') || undefined);
    }

    // Initialize Gemini AI for embeddings
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

    // Generate embeddings using Gemini
    const embeddingPromises = chunks.map(async (chunk) => {
      try {
        const result = await embeddingModel.embedContent(chunk.text);
        const embedding = result.embedding;
        
        return {
          ...chunk,
          embedding: embedding.values
        };
      } catch (error) {
        console.error(`Error generating embedding for chunk ${chunk.index}:`, error);
        return {
          ...chunk,
          embedding: null
        };
      }
    });

    const chunksWithEmbeddings = await Promise.all(embeddingPromises);
    
    // Store chunks with embeddings in database
    const chunkInserts = chunksWithEmbeddings.map(chunk => ({
      document_id: document.id,
      chunk_text: chunk.text,
      chunk_index: chunk.index,
      embedding: chunk.embedding,
      metadata: chunk.metadata
    }));

    const { error: chunkError } = await supabase
      .from('document_chunks')
      .insert(chunkInserts);

    if (chunkError) {
      console.error('Error storing chunks:', chunkError);
      return Middleware.createErrorResponse(
        "Failed to store document chunks",
        "CHUNK_STORAGE_ERROR",
        500,
        req.headers.get('origin') || undefined
      );
    }

    const successfulEmbeddings = chunksWithEmbeddings.filter(c => c.embedding !== null).length;

    return Middleware.createSuccessResponse({
      documentId: document.id,
      chunksCreated: chunks.length,
      embeddingsGenerated: successfulEmbeddings,
      embeddingSuccess: successfulEmbeddings === chunks.length,
      message: "Document indexed successfully with Gemini embeddings"
    }, req.headers.get('origin') || undefined);

  } catch (error) {
    console.error("Error in document-indexer function:", error);
    
    return Middleware.createErrorResponse(
      "An error occurred while indexing the document",
      "INDEXING_ERROR",
      500,
      req.headers.get('origin') || undefined
    );
  }
});

/**
 * Chunk document content into smaller, semantically meaningful pieces
 */
function chunkDocument(content: string): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const maxChunkSize = 1000; // characters
  const overlapSize = 200; // characters
  
  // Split content into paragraphs first
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let chunkIndex = 0;
  let currentStartChar = 0;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    
    // Check if adding this paragraph would exceed chunk size
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      // Create chunk from current content
      const chunk = createChunk(currentChunk, chunkIndex, currentStartChar, content);
      chunks.push(chunk);
      
      // Start new chunk with overlap
      const overlapText = getOverlapText(currentChunk, overlapSize);
      currentChunk = overlapText + '\n\n' + paragraph;
      currentStartChar = content.indexOf(currentChunk.replace(overlapText + '\n\n', ''));
      chunkIndex++;
    } else {
      // Add paragraph to current chunk
      if (currentChunk.length > 0) {
        currentChunk += '\n\n' + paragraph;
      } else {
        currentChunk = paragraph;
        currentStartChar = content.indexOf(paragraph);
      }
    }
  }
  
  // Add final chunk if there's remaining content
  if (currentChunk.trim().length > 0) {
    const chunk = createChunk(currentChunk, chunkIndex, currentStartChar, content);
    chunks.push(chunk);
  }
  
  return chunks;
}

/**
 * Create a document chunk with metadata
 */
function createChunk(text: string, index: number, startChar: number, fullContent: string): DocumentChunk {
  const trimmedText = text.trim();
  const endChar = startChar + trimmedText.length;
  const wordCount = trimmedText.split(/\s+/).length;
  
  // Check if chunk starts with a heading (simple heuristic)
  const hasHeading = /^[A-Z][^.!?]*$/.test(trimmedText.split('\n')[0]);
  
  // Try to identify section from headings
  const lines = trimmedText.split('\n');
  const firstLine = lines[0];
  const section = hasHeading ? firstLine : undefined;
  
  return {
    text: trimmedText,
    index,
    metadata: {
      startChar,
      endChar,
      wordCount,
      hasHeading,
      section
    }
  };
}

/**
 * Get overlap text from the end of current chunk
 */
function getOverlapText(text: string, overlapSize: number): string {
  if (text.length <= overlapSize) {
    return text;
  }
  
  // Try to break at sentence boundary
  const overlap = text.slice(-overlapSize);
  const sentenceEnd = overlap.lastIndexOf('.');
  
  if (sentenceEnd > overlapSize / 2) {
    return text.slice(-(overlapSize - sentenceEnd + 1));
  }
  
  return overlap;
}