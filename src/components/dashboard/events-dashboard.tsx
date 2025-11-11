/**
 * Events Dashboard Component
 * Client component for displaying and managing user's events
 * Phase 1: Basic layout and event display
 * Phase 2: Event card integration with full metadata
 */

"use client";

import Link from "next/link";
import { EventCard } from "./event-card";

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

export function EventsDashboard({ initialEvents }: EventsDashboardProps) {
  const { events } = initialEvents;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Events</h1>
        <p className="mt-2 text-gray-600">Manage all your events in one place</p>
      </div>

      {/* Empty state when no events exist */}
      {events.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-4 text-4xl">📅</div>
          <h2 className="mb-2 text-2xl font-bold">Create Your First Event</h2>
          <p className="mb-6 text-gray-600">
            Start managing amazing events with Events Ting. It takes just a few minutes to get started.
          </p>
          <Link
            href="/create-event"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700"
          >
            Create Your First Event
          </Link>
        </div>
      ) : (
        /* Events grid using new EventCard component */
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
