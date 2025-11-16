/**
 * Team Member Card Skeleton Component
 *
 * Loading skeleton placeholder for team member cards
 *
 * @module components/team/team-member-skeleton
 */

import { Card } from "flowbite-react";

export function TeamMemberSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        {/* Avatar Skeleton */}
        <div className="shrink-0">
          <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Content Skeleton */}
        <div className="min-w-0 flex-1 space-y-3">
          {/* Name Skeleton */}
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Badges Skeleton */}
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Module Permissions Skeleton */}
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="flex flex-wrap gap-2">
              <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>

          {/* Metadata Skeleton */}
          <div className="flex gap-2">
            <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-40 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>

        {/* Action Buttons Skeleton */}
        <div className="flex gap-2 sm:flex-col">
          <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Multiple Team Member Skeletons
 */
export function TeamMemberListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading team members">
      {Array.from({ length: count }).map((_, i) => (
        <TeamMemberSkeleton key={i} />
      ))}
      <span className="sr-only">Loading team members...</span>
    </div>
  );
}
