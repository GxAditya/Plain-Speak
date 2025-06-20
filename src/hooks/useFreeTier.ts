/**
 * Free Tier Management Hook
 * Handles free tier functionality including API key management and upload limits
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

interface FreeTierInfo {
  tier: 'free' | 'pro' | 'enterprise';
  hasGeminiKey: boolean;
  dailyUploadsCount: number;
  maxDailyUploads: number;
  uploadsRemaining: number;
  lastUploadDate: string | null;
  historySaved: boolean;
  requiresOwnKey: boolean;
}

interface UploadLimitCheck {
  allowed: boolean;
  uploadsRemaining?: number;
  maxUploads?: number;
  error?: string;
  requiresKey?: boolean;
  limitExceeded?: boolean;
  resetTime?: string;
  unlimited?: boolean;
}

interface UseFreeTierReturn {
  freeTierInfo: FreeTierInfo | null;
  loading: boolean;
  error: string | null;
  checkUploadLimit: () => Promise<UploadLimitCheck>;
  updateGeminiKey: (apiKey: string) => Promise<boolean>;
  refreshTierInfo: () => Promise<void>;
  canUpload: boolean;
  canSaveHistory: boolean;
}

export function useFreeTier(): UseFreeTierReturn {
  const [freeTierInfo, setFreeTierInfo] = useState<FreeTierInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTierInfo = useCallback(async () => {
    try {
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setFreeTierInfo(null);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/get-tier-info`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'get_tier_info' })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch tier info');
      }

      const tierData = result.result;
      setFreeTierInfo({
        tier: tierData.tier,
        hasGeminiKey: tierData.has_gemini_key,
        dailyUploadsCount: tierData.daily_uploads_count || 0,
        maxDailyUploads: tierData.max_daily_uploads || (tierData.tier === 'free' ? 3 : -1),
        uploadsRemaining: tierData.tier === 'free' ? 
          Math.max(0, (tierData.max_daily_uploads || 3) - (tierData.daily_uploads_count || 0)) : -1,
        lastUploadDate: tierData.last_upload_date,
        historySaved: tierData.history_saved,
        requiresOwnKey: tierData.requires_own_key
      });

    } catch (err) {
      console.error('Error fetching tier info:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tier information');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkUploadLimit = useCallback(async (): Promise<UploadLimitCheck> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { allowed: false, error: 'Authentication required' };
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/check-upload-limit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'check_limit' })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        return { allowed: false, error: result.error || 'Failed to check upload limit' };
      }

      return result.result;

    } catch (err) {
      console.error('Error checking upload limit:', err);
      return { 
        allowed: false, 
        error: err instanceof Error ? err.message : 'Failed to check upload limit' 
      };
    }
  }, []);

  const updateGeminiKey = useCallback(async (apiKey: string): Promise<boolean> => {
    try {
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/update-profile-key`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ geminiApiKey: apiKey })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update API key');
      }

      // Refresh tier info after successful key update
      await fetchTierInfo();
      
      return true;

    } catch (err) {
      console.error('Error updating Gemini key:', err);
      setError(err instanceof Error ? err.message : 'Failed to update API key');
      return false;
    }
  }, [fetchTierInfo]);

  const refreshTierInfo = useCallback(async () => {
    setLoading(true);
    await fetchTierInfo();
  }, [fetchTierInfo]);

  useEffect(() => {
    fetchTierInfo();
  }, [fetchTierInfo]);

  const canUpload = freeTierInfo ? 
    (freeTierInfo.tier !== 'free' || (freeTierInfo.hasGeminiKey && freeTierInfo.uploadsRemaining > 0)) : 
    false;

  const canSaveHistory = freeTierInfo ? freeTierInfo.historySaved : false;

  return {
    freeTierInfo,
    loading,
    error,
    checkUploadLimit,
    updateGeminiKey,
    refreshTierInfo,
    canUpload,
    canSaveHistory
  };
}