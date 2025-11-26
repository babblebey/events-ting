/**
 * Loading Skeleton for Check-In Page
 * Displays skeleton UI while check-in data loads
 */

export default function CheckInLoadingPage() {
  return (
    <div className="container mx-auto max-w-7xl animate-pulse px-3 py-6 sm:px-4 sm:py-8">
      {/* Header Skeleton */}
      <div className="mb-6 sm:mb-8">
        <div className="h-8 w-48 rounded bg-gray-200 sm:h-9 sm:w-64 dark:bg-gray-700"></div>
        <div className="mt-2 h-4 w-64 rounded bg-gray-200 sm:h-5 sm:w-96 dark:bg-gray-700"></div>
      </div>

      {/* Metrics Skeleton */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-2 h-6 w-12 rounded bg-gray-200 sm:h-8 sm:w-16 dark:bg-gray-700"></div>
            <div className="h-3 w-20 rounded bg-gray-200 sm:h-4 sm:w-24 dark:bg-gray-700"></div>
          </div>
        ))}
      </div>

      {/* Search and Filters Skeleton */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:gap-4">
        <div className="h-10 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
        <div className="flex gap-2">
          <div className="h-10 flex-1 rounded bg-gray-200 sm:w-32 sm:flex-none dark:bg-gray-700"></div>
          <div className="h-10 w-full rounded bg-gray-200 sm:w-48 dark:bg-gray-700"></div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="min-w-[640px]">
          {/* Table Header */}
          <div className="border-b border-gray-200 p-3 sm:p-4 dark:border-gray-700">
            <div className="grid grid-cols-4 gap-4">
              <div className="h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
          </div>

          {/* Table Rows */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="border-b border-gray-200 p-3 last:border-b-0 sm:p-4 dark:border-gray-700"
            >
              <div className="grid grid-cols-4 gap-4">
                <div className="h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div className="h-5 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Skeleton */}
      <div className="mt-4 flex flex-col items-start gap-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-3 w-28 rounded bg-gray-200 sm:h-4 sm:w-32 dark:bg-gray-700"></div>
        <div className="flex w-full gap-2 sm:w-auto">
          <div className="h-10 flex-1 rounded bg-gray-200 sm:w-24 dark:bg-gray-700"></div>
          <div className="h-10 flex-1 rounded bg-gray-200 sm:w-24 dark:bg-gray-700"></div>
        </div>
      </div>
    </div>
  );
}
