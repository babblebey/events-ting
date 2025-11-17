/**
 * Loading state for Team Management Page
 */

import { Card } from "flowbite-react";

export default function TeamLoadingPage() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-5 w-96 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Invite Collaborator Card Skeleton */}
      <Card>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-7 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-96 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Form fields skeleton */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            </div>

            <div className="space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <div className="h-6 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-6 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-6 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>

            <div className="flex justify-end">
              <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        </div>
      </Card>

      {/* Team Members Card Skeleton */}
      <Card>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-7 w-40 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Member list skeleton */}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="space-y-2">
                    <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
                <div className="h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Pending Invitations Card Skeleton */}
      <Card>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-7 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-72 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Invitation list skeleton */}
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="space-y-2">
                  <div className="h-5 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-4 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-8 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
