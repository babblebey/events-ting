/**
 * Events Dashboard Component
 * Client component for displaying and managing user's events
 * Phase 1: Basic layout and event display
 * Phase 2: Event card integration with full metadata
 * Phase 3: Events grid & list management with sorting and loading states
 * Phase 4: Status filtering with counts
 * Phase 7: Pagination & Performance with infinite query
 */

"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Alert } from "flowbite-react";
import { HiRefresh } from "react-icons/hi";
import { EventCard, EventCardSkeleton } from "./event-card";
import { StatusFilter } from "./status-filter";
import { EmptyState } from "./empty-state";
import { DashboardHeader } from "./dashboard-header";
import { PaginationControls } from "./pagination-controls";
import { isPast } from "@/lib/utils/date";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";

type Event = RouterOutputs["event"]["list"]["events"][number];

interface EventsDashboardProps {
  initialEvents: RouterOutputs["event"]["list"];
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

/**
 * Sort events by date: upcoming events first (soonest first), then past events (most recent first)
 * @param events - Array of events to sort
 * @returns Sorted array of events
 */
function sortEventsByDate(events: Event[]): Event[] {
  // Separate upcoming and past events
  const upcomingEvents: Event[] = [];
  const pastEvents: Event[] = [];

  events.forEach((event) => {
    if (isPast(event.endDate, event.timezone)) {
      pastEvents.push(event);
    } else {
      upcomingEvents.push(event);
    }
  });

  // Sort upcoming events: soonest first (ascending by startDate)
  upcomingEvents.sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  // Sort past events: most recent first (descending by startDate)
  pastEvents.sort((a, b) => {
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  // Combine: upcoming first, then past
  return [...upcomingEvents, ...pastEvents];
}

export function EventsDashboard({ initialEvents, user }: EventsDashboardProps) {
  const searchParams = useSearchParams();
  const activeFilter = searchParams.get("status") as "draft" | "published" | "archived" | undefined;

  // Fetch status counts for filter badges
  const { data: statusCounts, isLoading: isLoadingCounts } =
    api.event.getStatusCounts.useQuery();

  // Use infinite query for pagination with cursor-based approach
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = api.event.list.useInfiniteQuery(
    {
      organizerId: user.id,
      status: activeFilter,
      limit: 20,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialData: {
        pages: [initialEvents],
        pageParams: [undefined],
      },
      // React Query caching strategy
      staleTime: 1000 * 60 * 5, // 5 minutes - data is considered fresh
      gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
      refetchOnMount: false, // Don't refetch on component mount (use initialData)
    }
  );

  // Flatten all pages into a single array of events
  const allEvents = useMemo(() => {
    return data?.pages.flatMap((page) => page.events) ?? [];
  }, [data?.pages]);

  // Sort events on render: upcoming first (soonest first), then past (most recent first)
  const sortedEvents = useMemo(() => sortEventsByDate(allEvents), [allEvents]);

  // Get total count from the first page (all pages have the same totalCount)
  const totalCount = data?.pages[0]?.totalCount ?? 0;
  const currentCount = sortedEvents.length;

  // Determine if we should show "no events" or "no match" empty state
  const hasNoEvents = statusCounts?.all === 0;
  const hasNoMatchingEvents = sortedEvents.length === 0 && !hasNoEvents;

  /**
   * Handle retry when there's an error
   */
  const handleRetry = () => {
    void refetch();
  };

  /**
   * Handle loading more events
   */
  const handleLoadMore = () => {
    void fetchNextPage();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Dashboard Header */}
      <DashboardHeader user={user} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Status Filter */}
        <StatusFilter
          statusCounts={statusCounts}
          isLoading={isLoadingCounts}
        />

        {/* Error State */}
        {isError && (
          <Alert color="failure" className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">Error loading events:</span>{" "}
                {error?.message ?? "An unexpected error occurred"}
              </div>
              <Button color="failure" size="sm" onClick={handleRetry}>
                <HiRefresh className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <EventCardSkeleton key={index} />
            ))}
          </div>
        ) : hasNoEvents ? (
          /* Empty State - No Events Created */
          <EmptyState type="no-events" />
        ) : hasNoMatchingEvents ? (
          /* Empty State - No Events Match Filter */
          <EmptyState type="no-match" activeFilter={activeFilter} />
        ) : (
          /* Events Grid */
          <>
            {/* Responsive Grid Layout */}
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {sortedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {/* Pagination Controls */}
            <PaginationControls
              currentCount={currentCount}
              totalCount={totalCount}
              isLoading={isFetchingNextPage}
              hasMore={hasNextPage ?? false}
              onLoadMore={handleLoadMore}
            />
          </>
        )}
      </div>
    </div>
  );
}
