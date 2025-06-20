/**
 * Enhanced Authentication Form Component
 * Handles sign-up, sign-in, and password reset functionality with comprehensive error handling
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
  Sparkles,
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { auth } from '../../utils/supabase';
import { parseError, logError } from '../../utils/errorHandler';
import { LoadingSpinner } from '../LoadingSpinner';

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

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // For forgot password, only email is required
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
            onError?.('Account already exists. Please sign in instead.');
          } else {
            setError(errorDetails.userMessage);
            onError?.(errorDetails.userMessage);
          }
        } else if (data.user) {
          setSuccess('Account created successfully! Signing you in...');
          onInfo?.('Account created successfully!');
          
          // Wait for auth state to update, then call onSuccess
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      } else if (authMode === 'signIn') {
        const { data, error: authError } = await auth.signIn(email, password);
        
        if (authError) {
          const errorDetails = parseError(authError);
          logError(authError, { action: 'sign_in', email });
          
          if (authError.message.includes('Invalid login credentials')) {
            setError('The email or password you entered is incorrect. Please check your credentials and try again.');
            onError?.('Invalid email or password. Please check your credentials.');
          } else if (authError.message.includes('Email not confirmed')) {
            setError('Please check your email and click the confirmation link before signing in.');
            onError?.('Please confirm your email address before signing in.');
          } else {
            setError(errorDetails.userMessage);
            onError?.(errorDetails.userMessage);
          }
        } else if (data.user) {
          setSuccess('Welcome back!');
          onInfo?.('Successfully signed in!');
          
          // Wait for auth state to update, then call onSuccess
          setTimeout(() => {
            onSuccess();
          }, 1000);
        }
      } else if (authMode === 'forgotPassword') {
        const { error: resetError } = await auth.resetPasswordForEmail(email);
        
        if (resetError) {
          const errorDetails = parseError(resetError);
          logError(resetError, { action: 'forgot_password', email });
          setError(errorDetails.userMessage);
          onError?.(errorDetails.userMessage);
        } else {
          setSuccess('Password reset email sent! Please check your inbox and follow the instructions to reset your password.');
          onInfo?.('Password reset email sent successfully!');
          // Don't automatically redirect, let user manually go back
        }
      }
    } catch (err) {
      const errorDetails = parseError(err);
      logError(err, { action: authMode, email });
      setError(errorDetails.userMessage);
      onError?.(errorDetails.userMessage);
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
      case 'signUp': return 'Create your account';
      case 'signIn': return 'Welcome back';
      case 'forgotPassword': return 'Reset your password';
      default: return 'Welcome back';
    }
  };

  const getSubtitle = () => {
    switch (authMode) {
      case 'signUp': return 'Start translating complex jargon into plain English';
      case 'signIn': return 'Sign in to continue to your dashboard';
      case 'forgotPassword': return 'Enter your email address and we\'ll send you a link to reset your password';
      default: return 'Sign in to continue to your dashboard';
    }
  };

  const getButtonText = () => {
    if (isLoading) {
      switch (authMode) {
        case 'signUp': return 'Creating account...';
        case 'signIn': return 'Signing in...';
        case 'forgotPassword': return 'Sending reset email...';
        default: return 'Loading...';
      }
    }
    
    switch (authMode) {
      case 'signUp': return 'Create account';
      case 'signIn': return 'Sign in';
      case 'forgotPassword': return 'Send reset email';
      default: return 'Sign in';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bolt-gray-50 via-white to-bolt-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors mb-8"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Home</span>
        </button>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-bolt-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="p-2 bg-gradient-to-r from-bolt-blue-600 to-bolt-blue-700 rounded-xl">
                {authMode === 'forgotPassword' ? (
                  <KeyRound className="h-6 w-6 text-white" />
                ) : (
                  <Sparkles className="h-6 w-6 text-white" />
                )}
              </div>
              <span className="text-2xl font-bold text-bolt-gray-900">PlainSpeak</span>
            </div>
            <h2 className="text-2xl font-bold text-bolt-gray-900 mb-2">
              {getTitle()}
            </h2>
            <p className="text-bolt-gray-600">
              {getSubtitle()}
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-800 text-sm">{error}</p>
                {error.includes('email or password you entered is incorrect') && authMode === 'signIn' && (
                  <p className="text-red-700 text-xs mt-2">
                    Don't have an account yet?{' '}
                    <button
                      onClick={() => switchAuthMode('signUp')}
                      className="underline hover:no-underline"
                    >
                      Sign up here
                    </button>
                  </p>
                )}
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-bolt-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-bolt-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-bolt-gray-300 rounded-lg focus:ring-2 focus:ring-bolt-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field (not shown for forgot password) */}
            {authMode !== 'forgotPassword' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-bolt-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-bolt-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-bolt-gray-300 rounded-lg focus:ring-2 focus:ring-bolt-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-bolt-gray-400 hover:text-bolt-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-bolt-gray-400 hover:text-bolt-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password Field (Sign Up Only) */}
            {authMode === 'signUp' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-bolt-gray-700 mb-2">
                  Confirm password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-bolt-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-bolt-gray-300 rounded-lg focus:ring-2 focus:ring-bolt-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Confirm your password"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-bolt-gray-400 hover:text-bolt-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-bolt-gray-400 hover:text-bolt-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Forgot Password Link (Sign In Only) */}
            {authMode === 'signIn' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => switchAuthMode('forgotPassword')}
                  className="text-sm text-bolt-blue-600 hover:text-bolt-blue-700 font-medium transition-colors"
                  disabled={isLoading}
                >
                  Forgot your password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-bolt-blue-600 hover:bg-bolt-blue-700 disabled:bg-bolt-gray-400 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" color="white" text={getButtonText()} />
              ) : (
                <span>{getButtonText()}</span>
              )}
            </button>
          </form>

          {/* Mode Toggle */}
          <div className="mt-8 text-center">
            {authMode === 'forgotPassword' ? (
              <p className="text-bolt-gray-600">
                Remember your password?{' '}
                <button
                  onClick={() => switchAuthMode('signIn')}
                  className="text-bolt-blue-600 hover:text-bolt-blue-700 font-medium transition-colors"
                  disabled={isLoading}
                >
                  Back to sign in
                </button>
              </p>
            ) : (
              <p className="text-bolt-gray-600">
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

          {/* Terms (Sign Up Only) */}
          {authMode === 'signUp' && (
            <div className="mt-6 text-center">
              <p className="text-xs text-bolt-gray-500">
                By creating an account, you agree to our{' '}
                <a href="#" className="text-bolt-blue-600 hover:text-bolt-blue-700">Terms of Service</a>{' '}
                and{' '}
                <a href="#" className="text-bolt-blue-600 hover:text-bolt-blue-700">Privacy Policy</a>
              </p>
            </div>
          )}
        </div>

        {/* Features Preview */}
        <div className="mt-8 bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-bolt-gray-200">
          <h3 className="font-semibold text-bolt-gray-900 mb-4">What you'll get:</h3>
          <ul className="space-y-2 text-sm text-bolt-gray-600">
            <li className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Access to 9 specialized AI tools</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Unlimited document uploads</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Advanced AI analysis modes</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Secure document processing</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}