/**
 * Events Dashboard Component
 * Client component for displaying and managing user's events
 * Phase 1: Basic layout and event display
 * Phase 2: Event card integration with full metadata
 * Phase 3: Events grid & list management with sorting and loading states
 * Phase 4: Status filtering with counts
 */

"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Alert } from "flowbite-react";
import { HiRefresh } from "react-icons/hi";
import { EventCard, EventCardSkeleton } from "./event-card";
import { StatusFilter } from "./status-filter";
import { EmptyState } from "./empty-state";
import { DashboardHeader } from "./dashboard-header";
import { isPast } from "@/lib/utils/date";
import { api } from "@/trpc/react";

interface Event {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  timezone: string;
  locationType: "in-person" | "virtual" | "hybrid";
  locationAddress: string | null;
  locationUrl: string | null;
  status: "draft" | "published" | "archived";
  isArchived: boolean;
  bannerImageUrl?: string | null;
  organizer: {
    id: string;
    name: string | null;
    image: string | null;
  };
  _count: {
    registrations: number;
    ticketTypes: number;
  };
}

interface EventsDashboardProps {
  initialEvents: {
    events: Event[];
    nextCursor?: string;
  };
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const activeFilter = searchParams.get("status") ?? undefined;

  // Fetch status counts for filter badges
  const { data: statusCounts, isLoading: isLoadingCounts } =
    api.event.getStatusCounts.useQuery();

  // Sort events on initial render
  const sortedEvents = sortEventsByDate(initialEvents.events);

  // Determine if we should show "no events" or "no match" empty state
  const hasNoEvents = statusCounts?.all === 0;
  const hasNoMatchingEvents = sortedEvents.length === 0 && !hasNoEvents;

  /**
   * Handle retry when there's an error
   */
  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    // Reload the page to refetch data
    window.location.reload();
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
        {error && (
          <Alert color="failure" className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">Error loading events:</span> {error}
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
            {/* Event Count Info */}
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Showing {sortedEvents.length}{" "}
              {sortedEvents.length === 1 ? "event" : "events"}
            </div>

            {/* Responsive Grid Layout */}
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {sortedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
