/**
 * Document Management Component
 * Allows non-free tier users to view, search, and delete their uploaded documents
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Trash2, 
  Eye, 
  Download,
  Filter,
  RefreshCw,
  AlertCircle,
  Loader2,
  Calendar,
  Hash,
  BarChart3,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle
} from 'lucide-react';
import { useDocumentManagement } from '../hooks/useDocumentManagement';
import { LoadingSpinner } from './LoadingSpinner';

interface DocumentManagementProps {
  onBack: () => void;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

export function DocumentManagement({ onBack, onError, onSuccess }: DocumentManagementProps) {
  const { 
    documents, 
    loading, 
    error, 
    total, 
    loadDocuments, 
    deleteDocument, 
    searchDocuments, 
    refreshDocuments 
  } = useDocumentManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'created_at' | 'filename' | 'file_size'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [complexityFilter, setComplexityFilter] = useState('');

  const itemsPerPage = 10;

  useEffect(() => {
    loadDocuments({ limit: itemsPerPage, offset: 0 });
  }, [loadDocuments]);

  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      await searchDocuments(searchTerm.trim());
      setCurrentPage(1);
    } else {
      await loadDocuments({ limit: itemsPerPage, offset: 0 });
      setCurrentPage(1);
    }
  };

  const handleDelete = async (documentId: string, filename: string) => {
    try {
      await deleteDocument(documentId);
      setDeleteConfirm(null);
      onSuccess?.(`Document "${filename}" deleted successfully`);
    } catch (err) {
      onError?.('Failed to delete document');
    }
  };

  const handlePageChange = async (newPage: number) => {
    const offset = (newPage - 1) * itemsPerPage;
    await loadDocuments({ limit: itemsPerPage, offset });
    setCurrentPage(newPage);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('text')) return '📃';
    return '📄';
  };

  const filteredAndSortedDocuments = documents
    .filter(doc => {
      if (complexityFilter && doc.complexity !== complexityFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];
      
      if (sortBy === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-bolt-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="font-medium">Back to Dashboard</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-bolt-blue-600 to-bolt-blue-700 rounded-xl">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-bolt-gray-900">Document Management</h1>
                <p className="text-sm text-bolt-gray-500">{total} documents total</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={refreshDocuments}
                disabled={loading}
                className="flex items-center space-x-2 px-3 py-2 text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-bolt-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents by filename or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-bolt-gray-300 rounded-lg focus:ring-2 focus:ring-bolt-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={complexityFilter}
                onChange={(e) => setComplexityFilter(e.target.value)}
                className="px-3 py-2 border border-bolt-gray-300 rounded-lg focus:ring-2 focus:ring-bolt-blue-500 focus:border-transparent outline-none"
              >
                <option value="">All Complexity</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as any);
                  setSortOrder(order as any);
                }}
                className="px-3 py-2 border border-bolt-gray-300 rounded-lg focus:ring-2 focus:ring-bolt-blue-500 focus:border-transparent outline-none"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="filename-asc">Name A-Z</option>
                <option value="filename-desc">Name Z-A</option>
                <option value="file_size-desc">Largest First</option>
                <option value="file_size-asc">Smallest First</option>
              </select>
              
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-bolt-blue-600 text-white rounded-lg hover:bg-bolt-blue-700 transition-colors"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" text="Loading documents..." />
            </div>
          ) : filteredAndSortedDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-bolt-gray-300" />
              <h3 className="text-lg font-medium text-bolt-gray-900 mb-2">
                {searchTerm ? 'No documents found' : 'No documents yet'}
              </h3>
              <p className="text-bolt-gray-600">
                {searchTerm 
                  ? 'Try adjusting your search terms or filters'
                  : 'Upload your first document to get started'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-bolt-gray-200">
                {filteredAndSortedDocuments.map((document) => (
                  <div key={document.id} className="p-6 hover:bg-bolt-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start space-x-4 flex-1 min-w-0">
                        <div className="text-2xl">{getFileTypeIcon(document.file_type)}</div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-bolt-gray-900 truncate">
                              {document.filename}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getComplexityColor(document.complexity)}`}>
                              {document.complexity}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-bolt-gray-600">
                            <div className="flex items-center space-x-1">
                              <Hash className="h-3 w-3" />
                              <span>{document.word_count.toLocaleString()} words</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <BarChart3 className="h-3 w-3" />
                              <span>Score: {document.readability_score}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(document.created_at)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>{formatFileSize(document.file_size)}</span>
                            </div>
                          </div>
                          
                          {document.technical_terms && document.technical_terms.length > 0 && (
                            <div className="mt-2">
                              <div className="flex flex-wrap gap-1">
                                {document.technical_terms.slice(0, 5).map((term, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-bolt-blue-100 text-bolt-blue-800 text-xs rounded-md"
                                  >
                                    {term}
                                  </span>
                                ))}
                                {document.technical_terms.length > 5 && (
                                  <span className="px-2 py-1 bg-bolt-gray-100 text-bolt-gray-600 text-xs rounded-md">
                                    +{document.technical_terms.length - 5} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedDocument(document);
                            setShowDetailModal(true);
                          }}
                          className="p-2 text-bolt-gray-400 hover:text-bolt-blue-600 transition-colors"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => setDeleteConfirm(document.id)}
                          className="p-2 text-bolt-gray-400 hover:text-red-600 transition-colors"
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-bolt-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-bolt-gray-700">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} documents
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1 || loading}
                        className="px-3 py-2 border border-bolt-gray-300 rounded-lg text-sm font-medium text-bolt-gray-700 hover:bg-bolt-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      <span className="px-3 py-2 text-sm font-medium text-bolt-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>
                      
                      <button
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages || loading}
                        className="px-3 py-2 border border-bolt-gray-300 rounded-lg text-sm font-medium text-bolt-gray-700 hover:bg-bolt-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Document Detail Modal */}
      {showDetailModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-bolt-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-bolt-gray-900">Document Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-bolt-gray-400 hover:text-bolt-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">File Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-bolt-gray-600">Filename:</span>
                        <span className="font-medium text-bolt-gray-900">{selectedDocument.filename}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bolt-gray-600">File Type:</span>
                        <span className="font-medium text-bolt-gray-900">{selectedDocument.file_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bolt-gray-600">File Size:</span>
                        <span className="font-medium text-bolt-gray-900">{formatFileSize(selectedDocument.file_size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bolt-gray-600">Uploaded:</span>
                        <span className="font-medium text-bolt-gray-900">{formatDate(selectedDocument.created_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bolt-gray-600">Chunks:</span>
                        <span className="font-medium text-bolt-gray-900">{selectedDocument.chunk_count}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Content Analysis</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-bolt-gray-600">Word Count:</span>
                        <span className="font-medium text-bolt-gray-900">{selectedDocument.word_count.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bolt-gray-600">Complexity:</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getComplexityColor(selectedDocument.complexity)}`}>
                          {selectedDocument.complexity}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bolt-gray-600">Readability Score:</span>
                        <span className="font-medium text-bolt-gray-900">{selectedDocument.readability_score}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bolt-gray-600">Jargon Density:</span>
                        <span className="font-medium text-bolt-gray-900">{(selectedDocument.jargon_density * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {selectedDocument.technical_terms && selectedDocument.technical_terms.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Technical Terms</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedDocument.technical_terms.map((term: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-bolt-blue-100 text-bolt-blue-800 text-sm rounded-md"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Actions</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => setDeleteConfirm(selectedDocument.id)}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Document</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-bolt-gray-900">Delete Document</h3>
            </div>
            
            <p className="text-bolt-gray-600 mb-6">
              Are you sure you want to delete this document? This action cannot be undone and will also remove all associated document chunks.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-bolt-gray-300 rounded-lg text-bolt-gray-700 hover:bg-bolt-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const doc = documents.find(d => d.id === deleteConfirm);
                  if (doc) {
                    handleDelete(deleteConfirm, doc.filename);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}