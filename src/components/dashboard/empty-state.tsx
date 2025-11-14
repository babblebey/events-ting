/**
 * Empty State Component
 * Different empty states based on filter status and context
 * Phase 6: Enhanced with better icons, illustrations, and responsive design
 */

"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "flowbite-react";
import {
  HiCalendar,
  HiSearch,
  HiDocumentText,
  HiCheckCircle,
  HiArchive,
  HiPlus,
  HiViewGrid,
} from "react-icons/hi";

type EmptyStateType = "no-events" | "no-match";

interface EmptyStateProps {
  type?: EmptyStateType;
  activeFilter?: string;
}

/**
 * Get appropriate icon component based on filter type
 */
function getFilterIcon(filter?: string) {
  switch (filter) {
    case "draft":
      return HiDocumentText;
    case "published":
      return HiCheckCircle;
    case "archived":
      return HiArchive;
    default:
      return HiSearch;
  }
}

/**
 * Get filter-specific content (title, message, icon)
 */
function getFilterContent(filter?: string) {
  switch (filter) {
    case "draft":
      return {
        title: "No Draft Events Found",
        message:
          "You don't have any draft events. All your events are published! Keep up the great work.",
        suggestion: "Create a new event to start working on your next project.",
      };
    case "published":
      return {
        title: "No Published Events",
        message:
          "You don't have any published events yet. Publish your draft events to make them visible to attendees.",
        suggestion: "Check your draft events or create a new one to get started.",
      };
    case "archived":
      return {
        title: "No Archived Events",
        message:
          "You haven't archived any events yet. Archive past events to keep your dashboard organized.",
        suggestion: "Archive events you're no longer actively managing.",
      };
    default:
      return {
        title: "No Events Found",
        message: "No events match your current filter criteria.",
        suggestion: "Try adjusting your filters or view all events.",
      };
  }
}

export function EmptyState({
  type = "no-events",
  activeFilter,
}: EmptyStateProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Clear all filters and return to "All" view
   */
  const handleViewAllEvents = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    const queryString = params.toString();
    router.push(`/dashboard${queryString ? "?" + queryString : ""}`, { scroll: false });
  };

  // No events created at all
  if (type === "no-events") {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white px-6 py-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:px-12 sm:py-16">
          {/* Icon/Illustration */}
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
            <HiCalendar className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>

          {/* Title */}
          <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Create Your First Event
          </h2>

          {/* Description */}
          <p className="mx-auto mb-2 max-w-md text-base text-gray-600 dark:text-gray-400 sm:text-lg">
            Start managing amazing events with Events Ting. It takes just a few
            minutes to get started.
          </p>

          {/* Additional info */}
          <p className="mx-auto mb-8 max-w-md text-sm text-gray-500 dark:text-gray-500">
            Set up your event details, manage registrations, handle CFP
            submissions, and much more.
          </p>

          {/* CTA Button */}
          <Link href="/create-event">
            <Button color="blue" size="lg" className="mx-auto">
              <HiPlus className="mr-2 h-5 w-5" />
              Create Your First Event
            </Button>
          </Link>

          {/* Help text */}
          <p className="mt-6 text-xs text-gray-500 dark:text-gray-500">
            Need help getting started?{" "}
            <Link
              href="/docs/getting-started"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              View documentation
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // No events match the current filter
  const FilterIcon = getFilterIcon(activeFilter);
  const content = getFilterContent(activeFilter);

  return (
    <div className="mx-auto">
      <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white px-6 py-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:px-12 sm:py-16">
        {/* Icon/Illustration */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-700/50">
          <FilterIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
        </div>

        {/* Title */}
        <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          {content.title}
        </h2>

        {/* Description */}
        <p className="mx-auto mb-2 max-w-md text-base text-gray-600 dark:text-gray-400 sm:text-lg">
          {content.message}
        </p>

        {/* Suggestion */}
        <p className="mx-auto mb-8 max-w-md text-sm text-gray-500 dark:text-gray-500">
          {content.suggestion}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            color="blue"
            size="lg"
            onClick={handleViewAllEvents}
            className="w-full sm:w-auto"
          >
            <HiViewGrid className="mr-2 h-5 w-5" />
            View All Events
          </Button>

          <Link href="/create-event" className="w-full sm:w-auto">
            <Button color="light" size="lg" className="w-full">
              <HiPlus className="mr-2 h-5 w-5" />
              Create New Event
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
