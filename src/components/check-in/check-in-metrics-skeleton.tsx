/**
 * Check-In Metrics Skeleton Component
 * Loading skeleton for metrics during async operations
 */

export function CheckInMetricsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Metrics Cards Skeleton */}
      <div
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        role="status"
        aria-label="Loading check-in statistics"
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-20 rounded bg-gray-200 sm:h-4 sm:w-24 dark:bg-gray-700"></div>
                <div className="h-6 w-12 rounded bg-gray-200 sm:h-8 sm:w-16 dark:bg-gray-700"></div>
              </div>
              <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200 sm:h-12 sm:w-12 dark:bg-gray-700"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar Skeleton */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="h-3 w-32 rounded bg-gray-200 sm:h-4 dark:bg-gray-700"></div>
            <div className="h-3 w-24 rounded bg-gray-200 sm:h-4 dark:bg-gray-700"></div>
          </div>
          <div className="h-4 w-full rounded-full bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </div>

      {/* Recent Check-Ins Skeleton */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 h-5 w-40 rounded bg-gray-200 sm:h-6 dark:bg-gray-700"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <div className="h-6 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="min-w-0 space-y-1">
                  <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700"></div>
                  <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
                </div>
              </div>
              <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading check-in metrics...</span>
    </div>
  );
}
