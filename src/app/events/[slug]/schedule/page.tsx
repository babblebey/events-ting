/**
 * Public Schedule Page
 * Display event schedule for attendees
 * FR-020: Public view of event schedule organized by date and track
 * FR-025: Track filtering and color coding
 */

import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import { ScheduleTimeline } from "@/components/schedule/schedule-timeline";

interface SchedulePageProps {
  params: Promise<{ slug: string }>;
}

export default async function SchedulePage({ params }: SchedulePageProps) {
  const { slug } = await params;

  // Fetch event
  const event = await api.event.getBySlug({ slug });

  if (!event) {
    redirect("/events");
  }

  // Only show schedule for published events
  if (event.status !== "published") {
    redirect("/events");
  }

  // Fetch schedule entries
  const entries = await api.schedule.list({ eventId: event.id });

  // Fetch tracks
  const tracks = await api.schedule.getTracks({ id: event.id });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Event Schedule
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            All times are in {event.timezone} timezone
          </p>
        </div>

        {/* Schedule Timeline */}
        {entries.length > 0 ? (
          <ScheduleTimeline
            entries={entries}
            timezone={event.timezone}
            tracks={tracks}
            showActions={false}
          />
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Schedule coming soon
            </p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Check back later for the full event schedule
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
