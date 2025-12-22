'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary Component
 * 
 * Catches React errors and prevents the entire app from crashing.
 * Replaces console.error with proper error logging that doesn't leak sensitive info.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to a centralized error logging service
    // This replaces console.error with structured logging
    this.logError(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    // Structure error for logging without exposing sensitive data
    const errorData = {
      message: error.message,
      name: error.name,
      // Don't log the full stack trace to avoid sensitive info leaks
      componentStack: errorInfo.componentStack?.split('\n').slice(0, 3).join('\n'),
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
    };

    // In production, send to error tracking service (Sentry, LogRocket, etc.)
    // For now, use structured logging
    if (process.env.NODE_ENV === 'production') {
      // Send to error tracking service
      this.sendToErrorTrackingService(errorData);
    } else {
      // Development: log to console for debugging
      console.error('[ErrorBoundary]', errorData);
    }
  }

  private sendToErrorTrackingService(errorData: {
    message: string;
    name: string;
    componentStack?: string;
    timestamp: string;
    userAgent: string;
  }) {
    // TODO: Integrate with error tracking service (Sentry, LogRocket, DataDog, etc.)
    // For now, this is a placeholder that prevents errors from going untracked
    
    // Example: Send to /api/errors endpoint
    if (typeof window !== 'undefined') {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      }).catch(() => {
        // Silently fail - don't want error logging to cause more errors
      });
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Render fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-green-900 p-4">
          <div className="max-w-2xl w-full bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 text-white">
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold mb-2">⚠️ Something went wrong</h1>
              <p className="text-white/80 text-lg">
                We've encountered an unexpected error. Our team has been notified.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-black/30 rounded-lg border border-red-500/50">
                <h2 className="text-lg font-semibold mb-2 text-red-300">Error Details (Development Only)</h2>
                <p className="font-mono text-sm text-red-200 break-all">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-white/70 hover:text-white">
                      Component Stack
                    </summary>
                    <pre className="mt-2 text-xs text-white/60 overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold transition-all duration-200"
              >
                Go Home
              </button>
            </div>

            <div className="mt-8 text-center text-sm text-white/60">
              <p>If this problem persists, please contact support.</p>
              <p className="mt-2">Error ID: {new Date().getTime().toString(36)}</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
