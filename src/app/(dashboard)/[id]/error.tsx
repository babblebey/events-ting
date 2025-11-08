'use client';

/**
 * Error boundary for event dashboard routes
 * Catches and displays errors in a user-friendly way
 */

import { Button, Card } from "flowbite-react";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service (e.g., Sentry, LogRocket)
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            Oops! Something went wrong
          </h1>
          
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            We encountered an error while loading this page. This might be a temporary issue.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 w-full rounded-lg bg-gray-100 p-4 text-left dark:bg-gray-800">
              <p className="mb-2 font-mono text-xs text-gray-700 dark:text-gray-300">
                <strong>Error:</strong> {error.message}
              </p>
              {error.digest && (
                <p className="font-mono text-xs text-gray-600 dark:text-gray-400">
                  <strong>Digest:</strong> {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button color="gray" onClick={() => window.location.href = '/'}>
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
            <Button onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
