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
    let mounted = true;

    // Get initial session and user profile
    const getInitialSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          // Handle "Auth session missing!" as expected behavior, not a critical error
          if (error.message === 'Auth session missing!') {
            console.log('No active session found - user not logged in');
          } else {
            console.error('Error getting session:', error);
          }
        }

        if (mounted) {
          setSession(currentSession);
          
          if (currentSession?.user) {
            const enhancedUser = await fetchUserProfile(currentSession.user);
            setUser(enhancedUser);
          } else {
            setUser(null);
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event, newSession?.user?.email);
        
        if (!mounted) return;

        setSession(newSession);

        if (newSession?.user) {
          // Fetch user profile when user signs in
          try {
            const enhancedUser = await fetchUserProfile(newSession.user);
            setUser(enhancedUser);
          } catch (error) {
            console.error('Error fetching user profile after auth change:', error);
            // Still set the basic user info even if profile fetch fails
            setUser({
              ...newSession.user,
              profile: undefined,
              isAdmin: false
            });
          }
        } else {
          setUser(null);
        }

        // Ensure loading is set to false after any auth state change
        setLoading(false);

        // Handle specific auth events
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', newSession?.user?.email);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed');
          // Refresh profile data on token refresh
          if (newSession?.user) {
            try {
              const enhancedUser = await fetchUserProfile(newSession.user);
              setUser(enhancedUser);
            } catch (error) {
              console.error('Error refreshing profile after token refresh:', error);
            }
          }
        }
      }
    );

    return () => {
      mounted = false;
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
        
        // If profile doesn't exist, try to create it
        if (error.code === 'PGRST116') {
          console.log('Profile not found, attempting to create...');
          try {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: authUser.id,
                email: authUser.email || '',
                role: 'user',
                user_tier: 'free',
                has_gemini_key: false,
                daily_uploads_count: 0
              })
              .select()
              .single();

            if (createError) {
              console.error('Error creating profile:', createError);
              return {
                ...authUser,
                profile: undefined,
                isAdmin: false
              };
            }

            return {
              ...authUser,
              profile: newProfile,
              isAdmin: newProfile?.role === 'admin'
            };
          } catch (createError) {
            console.error('Error in profile creation:', createError);
            return {
              ...authUser,
              profile: undefined,
              isAdmin: false
            };
          }
        }
        
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      
      // Clear user state immediately
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
    signOut,
    updateProfile,
    refreshProfile
  };
}