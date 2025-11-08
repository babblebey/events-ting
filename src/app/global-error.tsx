'use client';

/**
 * Global error boundary for the entire application
 * Last resort error handler
 */

import { Button } from "flowbite-react";
import { AlertTriangle, Home } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
          <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
              
              <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
                Something Went Wrong
              </h1>
              
              <p className="mb-6 text-lg text-gray-600 dark:text-gray-400">
                We're sorry, but something unexpected happened. Our team has been notified.
              </p>

              {process.env.NODE_ENV === 'development' && (
                <div className="mb-6 w-full rounded-lg bg-gray-100 p-4 text-left dark:bg-gray-800">
                  <p className="mb-1 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Development Error Details:
                  </p>
                  <p className="font-mono text-xs text-gray-600 dark:text-gray-400">
                    {error.message}
                  </p>
                  {error.stack && (
                    <pre className="mt-2 max-h-40 overflow-auto font-mono text-xs text-gray-600 dark:text-gray-400">
                      {error.stack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  color="gray"
                  onClick={() => window.location.href = '/'}
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Homepage
                </Button>
                <Button onClick={reset}>
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
