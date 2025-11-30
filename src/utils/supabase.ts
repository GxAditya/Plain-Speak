/**
 * Auth Stub - Supabase removed
 * This file provides a placeholder for authentication.
 * Replace with your preferred auth provider (Firebase, Auth0, custom backend, etc.)
 */

// Placeholder user type
export interface User {
  id: string;
  email: string;
  created_at: string;
}

// Placeholder session type
export interface Session {
  access_token: string;
  user: User;
}

// In-memory state for demo purposes
let currentUser: User | null = null;
let currentSession: Session | null = null;
const authListeners: Array<(event: string, session: Session | null) => void> = [];

// Simulated auth helper functions
export const auth = {
  signUp: async (email: string, _password: string) => {
    // Simulate sign-up - replace with real implementation
    const user: User = {
      id: crypto.randomUUID(),
      email,
      created_at: new Date().toISOString()
    };
    currentUser = user;
    currentSession = { access_token: 'demo-token-' + user.id, user };
    authListeners.forEach(cb => cb('SIGNED_IN', currentSession));
    return { data: { user, session: currentSession }, error: null };
  },

  signIn: async (email: string, _password: string) => {
    // Simulate sign-in - replace with real implementation
    const user: User = {
      id: crypto.randomUUID(),
      email,
      created_at: new Date().toISOString()
    };
    currentUser = user;
    currentSession = { access_token: 'demo-token-' + user.id, user };
    authListeners.forEach(cb => cb('SIGNED_IN', currentSession));
    return { data: { user, session: currentSession }, error: null };
  },

  signOut: async () => {
    currentUser = null;
    currentSession = null;
    authListeners.forEach(cb => cb('SIGNED_OUT', null));
    return { error: null };
  },

  resetPasswordForEmail: async (_email: string) => {
    // Stub - replace with real implementation
    return { data: {}, error: null };
  },

  updatePassword: async (_newPassword: string) => {
    // Stub - replace with real implementation
    return { data: { user: currentUser }, error: null };
  },

  getCurrentUser: async () => {
    return { data: { user: currentUser }, error: null };
  },

  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
    authListeners.push(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const idx = authListeners.indexOf(callback);
            if (idx > -1) authListeners.splice(idx, 1);
          }
        }
      }
    };
  }
};

// Stub supabase client for compatibility with existing code
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: currentSession }, error: null }),
    getUser: async () => ({ data: { user: currentUser }, error: null }),
    signUp: auth.signUp,
    signInWithPassword: auth.signIn,
    signOut: auth.signOut,
    resetPasswordForEmail: auth.resetPasswordForEmail,
    updateUser: async (updates: { password?: string }) => {
      if (updates.password) return auth.updatePassword(updates.password);
      return { data: { user: currentUser }, error: null };
    },
    onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
      return auth.onAuthStateChange(callback);
    }
  }
};