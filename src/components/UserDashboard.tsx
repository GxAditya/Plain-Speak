/**
 * User Dashboard Component
 * Professional, clean dashboard following PlainSpeak design system
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Clock, 
  ChevronLeft,
  Loader2,
  AlertCircle,
  Key,
  FolderOpen,
  ArrowRight,
  Download,
  Settings
} from 'lucide-react';
import { useHistory } from '../hooks/useHistory';
import { useFreeTier } from '../hooks/useFreeTier';
import { HistoryList } from './HistoryList';
import { FreeTierSettings } from './FreeTierSettings';
import { DocumentManagement } from './DocumentManagement';
import BadgeTabs, { BadgeTabItem } from './ui/badge-tabs';

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
      <div className="min-h-screen bg-bolt-gray-50">
        <div className="max-w-5xl mx-auto p-6">
          {/* Back Button */}
          <button
            onClick={() => setShowSettings(false)}
            className="flex items-center gap-2 text-sm text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors mb-6"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to dashboard</span>
          </button>

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
        onSuccess={(message) => console.log('Document management success:', message)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-bolt-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to tools</span>
        </button>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {isLoading && !stats ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin text-bolt-gray-400 mx-auto mb-3" />
              <p className="text-sm text-bolt-gray-500">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <BadgeTabs
            items={getBadgeTabItems(stats, freeTierInfo, formatDate, setShowHistory, setShowSettings, setShowDocumentManagement, handleExportData, isExporting, user)}
            defaultValue="actions"
          />
        )}
      </div>
    </div>
  );
}

