import { api } from "@/trpc/server";
import { ImportWizard } from "@/components/attendees/import-wizard";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "flowbite-react";
import { HiArrowLeft } from "react-icons/hi";
import Link from "next/link";

interface ImportPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function ImportPage({ params }: ImportPageProps) {
  const { id: eventId } = await params;

  // Verify event exists and user has access
  const event = await api.event.getById({ id: eventId });

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: event.name, href: `/${eventId}` },
          { label: "Attendees", href: `/${eventId}/attendees` },
          { label: "Import" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Import Attendees
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Upload a CSV file to bulk import attendees for {event.name}
          </p>
        </div>
        <Link href={`/${eventId}/attendees`}>
          <Button color="gray" size="sm">
            <HiArrowLeft className="mr-2 h-4 w-4" />
            Back to Attendees
          </Button>
        </Link>
      </div>

      <ImportWizard eventId={eventId} eventName={event.name} />
    </div>
  );
}

export default ImportPage;
