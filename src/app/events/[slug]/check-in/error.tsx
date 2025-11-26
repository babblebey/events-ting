"use client";

/**
 * Error boundary for check-in page
 * Provides user-friendly error display for check-in related errors
 */

import { Button, Card } from "flowbite-react";
import { HiArrowLeft, HiOutlineRefresh } from "react-icons/hi";
import { LuCircleAlert } from "react-icons/lu";
import { useEffect } from "react";

export default function CheckInError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Check-in page error:", error);
  }, [error]);

  const isPermissionError =
    error.message.includes("permission") ||
    error.message.includes("FORBIDDEN") ||
    error.message.includes("access");

  const isNotFound =
    error.message.includes("not found") || error.message.includes("404");

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <LuCircleAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>

          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {isPermissionError
              ? "Access Denied"
              : isNotFound
                ? "Event Not Found"
                : "Unable to Load Check-In Page"}
          </h1>

          <p className="mb-6 text-gray-600 dark:text-gray-400">
            {isPermissionError
              ? "You don't have permission to access the check-in module for this event. Please contact the event owner to request CHECKIN access."
              : isNotFound
                ? "The event you're looking for doesn't exist or may have been removed."
                : "We're having trouble loading the check-in page. Please try again or contact support if the problem persists."}
          </p>

          <div className="flex gap-3">
            <Button color="gray" href="../">
              <HiArrowLeft className="mr-2 h-4 w-4" />
              Back to Event
            </Button>
            {!isNotFound && !isPermissionError && (
              <Button onClick={reset}>
                <HiOutlineRefresh className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
          </div>

          {error.digest && (
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
