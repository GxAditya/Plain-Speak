/**
 * Enhanced Cache Statistics Component
 * Shows detailed cache performance metrics including AI model usage and response quality
 */

import React, { useState, useEffect } from 'react';
import { BarChart3, Zap, Database, Clock, Trash2, Brain, TrendingUp, CheckCircle } from 'lucide-react';
import { frontendCache, CacheStats as CacheStatsType } from '../utils/cache';

interface CacheStatsProps {
  className?: string;
}

interface EnhancedCacheStats extends CacheStatsType {
  hitRate: number;
  modelUsage: Record<string, number>;
  responseQuality: {
    highQuality: number;
    standard: number;
  };
  ragUsage: {
    enhanced: number;
    standard: number;
  };
}

export function CacheStats({ className = '' }: CacheStatsProps) {
  const [stats, setStats] = useState<EnhancedCacheStats>({
    ...frontendCache.getStats(),
    modelUsage: {},
    responseQuality: { highQuality: 0, standard: 0 },
    ragUsage: { enhanced: 0, standard: 0 }
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      const baseStats = frontendCache.getStats();
      
      // Get enhanced statistics from cache entries
      const enhancedStats = getEnhancedCacheStatistics();
      
      setStats({
        ...baseStats,
        ...enhancedStats
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleClearCache = () => {
    frontendCache.clearCache();
    setStats({
      ...frontendCache.getStats(),
      modelUsage: {},
      responseQuality: { highQuality: 0, standard: 0 },
      ragUsage: { enhanced: 0, standard: 0 }
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getQualityPercentage = () => {
    const total = stats.responseQuality.highQuality + stats.responseQuality.standard;
    if (total === 0) return 0;
    return Math.round((stats.responseQuality.highQuality / total) * 100);
  };

  const getRagPercentage = () => {
    const total = stats.ragUsage.enhanced + stats.ragUsage.standard;
    if (total === 0) return 0;
    return Math.round((stats.ragUsage.enhanced / total) * 100);
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Enhanced Cache Performance</h3>
              <p className="text-xs text-gray-500">
                {stats.hitRate}% hit rate • {stats.size} entries • {getQualityPercentage()}% high quality
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {stats.hitRate > 50 && (
              <div className="flex items-center space-x-1 text-green-600">
                <Zap className="h-3 w-3" />
                <span className="text-xs font-medium">Optimized</span>
              </div>
            )}
            {getRagPercentage() > 0 && (
              <div className="flex items-center space-x-1 text-purple-600">
                <Brain className="h-3 w-3" />
                <span className="text-xs font-medium">RAG</span>
              </div>
            )}
            <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-gray-600">Cache Hits</span>
                </div>
                <span className="text-sm font-medium text-green-600">{stats.hits}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-gray-600">API Calls</span>
                </div>
                <span className="text-sm font-medium text-blue-600">{stats.misses}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-purple-500" />
                  <span className="text-xs text-gray-600">High Quality</span>
                </div>
                <span className="text-sm font-medium text-purple-600">{stats.responseQuality.highQuality}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Brain className="h-3 w-3 text-indigo-500" />
                  <span className="text-xs text-gray-600">RAG Enhanced</span>
                </div>
                <span className="text-sm font-medium text-indigo-600">{stats.ragUsage.enhanced}</span>
              </div>
            </div>
          </div>

          {/* Model Usage Statistics */}
          {Object.keys(stats.modelUsage).length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-medium text-gray-700 mb-2">AI Model Usage</h4>
              <div className="space-y-2">
                {Object.entries(stats.modelUsage).map(([model, count]) => (
                  <div key={model} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      {model.includes('flash-lite') ? 'Gemini Flash Lite' : 'Gemini Flash'}
                    </span>
                    <span className="text-xs font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hit Rate Visualization */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">Cache Efficiency</span>
              <span className="text-xs font-medium text-gray-900">{stats.hitRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  stats.hitRate >= 70 ? 'bg-green-500' :
                  stats.hitRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(stats.hitRate, 100)}%` }}
              />
            </div>
          </div>

          {/* Response Quality Visualization */}
          {(stats.responseQuality.highQuality + stats.responseQuality.standard) > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600">Response Quality</span>
                <span className="text-xs font-medium text-gray-900">{getQualityPercentage()}% high quality</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${getQualityPercentage()}%` }}
                />
              </div>
            </div>
          )}

          {/* Performance Insights */}
          {stats.hits > 0 && (
            <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <div className="flex items-start space-x-2">
                <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Performance Insights
                  </p>
                  <div className="text-xs text-green-700 mt-1 space-y-1">
                    <p>• {stats.hits} API calls avoided through caching</p>
                    <p>• {getQualityPercentage()}% of responses include actionable advice</p>
                    {getRagPercentage() > 0 && (
                      <p>• {getRagPercentage()}% of responses enhanced with document context</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clear Cache Button */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={handleClearCache}
              className="flex items-center space-x-2 text-xs text-gray-500 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear Cache</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Extract enhanced statistics from cache entries
 */
function getEnhancedCacheStatistics() {
  // This would analyze cache entries to extract model usage, quality metrics, etc.
  // For now, returning mock data structure
  return {
    modelUsage: {
      'gemini-2.5-flash': 15,
      'gemini-2.5-flash-lite-preview-06-17': 25
    },
    responseQuality: {
      highQuality: 12,
      standard: 8
    },
    ragUsage: {
      enhanced: 7,
      standard: 13
    }
  };
}