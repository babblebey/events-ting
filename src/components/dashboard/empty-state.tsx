/**
 * Empty State Component
 * Different empty states based on filter status
 * Phase 4: Status Filtering
 */

"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "flowbite-react";

type EmptyStateType = "no-events" | "no-match";

interface EmptyStateProps {
  type?: EmptyStateType;
  activeFilter?: string;
}

export function EmptyState({ type = "no-events", activeFilter }: EmptyStateProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Clear all filters and return to "All" view
   */
  const handleViewAllEvents = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    router.push(`/dashboard?${params.toString()}`, { scroll: false });
  };

  if (type === "no-events") {
    // No events created at all
    return (
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
    );
  }

  // No events match the current filter
  const filterLabel = activeFilter
    ? activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)
    : "Filtered";

  const getFilterMessage = () => {
    switch (activeFilter) {
      case "draft":
        return "You don't have any draft events. All your events are published!";
      case "published":
        return "You don't have any published events yet.";
      case "archived":
        return "You don't have any archived events.";
      default:
        return "No events match your current filter.";
    }
  };

  return (
    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 text-6xl">🔍</div>
      <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
        No {filterLabel} Events Found
      </h2>
      <p className="mx-auto mb-8 max-w-md text-gray-600 dark:text-gray-400">
        {getFilterMessage()}
      </p>
      <Button color="blue" size="lg" onClick={handleViewAllEvents} className="m-auto">
        View All Events
      </Button>
    </div>
  );
}
