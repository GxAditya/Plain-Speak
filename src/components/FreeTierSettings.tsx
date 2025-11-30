/**
 * Free Tier Settings Component
 * Allows free tier users to manage their Gemini API key and view usage limits
 */

import React, { useState } from 'react';
import { 
  Key, 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  Loader2,
  Info,
  ExternalLink,
  Clock,
  Zap
} from 'lucide-react';
import { useFreeTier } from '../hooks/useFreeTier';
import { LoadingSpinner } from './LoadingSpinner';

interface FreeTierSettingsProps {
  className?: string;
}

export function FreeTierSettings({ className = '' }: FreeTierSettingsProps) {
  const { 
    freeTierInfo, 
    loading, 
    error, 
    updateGeminiKey, 
    refreshTierInfo 
  } = useFreeTier();
  
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const handleUpdateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setUpdateError('Please enter a valid API key');
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    try {
      const success = await updateGeminiKey(apiKey.trim());
      
      if (success) {
        setUpdateSuccess(true);
        setApiKey('');
        setTimeout(() => setUpdateSuccess(false), 5000);
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update API key');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRefresh = async () => {
    await refreshTierInfo();
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6 ${className}`}>
        <LoadingSpinner size="md" text="Loading tier information..." />
      </div>
    );
  }

  if (!freeTierInfo) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-bolt-gray-100 p-6 ${className}`}>
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <p className="text-bolt-gray-600">Unable to load tier information</p>
          <button
            onClick={handleRefresh}
            className="mt-3 px-4 py-2 text-bolt-blue-600 hover:text-bolt-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Only show for free tier users
  if (freeTierInfo.tier !== 'free') {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-bolt-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-bolt-gray-500 mb-1">Uploads Remaining</p>
              <p className="text-2xl font-semibold text-bolt-gray-900">{freeTierInfo.uploadsRemaining}</p>
            </div>
            <Upload className="h-4 w-4 text-bolt-gray-400" />
          </div>
        </div>
        
        <div className="bg-white border border-bolt-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-bolt-gray-500 mb-1">Used Today</p>
              <p className="text-2xl font-semibold text-bolt-gray-900">{freeTierInfo.dailyUploadsCount}</p>
            </div>
            <Clock className="h-4 w-4 text-bolt-gray-400" />
          </div>
        </div>
        
        <div className="bg-white border border-bolt-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-bolt-gray-500 mb-1">API Key Status</p>
              <p className="text-2xl font-semibold text-bolt-gray-900">{freeTierInfo.hasGeminiKey ? '✓' : '✗'}</p>
            </div>
            <Key className="h-4 w-4 text-bolt-gray-400" />
          </div>
        </div>
      </div>

      {/* API Key Management */}
      <div className="bg-white border border-bolt-gray-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-bolt-gray-900">Gemini API Key</h4>
          {freeTierInfo.hasGeminiKey && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-3.5 w-3.5" />
              Active
            </span>
          )}
        </div>

        {!freeTierInfo.hasGeminiKey && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-900 font-medium">API Key Required</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Add your Gemini API key to use PlainSpeak on the free tier.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleUpdateKey} className="space-y-3">
          <div className="relative">
            <input
              id="apiKey"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-2.5 pr-12 text-sm border border-bolt-gray-300 rounded-lg focus:ring-2 focus:ring-bolt-gray-900 focus:border-transparent outline-none transition-all"
              disabled={isUpdating}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-bolt-gray-400 hover:text-bolt-gray-600"
              disabled={isUpdating}
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {updateError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800">{updateError}</span>
            </div>
          )}

          {updateSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">API key updated successfully!</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isUpdating || !apiKey.trim()}
            className="w-full bg-bolt-gray-900 hover:bg-bolt-gray-800 disabled:bg-bolt-gray-400 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Key className="h-4 w-4" />
            )}
            <span>{isUpdating ? 'Updating...' : freeTierInfo.hasGeminiKey ? 'Update Key' : 'Save Key'}</span>
          </button>
        </form>
      </div>

      {/* Information */}
      <div className="space-y-3">
        <div className="p-4 bg-bolt-gray-50 border border-bolt-gray-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-bolt-gray-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h5 className="text-sm font-medium text-bolt-gray-900 mb-2">How to get a Gemini API Key:</h5>
              <ol className="text-sm text-bolt-gray-700 space-y-1 list-decimal list-inside">
                <li>Visit Google AI Studio</li>
                <li>Sign in with your Google account</li>
                <li>Create a new API key</li>
                <li>Copy and paste it above</li>
              </ol>
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-bolt-gray-900 hover:text-bolt-gray-700 text-sm mt-2 font-medium"
              >
                <span>Get API Key</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="p-4 bg-bolt-gray-50 border border-bolt-gray-200 rounded-lg">
          <h5 className="text-sm font-medium text-bolt-gray-900 mb-2">Free Tier Limits:</h5>
          <ul className="text-sm text-bolt-gray-700 space-y-1">
            <li>• 3 document uploads per day</li>
            <li>• Requires your own Gemini API key</li>
            <li>• Chat history is not saved</li>
            <li>• Access to all 9 AI tools</li>
            <li>• Resets daily at midnight UTC</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      )}
    </div>
  );
}