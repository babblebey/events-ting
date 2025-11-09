/**
 * Public Event Page
 * Server Component displaying event details for attendees
 */

import Link from "next/link";
import { api } from "@/trpc/server";
import { Badge, Button, Card } from "flowbite-react";
import { LuMicVocal } from "react-icons/lu";
import { FiUsers } from "react-icons/fi";
import { HiOutlineMapPin } from "react-icons/hi2";
import { HiOutlineCalendar, HiOutlineExternalLink, HiOutlineVideoCamera } from "react-icons/hi";
import { formatDate, formatDateRange } from "@/lib/utils/date";
import type { Metadata } from "next";

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { slug: eventSlug } = await params;
  const event = await api.event.getBySlug({ slug: eventSlug });

  return {
    title: `${event.name} | Events Ting`,
    description: event.description.substring(0, 160),
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug: eventSlug } = await params;
  const event = await api.event.getBySlug({ slug: eventSlug });

  const isUpcoming = new Date(event.startDate) > new Date();
  const isPast = new Date(event.endDate) < new Date();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge color={isUpcoming ? "success" : isPast ? "info" : "gray"}>
              {isUpcoming ? "Upcoming" : isPast ? "Past Event" : "Ongoing"}
            </Badge>
            <Badge color="purple">{event.locationType}</Badge>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            {event.name}
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-400">
            {event.description}
          </p>

          {/* Organizer Info */}
          {event.organizer && (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 dark:bg-primary-900 dark:text-primary-300">
                {event.organizer.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Organized by
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {event.organizer.name}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Event Details */}
        <Card>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Event Details
            </h2>

            <div className="space-y-3">
              {/* Date */}
              <div className="flex items-start gap-3">
                <HiOutlineCalendar className="mt-1 h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDateRange(event.startDate, event.endDate, event.timezone)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {event.timezone}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3">
                {event.locationType === "virtual" ? (
                  <HiOutlineVideoCamera className="mt-1 h-5 w-5 text-gray-400" />
                ) : (
                  <HiOutlineMapPin className="mt-1 h-5 w-5 text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {event.locationType === "virtual"
                      ? "Virtual Event"
                      : event.locationType === "hybrid"
                        ? "Hybrid Event"
                        : "In-Person Event"}
                  </p>
                  {event.locationAddress && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {event.locationAddress}
                    </p>
                  )}
                  {event.locationUrl && (
                    <a
                      href={event.locationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 text-sm text-primary-600 hover:underline dark:text-primary-400"
                    >
                      Join virtually
                      <HiOutlineExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Attendees */}
              {event._count && (
                <div className="flex items-start gap-3">
                  <FiUsers className="mt-1 h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {event._count.registrations} people registered
                    </p>
                    {event._count.speakers > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {event._count.speakers} speaker{event._count.speakers > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Registration CTA */}
        {isUpcoming && event.ticketTypes && event.ticketTypes.length > 0 && (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Ready to attend?
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {event.ticketTypes.length} ticket type{event.ticketTypes.length > 1 ? "s" : ""}{" "}
                  available
                </p>
              </div>
              <Link href={`/events/${eventSlug}/register`}>
                <Button size="lg">Register Now</Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {event._count?.scheduleEntries && event._count.scheduleEntries > 0 && (
            <Link href={`/events/${eventSlug}/schedule`}>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <HiOutlineCalendar className="mx-auto h-8 w-8 text-primary-600 dark:text-primary-400" />
                  <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">
                    View Schedule
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {event._count.scheduleEntries} session{event._count.scheduleEntries > 1 ? "s" : ""}
                  </p>
                </div>
              </Card>
            </Link>
          )}

          {event._count?.speakers && event._count.speakers > 0 && (
            <Link href={`/events/${eventSlug}/speakers`}>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <FiUsers className="mx-auto h-8 w-8 text-primary-600 dark:text-primary-400" />
                  <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">
                    Meet Speakers
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {event._count.speakers} speaker{event._count.speakers > 1 ? "s" : ""}
                  </p>
                </div>
              </Card>
            </Link>
          )}

          <Link href={`/events/${eventSlug}/cfp`}>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <div className="text-center">
                <LuMicVocal className="mx-auto h-8 w-8 text-primary-600 dark:text-primary-400" />
                <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">
                  Submit Talk
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Call for Papers
                </p>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
