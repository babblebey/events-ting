"use client";

/**
 * Ticket Assignment Page
 * Allows buyers or organizers to assign a ticket to an attendee
 * Now uses ticketId from URL params instead of query params
 */

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Alert, Spinner, Badge } from "flowbite-react";
import {
  HiTicket,
  HiCheckCircle,
  HiXCircle,
  HiInformationCircle,
  HiExclamationCircle,
} from "react-icons/hi";
import { api } from "@/trpc/react";
import { AssignmentForm } from "@/components/tickets/assignment-form";
import { formatDate } from "@/lib/utils/date";
import { useToast } from "@/components/ui/toast-provider";

// Type guard for ticket and event data
type TicketData = {
  event: {
    id: string;
    name: string;
    timezone?: string | null;
    startDate: Date | string;
  };
  ticketType: {
    name: string;
    price: number;
  };
  attendee?: {
    name: string;
    email: string;
  } | null;
  ticketNumber: string;
  isAssigned: boolean;
  updatedAt: Date | string;
};

type EventData = {
  customData?: unknown;
  assignmentCutoffType?: string | null;
  assignmentCutoffTime?: Date | string | null;
};

export default function TicketAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();

  const ticketId = params.ticketId as string;

  const [assignmentComplete, setAssignmentComplete] = useState(false);

  // Fetch ticket details
  const {
    data: ticketData,
    isLoading: isLoadingTicket,
    isError: isTicketError,
    error: ticketError,
  } = api.tickets.getById.useQuery(
    { ticketId: ticketId ?? "" },
    {
      enabled: !!ticketId,
      retry: 1,
    },
  );

  const ticket = ticketData as TicketData | undefined;

  // Fetch event details for custom fields
  const { data: eventData } = api.event.getById.useQuery(
    { id: ticket?.event.id ?? "" },
    {
      enabled: !!ticket?.event.id,
    },
  );

  const event = eventData as EventData | undefined;

  // Parse custom fields from event
  const customFields = event?.customData
    ? (() => {
        try {
          const parsed = JSON.parse(
            typeof event.customData === "string"
              ? event.customData
              : JSON.stringify(event.customData),
          ) as { registrationFields?: unknown[] };
          return Array.isArray(parsed?.registrationFields)
            ? parsed.registrationFields
            : [];
        } catch {
          return [];
        }
      })()
    : [];

  const handleAssignmentSuccess = (_attendeeId: string) => {
    setAssignmentComplete(true);
    toast.success(
      "Ticket Assigned Successfully",
      "The attendee will receive an email with their ticket details.",
    );

    // Redirect to ticket view after a short delay
    setTimeout(() => {
      router.push(`/tickets/${ticketId}`);
    }, 2000);
  };

  const handleCancel = () => {
    router.push(`/tickets/${ticketId}`);
  };

  // Loading state
  if (isLoadingTicket) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Spinner size="xl" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading ticket details...
          </p>
        </div>
      </div>
    );
  }

  // Error states
  if (!ticketId) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Alert color="failure" icon={HiXCircle}>
          <span className="font-medium">Invalid Request</span>
          <p className="mt-2">
            No ticket ID provided. Please use a valid assignment link.
          </p>
        </Alert>
      </div>
    );
  }

  if (isTicketError ?? !ticket) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Alert color="failure" icon={HiXCircle}>
          <span className="font-medium">Error Loading Ticket</span>
          <p className="mt-2">
            {ticketError?.message ??
              "This ticket could not be found. Please check your link or contact the event organizer."}
          </p>
        </Alert>
      </div>
    );
  }

  if (ticket.isCheckedIn) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Alert color="warning" icon={HiExclamationCircle}>
          <span className="font-medium">Cannot Reassign Checked-In Ticket</span>
          <p className="mt-2">
            This ticket has already been checked in and cannot be reassigned.
          </p>
        </Alert>
      </div>
    );
  }

  const timezone = ticket.event.timezone ?? "UTC";

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <HiTicket className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {ticket.isAssigned ? "Reassign Ticket" : "Assign Ticket"}
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {ticket.isAssigned
            ? "Update the attendee information for this ticket"
            : "Assign this ticket to an attendee who will use it"}
        </p>
      </div>

      {/* Success State */}
      {assignmentComplete && (
        <div className="mb-6">
          <Alert color="success" icon={HiCheckCircle}>
            <div>
              <span className="font-medium">Assignment Successful!</span>
              <p className="mt-2">
                The ticket has been assigned and the attendee will receive an
                email with their ticket details and QR code.
              </p>
            </div>
          </Alert>
        </div>
      )}

      {/* Current Assignment Warning (if reassigning) */}
      {ticket.isAssigned && ticket.attendee && !assignmentComplete && (
        <div className="mb-6">
          <Alert color="warning" icon={HiExclamationCircle}>
            <div>
              <span className="font-medium">
                This ticket is currently assigned
              </span>
              <p className="mt-2">
                Current attendee: <strong>{ticket.attendee.name}</strong> (
                {ticket.attendee.email})
              </p>
              <p className="mt-2 text-sm">
                Reassigning this ticket will permanently delete the current
                attendee&apos;s information and send the new attendee an email.
              </p>
            </div>
          </Alert>
        </div>
      )}

      {/* Event & Ticket Information */}
      <Card className="mb-6">
        <div className="space-y-4">
          <div>
            <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
              {ticket.event.name}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Badge color="info" size="sm">
                {ticket.ticketType.name}
              </Badge>
              {ticket.ticketType.price === 0 ? (
                <Badge color="success" size="sm">
                  FREE
                </Badge>
              ) : (
                <Badge color="gray" size="sm">
                  ${ticket.ticketType.price.toFixed(2)}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Event Date
              </p>
              <p className="text-sm text-gray-900 dark:text-white">
                {formatDate(new Date(ticket.event.startDate), timezone, "PPP")}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Ticket Number
              </p>
              <p className="font-mono text-sm text-gray-900 dark:text-white">
                {ticket.ticketNumber}
              </p>
            </div>
          </div>

          {/* Assignment Cutoff Warning */}
          {event?.assignmentCutoffType && event.assignmentCutoffType !== "event_start" && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="flex items-start gap-2">
                <HiInformationCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                <div className="text-sm text-yellow-800 dark:text-yellow-300">
                  <p className="font-medium">Assignment Deadline</p>
                  <p className="mt-1">
                    {event.assignmentCutoffType === "1h_before" &&
                      "Tickets must be assigned at least 1 hour before the event starts."}
                    {event.assignmentCutoffType === "24h_before" &&
                      "Tickets must be assigned at least 24 hours before the event starts."}
                    {event.assignmentCutoffType === "custom" &&
                      event.assignmentCutoffTime &&
                      `Tickets must be assigned by ${formatDate(
                        event.assignmentCutoffTime,
                        timezone,
                        "PPp",
                      )}.`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Assignment Form */}
      {!assignmentComplete && (
        <Card>
          <AssignmentForm
            ticketId={ticketId}
            ticketNumber={ticket.ticketNumber}
            expectedUpdatedAt={new Date(ticket.updatedAt)}
            customFields={customFields}
            eventName={ticket.event.name}
            onSuccess={handleAssignmentSuccess}
            onCancel={handleCancel}
          />
        </Card>
      )}

      {/* Help Text */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-2">
          <HiInformationCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium">What happens next?</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>The attendee will receive an email with their ticket details</li>
              <li>
                They&apos;ll get a unique QR code for event check-in
              </li>
              <li>
                All event communications will be sent to the attendee&apos;s email
              </li>
              <li>
                You can reassign the ticket anytime before the event (unless
                checked in)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
