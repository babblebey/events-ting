/**
 * Tickets Router
 * Handles ticket instance management, assignment, and check-in operations
 * Part of Feature: 003-ticket-attendee-separation
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { checkModuleAccess } from "@/server/api/permissions";
import {
  listTicketsInputSchema,
  getTicketByNumberInputSchema,
  generateQRCodeInputSchema,
  assignTicketInputSchema,
  unassignTicketInputSchema,
  type ListTicketsInput,
} from "@/lib/validators";
import { generateTicketQRCode, generateTicketQRCodeSVG } from "@/lib/qr-code/generator";
import { isValidTicketNumberFormat } from "@/lib/tickets/generate-ticket-number";

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

  /**
   * Get ticket by ID
   * Public procedure - anyone with ticket ID can view
   */
  getById: publicProcedure
    .input(z.object({ ticketId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { ticketId } = input;

      // Fetch ticket with all relations
      const ticket = await ctx.db.ticket.findUnique({
        where: { id: ticketId },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              slug: true,
              startDate: true,
              endDate: true,
              locationType: true,
              locationAddress: true,
              timezone: true,
            },
          },
          ticketType: {
            select: {
              id: true,
              name: true,
              description: true,
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
          registration: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (!ticket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ticket not found",
        });
      }

      // Transform to output format
      return {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        qrCodeData: ticket.qrCodeData,
        isAssigned: ticket.isAssigned,
        assignedAt: ticket.assignedAt,
        isCheckedIn: ticket.isCheckedIn,
        checkedInAt: ticket.checkedInAt,
        checkedInBy: ticket.checkedInBy,
        event: {
          id: ticket.event.id,
          name: ticket.event.name,
          slug: ticket.event.slug,
          startDate: ticket.event.startDate,
          endDate: ticket.event.endDate,
          locationType: ticket.event.locationType,
          locationAddress: ticket.event.locationAddress,
          timezone: ticket.event.timezone,
        },
        ticketType: {
          id: ticket.ticketType.id,
          name: ticket.ticketType.name,
          description: ticket.ticketType.description,
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
        registration: {
          id: ticket.registration.id,
          email: ticket.registration.email,
          name: ticket.registration.name,
        },
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      };
    }),

  /**
   * Get ticket by ticket number (for QR code lookup)
   * Public procedure - anyone with ticket number can view
   */
  getByNumber: publicProcedure
    .input(getTicketByNumberInputSchema)
    .query(async ({ ctx, input }) => {
      const { ticketNumber } = input;

      // Validate ticket number format
      if (!isValidTicketNumberFormat(ticketNumber)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid ticket number format",
        });
      }

      // Fetch ticket with all relations
      const ticket = await ctx.db.ticket.findUnique({
        where: { ticketNumber },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              slug: true,
              startDate: true,
              endDate: true,
              locationType: true,
              locationAddress: true,
              timezone: true,
            },
          },
          ticketType: {
            select: {
              id: true,
              name: true,
              description: true,
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
          registration: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (!ticket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ticket not found",
        });
      }

      // Transform to output format
      return {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        qrCodeData: ticket.qrCodeData,
        isAssigned: ticket.isAssigned,
        assignedAt: ticket.assignedAt,
        isCheckedIn: ticket.isCheckedIn,
        checkedInAt: ticket.checkedInAt,
        checkedInBy: ticket.checkedInBy,
        event: {
          id: ticket.event.id,
          name: ticket.event.name,
          slug: ticket.event.slug,
          startDate: ticket.event.startDate,
          endDate: ticket.event.endDate,
          locationType: ticket.event.locationType,
          locationAddress: ticket.event.locationAddress,
          timezone: ticket.event.timezone,
        },
        ticketType: {
          id: ticket.ticketType.id,
          name: ticket.ticketType.name,
          description: ticket.ticketType.description,
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
        registration: {
          id: ticket.registration.id,
          email: ticket.registration.email,
          name: ticket.registration.name,
        },
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      };
    }),

  /**
   * Generate QR code for a ticket
   * Public procedure - anyone with ticket ID can generate QR code
   */
  generateQRCode: publicProcedure
    .input(generateQRCodeInputSchema)
    .query(async ({ ctx, input }) => {
      const { ticketId, format, size } = input;

      // Fetch ticket
      const ticket = await ctx.db.ticket.findUnique({
        where: { id: ticketId },
        select: {
          ticketNumber: true,
          qrCodeData: true,
        },
      });

      if (!ticket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ticket not found",
        });
      }

      // Generate QR code in requested format
      let qrCode: string;
      if (format === "svg") {
        qrCode = await generateTicketQRCodeSVG(ticket.qrCodeData);
      } else {
        qrCode = await generateTicketQRCode(ticket.qrCodeData, { width: size });
      }

      return {
        qrCode,
        ticketNumber: ticket.ticketNumber,
      };
    }),

  /**
   * Assign a ticket to an attendee
   * Protected procedure - buyer or event organizer only
   */
  assign: protectedProcedure
    .input(assignTicketInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { ticketId, attendee: attendeeData, expectedUpdatedAt } = input;

      // Fetch ticket with relations to verify access and assignment cutoff
      const ticket = await ctx.db.ticket.findUnique({
        where: { id: ticketId },
        include: {
          registration: {
            select: {
              id: true,
              userId: true,
            },
          },
          event: {
            select: {
              id: true,
              assignmentCutoffType: true,
              assignmentCutoffTime: true,
              startDate: true,
            },
          },
          attendee: true,
        },
      });

      if (!ticket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ticket not found",
        });
      }

      // Verify user is buyer or event organizer
      const isBuyer = ticket.registration.userId === ctx.session.user.id;
      let isOrganizer = false;

      if (!isBuyer) {
        try {
          await checkModuleAccess({
            db: ctx.db,
            eventId: ticket.event.id,
            userId: ctx.session.user.id,
            requiredModule: "TICKETS",
          });
          isOrganizer = true;
        } catch {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to assign this ticket",
          });
        }
      }

      // Check assignment cutoff time
      const now = new Date();
      let cutoffTime: Date;

      switch (ticket.event.assignmentCutoffType) {
        case "event_start":
          cutoffTime = ticket.event.startDate;
          break;
        case "1h_before":
          cutoffTime = new Date(ticket.event.startDate.getTime() - 60 * 60 * 1000);
          break;
        case "24h_before":
          cutoffTime = new Date(ticket.event.startDate.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "custom":
          if (!ticket.event.assignmentCutoffTime) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Custom cutoff time not configured",
            });
          }
          cutoffTime = ticket.event.assignmentCutoffTime;
          break;
        default:
          cutoffTime = ticket.event.startDate;
      }

      if (now >= cutoffTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assignment cutoff time has passed",
        });
      }

      // Perform optimistic lock check
      if (ticket.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ticket was modified by another user. Please refresh and try again.",
        });
      }

      // TODO: Validate custom data against event's custom field schema
      // This will be implemented when custom field schema is added to Event model

      // If ticket already assigned, delete old attendee record (privacy)
      if (ticket.attendee) {
        await ctx.db.attendee.delete({
          where: { id: ticket.attendee.id },
        });
      }

      // Create new attendee and update ticket in transaction
      const result = await ctx.db.$transaction(async (tx) => {
        // Create attendee
        const newAttendee = await tx.attendee.create({
          data: {
            name: attendeeData.name,
            email: attendeeData.email,
            customData: attendeeData.customData ?? undefined,
            userId: ctx.session.user.id, // Link to user if authenticated
          },
        });

        // Update ticket
        const updatedTicket = await tx.ticket.update({
          where: { id: ticketId },
          data: {
            isAssigned: true,
            assignedAt: now,
            attendeeId: newAttendee.id,
          },
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

        return { updatedTicket, newAttendee };
      });

      // TODO: Send email to attendee with ticket details
      // This will be implemented in T034

      return {
        ticket: {
          id: result.updatedTicket.id,
          ticketNumber: result.updatedTicket.ticketNumber,
          qrCodeData: result.updatedTicket.qrCodeData,
          isAssigned: result.updatedTicket.isAssigned,
          assignedAt: result.updatedTicket.assignedAt,
          isCheckedIn: result.updatedTicket.isCheckedIn,
          checkedInAt: result.updatedTicket.checkedInAt,
          ticketType: {
            id: result.updatedTicket.ticketType.id,
            name: result.updatedTicket.ticketType.name,
            price: result.updatedTicket.ticketType.price.toNumber(),
          },
          attendee: result.updatedTicket.attendee
            ? {
                id: result.updatedTicket.attendee.id,
                name: result.updatedTicket.attendee.name,
                email: result.updatedTicket.attendee.email,
                customData: result.updatedTicket.attendee.customData as Record<
                  string,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  any
                > | null,
              }
            : null,
          createdAt: result.updatedTicket.createdAt,
          updatedAt: result.updatedTicket.updatedAt,
        },
        attendee: {
          id: result.newAttendee.id,
          name: result.newAttendee.name,
          email: result.newAttendee.email,
          customData: result.newAttendee.customData as Record<
            string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            any
          > | null,
        },
      };
    }),

  /**
   * Unassign a ticket (remove attendee)
   * Protected procedure - buyer or event organizer only
   */
  unassign: protectedProcedure
    .input(unassignTicketInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { ticketId, expectedUpdatedAt } = input;

      // Fetch ticket with relations
      const ticket = await ctx.db.ticket.findUnique({
        where: { id: ticketId },
        include: {
          registration: {
            select: {
              id: true,
              userId: true,
            },
          },
          event: {
            select: {
              id: true,
              assignmentCutoffType: true,
              assignmentCutoffTime: true,
              startDate: true,
            },
          },
          attendee: true,
          ticketType: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      });

      if (!ticket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ticket not found",
        });
      }

      // Verify user is buyer or event organizer
      const isBuyer = ticket.registration.userId === ctx.session.user.id;

      if (!isBuyer) {
        try {
          await checkModuleAccess({
            db: ctx.db,
            eventId: ticket.event.id,
            userId: ctx.session.user.id,
            requiredModule: "TICKETS",
          });
        } catch {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to unassign this ticket",
          });
        }
      }

      // Check if ticket is checked in
      if (ticket.isCheckedIn) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot unassign a checked-in ticket",
        });
      }

      // Check assignment cutoff time
      const now = new Date();
      let cutoffTime: Date;

      switch (ticket.event.assignmentCutoffType) {
        case "event_start":
          cutoffTime = ticket.event.startDate;
          break;
        case "1h_before":
          cutoffTime = new Date(ticket.event.startDate.getTime() - 60 * 60 * 1000);
          break;
        case "24h_before":
          cutoffTime = new Date(ticket.event.startDate.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "custom":
          if (!ticket.event.assignmentCutoffTime) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Custom cutoff time not configured",
            });
          }
          cutoffTime = ticket.event.assignmentCutoffTime;
          break;
        default:
          cutoffTime = ticket.event.startDate;
      }

      if (now >= cutoffTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assignment cutoff time has passed",
        });
      }

      // Perform optimistic lock check
      if (ticket.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ticket was modified by another user. Please refresh and try again.",
        });
      }

      // Delete attendee and update ticket in transaction
      const updatedTicket = await ctx.db.$transaction(async (tx) => {
        // Delete attendee if exists
        if (ticket.attendee) {
          await tx.attendee.delete({
            where: { id: ticket.attendee.id },
          });
        }

        // Update ticket
        return await tx.ticket.update({
          where: { id: ticketId },
          data: {
            isAssigned: false,
            assignedAt: null,
            attendeeId: null,
          },
          include: {
            ticketType: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        });
      });

      return {
        ticket: {
          id: updatedTicket.id,
          ticketNumber: updatedTicket.ticketNumber,
          qrCodeData: updatedTicket.qrCodeData,
          isAssigned: updatedTicket.isAssigned,
          assignedAt: updatedTicket.assignedAt,
          isCheckedIn: updatedTicket.isCheckedIn,
          checkedInAt: updatedTicket.checkedInAt,
          ticketType: {
            id: updatedTicket.ticketType.id,
            name: updatedTicket.ticketType.name,
            price: updatedTicket.ticketType.price.toNumber(),
          },
          attendee: null,
          createdAt: updatedTicket.createdAt,
          updatedAt: updatedTicket.updatedAt,
        },
      };
    }),
});
