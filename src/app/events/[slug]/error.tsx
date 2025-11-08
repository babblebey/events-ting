'use client';

/**
 * Error boundary for public event pages
 * Provides user-friendly error display for event-related errors
 */

import { Button, Card } from "flowbite-react";
import { AlertCircle, ArrowLeft, Search } from "lucide-react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Event page error:', error);
  }, [error]);

  const isNotFound = error.message.includes('not found') || error.message.includes('404');

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            {isNotFound ? (
              <Search className="h-8 w-8 text-red-600 dark:text-red-400" />
            ) : (
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            )}
          </div>
          
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {isNotFound ? 'Event Not Found' : 'Unable to Load Event'}
          </h1>
          
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            {isNotFound
              ? "The event you're looking for doesn't exist or may have been removed."
              : "We're having trouble loading this event. Please try again or browse our other events."}
          </p>

          <div className="flex gap-3">
            <Button color="gray" href="/events">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Browse Events
            </Button>
            {!isNotFound && (
              <Button onClick={reset}>
                <Search className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
