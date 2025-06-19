/**
 * Advanced Document Processing Utilities
 * Handles multiple document formats with intelligent content extraction
 */

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import JSZip from 'jszip';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;

export interface ProcessedDocument {
  content: string;
  metadata: DocumentMetadata;
  structure: DocumentStructure;
  analysis: ContentAnalysis;
}

export interface DocumentMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  pageCount?: number;
  wordCount: number;
  characterCount: number;
  processingTime: number;
  extractionMethod: string;
}

export interface DocumentStructure {
  sections: DocumentSection[];
  headings: string[];
  tables: TableData[];
  lists: ListData[];
  footnotes: string[];
}

export interface DocumentSection {
  title: string;
  content: string;
  level: number;
  wordCount: number;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface ListData {
  type: 'ordered' | 'unordered';
  items: string[];
}

export interface ContentAnalysis {
  complexity: 'low' | 'medium' | 'high';
  jargonDensity: number;
  technicalTerms: string[];
  keyPhrases: string[];
  readabilityScore: number;
  suggestedQuestions: string[];
}

export class DocumentProcessor {
  private static instance: DocumentProcessor;
  
  public static getInstance(): DocumentProcessor {
    if (!DocumentProcessor.instance) {
      DocumentProcessor.instance = new DocumentProcessor();
    }
    return DocumentProcessor.instance;
  }

  /**
   * Process document based on file type
   */
  async processDocument(file: File): Promise<ProcessedDocument> {
    const startTime = Date.now();
    
    try {
      let content: string;
      let extractionMethod: string;
      
      const fileType = this.getFileType(file);
      
      switch (fileType) {
        case 'pdf':
          content = await this.processPDF(file);
          extractionMethod = 'PDF.js extraction';
          break;
        case 'docx':
          content = await this.processDOCX(file);
          extractionMethod = 'Mammoth.js extraction';
          break;
        case 'doc':
          content = await this.processDOC(file);
          extractionMethod = 'Legacy DOC processing';
          break;
        case 'txt':
          content = await this.processTXT(file);
          extractionMethod = 'Plain text reading';
          break;
        case 'rtf':
          content = await this.processRTF(file);
          extractionMethod = 'RTF parsing';
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      const processingTime = Date.now() - startTime;
      
      // Generate metadata
      const metadata: DocumentMetadata = {
        fileName: file.name,
        fileSize: file.size,
        fileType,
        wordCount: this.countWords(content),
        characterCount: content.length,
        processingTime,
        extractionMethod
      };

      // Analyze document structure
      const structure = this.analyzeStructure(content);
      
      // Perform content analysis
      const analysis = this.analyzeContent(content);

      return {
        content,
        metadata,
        structure,
        analysis
      };
    } catch (error) {
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }

  /**
   * Determine file type from file extension and MIME type
   */
  private getFileType(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();

    if (extension === 'pdf' || mimeType.includes('pdf')) return 'pdf';
    if (extension === 'docx' || mimeType.includes('wordprocessingml')) return 'docx';
    if (extension === 'doc' || mimeType.includes('msword')) return 'doc';
    if (extension === 'txt' || mimeType.includes('text/plain')) return 'txt';
    if (extension === 'rtf' || mimeType.includes('rtf')) return 'rtf';
    
    throw new Error('Unsupported file type');
  }

  /**
   * Process PDF files using PDF.js
   */
  private async processPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const numPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
    }

    return this.cleanExtractedText(fullText);
  }

  /**
   * Process DOCX files using Mammoth.js
   */
  private async processDOCX(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (result.messages.length > 0) {
      console.warn('DOCX processing warnings:', result.messages);
    }
    
    return this.cleanExtractedText(result.value);
  }

  /**
   * Process legacy DOC files
   */
  private async processDOC(file: File): Promise<string> {
    // For legacy DOC files, we'll attempt basic text extraction
    // This is a simplified approach - in production, you might want to use a more robust solution
    const text = await file.text();
    return this.cleanExtractedText(text);
  }

  /**
   * Process plain text files
   */
  private async processTXT(file: File): Promise<string> {
    const text = await file.text();
    return this.cleanExtractedText(text);
  }

