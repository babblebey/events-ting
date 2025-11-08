"use client";

/**
 * EventCard Component
 * Displays event summary in a card format for list views
 */

import { Badge, Button, Card } from "flowbite-react";
import { Calendar, MapPin, Users, Video } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils/date";

interface EventCardProps {
  event: {
    id: string;
    slug: string;
    name: string;
    description: string;
    locationType: "in-person" | "virtual" | "hybrid";
    locationAddress?: string | null;
    locationUrl?: string | null;
    startDate: Date;
    endDate: Date;
    status: string;
    isArchived: boolean;
    timezone: string;
    organizer?: {
      name: string | null;
      image: string | null;
    };
    _count?: {
      registrations: number;
      ticketTypes: number;
    };
  };
  showActions?: boolean;
  showOrganizer?: boolean;
}

export function EventCard({
  event,
  showActions = false,
  showOrganizer = true,
}: EventCardProps) {
  const isUpcoming = new Date(event.startDate) > new Date();
  const isPast = new Date(event.endDate) < new Date();

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="flex flex-col gap-4">
        {/* Header with badges */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link
              href={
                showActions ? `/(dashboard)/${event.id}` : `/events/${event.slug}`
              }
              className="hover:text-primary-600"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2">
                {event.name}
              </h3>
            </Link>
            {showOrganizer && event.organizer && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                by {event.organizer.name ?? "Unknown"}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {event.isArchived && <Badge color="gray">Archived</Badge>}
            {event.status === "draft" && <Badge color="warning">Draft</Badge>}
            {event.status === "published" && isUpcoming && (
              <Badge color="success">Upcoming</Badge>
            )}
            {isPast && !event.isArchived && <Badge color="info">Past</Badge>}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
          {event.description}
        </p>

        {/* Event details */}
        <div className="space-y-2">
          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDate(event.startDate, event.timezone, "PPP")}
              {new Date(event.endDate).toDateString() !==
                new Date(event.startDate).toDateString() &&
                ` - ${formatDate(event.endDate, event.timezone, "PPP")}`}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {event.locationType === "virtual" ? (
              <>
                <Video className="h-4 w-4" />
                <span>Virtual Event</span>
              </>
            ) : event.locationType === "hybrid" ? (
              <>
                <MapPin className="h-4 w-4" />
                <span>
                  Hybrid (In-person + Virtual)
                  {event.locationAddress && ` - ${event.locationAddress}`}
                </span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                <span>{event.locationAddress ?? "Location TBA"}</span>
              </>
            )}
          </div>

          {/* Attendee count */}
          {event._count && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="h-4 w-4" />
              <span>
                {event._count.registrations} registered
                {event._count.ticketTypes > 0 &&
                  ` · ${event._count.ticketTypes} ticket type${event._count.ticketTypes > 1 ? "s" : ""}`}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions ? (
          <div className="flex gap-2 pt-2">
            <Link href={`/(dashboard)/${event.id}`} className="flex-1">
              <Button size="sm" className="w-full">
                Manage Event
              </Button>
            </Link>
            <Link href={`/events/${event.slug}`}>
              <Button size="sm" color="gray">
                View Public Page
              </Button>
            </Link>
          </div>
        ) : (
          <div className="pt-2">
            <Link href={`/events/${event.slug}`} className="block">
              <Button size="sm" className="w-full">
                View Event Details
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
