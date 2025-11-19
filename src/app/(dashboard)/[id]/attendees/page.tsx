import { api } from "@/trpc/server";
import { AttendeeList } from "@/components/attendees/attendee-list";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "flowbite-react";
import { HiUpload, HiDownload } from "react-icons/hi";
import Link from "next/link";

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
      <Breadcrumbs
        items={[
          { label: event.name, href: `/${eventId}` },
          { label: "Attendees" },
        ]}
      />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Attendees
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View individual attendees, filter by email status, and export attendee data for {event.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${eventId}/attendees/export`}>
            <Button color="gray">
              <HiDownload className="mr-2 h-5 w-5" />
              Export CSV
            </Button>
          </Link>
          <Link href={`/${eventId}/attendees/import`}>
            <Button color="blue">
              <HiUpload className="mr-2 h-5 w-5" />
              Import Attendees
            </Button>
          </Link>
        </div>
      </div>

      <AttendeeList eventId={eventId} />
    </div>
  );
}

export default AttendeesPage;
