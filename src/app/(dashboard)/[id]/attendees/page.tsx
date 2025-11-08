import { use } from "react";
import { api } from "@/trpc/server";
import { AttendeeTable } from "@/components/registration/attendee-table";

interface AttendeesPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function AttendeesPage({ params }: AttendeesPageProps) {
  const { id: eventId } = await params;

  // Verify event exists and user has access
  const event = await api.event.getById({ id: eventId });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Attendees
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage registrations and export attendee data for {event.name}
        </p>
      </div>

      <AttendeeTable eventId={eventId} />
    </div>
  );
}

export default AttendeesPage;
