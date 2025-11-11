/**
 * Dashboard Event Card Component
 * Specialized card component for displaying events in the user dashboard
 * Features: Status badges, metadata display, action buttons, responsive design
 */

"use client";

import Link from "next/link";
import { Card, Badge, Button } from "flowbite-react";
import {
  HiOutlineCalendar,
  HiOutlineVideoCamera,
  HiOutlineOfficeBuilding,
} from "react-icons/hi";
import { HiOutlineMapPin } from "react-icons/hi2";
import { FiUsers } from "react-icons/fi";
import { formatDateRange, isPast } from "@/lib/utils/date";
import type { RouterOutputs } from "@/trpc/react";

type Event = RouterOutputs["event"]["list"]["events"][number];

interface EventCardProps {
  event: Event;
}

/**
 * Get status badge color variant based on event status
 */
function getStatusBadgeColor(
  status: string,
): "warning" | "success" | "gray" | "info" {
  switch (status) {
    case "draft":
      return "warning";
    case "published":
      return "success";
    case "archived":
      return "gray";
    default:
      return "info";
  }
}

/**
 * Get status badge label based on event status
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "published":
      return "Published";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

/**
 * Get location icon and label based on location type
 */
function getLocationDisplay(
  locationType: string,
  locationAddress: string | null,
): { icon: React.ReactElement; label: string } {
  switch (locationType) {
    case "virtual":
      return {
        icon: <HiOutlineVideoCamera className="h-4 w-4 shrink-0" />,
        label: "Virtual Event",
      };
    case "hybrid":
      return {
        icon: <HiOutlineOfficeBuilding className="h-4 w-4 shrink-0" />,
        label: locationAddress
          ? `Hybrid - ${locationAddress}`
          : "Hybrid (In-person + Virtual)",
      };
    case "in-person":
    default:
      return {
        icon: <HiOutlineMapPin className="h-4 w-4 shrink-0" />,
        label: locationAddress ?? "Location TBA",
      };
  }
}

/**
 * Dashboard Event Card
 * Displays event summary with metadata, status badge, and action buttons
 */
export function EventCard({ event }: EventCardProps) {
  const isEventPast = isPast(event.endDate, event.timezone);
  const location = getLocationDisplay(event.locationType, event.locationAddress);
  const statusColor = getStatusBadgeColor(event.status);
  const statusLabel = getStatusLabel(event.status);

  return (
    <Card className="group transition-all duration-200 hover:shadow-xl">
      <div className="flex flex-col gap-4">
        {/* Header with title and status badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              href={`/${event.id}`}
              className="group/link block transition-colors hover:text-primary-600 dark:hover:text-primary-400"
            >
              <h3 className="line-clamp-2 text-xl font-bold text-gray-900 transition-colors dark:text-white">
                {event.name}
              </h3>
            </Link>
          </div>
          <Badge color={statusColor} size="sm" className="shrink-0">
            {statusLabel}
          </Badge>
        </div>

        {/* Description */}
        {event.description && (
          <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
            {event.description}
          </p>
        )}

        {/* Metadata section */}
        <div className="space-y-2.5">
          {/* Date */}
          <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <HiOutlineCalendar className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-medium">
                {formatDateRange(event.startDate, event.endDate, event.timezone)}
              </span>
              {isEventPast && (
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  Past event
                </span>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {location.icon}
            <span className="line-clamp-1">{location.label}</span>
          </div>

          {/* Attendees */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <FiUsers className="h-4 w-4 shrink-0" />
            <span>
              {event._count.registrations}{" "}
              {event._count.registrations === 1 ? "attendee" : "attendees"}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Link href={`/${event.id}`} className="flex-1">
            <Button
              size="sm"
              className="w-full"
              color="blue"
            >
              Manage
            </Button>
          </Link>
          <Link href={`/${event.id}/settings`} className="flex-1">
            <Button size="sm" color="gray" className="w-full">
              Edit
            </Button>
          </Link>
          <Link
            href={`/events/${event.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button size="sm" color="light" className="w-full">
              View Event
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

/**
 * Loading skeleton for event card
 * Displays while event data is being fetched
 */
export function EventCardSkeleton() {
  return (
    <Card>
      <div className="flex flex-col gap-4">
        {/* Header skeleton */}
        <div className="flex items-start justify-between gap-3">
          <div className="h-7 w-3/4 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-gray-300 dark:bg-gray-700" />
        </div>

        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
        </div>

        {/* Metadata skeleton */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
            <div className="h-4 w-48 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
            <div className="h-4 w-40 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
            <div className="h-4 w-32 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
          </div>
        </div>

        {/* Buttons skeleton */}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <div className="h-9 flex-1 animate-pulse rounded-lg bg-gray-300 dark:bg-gray-700" />
          <div className="h-9 flex-1 animate-pulse rounded-lg bg-gray-300 dark:bg-gray-700" />
          <div className="h-9 flex-1 animate-pulse rounded-lg bg-gray-300 dark:bg-gray-700" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Event card skeleton with image placeholder
 * Used when event has a banner image
 */
export function EventCardSkeletonWithImage() {
  return (
    <Card>
      <div className="flex flex-col gap-4">
        {/* Image skeleton */}
        <div className="relative -mx-6 -mt-6 mb-2 h-48 w-[calc(100%+3rem)] animate-pulse rounded-t-lg bg-gray-300 dark:bg-gray-700" />

        {/* Header skeleton */}
        <div className="flex items-start justify-between gap-3">
          <div className="h-7 w-3/4 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-gray-300 dark:bg-gray-700" />
        </div>

        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
        </div>

        {/* Metadata skeleton */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
            <div className="h-4 w-48 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
            <div className="h-4 w-40 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
            <div className="h-4 w-32 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
          </div>
        </div>

        {/* Buttons skeleton */}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <div className="h-9 flex-1 animate-pulse rounded-lg bg-gray-300 dark:bg-gray-700" />
          <div className="h-9 flex-1 animate-pulse rounded-lg bg-gray-300 dark:bg-gray-700" />
          <div className="h-9 flex-1 animate-pulse rounded-lg bg-gray-300 dark:bg-gray-700" />
        </div>
      </div>
    </Card>
  );
}
