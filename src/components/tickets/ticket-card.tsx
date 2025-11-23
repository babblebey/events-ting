"use client";

/**
 * TicketCard Component
 * Displays individual ticket information with assignment status and QR code
 */

import Link from "next/link";
import { Badge, Button, Card } from "flowbite-react";
import { HiTicket, HiCheckCircle, HiXCircle, HiUser } from "react-icons/hi";
import { formatDate } from "@/lib/utils/date";

interface TicketCardProps {
  ticket: {
    id: string;
    ticketNumber: string;
    isAssigned: boolean;
    assignedAt: Date | null;
    isCheckedIn: boolean;
    checkedInAt: Date | null;
    ticketType: {
      id: string;
      name: string;
      price: number;
    };
    attendee: {
      id: string;
      name: string;
      email: string;
      customData: Record<string, unknown> | null;
    } | null;
    createdAt: Date;
    ticketUrl: string;
  };
  eventSlug?: string;
  eventTimezone?: string;
  showActions?: boolean;
  onAssign?: (ticketId: string) => void;
  onReassign?: (ticketId: string) => void;
  onUnassign?: (ticketId: string) => void;
}

export function TicketCard({
  ticket,
  eventSlug,
  eventTimezone = "UTC",
  showActions = false,
  onAssign,
  onReassign,
  onUnassign,
}: TicketCardProps) {
  const priceDisplay =
    ticket.ticketType.price === 0
      ? "FREE"
      : `$${ticket.ticketType.price.toFixed(2)}`;

  return (
    <Card className="transition-shadow hover:shadow-lg">
      <div className="flex flex-col gap-4">
        {/* Header with status badges */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <HiTicket className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {ticket.ticketType.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {ticket.ticketNumber}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {/* Assignment Status */}
            {ticket.isAssigned ? (
              <Badge color="success" icon={HiCheckCircle}>
                Assigned
              </Badge>
            ) : (
              <Badge color="warning" icon={HiXCircle}>
                Unassigned
              </Badge>
            )}

            {/* Check-in Status */}
            {ticket.isCheckedIn && (
              <Badge color="info" icon={HiCheckCircle}>
                Checked In
              </Badge>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {priceDisplay}
        </div>

        {/* Attendee Information */}
        {ticket.attendee ? (
          <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <HiUser className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Attendee Details
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Name:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {ticket.attendee.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Email:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {ticket.attendee.email}
                </span>
              </div>
              {ticket.assignedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Assigned:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {formatDate(ticket.assignedAt, eventTimezone, "PPp")}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center dark:border-gray-600 dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This ticket has not been assigned to an attendee yet
            </p>
          </div>
        )}

        {/* Check-in Information */}
        {ticket.isCheckedIn && ticket.checkedInAt && (
          <div className="space-y-1 border-t pt-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Checked in at:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatDate(ticket.checkedInAt, eventTimezone, "PPp")}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row">
            {!ticket.isAssigned ? (
              <Button
                size="sm"
                onClick={() => onAssign?.(ticket.id)}
                className="flex-1"
              >
                Assign Ticket
              </Button>
            ) : (
              <>
                {!ticket.isCheckedIn && (
                  <>
                    <Button
                      size="sm"
                      color="gray"
                      onClick={() => onReassign?.(ticket.id)}
                      className="flex-1"
                    >
                      Reassign
                    </Button>
                    <Button
                      size="sm"
                      color="red"
                      onClick={() => onUnassign?.(ticket.id)}
                      className="flex-1"
                    >
                      Unassign
                    </Button>
                  </>
                )}
                <Link href={ticket.ticketUrl}>
                  <Button
                    size="sm"
                    color="light"
                    // className="flex-1"
                  >
                    View Ticket
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}

        {/* View Ticket Link (non-action mode) */}
        {!showActions && eventSlug && (
          <div className="border-t pt-4">
            <Link href={`/events/${eventSlug}/tickets/${ticket.id}`} className="block">
              <Button size="sm" className="w-full">
                View Ticket Details
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
