/**
 * Advanced Document Upload Component
 * Handles multiple file formats with progress tracking and detailed analysis
 * Now includes RAG indexing integration
 */

import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  File,
  Eye,
  Brain,
  BarChart3,
  Clock,
  Hash,
  Layers,
  Database,
  Zap
} from 'lucide-react';
import { documentProcessor, ProcessedDocument } from '../utils/documentProcessor';
import { supabase } from '../utils/supabase';

interface DocumentUploadProps {
  onDocumentProcessed: (document: ProcessedDocument) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export function DocumentUpload({ onDocumentProcessed, onError, disabled }: DocumentUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processedDoc, setProcessedDoc] = useState<ProcessedDocument | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [indexingStatus, setIndexingStatus] = useState<{
    isIndexing: boolean;
    chunksCreated: number;
    embeddingsGenerated: number;
    success: boolean;
  } | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    if (disabled) return;
    
    setUploadedFile(file);
    setProcessedDoc(null);
    setIndexingStatus(null);
    setIsProcessing(true);
    setProcessingStage('Validating file...');

    try {
      // Check if file type is supported
      if (!documentProcessor.isSupported(file)) {
        throw new Error(`Unsupported file type. Supported formats: ${documentProcessor.getSupportedTypes().join(', ')}`);
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size too large. Maximum size is 10MB.');
      }

      setProcessingStage('Extracting content...');
      
      // Process the document
      const processed = await documentProcessor.processDocument(file);
      
      setProcessingStage('Analyzing structure...');
      
      // Small delay to show the analysis stage
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProcessedDoc(processed);
      onDocumentProcessed(processed);

      // Start RAG indexing process
      await indexDocumentForRAG(processed);
      
    } catch (error) {
      console.error('Document processing error:', error);
      onError(error instanceof Error ? error.message : 'Failed to process document');
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  const indexDocumentForRAG = async (processed: ProcessedDocument) => {
    setIndexingStatus({
      isIndexing: true,
      chunksCreated: 0,
      embeddingsGenerated: 0,
      success: false
    });

    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn('No active session for RAG indexing');
        setIndexingStatus({
          isIndexing: false,
          chunksCreated: 0,
          embeddingsGenerated: 0,
          success: false
        });
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/document-indexer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentContent: processed.content,
          documentMetadata: {
            fileName: processed.metadata.fileName,
            fileSize: processed.metadata.fileSize,
            fileType: processed.metadata.fileType,
            wordCount: processed.metadata.wordCount,
            complexity: processed.analysis.complexity,
            readabilityScore: processed.analysis.readabilityScore,
            jargonDensity: processed.analysis.jargonDensity,
            technicalTerms: processed.analysis.technicalTerms,
            processingTime: processed.metadata.processingTime,
            extractionMethod: processed.metadata.extractionMethod
          }
        })
      });

      if (!response.ok) {
        throw new Error(`RAG indexing failed: ${response.status}`);
      }

      const result = await response.json();
      
      setIndexingStatus({
        isIndexing: false,
        chunksCreated: result.chunksCreated || 0,
        embeddingsGenerated: result.embeddingsGenerated || 0,
        success: result.embeddingSuccess || false
      });

      console.log('RAG indexing completed:', result);

    } catch (error) {
      console.error('RAG indexing error:', error);
      setIndexingStatus({
        isIndexing: false,
        chunksCreated: 0,
        embeddingsGenerated: 0,
        success: false
      });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : disabled
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          onChange={handleFileInputChange}
          disabled={disabled || isProcessing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          accept=".pdf,.docx,.doc,.txt,.rtf"
        />
        
        <div className="space-y-4">
          {isProcessing ? (
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              <div>
                <p className="text-lg font-medium text-gray-900">Processing Document</p>
                <p className="text-sm text-gray-600">{processingStage}</p>
              </div>
            </div>
          ) : (
            <>
              <Upload className={`h-12 w-12 mx-auto ${
                dragActive ? 'text-blue-600' : 'text-gray-400'
              } transition-colors`} />
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {dragActive ? 'Drop your document here' : 'Upload Document'}
                </p>
                <p className="text-gray-600">
                  Drag & drop or click to browse
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Supports PDF, DOCX, DOC, TXT, RTF • Max 10MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* File Info */}
      {uploadedFile && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {uploadedFile.name}
                </p>
                {processedDoc ? (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : isProcessing ? (
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-gray-500">
                {formatFileSize(uploadedFile.size)} • {uploadedFile.type || 'Unknown type'}
              </p>
              {processedDoc && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Processed in {processedDoc.metadata.processingTime}ms using {processedDoc.metadata.extractionMethod}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RAG Indexing Status */}
      {indexingStatus && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Database className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">RAG Indexing</h4>
                {indexingStatus.isIndexing ? (
                  <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
                ) : indexingStatus.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                )}
              </div>
              
              {indexingStatus.isIndexing ? (
                <p className="text-sm text-gray-600">Creating document chunks and embeddings...</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Chunks created:</span>
                    <span className="font-medium">{indexingStatus.chunksCreated}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Embeddings generated:</span>
                    <span className="font-medium">{indexingStatus.embeddingsGenerated}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    {indexingStatus.success ? (
                      <>
                        <Zap className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">Ready for intelligent search</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-yellow-600">Basic search available</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Analysis */}
      {processedDoc && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Document Analysis</h3>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Hash className="h-4 w-4 text-gray-600 mx-auto mb-1" />
              <p className="text-sm font-medium text-gray-900">
                {processedDoc.metadata.wordCount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-600">Words</p>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Layers className="h-4 w-4 text-gray-600 mx-auto mb-1" />
              <p className="text-sm font-medium text-gray-900">
                {processedDoc.structure.sections.length}
              </p>
              <p className="text-xs text-gray-600">Sections</p>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Brain className="h-4 w-4 text-gray-600 mx-auto mb-1" />
              <p className="text-sm font-medium text-gray-900">
                {processedDoc.analysis.readabilityScore}
              </p>
              <p className="text-xs text-gray-600">Readability</p>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Clock className="h-4 w-4 text-gray-600 mx-auto mb-1" />
              <p className="text-sm font-medium text-gray-900">
                {Math.ceil(processedDoc.metadata.wordCount / 200)}
              </p>
              <p className="text-xs text-gray-600">Min Read</p>
            </div>
          </div>

          {/* Complexity Assessment */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Complexity Assessment</h4>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getComplexityColor(processedDoc.analysis.complexity)}`}>
                {processedDoc.analysis.complexity.charAt(0).toUpperCase() + processedDoc.analysis.complexity.slice(1)} Complexity
              </span>
              <span className="text-sm text-gray-600">
                {(processedDoc.analysis.jargonDensity * 100).toFixed(1)}% technical terms
              </span>
            </div>
          </div>

          {/* Technical Terms Preview */}
          {processedDoc.analysis.technicalTerms.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Technical Terms Detected</h4>
              <div className="flex flex-wrap gap-2">
                {processedDoc.analysis.technicalTerms.slice(0, 8).map((term, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                  >
                    {term}
                  </span>
                ))}
                {processedDoc.analysis.technicalTerms.length > 8 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                    +{processedDoc.analysis.technicalTerms.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Suggested Questions */}
          {processedDoc.analysis.suggestedQuestions.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Suggested Questions</h4>
              <div className="space-y-2">
                {processedDoc.analysis.suggestedQuestions.slice(0, 3).map((question, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-2 p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    <Eye className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800">{question}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}