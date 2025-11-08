import { CardListSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";

/**
 * Loading state for CFP management page
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      
      {/* CFP status card skeleton */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-4 flex gap-2">
            <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>

      {/* Submissions skeleton */}
      <div>
        <div className="mb-4 h-6 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <CardListSkeleton items={5} />
      </div>
    </div>
  );
}
