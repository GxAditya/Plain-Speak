/**
 * Enhanced User Dashboard Component
 * Main dashboard view showing user statistics and navigation to history
 * Now includes document management for non-free tier users
 */

import React, { useState, useEffect } from 'react';
import { 
  User, 
  BarChart3, 
  Clock, 
  FileText, 
  TrendingUp, 
  Calendar,
  Download,
  Settings,
  ChevronRight,
  Loader2,
  AlertCircle,
  Sparkles,
  Brain,
  Zap,
  Key,
  Upload,
  FolderOpen
} from 'lucide-react';
import { useHistory } from '../hooks/useHistory';
import { useFreeTier } from '../hooks/useFreeTier';
import { HistoryList } from './HistoryList';
import { FreeTierSettings } from './FreeTierSettings';
import { DocumentManagement } from './DocumentManagement';

interface UserDashboardProps {
  user: any;
  onBack: () => void;
  onError?: (error: string) => void;
}

export function UserDashboard({ user, onBack, onError }: UserDashboardProps) {
  const { getUserStats, exportData, isLoading, error } = useHistory();
  const { freeTierInfo, loading: tierLoading } = useFreeTier();
  const [stats, setStats] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDocumentManagement, setShowDocumentManagement] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const userStats = await getUserStats();
      setStats(userStats);
    } catch (err) {
      console.error('Failed to load user stats:', err);
      onError?.('Failed to load dashboard statistics');
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await exportData();
      
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plainspeak-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data:', err);
      onError?.('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (showHistory) {
    return (
      <HistoryList 
        user={user} 
        onBack={() => setShowHistory(false)} 
        onBackToDashboard={onBack}
      />
    );
  }

  if (showSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bolt-gray-50 to-white">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={() => setShowSettings(false)}
                className="flex items-center space-x-2 text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors"
              >
                <ChevronRight className="h-5 w-5 rotate-180" />
                <span className="font-medium">Back to Dashboard</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-bolt-blue-600 to-bolt-blue-700 rounded-xl">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-bolt-gray-900">Settings</h1>
                  <p className="text-sm text-bolt-gray-500">{user.email}</p>
                </div>
              </div>

              <div className="w-32"></div> {/* Spacer for balance */}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <FreeTierSettings />
        </div>
      </div>
    );
  }

  if (showDocumentManagement) {
    return (
      <DocumentManagement 
        onBack={() => setShowDocumentManagement(false)}
        onError={onError}
        onSuccess={(message) => {
          // You can add a success notification here if needed
          console.log('Document management success:', message);
        }}
      />
    );
  }

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
              <ChevronRight className="h-5 w-5 rotate-180" />
              <span className="font-medium">Back to Tools</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-bolt-blue-600 to-bolt-blue-700 rounded-xl">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-bolt-gray-900">Dashboard</h1>
                <p className="text-sm text-bolt-gray-500">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleExportData}
                disabled={isExporting}
                className="flex items-center space-x-2 px-4 py-2 text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Export Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Free Tier Status Banner */}
        {freeTierInfo?.tier === 'free' && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-bolt-gray-900">Free Tier Account</h3>
                  <p className="text-bolt-gray-600">
                    {freeTierInfo.uploadsRemaining} uploads remaining today • 
                    {freeTierInfo.hasGeminiKey ? ' API key configured' : ' API key required'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Key className="h-4 w-4" />
                  <span>Manage API Key</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading && !stats ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-bolt-blue-600 mx-auto mb-4" />
              <p className="text-bolt-gray-600">Loading your dashboard...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-bolt-gray-600">Total Interactions</p>
                    <p className="text-2xl font-bold text-bolt-gray-900">
                      {stats?.overview.totalInteractions || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-bolt-gray-600">Tools Used</p>
                    <p className="text-2xl font-bold text-bolt-gray-900">
                      {stats?.overview.toolsUsed || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Sparkles className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-bolt-gray-600">Documents</p>
                    <p className="text-2xl font-bold text-bolt-gray-900">
                      {stats?.overview.documentsUploaded || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-bolt-gray-600">
                      {freeTierInfo?.tier === 'free' ? 'Today\'s Uploads' : 'Avg Complexity'}
                    </p>
                    <p className="text-2xl font-bold text-bolt-gray-900">
                      {freeTierInfo?.tier === 'free' ? 
                        freeTierInfo.dailyUploadsCount : 
                        stats?.overview.avgQueryComplexity?.toFixed(1) || '0.0'
                      }
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    {freeTierInfo?.tier === 'free' ? (
                      <Upload className="h-6 w-6 text-orange-600" />
                    ) : (
                      <Brain className="h-6 w-6 text-orange-600" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Tool Usage */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-bolt-gray-900">Tool Usage</h3>
                    <TrendingUp className="h-5 w-5 text-bolt-gray-400" />
                  </div>
                  
                  {stats?.toolUsage && stats.toolUsage.length > 0 ? (
                    <div className="space-y-4">
                      {stats.toolUsage.slice(0, 5).map((tool: any, index: number) => (
                        <div key={tool.toolId} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium ${
                              index === 0 ? 'bg-blue-500' :
                              index === 1 ? 'bg-green-500' :
                              index === 2 ? 'bg-purple-500' :
                              index === 3 ? 'bg-orange-500' : 'bg-gray-500'
                            }`}>
                              {index + 1}
                            </div>
                            <span className="font-medium text-bolt-gray-900">{tool.toolName}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-24 bg-bolt-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  index === 0 ? 'bg-blue-500' :
                                  index === 1 ? 'bg-green-500' :
                                  index === 2 ? 'bg-purple-500' :
                                  index === 3 ? 'bg-orange-500' : 'bg-gray-500'
                                }`}
                                style={{ 
                                  width: `${Math.max((tool.count / (stats.toolUsage[0]?.count || 1)) * 100, 10)}%` 
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium text-bolt-gray-600 w-8 text-right">
                              {tool.count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-bolt-gray-500">
                      <BarChart3 className="h-12 w-12 mx-auto mb-3 text-bolt-gray-300" />
                      <p>No tool usage data yet</p>
                      <p className="text-sm">Start using PlainSpeak tools to see your usage patterns!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats & Actions */}
              <div className="space-y-6">
                {/* Account Info */}
                <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Account Info</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-bolt-gray-600">Plan</span>
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                        freeTierInfo?.tier === 'free' ? 'bg-blue-100 text-blue-800' :
                        freeTierInfo?.tier === 'pro' ? 'bg-purple-100 text-purple-800' :
                        'bg-gold-100 text-gold-800'
                      }`}>
                        {freeTierInfo?.tier?.charAt(0).toUpperCase() + freeTierInfo?.tier?.slice(1) || 'Free'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-bolt-gray-600">Most Used Tool</span>
                      <span className="text-sm font-medium text-bolt-gray-900">
                        {stats?.overview.mostUsedTool || 'None'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-bolt-gray-600">Last Activity</span>
                      <span className="text-sm font-medium text-bolt-gray-900">
                        {formatDate(stats?.overview.lastActivity)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-bolt-gray-600">Member Since</span>
                      <span className="text-sm font-medium text-bolt-gray-900">
                        {formatDate(user.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    {freeTierInfo?.historySaved !== false && (
                      <button
                        onClick={() => setShowHistory(true)}
                        className="w-full flex items-center justify-between p-3 text-left bg-bolt-gray-50 hover:bg-bolt-gray-100 rounded-lg transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Clock className="h-4 w-4 text-bolt-gray-600" />
                          <span className="text-sm font-medium text-bolt-gray-900">View History</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-bolt-gray-400" />
                      </button>
                    )}
                    
                    {/* Document Management - Only for non-free tier users */}
                    {freeTierInfo?.tier !== 'free' && (
                      <button
                        onClick={() => setShowDocumentManagement(true)}
                        className="w-full flex items-center justify-between p-3 text-left bg-bolt-gray-50 hover:bg-bolt-gray-100 rounded-lg transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <FolderOpen className="h-4 w-4 text-bolt-gray-600" />
                          <span className="text-sm font-medium text-bolt-gray-900">Manage Documents</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-bolt-gray-400" />
                      </button>
                    )}
                    
                    {freeTierInfo?.tier === 'free' && (
                      <button
                        onClick={() => setShowSettings(true)}
                        className="w-full flex items-center justify-between p-3 text-left bg-bolt-gray-50 hover:bg-bolt-gray-100 rounded-lg transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Key className="h-4 w-4 text-bolt-gray-600" />
                          <span className="text-sm font-medium text-bolt-gray-900">API Key Settings</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-bolt-gray-400" />
                      </button>
                    )}
                    
                    <button
                      onClick={handleExportData}
                      disabled={isExporting}
                      className="w-full flex items-center justify-between p-3 text-left bg-bolt-gray-50 hover:bg-bolt-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center space-x-3">
                        {isExporting ? (
                          <Loader2 className="h-4 w-4 text-bolt-gray-600 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 text-bolt-gray-600" />
                        )}
                        <span className="text-sm font-medium text-bolt-gray-900">Export Data</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-bolt-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Free Tier Notice */}
                {freeTierInfo?.tier === 'free' && (
                  <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Free Tier Notice</h3>
                    <div className="space-y-3 text-sm text-bolt-gray-600">
                      <p>• Chat history is not saved on the free tier</p>
                      <p>• 3 document uploads per day</p>
                      <p>• Requires your own Gemini API key</p>
                      <p>• All AI tools available</p>
                      <p>• Document management not available</p>
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                {stats?.recentActivity && stats.recentActivity.length > 0 && freeTierInfo?.historySaved !== false && (
                  <div className="bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-bolt-gray-900 mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      {stats.recentActivity.slice(0, 5).map((activity: any, index: number) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-bolt-blue-500 rounded-full"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-bolt-gray-900 truncate">{activity.toolName}</p>
                            <p className="text-xs text-bolt-gray-500">
                              {formatDate(activity.date)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}