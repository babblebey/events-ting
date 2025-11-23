"use client";

/**
 * RegistrationSummary Component
 * Displays comprehensive summary of a registration including all tickets
 */

import { Card, Badge, Button, Alert } from "flowbite-react";
import {
  HiShoppingCart,
  HiTicket,
  HiCheckCircle,
  HiExclamationCircle,
  HiClock,
} from "react-icons/hi";
import { formatDate } from "@/lib/utils/date";
import Link from "next/link";

interface RegistrationSummaryProps {
  registration: {
    id: string;
    name: string;
    email: string;
    quantity: number;
    paymentStatus: string;
    registeredAt: Date;
    event: {
      id: string;
      name: string;
      slug: string;
      startDate: Date;
      endDate: Date;
      timezone: string;
      assignmentCutoffType: string;
      assignmentCutoffTime: Date | null;
    };
    ticketType: {
      id: string;
      name: string;
      price: number;
    };
    tickets: Array<{
      id: string;
      ticketNumber: string;
      isAssigned: boolean;
      assignedAt: Date | null;
      isCheckedIn: boolean;
      checkedInAt: Date | null;
      attendee: {
        id: string;
        name: string;
        email: string;
      } | null;
    }>;
  };
  showManageLink?: boolean;
}

export function RegistrationSummary({
  registration,
  showManageLink = false,
}: RegistrationSummaryProps) {
  // Calculate summary statistics
  const totalTickets = registration.tickets.length;
  const assignedTickets = registration.tickets.filter(
    (t) => t.isAssigned,
  ).length;
  const unassignedTickets = totalTickets - assignedTickets;
  const checkedInTickets = registration.tickets.filter(
    (t) => t.isCheckedIn,
  ).length;

  // Calculate total price
  const totalPrice = registration.ticketType.price * registration.quantity;
  const isFree = totalPrice === 0;

  // Payment status badge
  const getPaymentBadge = () => {
    switch (registration.paymentStatus) {
      case "paid":
        return (
          <Badge color="success" icon={HiCheckCircle}>
            Paid
          </Badge>
        );
      case "free":
        return (
          <Badge color="info" icon={HiCheckCircle}>
            Free
          </Badge>
        );
      case "pending":
        return (
          <Badge color="warning" icon={HiClock}>
            Pending Payment
          </Badge>
        );
      case "failed":
        return (
          <Badge color="failure" icon={HiExclamationCircle}>
            Payment Failed
          </Badge>
        );
      case "refunded":
        return (
          <Badge color="gray" icon={HiExclamationCircle}>
            Refunded
          </Badge>
        );
      default:
        return (
          <Badge color="gray" icon={HiExclamationCircle}>
            Unknown
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Registration Card */}
      <Card>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {registration.event.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatDate(
                  registration.event.startDate,
                  registration.event.timezone,
                  "PPP",
                )}
              </p>
            </div>
            {getPaymentBadge()}
          </div>

          {/* Buyer Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Buyer Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Name:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {registration.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Email:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {registration.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Registration Date:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDate(
                      registration.registeredAt,
                      registration.event.timezone,
                      "PPp",
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Order Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Ticket Type:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {registration.ticketType.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Quantity:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {registration.quantity} ticket
                    {registration.quantity !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Price per Ticket:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {isFree
                      ? "FREE"
                      : `$${registration.ticketType.price.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Total:
                  </span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {isFree ? "FREE" : `$${totalPrice.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Ticket Assignment Status */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Ticket Assignment Status
            </h3>
            <div className="flex items-center gap-2">
              <HiTicket className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {assignedTickets} of {totalTickets} assigned
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="rounded-full bg-blue-600 py-1 text-center text-xs leading-none font-medium text-white"
              style={{
                width: `${totalTickets > 0 ? (assignedTickets / totalTickets) * 100 : 0}%`,
              }}
            >
              {totalTickets > 0
                ? `${Math.round((assignedTickets / totalTickets) * 100)}%`
                : "0%"}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center dark:border-gray-700 dark:bg-gray-800">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {assignedTickets}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Assigned
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center dark:border-gray-700 dark:bg-gray-800">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {unassignedTickets}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Unassigned
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center dark:border-gray-700 dark:bg-gray-800">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {checkedInTickets}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Checked In
              </div>
            </div>
          </div>

          {/* Unassigned Warning */}
          {unassignedTickets > 0 && (
            <Alert color="warning" icon={HiExclamationCircle}>
              <span className="font-medium">Action Required:</span> You have{" "}
              {unassignedTickets} unassigned ticket
              {unassignedTickets !== 1 ? "s" : ""}. Please assign{" "}
              {unassignedTickets === 1 ? "it" : "them"} to{" "}
              {unassignedTickets === 1 ? "an attendee" : "attendees"} before the
              event.
            </Alert>
          )}

          {/* All Assigned Success */}
          {unassignedTickets === 0 && totalTickets > 0 && (
            <Alert color="success" icon={HiCheckCircle}>
              <span className="font-medium">All tickets assigned!</span> All{" "}
              {totalTickets} ticket{totalTickets !== 1 ? "s have" : " has"} been
              assigned to attendees.
            </Alert>
          )}
        </div>
      </Card>

      {/* Manage Link */}
      {showManageLink && (
        <div className="flex justify-center">
          <Link
            href={`/events/${registration.event.slug}/registrations/${registration.id}`}
          >
            <Button size="lg">
              <HiShoppingCart className="mr-2 h-5 w-5" />
              Manage My Tickets
            </Button>
          </Link>
        </div>
      )}

      {/* Individual Tickets List */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Tickets
          </h3>

          <div className="space-y-3">
            {registration.tickets.map((ticket, index) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {ticket.attendee
                        ? ticket.attendee.name
                        : "Unassigned Ticket"}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {ticket.ticketNumber}
                    </div>
                    {ticket.attendee && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {ticket.attendee.email}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {ticket.isCheckedIn ? (
                    <Badge color="info" icon={HiCheckCircle}>
                      Checked In
                    </Badge>
                  ) : ticket.isAssigned ? (
                    <Badge color="success" icon={HiCheckCircle}>
                      Assigned
                    </Badge>
                  ) : (
                    <Badge color="warning" icon={HiExclamationCircle}>
                      Unassigned
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
