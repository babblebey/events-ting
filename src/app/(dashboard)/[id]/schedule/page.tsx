/**
 * Schedule Management Page
 * Dashboard page for organizers to manage event schedule
 * FR-019: Create and edit schedule entries
 * FR-021: View schedule with overlap detection
 */

import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import { getServerAuthSession } from "@/server/auth";
import { ScheduleManager } from "./schedule-manager";

interface SchedulePageProps {
  params: Promise<{ id: string }>;
}

export default async function SchedulePage({ params }: SchedulePageProps) {
  const { id } = await params;
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/auth/signin");
  }

  // Fetch event to verify ownership and get timezone
  const event = await api.event.getById({ id });

  if (!event) {
    redirect("/events");
  }

  // Verify user is the organizer
  if (event.organizerId !== session.user.id) {
    redirect(`/events/${event.slug}`);
  }

  // Fetch schedule entries
  const entries = await api.schedule.list({ eventId: id });

  // Fetch tracks
  const tracks = await api.schedule.getTracks({ id });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Schedule
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your event schedule and sessions
        </p>
      </div>

      <ScheduleManager
        eventId={id}
        eventTimezone={event.timezone}
        initialEntries={entries}
        initialTracks={tracks}
      />
    </div>
  );
}
