/**
 * History List Component
 * Displays paginated user interaction history with filtering and search
 */

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  Calendar,
  Clock,
  Brain,
  Zap,
  FileText,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { useHistory } from '../hooks/useHistory';

interface HistoryListProps {
  user: any;
  onBack: () => void;
  onBackToDashboard: () => void;
}

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

export function HistoryList({ user, onBack, onBackToDashboard }: HistoryListProps) {
  const { getHistory, deleteInteraction, isLoading, error } = useHistory();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toolFilter, setToolFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const itemsPerPage = 10;

  useEffect(() => {
    loadHistory();
  }, [currentPage, toolFilter]);

  const loadHistory = async () => {
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const result = await getHistory({
        limit: itemsPerPage,
        offset,
        toolFilter: toolFilter || undefined
      });
      
      setHistory(result.history);
      setTotal(result.total);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleSearch = async () => {
    setCurrentPage(1);
    await loadHistory();
  };

  const handleDelete = async (entryId: string) => {
    try {
      await deleteInteraction(entryId);
      setDeleteConfirm(null);
      await loadHistory(); // Reload the current page
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
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

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'standard': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getComplexityColor = (complexity: number) => {
    if (complexity >= 7) return 'text-red-600 bg-red-100';
    if (complexity >= 4) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-bolt-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="font-medium">Back to Dashboard</span>
              </button>
              
              <div className="h-6 w-px bg-bolt-gray-300"></div>
              
              <button
                onClick={onBackToDashboard}
                className="text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors text-sm"
              >
                Tools
              </button>
            </div>
            
            <div>
              <h1 className="text-xl font-bold text-bolt-gray-900">Interaction History</h1>
              <p className="text-sm text-bolt-gray-500">{total} total interactions</p>
            </div>

            <div className="w-32"></div> {/* Spacer for balance */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-bolt-gray-400" />
                <input
                  type="text"
                  placeholder="Search your interactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-bolt-gray-300 rounded-lg focus:ring-2 focus:ring-bolt-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 border border-bolt-gray-300 rounded-lg hover:bg-bolt-gray-50 transition-colors"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-bolt-blue-600 text-white rounded-lg hover:bg-bolt-blue-700 transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-bolt-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-bolt-gray-700 mb-2">Tool</label>
                  <select
                    value={toolFilter}
                    onChange={(e) => setToolFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-bolt-gray-300 rounded-lg focus:ring-2 focus:ring-bolt-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">All Tools</option>
                    <option value="legalese">Legalese Decoder</option>
                    <option value="medispeak">MediSpeak</option>
                    <option value="finfriend">FinFriend</option>
                    <option value="buildbot">BuildBot</option>
                    <option value="edusimplify">EduSimplify</option>
                    <option value="homelingo">HomeLingo</option>
                    <option value="techtalk">TechTalk</option>
                    <option value="adanalyst">AdAnalyst</option>
                    <option value="policypal">PolicyPal</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* History List */}
        <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-bolt-blue-600 mx-auto mb-4" />
                <p className="text-bolt-gray-600">Loading your history...</p>
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto mb-4 text-bolt-gray-300" />
              <h3 className="text-lg font-medium text-bolt-gray-900 mb-2">No interactions yet</h3>
              <p className="text-bolt-gray-600">Start using PlainSpeak tools to see your history here!</p>
            </div>
          ) : (
            <div className="divide-y divide-bolt-gray-200">
              {history.map((entry) => (
                <div key={entry.id} className="p-6 hover:bg-bolt-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-bolt-blue-100 text-bolt-blue-800">
                          {entry.tool_name}
                        </span>
                        
                        {entry.has_document && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <FileText className="h-3 w-3 mr-1" />
                            Document
                          </span>
                        )}
                        
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getComplexityColor(entry.query_complexity)}`}>
                          Complexity: {entry.query_complexity}
                        </span>
                        
                        {entry.model_used.includes('flash-lite') ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Zap className="h-3 w-3 mr-1" />
                            Fast
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <Brain className="h-3 w-3 mr-1" />
                            Deep
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-sm font-medium text-bolt-gray-900 mb-1">
                        {entry.query_preview}
                      </h3>
                      
                      <p className="text-sm text-bolt-gray-600 mb-3">
                        {entry.response_preview}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-bolt-gray-500">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(entry.created_at)}</span>
                        </span>
                        
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{entry.processing_time}ms</span>
                        </span>
                        
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getQualityColor(entry.response_quality)}`}>
                          {entry.response_quality} quality
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => setSelectedEntry(entry)}
                        className="p-2 text-bolt-gray-400 hover:text-bolt-blue-600 transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => setDeleteConfirm(entry.id)}
                        className="p-2 text-bolt-gray-400 hover:text-red-600 transition-colors"
                        title="Delete interaction"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-bolt-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} results
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-bolt-gray-300 rounded-lg text-sm font-medium text-bolt-gray-700 hover:bg-bolt-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <span className="px-3 py-2 text-sm font-medium text-bolt-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-bolt-gray-300 rounded-lg text-sm font-medium text-bolt-gray-700 hover:bg-bolt-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-bolt-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-bolt-gray-900">Interaction Details</h2>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-bolt-gray-400 hover:text-bolt-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-bolt-gray-900 mb-2">Query</h3>
                  <div className="p-4 bg-bolt-gray-50 rounded-lg">
                    <p className="text-sm text-bolt-gray-700 whitespace-pre-wrap">{selectedEntry.query_text}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-bolt-gray-900 mb-2">Response</h3>
                  <div className="p-4 bg-bolt-gray-50 rounded-lg">
                    <p className="text-sm text-bolt-gray-700 whitespace-pre-wrap">{selectedEntry.response_text}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-bolt-gray-900 mb-2">Metadata</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-bolt-gray-600">Tool:</span>
                        <span className="font-medium">{selectedEntry.tool_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bolt-gray-600">Model:</span>
                        <span className="font-medium">{selectedEntry.model_used}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bolt-gray-600">Complexity:</span>
                        <span className="font-medium">{selectedEntry.query_complexity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bolt-gray-600">Quality:</span>
                        <span className="font-medium">{selectedEntry.response_quality}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bolt-gray-600">Processing Time:</span>
                        <span className="font-medium">{selectedEntry.processing_time}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bolt-gray-600">Date:</span>
                        <span className="font-medium">{formatDate(selectedEntry.created_at)}</span>
                      </div>
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
            <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Delete Interaction</h3>
            <p className="text-bolt-gray-600 mb-6">
              Are you sure you want to delete this interaction? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-bolt-gray-300 rounded-lg text-bolt-gray-700 hover:bg-bolt-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
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