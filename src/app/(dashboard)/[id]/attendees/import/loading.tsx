import { PageHeaderSkeleton } from "@/components/ui/skeletons";
import { Card } from "flowbite-react";

/**
 * Loading state for import attendees page
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />

      {/* Wizard card skeleton */}
      <Card>
        <div className="space-y-6">
          {/* Step indicator skeleton */}
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-2 w-full animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Content skeleton */}
          <div className="space-y-4">
            <div className="h-48 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="flex justify-end gap-3">
              <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
              <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
