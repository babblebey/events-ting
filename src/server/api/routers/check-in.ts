/**
 * Check-In Router
 * Handles attendee check-in operations for event team members
 *
 * This router provides procedures for:
 * - Listing attendees with check-in status
 * - Processing check-ins via manual ticket number or QR code
 * - Retrieving check-in metrics and statistics
 *
 * All procedures require CHECKIN module permission.
 *
 * @module server/api/routers/check-in
 */

import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { checkModuleAccess } from "@/server/api/permissions";
import {
  listAttendeesInputSchema,
  listAttendeesOutputSchema,
  checkInTicketInputSchema,
  checkInTicketOutputSchema,
  getCheckInMetricsInputSchema,
  getCheckInMetricsOutputSchema,
  getTicketByNumberInputSchema,
  getTicketByNumberOutputSchema,
  CHECK_IN_ERROR_CODES,
} from "../../../../specs/004-attendee-check-in/contracts/check-in-api";

export const checkInRouter = createTRPCRouter({
  /**
   * List attendees for check-in page
   * Supports filtering by check-in status, searching by ticket number, and pagination
   *
   * @requires CHECKIN module permission
   */
  listAttendees: protectedProcedure
    .input(listAttendeesInputSchema)
    .output(listAttendeesOutputSchema)
    .query(async ({ ctx, input }) => {
      // Verify user has CHECKIN module access
      await checkModuleAccess({
        db: ctx.db,
        eventId: input.eventId,
        userId: ctx.session.user.id,
        requiredModule: "CHECKIN",
      });

      // Build where clause for filtering
      const where = {
        eventId: input.eventId,
        // Filter by check-in status
        ...(input.filter === "checked-in" && { isCheckedIn: true }),
        ...(input.filter === "not-checked-in" && { isCheckedIn: false }),
        // Search by ticket number
        ...(input.search && {
          ticketNumber: {
            contains: input.search,
            mode: "insensitive" as const,
          },
        }),
      };

      // Get total count for pagination
      const total = await ctx.db.ticket.count({ where });

      // Calculate pagination values
      const totalPages = Math.ceil(total / input.pageSize);

      // Fetch tickets with pagination and event timezone
      const tickets = await ctx.db.ticket.findMany({
        where,
        orderBy: [
          { isCheckedIn: "asc" }, // Not checked in first
          { createdAt: "desc" }, // Newest first
        ],
        skip: input.page * input.pageSize,
        take: input.pageSize,
        include: {
          attendee: {
            select: {
              name: true,
              email: true,
            },
          },
          registration: {
            select: {
              name: true,
              email: true,
            },
          },
          event: {
            select: {
              timezone: true,
            },
          },
        },
      });

      // Transform to output format
      const attendees = tickets.map((ticket) => ({
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        isCheckedIn: ticket.isCheckedIn,
        checkedInAt: ticket.checkedInAt,
        checkedInBy: ticket.checkedInBy,
        // Attendee info (if assigned)
        attendeeName: ticket.attendee?.name ?? null,
        attendeeEmail: ticket.attendee?.email ?? null,
        // Buyer info (always present from Registration)
        buyerName: ticket.registration.name,
        buyerEmail: ticket.registration.email,
        // Assignment status
        isAssigned: ticket.isAssigned,
      }));

      return {
        attendees,
        pagination: {
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages,
        },
        // Include event timezone for client-side date formatting
        eventTimezone: tickets[0]?.event.timezone ?? "UTC",
      };
    }),

  /**
   * Check in a ticket (manual entry or QR code)
   * Idempotent - returns success if already checked in
   *
   * @requires CHECKIN module permission
   */
  checkInTicket: protectedProcedure
    .input(checkInTicketInputSchema)
    .output(checkInTicketOutputSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify user has CHECKIN module access
      await checkModuleAccess({
        db: ctx.db,
        eventId: input.eventId,
        userId: ctx.session.user.id,
        requiredModule: "CHECKIN",
      });

      // Find ticket by ticket number or QR code data
      const ticket = await ctx.db.ticket.findFirst({
        where: {
          eventId: input.eventId,
          OR: [
            ...(input.ticketNumber
              ? [{ ticketNumber: input.ticketNumber }]
              : []),
            ...(input.qrCodeData ? [{ qrCodeData: input.qrCodeData }] : []),
          ],
        },
        include: {
          attendee: {
            select: {
              name: true,
              email: true,
            },
          },
          registration: {
            select: {
              name: true,
              email: true,
            },
          },
          event: {
            select: {
              timezone: true,
            },
          },
        },
      });

      // Ticket not found
      if (!ticket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: CHECK_IN_ERROR_CODES.TICKET_NOT_FOUND,
        });
      }

      // Check if already checked in (idempotent - return success)
      if (ticket.isCheckedIn) {
        return {
          success: true,
          alreadyCheckedIn: true,
          eventTimezone: ticket.event.timezone,
          ticket: {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            isCheckedIn: ticket.isCheckedIn,
            checkedInAt: ticket.checkedInAt!,
            attendeeName: ticket.attendee?.name ?? null,
            attendeeEmail: ticket.attendee?.email ?? null,
            buyerName: ticket.registration.name,
            buyerEmail: ticket.registration.email,
          },
        };
      }

      // Perform check-in
      const updatedTicket = await ctx.db.ticket.update({
        where: { id: ticket.id },
        data: {
          isCheckedIn: true,
          checkedInAt: new Date(), // Store in UTC
          checkedInBy: ctx.session.user.id,
        },
        include: {
          attendee: {
            select: {
              name: true,
              email: true,
            },
          },
          registration: {
            select: {
              name: true,
              email: true,
            },
          },
          event: {
            select: {
              timezone: true,
            },
          },
        },
      });

      return {
        success: true,
        alreadyCheckedIn: false,
        eventTimezone: updatedTicket.event.timezone,
        ticket: {
          ticketId: updatedTicket.id,
          ticketNumber: updatedTicket.ticketNumber,
          isCheckedIn: updatedTicket.isCheckedIn,
          checkedInAt: updatedTicket.checkedInAt!,
          attendeeName: updatedTicket.attendee?.name ?? null,
          attendeeEmail: updatedTicket.attendee?.email ?? null,
          buyerName: updatedTicket.registration.name,
          buyerEmail: updatedTicket.registration.email,
        },
      };
    }),

  /**
   * Get check-in metrics for event dashboard
   * Provides statistics and recent check-in activity
   *
   * @requires CHECKIN module permission
   */
  getMetrics: protectedProcedure
    .input(getCheckInMetricsInputSchema)
    .output(getCheckInMetricsOutputSchema)
    .query(async ({ ctx, input }) => {
      // Verify user has CHECKIN module access
      await checkModuleAccess({
        db: ctx.db,
        eventId: input.eventId,
        userId: ctx.session.user.id,
        requiredModule: "CHECKIN",
      });

      // Execute queries in parallel for performance
      const [totalTickets, checkedInCount, recentCheckIns] = await Promise.all([
        // Total tickets
        ctx.db.ticket.count({
          where: { eventId: input.eventId },
        }),

        // Checked in count
        ctx.db.ticket.count({
          where: { eventId: input.eventId, isCheckedIn: true },
        }),

        // Recent check-ins (last 10)
        ctx.db.ticket.findMany({
          where: { eventId: input.eventId, isCheckedIn: true },
          orderBy: { checkedInAt: "desc" },
          take: 10,
          include: {
            attendee: {
              select: { name: true },
            },
            registration: {
              select: { name: true },
            },
          },
        }),
      ]);

      // Calculate metrics
      const notCheckedInCount = totalTickets - checkedInCount;
      const checkInPercentage =
        totalTickets > 0 ? (checkedInCount / totalTickets) * 100 : 0;

      // Transform recent check-ins
      const recentCheckInsFormatted = recentCheckIns.map((ticket) => ({
        ticketNumber: ticket.ticketNumber,
        name: ticket.attendee?.name ?? ticket.registration.name,
        checkedInAt: ticket.checkedInAt!,
      }));

      return {
        totalTickets,
        checkedInCount,
        notCheckedInCount,
        checkInPercentage,
        recentCheckIns: recentCheckInsFormatted,
      };
    }),

  /**
   * Get ticket details by ticket number
   * Used for confirmation modal before check-in
   *
   * @requires CHECKIN module permission
   */
  getTicketByNumber: protectedProcedure
    .input(getTicketByNumberInputSchema)
    .output(getTicketByNumberOutputSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify user has CHECKIN module access
      await checkModuleAccess({
        db: ctx.db,
        eventId: input.eventId,
        userId: ctx.session.user.id,
        requiredModule: "CHECKIN",
      });

      // Find ticket by ticket number
      const ticket = await ctx.db.ticket.findFirst({
        where: {
          eventId: input.eventId,
          ticketNumber: input.ticketNumber,
        },
        include: {
          attendee: {
            select: {
              name: true,
              email: true,
            },
          },
          registration: {
            select: {
              name: true,
              email: true,
            },
          },
          event: {
            select: {
              timezone: true,
            },
          },
        },
      });

      // Ticket not found
      if (!ticket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: CHECK_IN_ERROR_CODES.TICKET_NOT_FOUND,
        });
      }

      return {
        ticketNumber: ticket.ticketNumber,
        isCheckedIn: ticket.isCheckedIn,
        checkedInAt: ticket.checkedInAt,
        attendeeName: ticket.attendee?.name ?? null,
        attendeeEmail: ticket.attendee?.email ?? null,
        buyerName: ticket.registration.name,
        buyerEmail: ticket.registration.email,
        eventTimezone: ticket.event.timezone,
      };
    }),
});
