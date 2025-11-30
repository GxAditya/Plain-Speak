/**
 * Authentication Hook - Supabase removed
 * Manages user authentication state with profile data and role information.
 * Replace with your preferred auth provider implementation.
 */

import { useState, useEffect } from 'react';
import { auth, supabase, User, Session } from '../utils/supabase';

interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'admin';
  full_name?: string;
  avatar_url?: string;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface EnhancedUser extends User {
  profile?: UserProfile;
  isAdmin?: boolean;
}

interface UseAuthReturn {
  user: EnhancedUser | null;
  session: Session | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (mounted) {
          setSession(currentSession);

          if (currentSession?.user) {
            const basicUser: EnhancedUser = {
              ...currentSession.user,
              profile: undefined,
              isAdmin: false
            };
            setUser(basicUser);
          } else {
            setUser(null);
          }

          setLoading(false);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        if (mounted) {
          setUser(null);
          setSession(null);
          setLoading(false);
        }
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        setSession(newSession);

        if (newSession?.user) {
          const basicUser: EnhancedUser = {
            ...newSession.user,
            profile: undefined,
            isAdmin: false
          };
          setUser(basicUser);
        } else {
          setUser(null);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const updateProfile = async (_updates: Partial<UserProfile>) => {
    // Stub - replace with real implementation
    console.warn('updateProfile is a stub. Replace with real implementation.');
  };

  const refreshProfile = async () => {
    // Stub - replace with real implementation
    console.warn('refreshProfile is a stub. Replace with real implementation.');
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    session,
    loading,
    profileLoading,
    signOut,
    updateProfile,
    refreshProfile
  };
}