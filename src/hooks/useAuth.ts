/**
 * Enhanced Authentication Hook
 * Manages user authentication state with profile data and role information
 * Fixed: Separated auth loading from profile loading to prevent infinite loading
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
  profileLoading: boolean; // Added separate profile loading state
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

    // Get initial session and user profile
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...');
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
            console.log('Found existing session for:', currentSession.user.email);
            
            // Set basic user info immediately - this fixes the infinite loading
            const basicUser: EnhancedUser = {
              ...currentSession.user,
              profile: undefined,
              isAdmin: false
            };
            setUser(basicUser);
            
            // Load profile data in background without blocking auth
            setProfileLoading(true);
            loadUserProfile(currentSession.user)
              .then(enhancedUser => {
                if (mounted) {
                  console.log('Profile loaded successfully');
                  setUser(enhancedUser);
                }
              })
              .catch(profileError => {
                console.error('Error fetching profile during initial load:', profileError);
                // Keep the basic user info even if profile fetch fails
              })
              .finally(() => {
                if (mounted) {
                  setProfileLoading(false);
                }
              });
          } else {
            console.log('No user in session');
            setUser(null);
          }
          
          // CRITICAL: Set loading to false immediately after auth check
          console.log('Setting auth loading to false');
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event, newSession?.user?.email);
        
        if (!mounted) return;

        setSession(newSession);

        if (newSession?.user) {
          console.log('User authenticated:', newSession.user.email);
          
          // Set basic user info immediately
          const basicUser: EnhancedUser = {
            ...newSession.user,
            profile: undefined,
            isAdmin: false
          };
          setUser(basicUser);
          
          // Load profile in background
          setProfileLoading(true);
          loadUserProfile(newSession.user)
            .then(enhancedUser => {
              if (mounted) {
                console.log('Profile loaded after auth change');
                setUser(enhancedUser);
              }
            })
            .catch(error => {
              console.error('Error fetching user profile after auth change:', error);
              // Keep the basic user info even if profile fetch fails
            })
            .finally(() => {
              if (mounted) {
                setProfileLoading(false);
              }
            });
        } else {
          console.log('User signed out');
          setUser(null);
          setProfileLoading(false);
        }

        // Always ensure loading is set to false after any auth state change
        console.log('Setting auth loading to false after state change');
        setLoading(false);

        // Handle specific auth events
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', newSession?.user?.email);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed');
          // Refresh profile data on token refresh if user exists
          if (newSession?.user && user) {
            setProfileLoading(true);
            loadUserProfile(newSession.user)
              .then(enhancedUser => {
                if (mounted) {
                  setUser(enhancedUser);
                }
              })
              .catch(error => {
                console.error('Error refreshing profile after token refresh:', error);
              })
              .finally(() => {
                if (mounted) {
                  setProfileLoading(false);
                }
              });
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
   * Load user profile data with timeout and error handling
   * Separated from fetchUserProfile to make it more robust
   */
  const loadUserProfile = async (authUser: User): Promise<EnhancedUser> => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout after 10 seconds')), 10000)
      );
      
      const profilePromise = fetchUserProfile(authUser);
      
      const enhancedUser = await Promise.race([profilePromise, timeoutPromise]);
      return enhancedUser;
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      // Always return basic user info if profile loading fails
      return {
        ...authUser,
        profile: undefined,
        isAdmin: false
      };
    }
  };

  /**
   * Fetch user profile data from the profiles table
   */
  const fetchUserProfile = async (authUser: User): Promise<EnhancedUser> => {
    try {
      console.log('Fetching profile for user:', authUser.id);
      
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
                daily_uploads_count: 0,
                preferences: {}
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

            console.log('Profile created successfully');
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

      console.log('User profile loaded successfully:', {
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
      setProfileLoading(true);

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
      setProfileLoading(false);
    }
  };

  /**
   * Refresh user profile data
   */
  const refreshProfile = async () => {
    if (!user) return;

    try {
      setProfileLoading(true);
      const enhancedUser = await loadUserProfile(user);
      setUser(enhancedUser);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  /**
   * Sign out user
   */
  const signOut = async () => {
    try {
      setLoading(true);
      console.log('Signing out user...');
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      
      // Clear user state immediately
      setUser(null);
      setSession(null);
      setProfileLoading(false);
      
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Debug logging (remove in production)
  useEffect(() => {
    console.log('Auth State Debug:', {
      loading,
      profileLoading,
      hasUser: !!user,
      hasSession: !!session,
      userEmail: user?.email,
      hasProfile: !!user?.profile
    });
  }, [loading, profileLoading, user, session]);

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