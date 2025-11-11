/**
 * Events Dashboard Component
 * Client component for displaying and managing user's events
 * Phase 1: Basic layout and event display
 * Phase 2: Event card integration with full metadata
 * Phase 3: Events grid & list management with sorting and loading states
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Alert } from "flowbite-react";
import { HiRefresh } from "react-icons/hi";
import { EventCard, EventCardSkeleton } from "./event-card";
import { isPast } from "@/lib/utils/date";

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

export function EventsDashboard({ initialEvents }: EventsDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sort events on initial render
  const sortedEvents = sortEventsByDate(initialEvents.events);

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
    <div className="container mx-auto px-4 py-8">
      {/* Dashboard Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Events
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage all your events in one place
          </p>
        </div>
        <Link href="/create-event">
          <Button color="blue" size="lg">
            + Create Event
          </Button>
        </Link>
      </div>

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
      ) : sortedEvents.length === 0 ? (
        /* Empty State - No Events */
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 text-6xl">📅</div>
          <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
            Create Your First Event
          </h2>
          <p className="mx-auto mb-8 max-w-md text-gray-600 dark:text-gray-400">
            Start managing amazing events with Events Ting. It takes just a few
            minutes to get started.
          </p>
          <Link href="/create-event">
            <Button color="blue" size="lg">
              Create Your First Event
            </Button>
          </Link>
        </div>
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
  );
}
