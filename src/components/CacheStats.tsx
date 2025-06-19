/**
 * Cache Statistics Component
 * Shows cache performance metrics to users
 */

import React, { useState, useEffect } from 'react';
import { BarChart3, Zap, Database, Clock, Trash2 } from 'lucide-react';
import { frontendCache, CacheStats as CacheStatsType } from '../utils/cache';

interface CacheStatsProps {
  className?: string;
}

export function CacheStats({ className = '' }: CacheStatsProps) {
  const [stats, setStats] = useState<CacheStatsType & { hitRate: number }>(
    frontendCache.getStats()
  );
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(frontendCache.getStats());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleClearCache = () => {
    frontendCache.clearCache();
    setStats(frontendCache.getStats());
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
              <h3 className="text-sm font-medium text-gray-900">Cache Performance</h3>
              <p className="text-xs text-gray-500">
                {stats.hitRate}% hit rate • {stats.size} entries
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
                  <Database className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-600">Entries</span>
                </div>
                <span className="text-sm font-medium text-gray-600">{stats.size}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-600">Last Cleanup</span>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {formatTime(stats.lastCleanup)}
                </span>
              </div>
            </div>
          </div>

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

          {/* Cost Savings Estimate */}
          {stats.hits > 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Estimated API Cost Savings
                  </p>
                  <p className="text-xs text-green-700">
                    ~{stats.hits} API calls avoided • Faster responses
                  </p>
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