// Sub-components
function getBadgeTabItems(
  stats: any, 
  freeTierInfo: any, 
  formatDate: (dateString: string | null) => string,
  setShowHistory: (show: boolean) => void,
  setShowSettings: (show: boolean) => void,
  setShowDocumentManagement: (show: boolean) => void,
  handleExportData: () => void,
  isExporting: boolean,
  user: any
): BadgeTabItem[] {
  const recentActivityCount = stats?.recentActivity?.length || 0;

  return [
    {
      value: "overview",
      label: "Overview",
      content: (
        <div className="space-y-4">
          {/* Account Info */}
          <div className="bg-white border border-bolt-gray-200 rounded-lg">
            <div className="p-4 border-b border-bolt-gray-200">
              <h3 className="text-sm font-medium text-bolt-gray-900">Account</h3>
            </div>
            <div className="p-4 space-y-3">
              <InfoRow 
                label="Plan" 
                value={
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    freeTierInfo?.tier === 'free' ? 'bg-bolt-gray-100 text-bolt-gray-700' :
                    freeTierInfo?.tier === 'pro' ? 'bg-bolt-blue-50 text-bolt-blue-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {freeTierInfo?.tier?.charAt(0).toUpperCase() + freeTierInfo?.tier?.slice(1) || 'Free'}
                  </span>
                } 
              />
              <InfoRow label="Most Used" value={stats?.overview.mostUsedTool || '—'} />
              <InfoRow label="Last Active" value={formatDate(stats?.overview.lastActivity)} />
              <InfoRow label="Email" value={user.email} truncate />
            </div>
          </div>

          {/* Free Tier Notice */}
          {freeTierInfo?.tier === 'free' && (
            <div className="bg-bolt-gray-50 border border-bolt-gray-200 rounded-lg p-4">
              <h4 className="text-xs font-medium text-bolt-gray-700 uppercase tracking-wide mb-2">Free Plan Limits</h4>
              <ul className="space-y-1.5 text-xs text-bolt-gray-600">
                <li>• 3 document uploads per day</li>
                <li>• Requires Gemini API key</li>
                <li>• History not saved</li>
                <li>• All tools available</li>
              </ul>
            </div>
          )}
        </div>
      ),
    },
    {
      value: "activity",
      label: "Activity",
      badge: recentActivityCount > 0 ? recentActivityCount : undefined,
      content: (
        <div className="space-y-4">
          {/* Tool Usage */}
          <div className="bg-white border border-bolt-gray-200 rounded-lg">
            <div className="p-4 border-b border-bolt-gray-200">
              <h3 className="text-sm font-medium text-bolt-gray-900">Tool Usage</h3>
            </div>
            
            <div className="p-4">
              {stats?.toolUsage && stats.toolUsage.length > 0 ? (
                <div className="space-y-3">
                  {stats.toolUsage.slice(0, 5).map((tool: any, index: number) => (
                    <div key={tool.toolId} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-mono text-bolt-gray-400">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-bolt-gray-900">{tool.toolName}</span>
                          <span className="text-xs font-mono text-bolt-gray-500">{tool.count}</span>
                        </div>
                        <div className="h-1 bg-bolt-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-bolt-gray-900 rounded-full transition-all"
                            style={{ 
                              width: `${Math.max((tool.count / (stats.toolUsage[0]?.count || 1)) * 100, 5)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-8 w-8 text-bolt-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-bolt-gray-500">No tool usage data yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          {stats?.recentActivity && stats.recentActivity.length > 0 && freeTierInfo?.historySaved !== false && (
            <div className="bg-white border border-bolt-gray-200 rounded-lg">
              <div className="p-4 border-b border-bolt-gray-200">
                <h3 className="text-sm font-medium text-bolt-gray-900">Recent Activity</h3>
              </div>
              <div className="p-2">
                {stats.recentActivity.slice(0, 6).map((activity: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded hover:bg-bolt-gray-50">
                    <div className="w-1.5 h-1.5 bg-bolt-gray-400 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-bolt-gray-900 truncate">{activity.toolName}</p>
                      <p className="text-xs text-bolt-gray-500">{formatDate(activity.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      value: "actions",
      label: "Actions",
      content: (
        <div className="bg-white border border-bolt-gray-200 rounded-lg">
          <div className="p-4 border-b border-bolt-gray-200">
            <h3 className="text-sm font-medium text-bolt-gray-900">Quick Actions</h3>
          </div>
          <div className="p-2">
            {freeTierInfo?.historySaved !== false && (
              <ActionButton 
                icon={Clock} 
                label="View History" 
                onClick={() => setShowHistory(true)} 
              />
            )}
            
            {freeTierInfo?.tier !== 'free' && (
              <ActionButton 
                icon={FolderOpen} 
                label="Manage Documents" 
                onClick={() => setShowDocumentManagement(true)} 
              />
            )}
            
            {freeTierInfo?.tier === 'free' && (
              <ActionButton 
                icon={Key} 
                label="API Key Settings" 
                onClick={() => setShowSettings(true)} 
              />
            )}
            
            <ActionButton 
              icon={Download} 
              label="Export All Data" 
              onClick={handleExportData}
              loading={isExporting}
            />
          </div>
        </div>
      ),
    },
  ];
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function InfoRow({ label, value, truncate }: { label: string; value: React.ReactNode; truncate?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-bolt-gray-500">{label}</span>
      {typeof value === 'string' ? (
        <span className={`text-sm text-bolt-gray-900 ${truncate ? 'truncate max-w-[140px]' : ''}`}>{value}</span>
      ) : value}
    </div>
  );
}

function ActionButton({ 
  icon: Icon, 
  label, 
  onClick, 
  loading 
}: { 
  icon: React.ElementType; 
  label: string; 
  onClick: () => void; 
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-between p-2.5 text-left hover:bg-bolt-gray-50 rounded-md transition-colors disabled:opacity-50"
    >
      <div className="flex items-center gap-2.5">
        {loading ? (
          <Loader2 className="h-4 w-4 text-bolt-gray-400 animate-spin" />
        ) : (
          <Icon className="h-4 w-4 text-bolt-gray-400" />
        )}
        <span className="text-sm text-bolt-gray-700">{label}</span>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-bolt-gray-400" />
    </button>
  );
}