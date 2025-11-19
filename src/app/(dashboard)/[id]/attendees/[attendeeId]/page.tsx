/**
 * Attendee Detail View Page
 * Displays individual attendee information including custom field responses
 */

import { api } from "@/trpc/server";
import { Card, Badge, Button } from "flowbite-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { HiArrowLeft, HiMail, HiTicket, HiCheckCircle, HiXCircle, HiClock } from "react-icons/hi";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface AttendeeDetailPageProps {
  params: Promise<{
    id: string;
    attendeeId: string;
  }>;
}

export default async function AttendeeDetailPage({
  params,
}: AttendeeDetailPageProps) {
  const { id: eventId, attendeeId } = await params;

  // Fetch event and attendee data
  const [event, attendee] = await Promise.all([
    api.event.getById({ id: eventId }),
    api.attendees.getById({ attendeeId }),
  ]);

  // Parse custom fields from event.customFields
  const customFieldDefinitions: Array<{
    id: string;
    label: string;
    type: string;
  }> = Array.isArray(event.customFields)
    ? (event.customFields as Array<{
        id: string;
        label: string;
        type: string;
      }>)
    : [];

  // Format custom field responses
  const customResponses = customFieldDefinitions.map((field) => {
    const response = attendee.customData?.[field.id];
    let displayValue = 'Not provided';
    const hasValue = response !== undefined && response !== null && response !== '';
    
    if (hasValue) {
      if (Array.isArray(response)) {
        displayValue = response.join(', ');
      } else if (typeof response === 'object') {
        displayValue = JSON.stringify(response);
      } else if (typeof response === 'string' || typeof response === 'number' || typeof response === 'boolean') {
        displayValue = String(response);
      } else {
        displayValue = 'Invalid response format';
      }
    }
    
    return {
      label: field.label,
      value: displayValue,
      hasValue,
    };
  });

  const emailStatusColor = {
    active: 'success' as const,
    bounced: 'failure' as const,
    unsubscribed: 'warning' as const,
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: event.name, href: `/${eventId}` },
          { label: "Attendees", href: `/${eventId}/attendees` },
          { label: attendee.name },
        ]}
      />

      {/* Back Button */}
      <div>
        <Link href={`/${eventId}/attendees`}>
          <Button color="gray" size="sm">
            <HiArrowLeft className="mr-2 h-4 w-4" />
            Back to Attendees
          </Button>
        </Link>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {attendee.name}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Attendee details and registration information
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Information Card */}
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Basic Information
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Full Name
              </dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-white">
                {attendee.name}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Email Address
              </dt>
              <dd className="mt-1 flex items-center gap-2">
                <HiMail className="h-5 w-5 text-gray-400" />
                <a
                  href={`mailto:${attendee.email}`}
                  className="text-base text-blue-600 hover:underline dark:text-blue-400"
                >
                  {attendee.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Email Status
              </dt>
              <dd className="mt-1">
                <Badge color={emailStatusColor[attendee.emailStatus]} size="sm">
                  {attendee.emailStatus.charAt(0).toUpperCase() + attendee.emailStatus.slice(1)}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Registered
              </dt>
              <dd className="mt-1 flex items-center gap-2 text-base text-gray-900 dark:text-white">
                <HiClock className="h-5 w-5 text-gray-400" />
                {formatDistanceToNow(attendee.createdAt, { addSuffix: true })}
              </dd>
            </div>
          </div>
        </Card>

        {/* Ticket Information Card */}
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Ticket Information
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Ticket Number
              </dt>
              <dd className="mt-1 flex items-center gap-2">
                <HiTicket className="h-5 w-5 text-gray-400" />
                <code className="rounded bg-gray-100 px-2 py-1 text-sm font-mono text-gray-900 dark:bg-gray-800 dark:text-white">
                  {attendee.ticket.ticketNumber}
                </code>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Ticket Type
              </dt>
              <dd className="mt-1 text-base text-gray-900 dark:text-white">
                {attendee.ticket.ticketType.name}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Check-In Status
              </dt>
              <dd className="mt-1 flex items-center gap-2">
                {attendee.ticket.isCheckedIn ? (
                  <>
                    <HiCheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-base text-gray-900 dark:text-white">
                      Checked in
                      {attendee.ticket.checkedInAt && (
                        <span className="ml-1 text-sm text-gray-500">
                          ({formatDistanceToNow(attendee.ticket.checkedInAt, { addSuffix: true })})
                        </span>
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <HiXCircle className="h-5 w-5 text-gray-400" />
                    <span className="text-base text-gray-500">Not checked in</span>
                  </>
                )}
              </dd>
            </div>
            <div className="pt-4">
              <Link href={`/tickets/${attendee.ticket.id}`}>
                <Button color="blue" size="sm" className="w-full">
                  View Full Ticket Details
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Custom Field Responses Card */}
      {customResponses.length > 0 && (
        <Card>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Custom Registration Information
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Additional information collected during ticket assignment
            </p>
          </div>
          <div className="space-y-4">
            {customResponses.map((response, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
              >
                <dt className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {response.label}
                </dt>
                <dd className={`mt-2 text-base ${response.hasValue ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 italic'}`}>
                  {response.value}
                </dd>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* No Custom Fields Message */}
      {customResponses.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              No custom registration fields configured for this event.
            </p>
            <Link href={`/${eventId}/settings/registration`}>
              <Button color="blue" size="sm" className="mt-4">
                Configure Registration Fields
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Activity Timeline Card (Future Enhancement) */}
      <Card>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Activity Timeline
          </h2>
        </div>
        <div className="space-y-3">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <HiTicket className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Ticket Assigned
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatDistanceToNow(attendee.createdAt, { addSuffix: true })}
              </p>
            </div>
          </div>
          {attendee.ticket.isCheckedIn && attendee.ticket.checkedInAt && (
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <HiCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Checked In
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDistanceToNow(attendee.ticket.checkedInAt, { addSuffix: true })}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
