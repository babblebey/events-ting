/**
 * Send batch emails to attendees
 * Utilities for sending emails to event attendees with filtering
 * Part of User Story 5: Buyer vs Attendee Communication
 */

import {
  sendBatchEmailsWithRetry,
  type EmailResult,
} from "@/server/services/email";
import type { ReactElement } from "react";
import type { db } from "@/server/db";

type DbType = typeof db;

/**
 * Attendee email filter options
 */
export interface AttendeeEmailFilter {
  eventId: string;
  emailStatus?: "active" | "bounced" | "unsubscribed";
  ticketTypeId?: string;
}

/**
 * Attendee email options
 */
export interface AttendeeEmailOptions {
  filter: AttendeeEmailFilter;
  subject: string;
  html?: string;
  react?: ReactElement;
  from?: string;
  tags?: Array<{ name: string; value: string }>;
}

/**
 * Result of sending emails to attendees
 */
export interface AttendeeEmailResult {
  totalAttendees: number;
  emailsSent: number;
  emailsFailed: number;
  results: EmailResult[];
  failedEmails: string[];
}

/**
 * Fetch attendees matching filter criteria
 */
async function fetchAttendees(
  db: DbType,
  filter: AttendeeEmailFilter,
): Promise<Array<{ email: string; name: string }>> {
  const where = {
    ticket: {
      eventId: filter.eventId,
      isAssigned: true,
    },
    ...(filter.emailStatus && { emailStatus: filter.emailStatus }),
    ...(filter.ticketTypeId && {
      ticket: {
        eventId: filter.eventId,
        isAssigned: true,
        ticketTypeId: filter.ticketTypeId,
      },
    }),
  };

  const attendees = await db.attendee.findMany({
    where,
    select: {
      email: true,
      name: true,
    },
  });

  return attendees;
}

/**
 * Send batch emails to attendees matching filter criteria
 *
 * @param db - Prisma database client
 * @param options - Email options with attendee filter
 * @returns Result with counts and individual email results
 *
 * @example
 * ```typescript
 * const result = await sendAttendeeEmails(db, {
 *   filter: {
 *     eventId: 'event123',
 *     emailStatus: 'active',
 *   },
 *   subject: 'Event Reminder',
 *   react: EventReminderEmail({ ... }),
 *   tags: [
 *     { name: 'type', value: 'event-reminder' },
 *     { name: 'event', value: 'event123' },
 *   ],
 * });
 *
 * console.log(`Sent ${result.emailsSent} emails to ${result.totalAttendees} attendees`);
 * ```
 */
export async function sendAttendeeEmails(
  db: DbType,
  options: AttendeeEmailOptions,
): Promise<AttendeeEmailResult> {
  // Fetch attendees matching filter
  const attendees = await fetchAttendees(db, options.filter);

  if (attendees.length === 0) {
    return {
      totalAttendees: 0,
      emailsSent: 0,
      emailsFailed: 0,
      results: [],
      failedEmails: [],
    };
  }

  // Extract email addresses
  const recipientEmails = attendees.map((a) => a.email);

  // Send batch emails with retry logic
  const results = await sendBatchEmailsWithRetry(
    {
      recipients: recipientEmails,
      subject: options.subject,
      html: options.html,
      react: options.react,
      from: options.from,
      tags: options.tags,
    },
    3, // Max retries
  );

  // Calculate stats
  const emailsSent = results.filter((r) => r.success).length;
  const emailsFailed = results.filter((r) => !r.success).length;
  const failedEmails = results
    .map((r, index) => (!r.success ? recipientEmails[index] : null))
    .filter((email): email is string => email !== null);

  return {
    totalAttendees: attendees.length,
    emailsSent,
    emailsFailed,
    results,
    failedEmails,
  };
}

/**
 * Send batch emails to all active attendees
 * Convenience function for common use case
 *
 * @param db - Prisma database client
 * @param eventId - Event ID
 * @param subject - Email subject
 * @param emailContent - HTML or React component
 * @returns Result with counts and individual email results
 */
export async function sendToAllActiveAttendees(
  db: DbType,
  eventId: string,
  subject: string,
  emailContent: { html?: string; react?: ReactElement },
): Promise<AttendeeEmailResult> {
  return sendAttendeeEmails(db, {
    filter: {
      eventId,
      emailStatus: "active",
    },
    subject,
    ...emailContent,
    tags: [
      { name: "type", value: "attendee-campaign" },
      { name: "event", value: eventId },
    ],
  });
}

/**
 * Send batch emails to attendees of a specific ticket type
 *
 * @param db - Prisma database client
 * @param eventId - Event ID
 * @param ticketTypeId - Ticket type ID
 * @param subject - Email subject
 * @param emailContent - HTML or React component
 * @returns Result with counts and individual email results
 */
export async function sendToTicketType(
  db: DbType,
  eventId: string,
  ticketTypeId: string,
  subject: string,
  emailContent: { html?: string; react?: ReactElement },
): Promise<AttendeeEmailResult> {
  return sendAttendeeEmails(db, {
    filter: {
      eventId,
      emailStatus: "active", // Only send to active emails
      ticketTypeId,
    },
    subject,
    ...emailContent,
    tags: [
      { name: "type", value: "attendee-campaign" },
      { name: "event", value: eventId },
      { name: "ticket-type", value: ticketTypeId },
    ],
  });
}

/**
 * Validate email sending prerequisites
 * Check if event has attendees and email service is configured
 *
 * @param db - Prisma database client
 * @param eventId - Event ID
 * @returns Validation result with error message if validation fails
 */
export async function validateEmailCampaign(
  db: DbType,
  eventId: string,
): Promise<{ valid: boolean; error?: string; attendeeCount: number }> {
  // Check if event exists
  const event = await db.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return {
      valid: false,
      error: "Event not found",
      attendeeCount: 0,
    };
  }

  // Check if event has attendees
  const attendeeCount = await db.attendee.count({
    where: {
      ticket: {
        eventId,
        isAssigned: true,
      },
    },
  });

  if (attendeeCount === 0) {
    return {
      valid: false,
      error: "No attendees found for this event",
      attendeeCount: 0,
    };
  }

  // Check if email service is configured
  if (!process.env.RESEND_API_KEY) {
    return {
      valid: false,
      error: "Email service not configured",
      attendeeCount,
    };
  }

  return {
    valid: true,
    attendeeCount,
  };
}

/**
 * Get count of attendees matching filter criteria
 * Useful for showing recipient count before sending
 *
 * @param db - Prisma database client
 * @param filter - Attendee filter
 * @returns Count of matching attendees
 */
export async function getAttendeeEmailCount(
  db: DbType,
  filter: AttendeeEmailFilter,
): Promise<number> {
  const where = {
    ticket: {
      eventId: filter.eventId,
      isAssigned: true,
      ...(filter.ticketTypeId && { ticketTypeId: filter.ticketTypeId }),
    },
    ...(filter.emailStatus && { emailStatus: filter.emailStatus }),
  };

  return db.attendee.count({ where });
}

/**
 * Build email tags for tracking and analytics
 *
 * @param eventId - Event ID
 * @param campaignType - Type of campaign
 * @returns Array of email tags
 */
export function buildEmailTags(
  eventId: string,
  campaignType: string,
): Array<{ name: string; value: string }> {
  return [
    { name: "type", value: campaignType },
    { name: "event", value: eventId },
    { name: "timestamp", value: new Date().toISOString() },
  ];
}
