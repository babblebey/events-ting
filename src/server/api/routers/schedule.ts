/**
 * Schedule tRPC Router
 * Handles schedule entry CRUD, speaker assignments, overlap detection, and timeline views
 * FR-019 through FR-025
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import {
  createScheduleEntrySchema,
  updateScheduleEntrySchema,
  listScheduleEntriesSchema,
  eventIdSchema,
} from "@/lib/validators";
import { combineDateTime, doTimeRangesOverlap } from "@/lib/utils/date";

export const scheduleRouter = createTRPCRouter({
  /**
   * Create a new schedule entry
   * FR-019: Create schedule entries with date, time, location, track
   */
  create: protectedProcedure
    .input(createScheduleEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const {
        eventId,
        title,
        description,
        date,
        startTime,
        endTime,
        location,
        track,
        trackColor,
        sessionType,
        speakerIds,
      } = input;

      // Verify event exists and user is the organizer
      const event = await ctx.db.event.findUnique({
        where: { id: eventId },
        select: { id: true, organizerId: true, timezone: true },
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
          message: "Only event organizer can create schedule entries",
        });
      }

      // Combine date and time into UTC timestamps
      const startDateTime = combineDateTime(date, startTime, event.timezone);
      const endDateTime = combineDateTime(date, endTime, event.timezone);

      // Create schedule entry
      const scheduleEntry = await ctx.db.scheduleEntry.create({
        data: {
          eventId,
          title,
          description,
          startTime: startDateTime,
          endTime: endDateTime,
          location,
          track,
          trackColor,
          sessionType,
          // Create speaker assignments if provided
          speakerSessions: speakerIds
            ? {
                create: speakerIds.map((speakerId) => ({
                  speakerId,
                  role: "speaker",
                })),
              }
            : undefined,
        },
        include: {
          speakerSessions: {
            include: {
              speaker: {
                select: {
                  id: true,
                  name: true,
                  photo: true,
                },
              },
            },
          },
        },
      });

      return scheduleEntry;
    }),

  /**
   * List schedule entries for an event
   * FR-020: Display published event schedule
   */
  list: publicProcedure
    .input(listScheduleEntriesSchema)
    .query(async ({ ctx, input }) => {
      const { eventId, date, track } = input;

      // Build where clause with optional filters
      const where: {
        eventId: string;
        startTime?: { gte: Date; lt: Date };
        track?: string;
      } = { eventId };

      // Filter by date if provided
      if (date) {
        const startOfDay = new Date(`${date}T00:00:00Z`);
        const endOfDay = new Date(`${date}T23:59:59Z`);
        where.startTime = {
          gte: startOfDay,
          lt: endOfDay,
        };
      }

      // Filter by track if provided
      if (track) {
        where.track = track;
      }

      const entries = await ctx.db.scheduleEntry.findMany({
        where,
        orderBy: {
          startTime: "asc",
        },
        include: {
          speakerSessions: {
            include: {
              speaker: {
                select: {
                  id: true,
                  name: true,
                  photo: true,
                  bio: true,
                },
              },
            },
          },
        },
      });

      return entries;
    }),

  /**
   * Get a single schedule entry by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const entry = await ctx.db.scheduleEntry.findUnique({
        where: { id: input.id },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              slug: true,
              timezone: true,
            },
          },
          speakerSessions: {
            include: {
              speaker: true,
            },
          },
        },
      });

      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule entry not found",
        });
      }

      return entry;
    }),

  /**
   * Update a schedule entry
   * FR-021: Edit schedule entries
   * Implements optimistic concurrency control via updatedAt versioning
   */
  update: protectedProcedure
    .input(updateScheduleEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const {
        id,
        updatedAt,
        eventId,
        title,
        description,
        date,
        startTime,
        endTime,
        location,
        track,
        trackColor,
        sessionType,
        speakerIds,
      } = input;

      // Fetch existing entry with lock for update
      const existingEntry = await ctx.db.scheduleEntry.findUnique({
        where: { id },
        include: {
          event: {
            select: {
              id: true,
              organizerId: true,
              timezone: true,
            },
          },
        },
      });

      if (!existingEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule entry not found",
        });
      }

      // Check authorization
      if (existingEntry.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only event organizer can update schedule entries",
        });
      }

      // Optimistic concurrency control: check if entry was modified since last read
      if (existingEntry.updatedAt.getTime() !== updatedAt.getTime()) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Schedule entry was modified by another user. Please refresh and try again.",
        });
      }

      // Prepare update data
      const updateData: {
        title?: string;
        description?: string;
        startTime?: Date;
        endTime?: Date;
        location?: string | null;
        track?: string | null;
        trackColor?: string | null;
        sessionType?: string | null;
      } = {};

      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (location !== undefined) updateData.location = location;
      if (track !== undefined) updateData.track = track;
      if (trackColor !== undefined) updateData.trackColor = trackColor;
      if (sessionType !== undefined) updateData.sessionType = sessionType;

      // Handle date/time updates
      if (date && startTime && endTime) {
        updateData.startTime = combineDateTime(
          date,
          startTime,
          existingEntry.event.timezone,
        );
        updateData.endTime = combineDateTime(
          date,
          endTime,
          existingEntry.event.timezone,
        );
      }

      // Update schedule entry
      const updatedEntry = await ctx.db.scheduleEntry.update({
        where: { id },
        data: updateData,
        include: {
          speakerSessions: {
            include: {
              speaker: {
                select: {
                  id: true,
                  name: true,
                  photo: true,
                },
              },
            },
          },
        },
      });

      // Update speaker assignments if provided
      if (speakerIds !== undefined) {
        // Delete existing assignments
        await ctx.db.speakerSession.deleteMany({
          where: { scheduleEntryId: id },
        });

        // Create new assignments
        if (speakerIds.length > 0) {
          await ctx.db.speakerSession.createMany({
            data: speakerIds.map((speakerId) => ({
              scheduleEntryId: id,
              speakerId,
              role: "speaker",
            })),
          });
        }

        // Fetch updated entry with new speaker assignments
        return ctx.db.scheduleEntry.findUnique({
          where: { id },
          include: {
            speakerSessions: {
              include: {
                speaker: {
                  select: {
                    id: true,
                    name: true,
                    photo: true,
                  },
                },
              },
            },
          },
        });
      }

      return updatedEntry;
    }),

  /**
   * Delete a schedule entry
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify entry exists and user is organizer
      const entry = await ctx.db.scheduleEntry.findUnique({
        where: { id: input.id },
        include: {
          event: {
            select: { organizerId: true },
          },
        },
      });

      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule entry not found",
        });
      }

      if (entry.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only event organizer can delete schedule entries",
        });
      }

      await ctx.db.scheduleEntry.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Reorder schedule entries (update display order)
   * Note: Order is determined by startTime, this is a placeholder for drag-to-reorder UI
   */
  reorder: protectedProcedure
    .input(
      z.object({
        eventId: z.string().cuid(),
        entryIds: z.array(z.string().cuid()),
      }),
    )
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
          message: "Only event organizer can reorder schedule entries",
        });
      }

      // In a real implementation, you might add a displayOrder field
      // For now, we rely on startTime ordering
      // This is a placeholder for future drag-to-reorder functionality

      return { success: true, message: "Schedule is ordered by start time" };
    }),

  /**
   * Check for overlapping schedule entries
   * FR-021: Detect overlap conflicts (warning only, does not prevent)
   */
  checkOverlap: protectedProcedure
    .input(
      z.object({
        eventId: z.string().cuid(),
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
        location: z.string().optional(),
        excludeId: z.string().cuid().optional(), // Exclude this entry (for updates)
      }),
    )
    .query(async ({ ctx, input }) => {
      const { eventId, startTime, endTime, location, excludeId } = input;

      // Find potentially overlapping entries
      const entries = await ctx.db.scheduleEntry.findMany({
        where: {
          eventId,
          id: excludeId ? { not: excludeId } : undefined,
          // Find entries that might overlap in time
          OR: [
            {
              startTime: {
                lt: endTime,
              },
              endTime: {
                gt: startTime,
              },
            },
          ],
          // Only check same location if location is specified
          ...(location ? { location } : {}),
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          location: true,
          track: true,
        },
      });

      // Filter to actual overlaps using precise time range logic
      const overlappingEntries = entries.filter((entry) =>
        doTimeRangesOverlap(startTime, endTime, entry.startTime, entry.endTime),
      );

      return {
        hasOverlap: overlappingEntries.length > 0,
        count: overlappingEntries.length,
        entries: overlappingEntries,
      };
    }),

  /**
   * Get schedule entries for a specific date
   * Useful for day-by-day schedule views
   */
  getByDate: publicProcedure
    .input(
      z.object({
        eventId: z.string().cuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { eventId, date } = input;

      // Get event timezone for proper date filtering
      const event = await ctx.db.event.findUnique({
        where: { id: eventId },
        select: { timezone: true },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // Find entries for this date
      // Note: This is a simplified version; more robust filtering would consider timezone
      const startOfDay = new Date(`${date}T00:00:00Z`);
      const endOfDay = new Date(`${date}T23:59:59Z`);

      const entries = await ctx.db.scheduleEntry.findMany({
        where: {
          eventId,
          startTime: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
        orderBy: [{ startTime: "asc" }, { track: "asc" }],
        include: {
          speakerSessions: {
            include: {
              speaker: {
                select: {
                  id: true,
                  name: true,
                  photo: true,
                },
              },
            },
          },
        },
      });

      // Group by track
      const tracks = [...new Set(entries.map((e) => e.track).filter(Boolean))];

      return {
        date,
        tracks,
        entries,
        timezone: event.timezone,
      };
    }),

  /**
   * Get all unique tracks for an event
   * FR-025: Track support with visual indicators
   */
  getTracks: publicProcedure
    .input(eventIdSchema)
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.scheduleEntry.findMany({
        where: {
          eventId: input.id,
          track: { not: null },
        },
        select: {
          track: true,
          trackColor: true,
        },
        distinct: ["track"],
      });

      // Build unique track list with colors
      const tracks = entries
        .filter((e) => e.track)
        .map((e) => ({
          name: e.track!,
          color: e.trackColor ?? "#6B7280", // Default gray if no color
        }));

      return tracks;
    }),
});
