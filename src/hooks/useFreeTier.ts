/**
 * Free Tier Management Hook - Supabase removed
 * Replace with your backend implementation.
 */

import { useState, useEffect, useCallback } from 'react';

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
      // Stub - replace with real backend call
      setFreeTierInfo({
        tier: 'free',
        hasGeminiKey: false,
        dailyUploadsCount: 0,
        maxDailyUploads: 3,
        uploadsRemaining: 3,
        lastUploadDate: null,
        historySaved: true,
        requiresOwnKey: false
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tier information');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkUploadLimit = useCallback(async (): Promise<UploadLimitCheck> => {
    // Stub - replace with real backend call
    return { allowed: true, unlimited: true };
  }, []);

  const updateGeminiKey = useCallback(async (_apiKey: string): Promise<boolean> => {
    console.warn('updateGeminiKey is a stub. Replace with real implementation.');
    return true;
  }, []);

  const refreshTierInfo = useCallback(async () => {
    setLoading(true);
    await fetchTierInfo();
  }, [fetchTierInfo]);

  useEffect(() => {
    fetchTierInfo();
  }, [fetchTierInfo]);

  const canUpload = freeTierInfo
    ? freeTierInfo.tier !== 'free' || (freeTierInfo.hasGeminiKey && freeTierInfo.uploadsRemaining > 0)
    : true; // default to true for stub

  const canSaveHistory = freeTierInfo ? freeTierInfo.historySaved : true;

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