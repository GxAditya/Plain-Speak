/**
 * Loading Spinner Component
 * Minimal loading indicator following PlainSpeak design system
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'white';
  text?: string;
  className?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'default', 
  text, 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const colorClasses = {
    default: 'text-bolt-gray-400',
    white: 'text-white'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-sm'
  };

  if (text) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`} />
        <span className={`${textSizeClasses[size]} ${color === 'white' ? 'text-white' : 'text-bolt-gray-500'}`}>
          {text}
        </span>
      </div>
    );
  }

  return (
    <Loader2 className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin ${className}`} />
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
    <div className="min-h-screen bg-bolt-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-3" />
        <p className="text-sm font-medium text-bolt-gray-900 mb-1">{message}</p>
        {submessage && (
          <p className="text-xs text-bolt-gray-500">{submessage}</p>
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
    <div className={`flex items-center justify-center py-6 ${className}`}>
      <LoadingSpinner size={size} text={message} />
    </div>
  );
}