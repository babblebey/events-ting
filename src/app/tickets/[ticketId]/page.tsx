"use client";

/**
 * Individual Ticket View Page
 * Displays ticket details, QR code, and attendee information
 * Accessible via email link sent to attendees
 */

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Badge, Alert, Spinner } from "flowbite-react";
import {
  HiCheckCircle,
  HiXCircle,
  HiCalendar,
  HiLocationMarker,
  HiUser,
  HiMail,
  HiDownload,
  HiInformationCircle,
} from "react-icons/hi";
import { api } from "@/trpc/react";
import { QRCodeDisplay } from "@/components/tickets/qr-code-display";
import { formatDate } from "@/lib/utils/date";

// Type guard for ticket data
type TicketData = {
  event: {
    name: string;
    description?: string | null;
    timezone?: string | null;
    startDate: Date | string;
    endDate?: Date | string | null;
    locationType?: string | null;
    locationAddress?: string | null;
    customData?: unknown;
  };
  ticketType: {
    name: string;
    description?: string | null;
    price: number;
  };
  attendee?: {
    name: string;
    email: string;
    customData?: unknown;
  } | null;
  registration: {
    email: string;
  };
  ticketNumber: string;
  isAssigned: boolean;
  isCheckedIn: boolean;
  assignedAt?: Date | string | null;
};

