/**
 * Tickets Router
 * Handles ticket instance management, assignment, and check-in operations
 * Part of Feature: 003-ticket-attendee-separation
 */

import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { checkModuleAccess } from "@/server/api/permissions";
import {
  listTicketsInputSchema,
  type ListTicketsInput,
} from "@/lib/validators";

export const ticketsRouter = createTRPCRouter({
  /**
   * List tickets for a registration or event
   * Public procedure with context-based filtering
   */
  list: publicProcedure
    .input(listTicketsInputSchema)
    .query(async ({ ctx, input }) => {
      const {
        registrationId,
        eventId,
        isAssigned,
        isCheckedIn,
        limit,
        cursor,
      } = input;

      // Validate that at least one filter is provided
      if (!registrationId && !eventId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either registrationId or eventId must be provided",
        });
      }

      // If filtering by eventId, verify user has access (organizer only)
      if (eventId && ctx.session?.user) {
        await checkModuleAccess({
          db: ctx.db,
          eventId,
          userId: ctx.session.user.id,
          requiredModule: "TICKETS",
        });
      }

      // If filtering by registrationId, verify user owns the registration
      if (registrationId) {
        const registration = await ctx.db.registration.findUnique({
          where: { id: registrationId },
          select: { userId: true, email: true },
        });

        if (!registration) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Registration not found",
          });
        }

        // For authenticated users, verify they own the registration
        if (ctx.session?.user) {
          if (registration.userId !== ctx.session.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You do not have access to this registration",
            });
          }
        }
        // For unauthenticated users, they can view by registrationId
        // (used in public ticket management pages accessed via email link)
      }

      // Build where clause
      const where = {
        ...(registrationId && { registrationId }),
        ...(eventId && { eventId }),
        ...(isAssigned !== undefined && { isAssigned }),
        ...(isCheckedIn !== undefined && { isCheckedIn }),
        ...(cursor && { id: { gt: cursor } }),
      };

      // Fetch tickets with pagination
      const tickets = await ctx.db.ticket.findMany({
        where,
        take: limit + 1, // Fetch one extra to determine if there's a next page
        orderBy: { createdAt: "asc" },
        include: {
          ticketType: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
          attendee: {
            select: {
              id: true,
              name: true,
              email: true,
              customData: true,
            },
          },
        },
      });

      // Determine if there's a next page
      let nextCursor: string | null = null;
      if (tickets.length > limit) {
        const nextItem = tickets.pop();
        nextCursor = nextItem?.id ?? null;
      }

      // Transform to output format
      const transformedTickets = tickets.map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        qrCodeData: ticket.qrCodeData,
        isAssigned: ticket.isAssigned,
        assignedAt: ticket.assignedAt,
        isCheckedIn: ticket.isCheckedIn,
        checkedInAt: ticket.checkedInAt,
        ticketType: {
          id: ticket.ticketType.id,
          name: ticket.ticketType.name,
          price: ticket.ticketType.price.toNumber(),
        },
        attendee: ticket.attendee
          ? {
              id: ticket.attendee.id,
              name: ticket.attendee.name,
              email: ticket.attendee.email,
              customData: ticket.attendee.customData as Record<
                string,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                any
              > | null,
            }
          : null,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      }));

      return {
        tickets: transformedTickets,
        nextCursor,
      };
    }),
});