  /**
   * Process RTF files
   */
  private async processRTF(file: File): Promise<string> {
    const text = await file.text();
    // Basic RTF cleaning - remove RTF control codes
    const cleaned = text
      .replace(/\\[a-z]+\d*\s?/g, '') // Remove RTF control words
      .replace(/[{}]/g, '') // Remove braces
      .replace(/\\\\/g, '\\') // Unescape backslashes
      .trim();
    
    return this.cleanExtractedText(cleaned);
  }

  /**
   * Clean and normalize extracted text
   */
  private cleanExtractedText(text: string): string {
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove excessive line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Clean up special characters
      .replace(/[^\w\s\-.,;:!?()[\]{}'"]/g, ' ')
      // Trim and normalize
      .trim();
  }

  /**
   * Analyze document structure
   */
  private analyzeStructure(content: string): DocumentStructure {
    const lines = content.split('\n').filter(line => line.trim());
    
    // Detect headings (lines that are short and potentially titles)
    const headings = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length < 100 && 
             trimmed.length > 5 && 
             !trimmed.endsWith('.') &&
             /^[A-Z]/.test(trimmed);
    });

    // Detect sections based on headings
    const sections: DocumentSection[] = [];
    let currentSection = '';
    let currentTitle = 'Introduction';
    let level = 1;

    for (const line of lines) {
      if (headings.includes(line)) {
        if (currentSection.trim()) {
          sections.push({
            title: currentTitle,
            content: currentSection.trim(),
            level,
            wordCount: this.countWords(currentSection)
          });
        }
        currentTitle = line.trim();
        currentSection = '';
      } else {
        currentSection += line + '\n';
      }
    }

    // Add final section
    if (currentSection.trim()) {
      sections.push({
        title: currentTitle,
        content: currentSection.trim(),
        level,
        wordCount: this.countWords(currentSection)
      });
    }

    // Detect lists
    const lists = this.detectLists(content);
    
    // Detect tables (basic detection)
    const tables = this.detectTables(content);

    return {
      sections,
      headings,
      tables,
      lists,
      footnotes: [] // Could be enhanced to detect footnotes
    };
  }

  /**
   * Detect lists in content
   */
  private detectLists(content: string): ListData[] {
    const lists: ListData[] = [];
    const lines = content.split('\n');
    
    let currentList: string[] = [];
    let listType: 'ordered' | 'unordered' | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check for bullet points
      if (/^[•\-\*]\s/.test(trimmed)) {
        if (listType !== 'unordered' && currentList.length > 0) {
          lists.push({ type: listType!, items: [...currentList] });
          currentList = [];
        }
        listType = 'unordered';
        currentList.push(trimmed.substring(2).trim());
      }
      // Check for numbered lists
      else if (/^\d+\.\s/.test(trimmed)) {
        if (listType !== 'ordered' && currentList.length > 0) {
          lists.push({ type: listType!, items: [...currentList] });
          currentList = [];
        }
        listType = 'ordered';
        currentList.push(trimmed.replace(/^\d+\.\s/, '').trim());
      }
      // End of list
      else if (currentList.length > 0 && trimmed.length > 0) {
        lists.push({ type: listType!, items: [...currentList] });
        currentList = [];
        listType = null;
      }
    }

    // Add final list if exists
    if (currentList.length > 0 && listType) {
      lists.push({ type: listType, items: currentList });
    }

    return lists;
  }

  /**
   * Detect tables in content (basic implementation)
   */
  private detectTables(content: string): TableData[] {
    const tables: TableData[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for lines with multiple tab-separated or pipe-separated values
      if (line.includes('\t') || line.includes('|')) {
        const separator = line.includes('|') ? '|' : '\t';
        const columns = line.split(separator).map(col => col.trim()).filter(col => col);
        
        if (columns.length >= 2) {
          // This might be a table header
          const headers = columns;
          const rows: string[][] = [];
          
          // Look for subsequent rows
          for (let j = i + 1; j < lines.length && j < i + 10; j++) {
            const nextLine = lines[j].trim();
            if (nextLine.includes(separator)) {
              const rowData = nextLine.split(separator).map(col => col.trim()).filter(col => col);
              if (rowData.length === headers.length) {
                rows.push(rowData);
              }
            } else {
              break;
            }
          }
          
          if (rows.length > 0) {
            tables.push({ headers, rows });
            i += rows.length; // Skip processed rows
          }
        }
      }
    }
    
    return tables;
  }

