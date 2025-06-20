/**
 * Loading Spinner Component
 * Reusable loading indicator with different sizes and styles
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'gray' | 'white';
  text?: string;
  className?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'blue', 
  text, 
  className = '' 
}: LoadingSpinnerProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'h-4 w-4';
      case 'md': return 'h-6 w-6';
      case 'lg': return 'h-8 w-8';
      case 'xl': return 'h-12 w-12';
      default: return 'h-6 w-6';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'blue': return 'text-bolt-blue-600';
      case 'gray': return 'text-bolt-gray-600';
      case 'white': return 'text-white';
      default: return 'text-bolt-blue-600';
    }
  };

  const getTextSizeClasses = () => {
    switch (size) {
      case 'sm': return 'text-sm';
      case 'md': return 'text-base';
      case 'lg': return 'text-lg';
      case 'xl': return 'text-xl';
      default: return 'text-base';
    }
  };

  if (text) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <Loader2 className={`${getSizeClasses()} ${getColorClasses()} animate-spin`} />
        <span className={`${getTextSizeClasses()} ${getColorClasses()} font-medium`}>
          {text}
        </span>
      </div>
    );
  }

  return (
    <Loader2 className={`${getSizeClasses()} ${getColorClasses()} animate-spin ${className}`} />
  );
}

/**
 * Full Page Loading Component
 */
interface FullPageLoadingProps {
  message?: string;
  submessage?: string;
}

export function FullPageLoading({ 
  message = "Loading...", 
  submessage 
}: FullPageLoadingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bolt-gray-50 via-white to-bolt-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="p-4 bg-gradient-to-r from-bolt-blue-600 to-bolt-blue-700 rounded-xl mb-6 inline-block">
          <LoadingSpinner size="lg" color="white" />
        </div>
        <h2 className="text-xl font-semibold text-bolt-gray-900 mb-2">{message}</h2>
        {submessage && (
          <p className="text-bolt-gray-600">{submessage}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Inline Loading Component
 */
interface InlineLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function InlineLoading({ 
  message = "Loading...", 
  size = 'md',
  className = '' 
}: InlineLoadingProps) {
  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <LoadingSpinner size={size} text={message} />
    </div>
  );
}