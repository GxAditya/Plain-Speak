/**
 * Error Handling Utilities
 * Centralized error handling and user-friendly error message generation
 */

export interface ErrorDetails {
  code?: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  context?: Record<string, any>;
}

export class AppError extends Error {
  public readonly code?: string;
  public readonly userMessage: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly retryable: boolean;
  public readonly context?: Record<string, any>;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'AppError';
    this.code = details.code;
    this.userMessage = details.userMessage;
    this.severity = details.severity;
    this.retryable = details.retryable;
    this.context = details.context;
  }
}

/**
 * Parse and enhance error messages for better user experience
 */
export function parseError(error: unknown): ErrorDetails {
  // Handle AppError instances
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      severity: error.severity,
      retryable: error.retryable,
      context: error.context
    };
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    return parseStandardError(error);
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      userMessage: error,
      severity: 'medium',
      retryable: false
    };
  }

  // Handle unknown error types
  return {
    message: 'An unknown error occurred',
    userMessage: 'Something unexpected happened. Please try again.',
    severity: 'medium',
    retryable: true
  };
}

/**
 * Parse standard Error objects and provide user-friendly messages
 */
function parseStandardError(error: Error): ErrorDetails {
  const message = error.message.toLowerCase();

  // Network errors
  if (message.includes('fetch') || message.includes('network')) {
    return {
      code: 'NETWORK_ERROR',
      message: error.message,
      userMessage: 'Unable to connect to our servers. Please check your internet connection and try again.',
      severity: 'medium',
      retryable: true
    };
  }

  // Authentication errors
  if (message.includes('auth') || message.includes('unauthorized') || message.includes('401')) {
    return {
      code: 'AUTH_ERROR',
      message: error.message,
      userMessage: 'Your session has expired. Please sign in again.',
      severity: 'medium',
      retryable: false
    };
  }

  // Rate limiting errors
  if (message.includes('rate limit') || message.includes('429')) {
    return {
      code: 'RATE_LIMIT',
      message: error.message,
      userMessage: 'You\'re making requests too quickly. Please wait a moment and try again.',
      severity: 'low',
      retryable: true
    };
  }

  // Server errors
  if (message.includes('500') || message.includes('internal server')) {
    return {
      code: 'SERVER_ERROR',
      message: error.message,
      userMessage: 'Our servers are experiencing issues. Please try again in a few minutes.',
      severity: 'high',
      retryable: true
    };
  }

  // Validation errors
  if (message.includes('validation') || message.includes('invalid')) {
    return {
      code: 'VALIDATION_ERROR',
      message: error.message,
      userMessage: 'Please check your input and try again.',
      severity: 'low',
      retryable: false
    };
  }

  // File upload errors
  if (message.includes('file') && (message.includes('size') || message.includes('type'))) {
    return {
      code: 'FILE_ERROR',
      message: error.message,
      userMessage: 'There was an issue with your file. Please check the file type and size.',
      severity: 'low',
      retryable: false
    };
  }

  // Timeout errors
  if (message.includes('timeout')) {
    return {
      code: 'TIMEOUT_ERROR',
      message: error.message,
      userMessage: 'The request took too long to complete. Please try again.',
      severity: 'medium',
      retryable: true
    };
  }

  // Configuration errors
  if (message.includes('configuration') || message.includes('config')) {
    return {
      code: 'CONFIG_ERROR',
      message: error.message,
      userMessage: 'There\'s a configuration issue. Please contact support if this persists.',
      severity: 'high',
      retryable: false
    };
  }

  // Default case
  return {
    message: error.message,
    userMessage: 'An unexpected error occurred. Please try again.',
    severity: 'medium',
    retryable: true
  };
}

/**
 * Create user-friendly error messages for specific contexts
 */
export const ErrorMessages = {
  // Authentication
  SIGN_IN_FAILED: 'Unable to sign in. Please check your email and password.',
  SIGN_UP_FAILED: 'Unable to create your account. Please try again.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  
  // Document processing
  DOCUMENT_UPLOAD_FAILED: 'Failed to upload your document. Please try again.',
  DOCUMENT_PROCESSING_FAILED: 'Unable to process your document. Please check the file format and try again.',
  DOCUMENT_TOO_LARGE: 'Your document is too large. Please use a file smaller than 10MB.',
  UNSUPPORTED_FILE_TYPE: 'This file type is not supported. Please use PDF, DOCX, DOC, TXT, or RTF files.',
  
  // AI processing
  AI_REQUEST_FAILED: 'Unable to process your request. Please try again.',
  AI_OVERLOADED: 'Our AI service is currently busy. Please try again in a moment.',
  QUERY_TOO_LONG: 'Your question is too long. Please shorten it and try again.',
  
  // Network
  CONNECTION_FAILED: 'Unable to connect to our servers. Please check your internet connection.',
  SERVER_UNAVAILABLE: 'Our servers are temporarily unavailable. Please try again later.',
  
  // General
  UNEXPECTED_ERROR: 'Something unexpected happened. Please try again.',
  FEATURE_UNAVAILABLE: 'This feature is temporarily unavailable. Please try again later.'
};

/**
 * Log errors for debugging and monitoring
 */
export function logError(error: unknown, context?: Record<string, any>) {
  const errorDetails = parseError(error);
  
  const logData = {
    timestamp: new Date().toISOString(),
    error: {
      name: error instanceof Error ? error.name : 'Unknown',
      message: errorDetails.message,
      code: errorDetails.code,
      severity: errorDetails.severity,
      stack: error instanceof Error ? error.stack : undefined
    },
    context,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', logData);
  }

  // In production, you would send this to your error monitoring service
  // Example: Sentry.captureException(error, { extra: logData });
}

/**
 * Retry mechanism for retryable errors
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const errorDetails = parseError(error);

      // Don't retry if error is not retryable
      if (!errorDetails.retryable || attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }

  throw lastError;
}