  /**
   * Analyze content complexity and characteristics
   */
  private analyzeContent(content: string): ContentAnalysis {
    const words = content.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Calculate readability (simplified Flesch Reading Ease)
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = this.estimateSyllables(words);
    const readabilityScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    // Detect technical terms (words longer than 8 characters or containing specific patterns)
    const technicalTerms = words.filter(word => 
      word.length > 8 || 
      /tion$|sion$|ment$|ness$|ity$|ism$|ology$/.test(word)
    ).filter((word, index, arr) => arr.indexOf(word) === index).slice(0, 20);

    // Calculate jargon density
    const jargonDensity = technicalTerms.length / words.length;

    // Determine complexity
    let complexity: 'low' | 'medium' | 'high';
    if (jargonDensity > 0.15 || readabilityScore < 30) {
      complexity = 'high';
    } else if (jargonDensity > 0.08 || readabilityScore < 60) {
      complexity = 'medium';
    } else {
      complexity = 'low';
    }

    // Extract key phrases (simplified approach)
    const keyPhrases = this.extractKeyPhrases(content);

    // Generate suggested questions
    const suggestedQuestions = this.generateSuggestedQuestions(content, technicalTerms);

    return {
      complexity,
      jargonDensity: Math.round(jargonDensity * 1000) / 1000,
      technicalTerms,
      keyPhrases,
      readabilityScore: Math.round(readabilityScore),
      suggestedQuestions
    };
  }

  /**
   * Estimate syllables in words (simplified)
   */
  private estimateSyllables(words: string[]): number {
    const totalSyllables = words.reduce((sum, word) => {
      // Simple syllable estimation
      const vowels = word.match(/[aeiouy]+/g);
      return sum + (vowels ? vowels.length : 1);
    }, 0);
    
    return totalSyllables / words.length;
  }

  /**
   * Extract key phrases from content
   */
  private extractKeyPhrases(content: string): string[] {
    // Simple approach: find repeated phrases of 2-4 words
    const words = content.toLowerCase().split(/\s+/);
    const phrases: { [key: string]: number } = {};
    
    for (let i = 0; i < words.length - 1; i++) {
      for (let len = 2; len <= 4 && i + len <= words.length; len++) {
        const phrase = words.slice(i, i + len).join(' ');
        if (phrase.length > 10 && !/^(the|and|or|but|in|on|at|to|for|of|with|by)/.test(phrase)) {
          phrases[phrase] = (phrases[phrase] || 0) + 1;
        }
      }
    }
    
    return Object.entries(phrases)
      .filter(([_, count]) => count > 1)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 10)
      .map(([phrase, _]) => phrase);
  }

  /**
   * Generate suggested questions based on content
   */
  private generateSuggestedQuestions(content: string, technicalTerms: string[]): string[] {
    const questions: string[] = [];
    
    // Questions about technical terms
    if (technicalTerms.length > 0) {
      questions.push(`What do these technical terms mean: ${technicalTerms.slice(0, 3).join(', ')}?`);
    }
    
    // Questions about document type
    if (content.includes('contract') || content.includes('agreement')) {
      questions.push("What are my obligations under this contract?");
      questions.push("What are the key risks I should be aware of?");
    }
    
    if (content.includes('policy') || content.includes('insurance')) {
      questions.push("What is covered by this policy?");
      questions.push("What are the exclusions I should know about?");
    }
    
    if (content.includes('medical') || content.includes('diagnosis')) {
      questions.push("Can you explain this medical information in simple terms?");
      questions.push("What should I discuss with my doctor?");
    }
    
    // Generic questions
    questions.push("Can you summarize the main points of this document?");
    questions.push("What are the most important things I need to understand?");
    
    return questions.slice(0, 5);
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Get supported file types
   */
  static getSupportedTypes(): string[] {
    return ['pdf', 'docx', 'doc', 'txt', 'rtf'];
  }

  /**
   * Check if file type is supported
   */
  static isSupported(file: File): boolean {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return DocumentProcessor.getSupportedTypes().includes(extension || '');
  }
}

// Export singleton instance
export const documentProcessor = DocumentProcessor.getInstance();