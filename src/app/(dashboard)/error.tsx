'use client';

/**
 * Error boundary for dashboard root
 * Handles errors in dashboard layout or navigation
 */

import { Button, Card } from "flowbite-react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard layout error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-lg">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
            <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard Error
          </h1>
          
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            There was a problem loading the dashboard. Please try refreshing the page or return to the home page.
          </p>

          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="mb-6 w-full rounded-lg bg-gray-100 p-4 text-left dark:bg-gray-800">
              <p className="font-mono text-xs text-gray-700 dark:text-gray-300">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button color="gray" href="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
            <Button onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
