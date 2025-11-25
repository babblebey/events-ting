/**
 * Attendee List Skeleton Component
 * Loading skeleton for attendee list during async operations
 */

export function AttendeeListSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Table Skeleton */}
      <div
        className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        role="status"
        aria-label="Loading attendee list"
      >
        <div className="min-w-[640px] p-4">
          {/* Header */}
          <div className="mb-4 grid grid-cols-6 gap-4">
            <div className="h-4 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-4 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-4 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-4 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-4 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>

          {/* Rows */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="mb-3 grid grid-cols-6 gap-4 border-t border-gray-200 pt-3 dark:border-gray-700"
            >
              <div className="h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-5 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Skeleton */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700"></div>
        <div className="flex gap-2">
          <div className="h-10 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-10 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </div>

      <span className="sr-only">Loading attendee list...</span>
    </div>
  );
}
