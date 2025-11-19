"use client";

/**
 * UnassignedReminder Component
 * Displays warning/reminder for unassigned tickets with assignment deadline
 */

import { Alert, Button } from "flowbite-react";
import {
  HiExclamationCircle,
  HiClock,
  HiCheckCircle,
} from "react-icons/hi";
import { formatDate } from "@/lib/utils/date";
import Link from "next/link";

interface UnassignedReminderProps {
  unassignedCount: number;
  totalCount: number;
  assignmentCutoffType: string;
  assignmentCutoffTime: Date | null;
  eventStartDate: Date;
  timezone?: string;
  registrationId?: string;
  eventSlug?: string;
  showActions?: boolean;
}

export function UnassignedReminder({
  unassignedCount,
  totalCount,
  assignmentCutoffType,
  assignmentCutoffTime,
  eventStartDate,
  timezone = "UTC",
  registrationId,
  eventSlug,
  showActions = true,
}: UnassignedReminderProps) {
  // Calculate assignment cutoff time
  const getAssignmentCutoff = (): Date => {
    switch (assignmentCutoffType) {
      case "event_start":
        return eventStartDate;
      case "1h_before":
        return new Date(eventStartDate.getTime() - 60 * 60 * 1000);
      case "24h_before":
        return new Date(eventStartDate.getTime() - 24 * 60 * 60 * 1000);
      case "custom":
        return assignmentCutoffTime ?? eventStartDate;
      default:
        return eventStartDate;
    }
  };

  const cutoffDate = getAssignmentCutoff();
  const now = new Date();
  const isPastCutoff = now > cutoffDate;
  const timeRemaining = cutoffDate.getTime() - now.getTime();

  // Calculate time remaining in a human-readable format
  const getTimeRemainingText = (): string => {
    if (isPastCutoff) {
      return "Deadline has passed";
    }

    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} day${days !== 1 ? "s" : ""} ${hours} hour${hours !== 1 ? "s" : ""}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    }
  };

  // Get urgency level for styling
  const getUrgencyLevel = (): "critical" | "warning" | "info" => {
    if (isPastCutoff) return "critical";
    const hoursRemaining = timeRemaining / (1000 * 60 * 60);
    if (hoursRemaining < 24) return "critical";
    if (hoursRemaining < 72) return "warning";
    return "info";
  };

  const urgency = getUrgencyLevel();

  // Don't show if all tickets are assigned
  if (unassignedCount === 0) {
    return (
      <Alert color="success" icon={HiCheckCircle}>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium">All tickets assigned!</span> All{" "}
            {totalCount} ticket{totalCount !== 1 ? "s" : ""} have been assigned
            to attendees.
          </div>
        </div>
      </Alert>
    );
  }

  // Critical alert color mapping
  const alertColor =
    urgency === "critical" ? "failure" : urgency === "warning" ? "warning" : "info";

  return (
    <Alert color={alertColor} icon={HiExclamationCircle} className="border-l-4">
      <div className="space-y-3">
        {/* Header */}
        <div>
          <h3 className="font-semibold">
            {isPastCutoff
              ? "⚠️ Assignment Deadline Passed"
              : urgency === "critical"
                ? "🚨 Urgent: Assign Tickets Soon"
                : "⏰ Reminder: Assign Your Tickets"}
          </h3>
          <p className="mt-1 text-sm">
            You have <strong>{unassignedCount}</strong> unassigned ticket
            {unassignedCount !== 1 ? "s" : ""} out of {totalCount}.
          </p>
        </div>

        {/* Deadline Info */}
        <div className="flex items-start gap-2 rounded-lg bg-white/50 p-3 dark:bg-gray-800/50">
          <HiClock className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Assignment Deadline:</p>
            <p className="mt-1">{formatDate(cutoffDate, timezone, "PPp")}</p>
            {!isPastCutoff && (
              <p className="mt-1 font-semibold">
                Time remaining: {getTimeRemainingText()}
              </p>
            )}
          </div>
        </div>

        {/* Message */}
        <p className="text-sm">
          {isPastCutoff ? (
            <>
              The assignment deadline has passed. You may no longer be able to
              assign tickets. Please contact the event organizer if you need
              assistance.
            </>
          ) : urgency === "critical" ? (
            <>
              Please assign your tickets soon! Each attendee will receive their
              own ticket with a unique QR code for event check-in.
            </>
          ) : (
            <>
              Remember to assign each ticket to an attendee. Each person will
              receive their own ticket with a unique QR code for event check-in.
            </>
          )}
        </p>

        {/* Actions */}
        {showActions && registrationId && eventSlug && !isPastCutoff && (
          <div className="flex gap-3 border-t pt-3">
            <Link
              href={`/events/${eventSlug}/registrations/${registrationId}`}
              className="flex-1"
            >
              <Button size="sm" className="w-full">
                Assign Tickets Now
              </Button>
            </Link>
          </div>
        )}

        {/* Help Text */}
        <div className="border-t pt-2 text-xs opacity-75">
          <p>
            💡 Tip: You can assign tickets to different people by entering their
            name and email for each ticket.
          </p>
        </div>
      </div>
    </Alert>
  );
}
