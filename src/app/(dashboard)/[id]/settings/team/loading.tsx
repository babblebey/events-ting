/**
 * Loading state for Team Management Page
 */

import { Card } from "flowbite-react";

export default function TeamLoadingPage() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-64 animate-pulse" />
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-lg w-96 animate-pulse" />
      </div>

      {/* Invite Collaborator Card Skeleton */}
      <Card>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-96 animate-pulse" />
          </div>

          {/* Form fields skeleton */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-full animate-pulse" />
            </div>

            <div className="space-y-2">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-28 animate-pulse" />
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-36 animate-pulse" />
              </div>
            </div>

            <div className="flex justify-end">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 animate-pulse" />
            </div>
          </div>
        </div>
      </Card>

      {/* Team Members Card Skeleton */}
      <Card>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-lg w-40 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-64 animate-pulse" />
          </div>

          {/* Member list skeleton */}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
                  </div>
                </div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Pending Invitations Card Skeleton */}
      <Card>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-72 animate-pulse" />
          </div>

          {/* Invitation list skeleton */}
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-56 animate-pulse" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
