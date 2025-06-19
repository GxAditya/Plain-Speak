/**
 * Authentication Hook
 * Manages user authentication state and provides auth-related functions
 */

import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { auth } from '../utils/supabase';

interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { user }, error } = await auth.getCurrentUser();
        if (error) {
          // Handle "Auth session missing!" as expected behavior, not a critical error
          if (error.message === 'Auth session missing!') {
            console.log('No active session found - user not logged in');
          } else {
            console.error('Error getting user:', error);
          }
        } else {
          setUser(user);
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
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle specific auth events
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user?.email);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
    signOut
  };
}