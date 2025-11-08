/**
 * Events Listing Page (Public)
 * Shows all published events in a grid layout
 */

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "flowbite-react";
import { HiOutlinePlusCircle } from "react-icons/hi";;
import { api } from "@/trpc/server";
import { EventCard } from "@/components/events/event-card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Events | Events Ting",
  description: "Browse and discover upcoming events",
};

export default async function EventsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Discover Events
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Browse upcoming conferences, meetups, and workshops
          </p>
        </div>
        <Link href="/auth/signin">
          <Button>
            <HiOutlinePlusCircle className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </Link>
      </div>

      <Suspense fallback={<EventsListSkeleton />}>
        <EventsList />
      </Suspense>
    </div>
  );
}

async function EventsList() {
  const { events } = await api.event.list({
    limit: 20,
    status: "published",
  });

  if (events.length === 0) {
    return (
      <EmptyState
        title="No events found"
        description="There are no public events available at the moment. Check back later!"
        icon="calendar"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={{
            ...event,
            locationType: event.locationType as "in-person" | "virtual" | "hybrid",
          }}
          showOrganizer
        />
      ))}
    </div>
  );
}

function EventsListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"
        />
      ))}
    </div>
  );
}

