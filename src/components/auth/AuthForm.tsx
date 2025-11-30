/**
 * Enhanced Authentication Form Component
 * Professional, clean design following PlainSpeak design system
 */

import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  FileText,
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { auth } from '../../utils/supabase';
import { parseError, logError } from '../../utils/errorHandler';

interface AuthFormProps {
  onSuccess: () => void;
  onBack: () => void;
  onError?: (error: string) => void;
  onInfo?: (message: string) => void;
}

type AuthMode = 'signIn' | 'signUp' | 'forgotPassword';

export function AuthForm({ onSuccess, onBack, onError, onInfo }: AuthFormProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    if (authMode === 'forgotPassword') {
      return true;
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
          
          if (authError.message.includes('already registered')) {
            setError('An account with this email already exists. Please sign in instead.');
          } else {
            setError(errorDetails.userMessage);
          }
        } else if (data.user) {
          setSuccess('Account created successfully! Signing you in...');
          onInfo?.('Account created successfully!');
          setTimeout(() => onSuccess(), 1500);
        }
      } else if (authMode === 'signIn') {
        const { data, error: authError } = await auth.signIn(email, password);
        
        if (authError) {
          const errorDetails = parseError(authError);
          logError(authError, { action: 'sign_in', email });
          
          if (authError.message.includes('Invalid login credentials')) {
            setError('The email or password you entered is incorrect.');
          } else if (authError.message.includes('Email not confirmed')) {
            setError('Please check your email and click the confirmation link.');
          } else {
            setError(errorDetails.userMessage);
          }
        } else if (data.user) {
          setSuccess('Welcome back!');
          onInfo?.('Successfully signed in!');
          setTimeout(() => onSuccess(), 1000);
        }
      } else if (authMode === 'forgotPassword') {
        const { error: resetError } = await auth.resetPasswordForEmail(email);
        
        if (resetError) {
          const errorDetails = parseError(resetError);
          logError(resetError, { action: 'forgot_password', email });
          setError(errorDetails.userMessage);
        } else {
          setSuccess('Password reset email sent! Check your inbox.');
          onInfo?.('Password reset email sent successfully!');
        }
      }
    } catch (err) {
      const errorDetails = parseError(err);
      logError(err, { action: authMode, email });
      setError(errorDetails.userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const switchAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setError(null);
    setSuccess(null);
    setPassword('');
    setConfirmPassword('');
  };

  const getTitle = () => {
    switch (authMode) {
      case 'signUp': return 'Create account';
      case 'signIn': return 'Sign in';
      case 'forgotPassword': return 'Reset password';
    }
  };

  const getSubtitle = () => {
    switch (authMode) {
      case 'signUp': return 'Start simplifying complex documents';
      case 'signIn': return 'Welcome back to PlainSpeak';
      case 'forgotPassword': return 'We\'ll send you a reset link';
    }
  };

  const getButtonText = () => {
    if (isLoading) {
      switch (authMode) {
        case 'signUp': return 'Creating account...';
        case 'signIn': return 'Signing in...';
        case 'forgotPassword': return 'Sending...';
      }
    }
    switch (authMode) {
      case 'signUp': return 'Create account';
      case 'signIn': return 'Sign in';
      case 'forgotPassword': return 'Send reset link';
    }
  };

  return (
    <div className="min-h-screen bg-bolt-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to home</span>
        </button>

        {/* Auth Card */}
        <div className="bg-white rounded-lg border border-bolt-gray-200 shadow-sm">
          {/* Header */}
          <div className="p-6 border-b border-bolt-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-bolt-gray-900 rounded-md flex items-center justify-center">
                {authMode === 'forgotPassword' ? (
                  <KeyRound className="h-4 w-4 text-white" />
                ) : (
                  <FileText className="h-4 w-4 text-white" />
                )}
              </div>
              <span className="text-lg font-semibold text-bolt-gray-900">PlainSpeak</span>
            </div>
            <h1 className="text-xl font-semibold text-bolt-gray-900">{getTitle()}</h1>
            <p className="text-sm text-bolt-gray-500 mt-1">{getSubtitle()}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-emerald-700">{success}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-bolt-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-bolt-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 text-sm border border-bolt-gray-300 rounded-md focus:ring-2 focus:ring-bolt-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            {authMode !== 'forgotPassword' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-bolt-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-bolt-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 text-sm border border-bolt-gray-300 rounded-md focus:ring-2 focus:ring-bolt-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-bolt-gray-400 hover:text-bolt-gray-600" />
                    ) : (
                      <Eye className="h-4 w-4 text-bolt-gray-400 hover:text-bolt-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password */}
            {authMode === 'signUp' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-bolt-gray-700 mb-1.5">
                  Confirm password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-bolt-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 text-sm border border-bolt-gray-300 rounded-md focus:ring-2 focus:ring-bolt-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-bolt-gray-400 hover:text-bolt-gray-600" />
                    ) : (
                      <Eye className="h-4 w-4 text-bolt-gray-400 hover:text-bolt-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Forgot Password Link */}
            {authMode === 'signIn' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => switchAuthMode('forgotPassword')}
                  className="text-sm text-bolt-blue-600 hover:text-bolt-blue-700 transition-colors"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-bolt-gray-900 hover:bg-bolt-gray-800 disabled:bg-bolt-gray-400 rounded-md transition-colors"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {getButtonText()}
            </button>
          </form>

          {/* Footer */}
          <div className="px-6 pb-6 text-center">
            {authMode === 'forgotPassword' ? (
              <p className="text-sm text-bolt-gray-600">
                Remember your password?{' '}
                <button
                  onClick={() => switchAuthMode('signIn')}
                  className="text-bolt-blue-600 hover:text-bolt-blue-700 font-medium transition-colors"
                  disabled={isLoading}
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p className="text-sm text-bolt-gray-600">
                {authMode === 'signUp' ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  onClick={() => switchAuthMode(authMode === 'signUp' ? 'signIn' : 'signUp')}
                  className="text-bolt-blue-600 hover:text-bolt-blue-700 font-medium transition-colors"
                  disabled={isLoading}
                >
                  {authMode === 'signUp' ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Terms */}
        {authMode === 'signUp' && (
          <p className="text-xs text-bolt-gray-500 text-center mt-4">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-bolt-blue-600 hover:underline">Terms</a>{' '}
            and{' '}
            <a href="#" className="text-bolt-blue-600 hover:underline">Privacy Policy</a>
          </p>
        )}
      </div>
    </div>
  );
}