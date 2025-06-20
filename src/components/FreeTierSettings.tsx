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
    <div className={`bg-white rounded-xl shadow-sm border border-bolt-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-bolt-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-bolt-gray-900">Free Tier Settings</h3>
              <p className="text-sm text-bolt-gray-600">Manage your API key and view usage limits</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
            Free Plan
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Usage Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-bolt-gray-50 rounded-lg">
            <Upload className="h-6 w-6 text-bolt-gray-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-bolt-gray-900">
              {freeTierInfo.uploadsRemaining}
            </p>
            <p className="text-sm text-bolt-gray-600">Uploads Remaining Today</p>
          </div>
          
          <div className="text-center p-4 bg-bolt-gray-50 rounded-lg">
            <Clock className="h-6 w-6 text-bolt-gray-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-bolt-gray-900">
              {freeTierInfo.dailyUploadsCount}
            </p>
            <p className="text-sm text-bolt-gray-600">Used Today</p>
          </div>
          
          <div className="text-center p-4 bg-bolt-gray-50 rounded-lg">
            <Key className="h-6 w-6 text-bolt-gray-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-bolt-gray-900">
              {freeTierInfo.hasGeminiKey ? '✓' : '✗'}
            </p>
            <p className="text-sm text-bolt-gray-600">API Key Status</p>
          </div>
        </div>

        {/* API Key Management */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-bolt-gray-900">Gemini API Key</h4>
            {freeTierInfo.hasGeminiKey && (
              <span className="flex items-center space-x-1 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span>Key Configured</span>
              </span>
            )}
          </div>

          {!freeTierInfo.hasGeminiKey && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-yellow-800 font-medium">API Key Required</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    You need to provide your own Gemini API key to use PlainSpeak on the free tier.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleUpdateKey} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-bolt-gray-700 mb-2">
                {freeTierInfo.hasGeminiKey ? 'Update API Key' : 'Enter Your Gemini API Key'}
              </label>
              <div className="relative">
                <input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-4 py-3 pr-12 border border-bolt-gray-300 rounded-lg focus:ring-2 focus:ring-bolt-blue-500 focus:border-transparent outline-none transition-all"
                  disabled={isUpdating}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-bolt-gray-400 hover:text-bolt-gray-600"
                  disabled={isUpdating}
                >
                  {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {updateError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-800 text-sm">{updateError}</span>
                </div>
              </div>
            )}

            {updateSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-800 text-sm">API key updated successfully!</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isUpdating || !apiKey.trim()}
              className="w-full bg-bolt-blue-600 hover:bg-bolt-blue-700 disabled:bg-bolt-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
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
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h5 className="font-medium text-blue-900 mb-2">How to get a Gemini API Key:</h5>
                <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
                  <li>Visit Google AI Studio</li>
                  <li>Sign in with your Google account</li>
                  <li>Create a new API key</li>
                  <li>Copy and paste it above</li>
                </ol>
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm mt-2 font-medium"
                >
                  <span>Get API Key</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="p-4 bg-bolt-gray-50 rounded-lg">
            <h5 className="font-medium text-bolt-gray-900 mb-2">Free Tier Limits:</h5>
            <ul className="text-bolt-gray-700 text-sm space-y-1">
              <li>• 3 document uploads per day</li>
              <li>• Requires your own Gemini API key</li>
              <li>• Chat history is not saved</li>
              <li>• Access to all 9 AI tools</li>
              <li>• Resets daily at midnight UTC</li>
            </ul>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}