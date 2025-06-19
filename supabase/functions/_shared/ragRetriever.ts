/**
 * RAG Retrieval Utility
 * Handles vector similarity search and context retrieval for AI queries using Gemini embeddings
 */

import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

interface RetrievalResult {
  chunks: Array<{
    id: string;
    text: string;
    similarity: number;
    metadata: any;
    document: {
      id: string;
      filename: string;
      complexity: string;
    };
  }>;
  totalChunks: number;
  maxSimilarity: number;
  avgSimilarity: number;
}

export class RAGRetriever {
  private supabase: any;
  private geminiApiKey: string;
  private genAI: any;

  constructor(supabaseUrl: string, supabaseServiceKey: string, geminiApiKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.geminiApiKey = geminiApiKey;
    this.genAI = new GoogleGenerativeAI(geminiApiKey);
  }

  /**
   * Generate embedding for a query using Gemini
   */
  async generateQueryEmbedding(query: string): Promise<number[] | null> {
    try {
      const embeddingModel = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await embeddingModel.embedContent(query);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating query embedding with Gemini:', error);
      return null;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Retrieve relevant document chunks using vector similarity search
   */
  async retrieveRelevantChunks(
    userId: string,
    query: string,
    documentId?: string,
    limit: number = 5,
    similarityThreshold: number = 0.7
  ): Promise<RetrievalResult> {
    // Generate embedding for the query
    const queryEmbedding = await this.generateQueryEmbedding(query);
    
    if (!queryEmbedding) {
      // Fallback to text-based search if embedding generation fails
      return this.fallbackTextSearch(userId, query, documentId, limit);
    }

    try {
      // Build the query
      let dbQuery = this.supabase
        .from('document_chunks')
        .select(`
          id,
          chunk_text,
          chunk_index,
          metadata,
          embedding,
          documents!inner (
            id,
            filename,
            complexity,
            user_id
          )
        `)
        .eq('documents.user_id', userId);

      // Filter by specific document if provided
      if (documentId) {
        dbQuery = dbQuery.eq('document_id', documentId);
      }

      // Only get chunks that have embeddings
      dbQuery = dbQuery
        .not('embedding', 'is', null)
        .limit(limit * 3); // Get more results to filter by similarity

      const { data: chunks, error } = await dbQuery;

      if (error) {
        console.error('Error retrieving chunks:', error);
        return this.fallbackTextSearch(userId, query, documentId, limit);
      }

      if (!chunks || chunks.length === 0) {
        return {
          chunks: [],
          totalChunks: 0,
          maxSimilarity: 0,
          avgSimilarity: 0
        };
      }

      // Calculate similarities using cosine similarity
      const chunksWithSimilarity = chunks
        .map(chunk => {
          const similarity = chunk.embedding 
            ? this.calculateCosineSimilarity(queryEmbedding, chunk.embedding)
            : this.calculateTextSimilarity(query, chunk.chunk_text);
          
          return {
            id: chunk.id,
            text: chunk.chunk_text,
            similarity,
            metadata: chunk.metadata,
            document: {
              id: chunk.documents.id,
              filename: chunk.documents.filename,
              complexity: chunk.documents.complexity
            }
          };
        })
        .filter(chunk => chunk.similarity >= similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      const similarities = chunksWithSimilarity.map(c => c.similarity);
      
      return {
        chunks: chunksWithSimilarity,
        totalChunks: chunksWithSimilarity.length,
        maxSimilarity: similarities.length > 0 ? Math.max(...similarities) : 0,
        avgSimilarity: similarities.length > 0 ? similarities.reduce((a, b) => a + b, 0) / similarities.length : 0
      };

    } catch (error) {
      console.error('Error in vector search:', error);
      return this.fallbackTextSearch(userId, query, documentId, limit);
    }
  }

  /**
   * Fallback text-based search when vector search is not available
   */
  private async fallbackTextSearch(
    userId: string,
    query: string,
    documentId?: string,
    limit: number = 5
  ): Promise<RetrievalResult> {
    try {
      let dbQuery = this.supabase
        .from('document_chunks')
        .select(`
          id,
          chunk_text,
          chunk_index,
          metadata,
          documents!inner (
            id,
            filename,
            complexity,
            user_id
          )
        `)
        .eq('documents.user_id', userId);

      // Filter by specific document if provided
      if (documentId) {
        dbQuery = dbQuery.eq('document_id', documentId);
      }

      // Use text search
      const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
      
      if (queryTerms.length > 0) {
        // Use ilike for partial text matching
        const searchConditions = queryTerms.map(term => `chunk_text.ilike.%${term}%`);
        dbQuery = dbQuery.or(searchConditions.join(','));
      }

      dbQuery = dbQuery.limit(limit * 3); // Get more results for better filtering

      const { data: chunks, error } = await dbQuery;

      if (error) {
        console.error('Error in fallback text search:', error);
        return {
          chunks: [],
          totalChunks: 0,
          maxSimilarity: 0,
          avgSimilarity: 0
        };
      }

      if (!chunks || chunks.length === 0) {
        return {
          chunks: [],
          totalChunks: 0,
          maxSimilarity: 0,
          avgSimilarity: 0
        };
      }

      // Calculate text similarity and rank results
      const chunksWithSimilarity = chunks
        .map(chunk => {
          const similarity = this.calculateTextSimilarity(query, chunk.chunk_text);
          return {
            id: chunk.id,
            text: chunk.chunk_text,
            similarity,
            metadata: chunk.metadata,
            document: {
              id: chunk.documents.id,
              filename: chunk.documents.filename,
              complexity: chunk.documents.complexity
            }
          };
        })
        .filter(chunk => chunk.similarity > 0.1) // Basic threshold
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      const similarities = chunksWithSimilarity.map(c => c.similarity);

      return {
        chunks: chunksWithSimilarity,
        totalChunks: chunksWithSimilarity.length,
        maxSimilarity: similarities.length > 0 ? Math.max(...similarities) : 0,
        avgSimilarity: similarities.length > 0 ? similarities.reduce((a, b) => a + b, 0) / similarities.length : 0
      };

    } catch (error) {
      console.error('Error in fallback text search:', error);
      return {
        chunks: [],
        totalChunks: 0,
        maxSimilarity: 0,
        avgSimilarity: 0
      };
    }
  }

  /**
   * Calculate text similarity using simple term frequency
   */
  private calculateTextSimilarity(query: string, text: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    const textLower = text.toLowerCase();
    
    if (queryTerms.length === 0) return 0;
    
    let matches = 0;
    let totalScore = 0;
    
    for (const term of queryTerms) {
      if (textLower.includes(term)) {
        matches++;
        // Give higher score for exact word matches
        const wordBoundaryRegex = new RegExp(`\\b${term}\\b`, 'gi');
        const exactMatches = (textLower.match(wordBoundaryRegex) || []).length;
        totalScore += exactMatches > 0 ? 1 : 0.5;
      }
    }
    
    // Normalize score
    const similarity = totalScore / queryTerms.length;
    
    // Boost score if query appears as a phrase
    if (textLower.includes(query.toLowerCase())) {
      return Math.min(similarity + 0.3, 1.0);
    }
    
    return similarity;
  }

  /**
   * Get document information for a user
   */
  async getUserDocuments(userId: string): Promise<any[]> {
    try {
      const { data: documents, error } = await this.supabase
        .from('documents')
        .select(`
          id,
          filename,
          file_type,
          word_count,
          complexity,
          created_at,
          technical_terms
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user documents:', error);
        return [];
      }

      return documents || [];
    } catch (error) {
      console.error('Error in getUserDocuments:', error);
      return [];
    }
  }

  /**
   * Format retrieved chunks for AI prompt
   */
  formatChunksForPrompt(chunks: RetrievalResult['chunks']): string {
    if (chunks.length === 0) {
      return '';
    }

    const formattedChunks = chunks.map((chunk, index) => {
      const source = chunk.document.filename;
      return `[Source ${index + 1}: ${source}]\n${chunk.text}\n`;
    }).join('\n---\n\n');

    return `\n\nRelevant Document Context:\n${formattedChunks}`;
  }
}