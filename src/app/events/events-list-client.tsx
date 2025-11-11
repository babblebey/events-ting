"use client";

import { Button } from "flowbite-react";
import { api } from "@/trpc/react";
import { EventCard } from "@/components/events/event-card";
import { EmptyState } from "@/components/ui/empty-state";

export function EventsListClient() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    api.event.list.useInfiniteQuery(
      {
        limit: 12,
        status: "published",
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  if (isLoading) {
    return <EventsListSkeleton />;
  }

  const events = data?.pages.flatMap((page) => page.events) ?? [];

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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={{
              ...event,
              locationType: event.locationType as
                | "in-person"
                | "virtual"
                | "hybrid",
            }}
            showOrganizer
          />
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            color="light"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading..." : "Load More Events"}
          </Button>
        </div>
      )}
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
