import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeletons";

/**
 * Loading state for attendees management page
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      
      {/* Search and filter skeletons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 sm:w-64" />
        <div className="flex gap-2">
          <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>

      <TableSkeleton rows={10} />
    </div>
  );
}