export default function IndividualTicketViewPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.ticketId as string;

  const [termsAccepted, setTermsAccepted] = useState(false);

  // Fetch ticket details
  const {
    data: ticketData,
    isLoading,
    isError,
    error,
  } = api.tickets.getById.useQuery(
    { ticketId },
    {
      enabled: !!ticketId,
      retry: 1,
    },
  );

  const ticket = ticketData as TicketData | undefined;

  // Generate QR code
  const { data: qrCodeData } = api.tickets.generateQRCode.useQuery(
    {
      ticketId,
      format: "dataUrl",
      size: 400,
    },
    {
      enabled: !!ticketId && !!ticket,
    },
  );

  const handleDownloadQRCode = () => {
    if (!qrCodeData?.qrCode) return;

    // Create a link element and trigger download
    const link = document.createElement("a");
    link.href = qrCodeData.qrCode;
    link.download = `ticket-${ticket?.ticketNumber ?? "qr-code"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAcceptTerms = () => {
    // FR-019 Placeholder: Mock attendee terms acceptance
    setTermsAccepted(true);
  };

  // Loading state
  if (isLoading) {
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

  // Error state
  if (isError ?? !ticket) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Alert color="failure" icon={HiXCircle}>
          <span className="font-medium">Error loading ticket</span>
          <p className="mt-2">
            {error?.message ??
              "This ticket could not be found. Please check your link or contact the event organizer."}
          </p>
        </Alert>
        <div className="mt-6 text-center">
          <Button color="gray" onClick={() => router.push("/events")}>
            Browse Events
          </Button>
        </div>
      </div>
    );
  }

  const timezone = ticket.event.timezone ?? "UTC";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          Your Event Ticket
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {ticket.event.name}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Ticket Card */}
        <div className="lg:col-span-2">
          <Card>
            {/* Status Badges */}
            <div className="mb-4 flex flex-wrap gap-2">
              {ticket.isAssigned ? (
                <Badge color="success" icon={HiCheckCircle} size="sm">
                  Assigned
                </Badge>
              ) : (
                <Badge color="warning" icon={HiXCircle} size="sm">
                  Unassigned
                </Badge>
              )}
              {ticket.isCheckedIn && (
                <Badge color="info" icon={HiCheckCircle} size="sm">
                  Checked In
                </Badge>
              )}
            </div>

            {/* Event Information */}
            <div className="mb-6 space-y-4">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {ticket.event.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {ticket.ticketType.description}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <HiCalendar className="mt-1 h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(ticket.event.startDate, timezone, "PPPp")}
                    </p>
                    {ticket.event.endDate && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Ends:{" "}
                        {formatDate(ticket.event.endDate, timezone, "PPPp")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <HiLocationMarker className="mt-1 h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {ticket.event.locationType === "physical"
                        ? "In-Person Event"
                        : ticket.event.locationType === "virtual"
                          ? "Virtual Event"
                          : "Hybrid Event"}
                    </p>
                    {ticket.event.locationAddress && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {ticket.event.locationAddress}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Attendee Information */}
            {ticket.attendee && (
              <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                  <HiUser className="h-5 w-5" />
                  Attendee Details
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Name:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {ticket.attendee.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HiMail className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {ticket.attendee.email}
                    </span>
                  </div>
                  {ticket.assignedAt && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Assigned:
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatDate(ticket.assignedAt, timezone, "PPp")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Custom Fields */}
                {ticket.attendee.customData &&
                  Object.keys(ticket.attendee.customData).length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                        Additional Information
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(ticket.attendee.customData).map(
                          ([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-sm capitalize text-gray-600 dark:text-gray-400">
                                {key.replace(/([A-Z])/g, " $1").trim()}:
                              </span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {String(value)}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Ticket Type & Price */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {ticket.ticketType.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ticket Number:{" "}
                    <span className="font-mono">{ticket.ticketNumber}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {ticket.ticketType.price === 0
                      ? "FREE"
                      : `$${ticket.ticketType.price.toFixed(2)}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Check-in Information */}
            {ticket.isCheckedIn && ticket.checkedInAt && (() => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const checkedInDate = ticket.checkedInAt instanceof Date
                ? ticket.checkedInAt
                : new Date(String(ticket.checkedInAt));
              return (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <div className="flex items-center gap-2">
                    <HiCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-300">
                        Checked In
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        {/* eslint-disable-next-line @typescript-eslint/no-unsafe-argument */}
                        {formatDate(checkedInDate, timezone, "PPp")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </Card>
        </div>

        {/* QR Code & Actions Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <div className="space-y-6">
              {/* QR Code */}
              {qrCodeData && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                    Your QR Code
                  </h3>
                  <QRCodeDisplay
                    qrCodeDataUrl={qrCodeData.qrCode}
                    ticketNumber={ticket.ticketNumber}
                    size="large"
                    showActions={false}
                  />
                  <p className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400">
                    Show this QR code at check-in
                  </p>
                </div>
              )}

              {/* Download Button */}
              <Button
                color="light"
                onClick={handleDownloadQRCode}
                disabled={!qrCodeData}
                className="w-full"
              >
                <HiDownload className="mr-2 h-4 w-4" />
                Download QR Code
              </Button>

              {/* Important Information */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="flex items-start gap-2">
                  <HiInformationCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h4 className="mb-1 text-sm font-semibold text-blue-900 dark:text-blue-300">
                      Important
                    </h4>
                    <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-400">
                      <li>• Save this QR code to your phone</li>
                      <li>• Arrive 15 minutes early for check-in</li>
                      <li>• Bring a valid ID if required</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Buyer Information */}
              <div className="border-t pt-4">
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                  Purchased By
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {ticket.registration.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {ticket.registration.email}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* FR-019 Placeholder: Attendee Terms Acceptance */}
      {!termsAccepted && ticket.isAssigned && (
        <div className="mt-6">
          <Card>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <HiInformationCircle className="mt-1 h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                    Event Terms and Conditions
                  </h3>
                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    By attending this event, you agree to the event organizer&apos;s
                    terms and conditions, including their privacy policy and
                    code of conduct.
                  </p>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    <p className="mb-2 font-medium">You agree to:</p>
                    <ul className="list-inside list-disc space-y-1">
                      <li>Follow the event&apos;s code of conduct</li>
                      <li>
                        Allow the organizer to use your information for event
                        communications
                      </li>
                      <li>Understand that photography may occur at the event</li>
                      <li>
                        Comply with all venue rules and safety requirements
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleAcceptTerms}>
                  I Accept the Terms
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {termsAccepted && (
        <div className="mt-4">
          <Alert color="success" icon={HiCheckCircle}>
            <span className="font-medium">Terms Accepted</span> - You&apos;re all
            set for the event!
          </Alert>
        </div>
      )}

      {/* Need Help Section */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Questions about your ticket?{" "}
          <a
            href={`mailto:${ticket.registration.email}`}
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Contact the buyer
          </a>{" "}
          or reach out to the event organizer.
        </p>
      </div>
    </div>
  );
}
