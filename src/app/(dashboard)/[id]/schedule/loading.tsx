import {
  PageHeaderSkeleton,
  ScheduleTimelineSkeleton,
} from "@/components/ui/skeletons";

/**
 * Loading state for schedule management page
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />

      {/* Filters skeleton */}
      <div className="flex gap-2">
        <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>

      <ScheduleTimelineSkeleton />
    </div>
  );
}
