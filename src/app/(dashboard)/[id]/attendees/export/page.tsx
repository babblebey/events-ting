/**
 * Attendee Export Page
 * Standalone page for exporting attendee data with advanced options
 * Part of User Story 5: Buyer vs Attendee Communication (T074)
 */

import { api } from "@/trpc/server";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { AttendeeExportForm } from "@/components/attendees/attendee-export-form";

interface AttendeeExportPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function AttendeeExportPage({ params }: AttendeeExportPageProps) {
  const { id: eventId } = await params;

  // Verify event exists and user has access
  const event = await api.event.getById({ id: eventId });

  // Get attendee count for display
  const initialData = await api.attendees.list({
    eventId,
    limit: 1,
  });

  const totalAttendees = initialData.total;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: event.name, href: `/${eventId}` },
          { label: "Attendees", href: `/${eventId}/attendees` },
          { label: "Export" },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Export Attendees
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Export attendee data for {event.name} as a CSV file for use in
          spreadsheets or other tools
        </p>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              About Attendee Export
            </h3>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              <p>
                This export contains individual attendee data (people who were
                assigned tickets), not the original buyers. The CSV includes:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Attendee name and email</li>
                <li>Ticket number and type</li>
                <li>Check-in status and timestamp (if enabled)</li>
                <li>Custom registration fields (if enabled)</li>
              </ul>
              <p className="mt-2">
                <strong>Total Attendees:</strong>{" "}
                {totalAttendees.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Export Form */}
      <AttendeeExportForm eventId={eventId} totalAttendees={totalAttendees} />

      {/* Tips */}
      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          💡 Tips for Using Exported Data
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>
            • Use the exported CSV in Excel, Google Sheets, or other spreadsheet
            applications
          </li>
          <li>
            • Filter by email status to identify bounced or unsubscribed
            contacts
          </li>
          <li>• Include check-in status to track attendance and no-shows</li>
          <li>
            • Include custom fields to analyze attendee demographics or dietary
            restrictions
          </li>
          <li>
            • The export respects your current filter settings (email status,
            search terms)
          </li>
        </ul>
      </div>
    </div>
  );
}

export default AttendeeExportPage;
