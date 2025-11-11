/**
 * Event Router
 * Handles all event CRUD operations, dashboard metrics, and archival
 */

import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import {
  createEventSchema,
  updateEventSchema,
  eventIdSchema,
  eventSlugSchema,
  listEventsSchema,
} from "@/lib/validators";

export const eventRouter = createTRPCRouter({
  /**
   * Create a new event (authenticated organizers only)
   */
  create: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if slug is already taken
      const existing = await ctx.db.event.findUnique({
        where: { slug: input.slug },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "An event with this slug already exists. Please choose a different slug.",
        });
      }

      return ctx.db.event.create({
        data: {
          ...input,
          organizerId: ctx.session.user.id,
        },
      });
    }),

  /**
   * List events with filtering and pagination
   * Public: returns only published events
   * Authenticated: can see own draft/archived events
   */
  list: publicProcedure
    .input(listEventsSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor, status, organizerId } = input;

      // If not authenticated, only show published non-archived events
      const isAuthenticated = !!ctx.session;
      const baseWhere = isAuthenticated
        ? {
            ...(status && { status }),
            ...(organizerId && { organizerId }),
          }
        : {
            status: "published" as const,
            isArchived: false,
          };

      const events = await ctx.db.event.findMany({
        where: baseWhere,
        take: limit + 1,
        ...(cursor && {
          cursor: { id: cursor },
          skip: 1,
        }),
        orderBy: { startDate: "desc" },
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          _count: {
            select: {
              registrations: true,
              ticketTypes: true,
            },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (events.length > limit) {
        const nextItem = events.pop();
        nextCursor = nextItem?.id;
      }

      return {
        events,
        nextCursor,
      };
    }),

  /**
   * Get a single event by slug (public access)
   */
  getBySlug: publicProcedure
    .input(eventSlugSchema)
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({
        where: { slug: input.slug },
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              image: true,
              email: true,
            },
          },
          ticketTypes: {
            where: {
              // Only show tickets within sale period
              OR: [
                { saleStart: null, saleEnd: null },
                {
                  saleStart: { lte: new Date() },
                  saleEnd: { gte: new Date() },
                },
                { saleStart: { lte: new Date() }, saleEnd: null },
                { saleStart: null, saleEnd: { gte: new Date() } },
              ],
            },
            include: {
              _count: {
                select: { registrations: true },
              },
            },
          },
          _count: {
            select: {
              registrations: true,
              scheduleEntries: true,
              speakers: true,
            },
          },
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // If event is draft or archived, only allow access to organizer
      if (
        (event.status !== "published" || event.isArchived) &&
        event.organizerId !== ctx.session?.user?.id
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This event is not publicly available",
        });
      }

      return event;
    }),

  /**
   * Get a single event by ID (requires ownership)
   */
  getById: protectedProcedure
    .input(eventIdSchema)
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({
        where: { id: input.id },
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              image: true,
              email: true,
            },
          },
          ticketTypes: {
            include: {
              _count: {
                select: { registrations: true },
              },
            },
          },
          _count: {
            select: {
              registrations: true,
              scheduleEntries: true,
              speakers: true,
              emailCampaigns: true,
            },
          },
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // Only allow access to organizer
      if (event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this event",
        });
      }

      return event;
    }),

  /**
   * Update an event (requires ownership)
   */
  update: protectedProcedure
    .input(updateEventSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const event = await ctx.db.event.findUnique({
        where: { id },
        select: { organizerId: true, slug: true },
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
          message: "You do not have permission to edit this event",
        });
      }

      // Check slug uniqueness if changing
      if (data.slug && data.slug !== event.slug) {
        const existing = await ctx.db.event.findUnique({
          where: { slug: data.slug },
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An event with this slug already exists",
          });
        }
      }

      return ctx.db.event.update({
        where: { id },
        data,
      });
    }),

  /**
   * Archive an event (soft delete, requires ownership)
   */
  archive: protectedProcedure
    .input(eventIdSchema)
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({
        where: { id: input.id },
        select: {
          organizerId: true,
          isArchived: true,
          _count: {
            select: {
              registrations: true,
              scheduleEntries: true,
              speakers: true,
              emailCampaigns: true,
            },
          },
        },
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
          message: "You do not have permission to archive this event",
        });
      }

      if (event.isArchived) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Event is already archived",
        });
      }

      return ctx.db.event.update({
        where: { id: input.id },
        data: {
          isArchived: true,
          status: "archived",
        },
      });
    }),

  /**
   * Restore an archived event (requires ownership)
   */
  restore: protectedProcedure
    .input(eventIdSchema)
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({
        where: { id: input.id },
        select: { organizerId: true, isArchived: true },
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
          message: "You do not have permission to restore this event",
        });
      }

      if (!event.isArchived) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Event is not archived",
        });
      }

      return ctx.db.event.update({
        where: { id: input.id },
        data: {
          isArchived: false,
          status: "draft", // Restore to draft status for review
        },
      });
    }),

  /**
   * Delete an event permanently (requires ownership)
   * WARNING: This cascades to all related entities
   */
  delete: protectedProcedure
    .input(eventIdSchema)
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({
        where: { id: input.id },
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
          message: "You do not have permission to delete this event",
        });
      }

      return ctx.db.event.delete({
        where: { id: input.id },
      });
    }),

  /**
   * Get dashboard metrics for an event (requires ownership)
   */
  getMetrics: protectedProcedure
    .input(eventIdSchema)
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({
        where: { id: input.id },
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
          message: "You do not have permission to access this event",
        });
      }

      // Get comprehensive metrics
      const [
        totalRegistrations,
        totalTicketTypes,
        totalScheduleEntries,
        totalSpeakers,
        totalEmailCampaigns,
        recentRegistrations,
      ] = await Promise.all([
        ctx.db.registration.count({
          where: { eventId: input.id },
        }),
        ctx.db.ticketType.count({
          where: { eventId: input.id },
        }),
        ctx.db.scheduleEntry.count({
          where: { eventId: input.id },
        }),
        ctx.db.speaker.count({
          where: { eventId: input.id },
        }),
        ctx.db.emailCampaign.count({
          where: { eventId: input.id },
        }),
        ctx.db.registration.findMany({
          where: { eventId: input.id },
          take: 5,
          orderBy: { registeredAt: "desc" },
          include: {
            ticketType: {
              select: { name: true },
            },
          },
        }),
      ]);

      return {
        totalRegistrations,
        totalTicketTypes,
        totalScheduleEntries,
        totalSpeakers,
        totalEmailCampaigns,
        recentRegistrations,
      };
    }),

  /**
   * Get status counts for user's events (for dashboard filters)
   */
  getStatusCounts: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get counts for all statuses in parallel
    const [all, draft, published, archived] = await Promise.all([
      ctx.db.event.count({
        where: { organizerId: userId },
      }),
      ctx.db.event.count({
        where: { organizerId: userId, status: "draft" },
      }),
      ctx.db.event.count({
        where: { organizerId: userId, status: "published" },
      }),
      ctx.db.event.count({
        where: { organizerId: userId, status: "archived" },
      }),
    ]);

    return {
      all,
      draft,
      published,
      archived,
    };
  }),
});
