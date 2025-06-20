/**
 * Enhanced Authentication Hook
 * Manages user authentication state with profile data and role information
 */

import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { auth, supabase } from '../utils/supabase';

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
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session and user profile
    const getInitialSession = async () => {
      try {
        const { data: { user: authUser }, error } = await auth.getCurrentUser();
        if (error) {
          // Handle "Auth session missing!" as expected behavior, not a critical error
          if (error.message === 'Auth session missing!') {
            console.log('No active session found - user not logged in');
          } else {
            console.error('Error getting user:', error);
          }
        } else if (authUser) {
          const enhancedUser = await fetchUserProfile(authUser);
          setUser(enhancedUser);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setLoading(false);

        if (session?.user) {
          // Fetch user profile when user signs in
          const enhancedUser = await fetchUserProfile(session.user);
          setUser(enhancedUser);
        } else {
          setUser(null);
        }

        // Handle specific auth events
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user?.email);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed');
          // Refresh profile data on token refresh
          if (session?.user) {
            const enhancedUser = await fetchUserProfile(session.user);
            setUser(enhancedUser);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Fetch user profile data from the profiles table
   */
  const fetchUserProfile = async (authUser: User): Promise<EnhancedUser> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.warn('Error fetching user profile:', error);
        // Return user without profile if profile fetch fails
        return {
          ...authUser,
          profile: undefined,
          isAdmin: false
        };
      }

      const enhancedUser: EnhancedUser = {
        ...authUser,
        profile,
        isAdmin: profile?.role === 'admin'
      };

      console.log('User profile loaded:', {
        email: profile?.email,
        role: profile?.role,
        isAdmin: enhancedUser.isAdmin
      });

      return enhancedUser;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return {
        ...authUser,
        profile: undefined,
        isAdmin: false
      };
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user?.id) {
      throw new Error('No authenticated user');
    }

    try {
      setLoading(true);

      // Prevent users from changing their own role
      const safeUpdates = { ...updates };
      if (!user.isAdmin) {
        delete safeUpdates.role;
      }

      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(safeUpdates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local user state
      setUser(prev => prev ? {
        ...prev,
        profile: updatedProfile,
        isAdmin: updatedProfile.role === 'admin'
      } : null);

      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh user profile data
   */
  const refreshProfile = async () => {
    if (!user) return;

    try {
      const enhancedUser = await fetchUserProfile(user);
      setUser(enhancedUser);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  /**
   * Sign out user
   */
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
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
    signOut,
    updateProfile,
    refreshProfile
  };
}