/**
 * Modern Authentication Form using Signup1 Component
 * Integrates with Supabase authentication
 */

import React, { useState } from 'react';
import { FcGoogle } from "react-icons/fc";
import { Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from '../../utils/supabase';
import { parseError, logError } from '../../utils/errorHandler';

interface ModernAuthFormProps {
  onSuccess: () => void;
  onBack: () => void;
  onError?: (error: string) => void;
  onInfo?: (message: string) => void;
}

type AuthMode = 'signIn' | 'signUp';

export function ModernAuthForm({ onSuccess, onBack, onError, onInfo }: ModernAuthFormProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validateForm = () => {
    setError(null);
    
    if (!email) {
      setError('Please enter your email address');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!password) {
      setError('Please enter your password');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (authMode === 'signUp' && password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (authMode === 'signUp') {
        const { data, error: authError } = await auth.signUp(email, password);
        
        if (authError) {
          const errorDetails = parseError(authError);
          logError(authError, { action: 'sign_up', email });
          
          if (authError && typeof authError === 'object' && 'message' in authError) {
            const errorMessage = (authError as { message: string }).message;
            if (errorMessage.includes('already registered')) {
              setError('An account with this email already exists. Please sign in instead.');
            } else {
              setError(errorDetails.userMessage);
            }
          } else {
            setError(errorDetails.userMessage);
          }
        } else if (data.user) {
          setSuccess('Account created! Please check your email to verify your account.');
          onInfo?.('Please check your email to verify your account before signing in.');
          setTimeout(() => {
            setAuthMode('signIn');
            setPassword('');
            setConfirmPassword('');
          }, 2000);
        }
      } else {
        const { data, error: authError } = await auth.signIn(email, password);
        
        if (authError) {
          const errorDetails = parseError(authError);
          logError(authError, { action: 'sign_in', email });
          setError(errorDetails.userMessage);
        } else if (data.user) {
          setSuccess('Welcome back!');
          onSuccess();
        }
      }
    } catch (err) {
      const errorDetails = parseError(err);
      logError(err as Error, { action: authMode, email });
      setError(errorDetails.userMessage);
      onError?.(errorDetails.userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('Google sign-in is not available in demo mode. Please use email/password authentication.');
  };

  return (
    <section className="bg-bolt-gray-50 min-h-screen">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="bg-white flex w-full max-w-sm flex-col gap-6 rounded-lg border border-bolt-gray-200 px-6 py-8 shadow-sm">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          {/* Logo and Heading */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1">
              <h1 className="text-2xl font-bold text-bolt-gray-900">PlainSpeak</h1>
            </div>
            <p className="text-sm text-bolt-gray-600">
              {authMode === 'signIn' ? 'Welcome back' : 'Create your account'}
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-800">{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {authMode === 'signUp' && (
              <div className="flex flex-col gap-2">
                <Input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            )}

            <div className="flex flex-col gap-3 mt-2">
              <Button 
                type="submit" 
                className="w-full bg-bolt-gray-900 hover:bg-bolt-gray-800"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {authMode === 'signIn' ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  authMode === 'signIn' ? 'Sign in' : 'Create account'
                )}
              </Button>

              <Button 
                type="button"
                variant="outline" 
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <FcGoogle className="mr-2 h-5 w-5" />
                Continue with Google
              </Button>
            </div>
          </form>

          {/* Toggle Auth Mode */}
          <div className="flex justify-center gap-1 text-sm text-bolt-gray-600">
            <p>
              {authMode === 'signIn' 
                ? "Don't have an account?" 
                : "Already have an account?"}
            </p>
            <button
              onClick={() => {
                setAuthMode(authMode === 'signIn' ? 'signUp' : 'signIn');
                setError(null);
                setSuccess(null);
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-bolt-gray-900 font-medium hover:underline"
              disabled={isLoading}
            >
              {authMode === 'signIn' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
