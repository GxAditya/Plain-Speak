/**
 * Password Reset Form Component
 * Handles the password reset process when users click the reset link from their email
 */

import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  KeyRound,
  ArrowLeft
} from 'lucide-react';
import { auth, supabase } from '../../utils/supabase';
import { parseError, logError } from '../../utils/errorHandler';
import { LoadingSpinner } from '../LoadingSpinner';

interface PasswordResetFormProps {
  onSuccess: () => void;
  onBack: () => void;
  onError?: (error: string) => void;
  onInfo?: (message: string) => void;
}

export function PasswordResetForm({ onSuccess, onBack, onError, onInfo }: PasswordResetFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a valid password reset session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setIsValidSession(true);
        } else {
          setIsValidSession(false);
          setError('Invalid or expired password reset link. Please request a new password reset.');
        }
      } catch (err) {
        console.error('Error checking session:', err);
        setIsValidSession(false);
        setError('Unable to verify password reset session. Please try again.');
      }
    };

    checkSession();
  }, []);

  const validateForm = () => {
    setError(null);
    
    if (!password) {
      setError('Please enter a new password');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (password !== confirmPassword) {
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
      const { data, error: updateError } = await auth.updatePassword(password);
      
      if (updateError) {
        const errorDetails = parseError(updateError);
        logError(updateError, { action: 'password_reset' });
        setError(errorDetails.userMessage);
        onError?.(errorDetails.userMessage);
      } else if (data.user) {
        setSuccess('Password updated successfully! You can now sign in with your new password.');
        onInfo?.('Password reset successful!');
        setTimeout(() => onSuccess(), 2000);
      }
    } catch (err) {
      const errorDetails = parseError(err);
      logError(err, { action: 'password_reset' });
      setError(errorDetails.userMessage);
      onError?.(errorDetails.userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bolt-gray-50 via-white to-bolt-blue-50 flex items-center justify-center p-4">
        <LoadingSpinner size="lg" text="Verifying password reset link..." />
      </div>
    );
  }

  // Show error if session is invalid
  if (isValidSession === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bolt-gray-50 via-white to-bolt-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-bolt-gray-600 hover:text-bolt-gray-900 transition-colors mb-8"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </button>

          <div className="bg-white rounded-2xl shadow-xl border border-bolt-gray-200 p-8 text-center">
            <div className="p-3 bg-red-100 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            
            <h2 className="text-xl font-bold text-bolt-gray-900 mb-2">
              Invalid Reset Link
            </h2>
            
            <p className="text-bolt-gray-600 mb-6">
              This password reset link is invalid or has expired. Please request a new password reset.
            </p>

            <button
              onClick={onBack}
              className="w-full bg-bolt-blue-600 hover:bg-bolt-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              Request New Reset
            </button>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Reset Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-bolt-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="p-2 bg-gradient-to-r from-bolt-blue-600 to-bolt-blue-700 rounded-xl">
                <KeyRound className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-bolt-gray-900">PlainSpeak</span>
            </div>
            <h2 className="text-2xl font-bold text-bolt-gray-900 mb-2">
              Set New Password
            </h2>
            <p className="text-bolt-gray-600">
              Enter your new password below
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-800 text-sm">{error}</p>
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
            {/* New Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-bolt-gray-700 mb-2">
                New password
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
                  placeholder="Enter your new password"
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

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-bolt-gray-700 mb-2">
                Confirm new password
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
                  placeholder="Confirm your new password"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-bolt-blue-600 hover:bg-bolt-blue-700 disabled:bg-bolt-gray-400 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" color="white" text="Updating password..." />
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>Security tip:</strong> Choose a strong password with at least 6 characters, including a mix of letters, numbers, and symbols.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}