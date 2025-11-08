/**
 * Loading skeleton components for better perceived performance
 */

export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
      <div className="mb-2 h-4 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
      <div className="mb-2 h-4 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
      <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700"></div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="mb-2 flex items-center space-x-4 border-b border-gray-200 py-4 dark:border-gray-700"
        >
          <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="mb-6 h-8 w-1/3 rounded bg-gray-200 dark:bg-gray-700"></div>
      <div className="grid gap-4 md:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="mt-8">
        <div className="mb-4 h-6 w-1/4 rounded bg-gray-200 dark:bg-gray-700"></div>
        <TableSkeleton />
      </div>
    </div>
  );
}
