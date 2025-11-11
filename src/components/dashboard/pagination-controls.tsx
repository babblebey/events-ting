/**
 * Pagination Controls Component
 * Displays event count and "Load More" button for infinite scroll pagination
 * Phase 7: Pagination & Performance
 */

import { Button } from "flowbite-react";
import { HiChevronDown } from "react-icons/hi";

interface PaginationControlsProps {
  /** Current number of loaded events */
  currentCount: number;
  /** Total number of events across all pages */
  totalCount: number;
  /** Whether more events are being loaded */
  isLoading: boolean;
  /** Whether there are more events to load */
  hasMore: boolean;
  /** Callback to load more events */
  onLoadMore: () => void;
}

/**
 * Displays pagination controls with event count and load more button
 */
export function PaginationControls({
  currentCount,
  totalCount,
  isLoading,
  hasMore,
  onLoadMore,
}: PaginationControlsProps) {
  return (
    <div className="mt-8 space-y-4">
      {/* Event Count Display */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        Showing {currentCount} of {totalCount}{" "}
        {totalCount === 1 ? "event" : "events"}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            color="gray"
            onClick={onLoadMore}
            disabled={isLoading}
            className="min-w-[200px]"
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                Loading...
              </>
            ) : (
              <>
                <HiChevronDown className="mr-2 h-4 w-4" />
                Load More Events
              </>
            )}
          </Button>
        </div>
      )}

      {/* End of Results Message */}
      {!hasMore && currentCount > 0 && currentCount === totalCount && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          You&apos;ve reached the end of your events
        </div>
      )}
    </div>
  );
}
