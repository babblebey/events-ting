/**
 * Ticket Router
 * Handles ticket type management and availability queries
 */

import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import {
  createTicketTypeSchema,
  updateTicketTypeSchema,
  eventIdSchema,
} from "@/lib/validators";
import { z } from "zod";

export const ticketRouter = createTRPCRouter({
  /**
   * Create a new ticket type (event organizer only)
   */
  create: protectedProcedure
    .input(createTicketTypeSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify event exists and user is organizer
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        select: { organizerId: true },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You do not have permission to create tickets for this event",
        });
      }

      // MVP: Enforce free tickets only (price must be 0)
      if (input.price !== 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only free tickets are supported in MVP. Price must be 0.",
        });
      }

      // Validate sale period
      if (
        input.saleStart &&
        input.saleEnd &&
        input.saleStart >= input.saleEnd
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sale start must be before sale end",
        });
      }

      return ctx.db.ticketType.create({
        data: input,
      });
    }),

  /**
   * List ticket types for an event (public access for registration page)
   */
  list: publicProcedure
    .input(
      z.object({
        eventId: z.string().cuid(),
        includeUnavailable: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();

      const ticketTypes = await ctx.db.ticketType.findMany({
        where: { eventId: input.eventId },
        include: {
          _count: {
            select: { registrations: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      const items = ticketTypes.map((ticket) => {
        const soldCount = ticket._count.registrations;
        const available = ticket.quantity - soldCount;

        // Check if ticket is currently on sale
        const saleStarted = !ticket.saleStart || ticket.saleStart <= now;
        const saleNotEnded = !ticket.saleEnd || ticket.saleEnd >= now;
        const hasAvailability = available > 0;

        const isAvailable = saleStarted && saleNotEnded && hasAvailability;

        return {
          id: ticket.id,
          name: ticket.name,
          description: ticket.description,
          price: ticket.price,
          currency: ticket.currency,
          quantity: ticket.quantity,
          soldCount,
          available,
          isAvailable,
          saleStart: ticket.saleStart,
          saleEnd: ticket.saleEnd,
        };
      });

      // Filter out unavailable tickets if requested
      if (!input.includeUnavailable) {
        return {
          items: items.filter((item) => item.isAvailable),
        };
      }

      return { items };
    }),

  /**
   * Get ticket type details with stats (organizer only)
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const ticketType = await ctx.db.ticketType.findUnique({
        where: { id: input.id },
        include: {
          event: {
            select: { organizerId: true },
          },
          _count: {
            select: { registrations: true },
          },
        },
      });

      if (!ticketType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ticket type not found",
        });
      }

      // Verify user is event organizer
      if (ticketType.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this ticket type",
        });
      }

      const soldCount = ticketType._count.registrations;
      const available = ticketType.quantity - soldCount;

      // Get registrations by day for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const registrations = await ctx.db.registration.findMany({
        where: {
          ticketTypeId: input.id,
          registeredAt: { gte: thirtyDaysAgo },
        },
        select: { registeredAt: true },
      });

      // Group by date
      const registrationsByDay = registrations.reduce(
        (acc, reg) => {
          const date = reg.registeredAt.toISOString().split("T")[0]!;
          acc[date] = (acc[date] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const registrationsByDayArray = Object.entries(registrationsByDay).map(
        ([date, count]) => ({
          date,
          count,
        }),
      );

      return {
        ...ticketType,
        stats: {
          sold: soldCount,
          available,
          revenue: ticketType.price.toNumber() * soldCount,
          registrationsByDay: registrationsByDayArray,
        },
      };
    }),

  /**
   * Update ticket type (organizer only)
   */
  update: protectedProcedure
    .input(updateTicketTypeSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const ticketType = await ctx.db.ticketType.findUnique({
        where: { id },
        include: {
          event: {
            select: { organizerId: true },
          },
          _count: {
            select: { registrations: true },
          },
        },
      });

      if (!ticketType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ticket type not found",
        });
      }

      // Verify user is event organizer
      if (ticketType.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this ticket type",
        });
      }

      const soldCount = ticketType._count.registrations;

      // Validate business rules
      if (data.quantity !== undefined && data.quantity < soldCount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot decrease quantity below sold count (${soldCount})`,
        });
      }

      // Cannot change price after tickets sold
      if (
        data.price !== undefined &&
        soldCount > 0 &&
        data.price !== ticketType.price.toNumber()
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change price after tickets have been sold",
        });
      }

      // Validate sale period if both dates provided
      if (data.saleStart && data.saleEnd && data.saleStart >= data.saleEnd) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sale start must be before sale end",
        });
      }

      return ctx.db.ticketType.update({
        where: { id },
        data,
      });
    }),

  /**
   * Delete ticket type (restricted if registrations exist)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const ticketType = await ctx.db.ticketType.findUnique({
        where: { id: input.id },
        include: {
          event: {
            select: { organizerId: true },
          },
          _count: {
            select: { registrations: true },
          },
        },
      });

      if (!ticketType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ticket type not found",
        });
      }

      // Verify user is event organizer
      if (ticketType.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this ticket type",
        });
      }

      // Cannot delete if registrations exist
      if (ticketType._count.registrations > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Cannot delete ticket type with ${ticketType._count.registrations} registrations. Consider ending the sale period instead.`,
        });
      }

      await ctx.db.ticketType.delete({
        where: { id: input.id },
      });

      return {
        success: true,
        message: "Ticket type deleted successfully",
      };
    }),

  /**
   * Get real-time ticket stats (public, for registration page)
   */
  getStats: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const ticketType = await ctx.db.ticketType.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { registrations: true },
          },
        },
      });

      if (!ticketType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ticket type not found",
        });
      }

      const soldCount = ticketType._count.registrations;
      const available = ticketType.quantity - soldCount;

      const now = new Date();
      const saleStarted = !ticketType.saleStart || ticketType.saleStart <= now;
      const saleNotEnded = !ticketType.saleEnd || ticketType.saleEnd >= now;
      const hasAvailability = available > 0;

      const isAvailable = saleStarted && saleNotEnded && hasAvailability;

      return {
        sold: soldCount,
        available,
        isAvailable,
      };
    }),
});
