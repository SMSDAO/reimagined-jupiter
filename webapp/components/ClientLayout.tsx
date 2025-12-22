'use client';

import { useEffect } from 'react';
import { WalletContextProvider } from "@/lib/wallet-context-provider";
import { ThemeProvider } from "@/lib/theme-context";
import Navigation from "@/components/Navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { startAPIHealthMonitoring } from "@/lib/config";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize API health monitoring and global error handlers on client side
  useEffect(() => {
    // Start health checks every 60 seconds
    startAPIHealthMonitoring(60000);
    
    // Log initialization only in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[GXQ Studio] API health monitoring started');
    }

    // Add global error handlers for browser environment
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Log unhandled promise rejections
      const error = {
        message: event.reason?.message || String(event.reason),
        name: 'UnhandledPromiseRejection',
        timestamp: new Date().toISOString(),
      };

      // Send to error logging endpoint
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error),
      }).catch(() => {
        // Silently fail if error logging fails
      });

      // Prevent default behavior (console error) in production
      if (process.env.NODE_ENV === 'production') {
        event.preventDefault();
      }
    };

    const handleError = (event: ErrorEvent) => {
      // Log global errors
      const error = {
        message: event.message,
        name: event.error?.name || 'Error',
        timestamp: new Date().toISOString(),
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      };

      // Send to error logging endpoint
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error),
      }).catch(() => {
        // Silently fail if error logging fails
      });

      // Prevent default behavior (console error) in production
      if (process.env.NODE_ENV === 'production') {
        event.preventDefault();
      }
    };

    // Register global error handlers
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);
    
    // Cleanup is handled by the health checker itself and error handlers on unmount
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <WalletContextProvider>
          <div className="min-h-screen font-sans transition-colors duration-300">
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-purple-900 via-blue-900 to-green-900 dark:from-purple-950 dark:via-blue-950 dark:to-green-950" />
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-transparent via-transparent to-transparent dark:from-black/40 dark:via-black/20 dark:to-black/40" />
            <Navigation />
            <main className="container mx-auto px-4 py-8 relative">
              {children}
            </main>
          </div>
        </WalletContextProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
