/**
 * Loading Skeleton for Check-In Page
 * Displays skeleton UI while check-in data loads
 */

export default function CheckInLoadingPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-9 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="mt-2 h-5 w-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>

      {/* Metrics Skeleton */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>

      {/* Search and Filters Skeleton */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="h-10 w-full max-w-md bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div>
          <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {/* Table Header */}
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="grid grid-cols-4 gap-4">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>

        {/* Table Rows */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="border-b border-gray-200 p-4 dark:border-gray-700 last:border-b-0"
          >
            <div className="grid grid-cols-4 gap-4">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="mt-6 flex items-center justify-between">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>
  );
}
