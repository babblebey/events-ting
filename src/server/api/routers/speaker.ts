/**
 * Speaker Router
 * Handles speaker profile management and session assignments
 */

import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { z } from "zod";

/**
 * Input validation schemas
 */
const createSpeakerSchema = z.object({
  eventId: z.string().cuid(),
  name: z.string().min(2).max(200),
  bio: z.string().min(10).max(5000),
  email: z.string().email(),
  photo: z.string().min(1).nullable().optional().or(z.literal("")).transform(val => val === "" ? null : val), // Allow both URLs and relative paths
  twitter: z.string().nullable().optional(),
  github: z.string().nullable().optional(),
  linkedin: z.string().nullable().optional(),
  website: z.string().url().nullable().optional().or(z.literal("")).transform(val => val === "" ? null : val),
});

const updateSpeakerSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(2).max(200).optional(),
  bio: z.string().min(10).max(5000).optional(),
  email: z.string().email().optional(),
  photo: z.string().min(1).nullable().optional().or(z.literal("")).transform(val => val === "" ? null : val), // Allow both URLs and relative paths
  twitter: z.string().nullable().optional(),
  github: z.string().nullable().optional(),
  linkedin: z.string().nullable().optional(),
  website: z.string().url().nullable().optional().or(z.literal("")).transform(val => val === "" ? null : val),
});

const speakerIdSchema = z.object({
  id: z.string().cuid(),
});

const eventIdSchema = z.object({
  eventId: z.string().cuid(),
});

const assignToSessionSchema = z.object({
  speakerId: z.string().cuid(),
  scheduleEntryId: z.string().cuid(),
  role: z.enum(["speaker", "moderator", "panelist"]).default("speaker"),
});

const unassignFromSessionSchema = z.object({
  speakerId: z.string().cuid(),
  scheduleEntryId: z.string().cuid(),
});

export const speakerRouter = createTRPCRouter({
  /**
   * Create a new speaker profile (organizers only)
   */
  create: protectedProcedure
    .input(createSpeakerSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify organizer owns the event
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
          message: "You do not have permission to add speakers to this event",
        });
      }

      // Check if speaker with same email already exists for this event
      const existingSpeaker = await ctx.db.speaker.findFirst({
        where: {
          eventId: input.eventId,
          email: input.email,
        },
      });

      if (existingSpeaker) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A speaker with this email already exists for this event",
        });
      }

      return ctx.db.speaker.create({
        data: input,
      });
    }),

  /**
   * List all speakers for an event
   * Public access for displaying speaker directory
   */
  list: publicProcedure.input(eventIdSchema).query(async ({ ctx, input }) => {
    return ctx.db.speaker.findMany({
      where: { eventId: input.eventId },
      orderBy: { name: "asc" },
      include: {
        speakerSessions: {
          include: {
            scheduleEntry: {
              select: {
                id: true,
                title: true,
                startTime: true,
                endTime: true,
                location: true,
                track: true,
              },
            },
          },
          orderBy: {
            scheduleEntry: {
              startTime: "asc",
            },
          },
        },
      },
    });
  }),

  /**
   * Get a single speaker by ID with all session details
   */
  getById: publicProcedure
    .input(speakerIdSchema)
    .query(async ({ ctx, input }) => {
      const speaker = await ctx.db.speaker.findUnique({
        where: { id: input.id },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          speakerSessions: {
            include: {
              scheduleEntry: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  startTime: true,
                  endTime: true,
                  location: true,
                  track: true,
                  trackColor: true,
                  sessionType: true,
                },
              },
            },
            orderBy: {
              scheduleEntry: {
                startTime: "asc",
              },
            },
          },
          cfpSubmissions: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      });

      if (!speaker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Speaker not found",
        });
      }

      return speaker;
    }),

  /**
   * Update speaker profile (organizers only)
   */
  update: protectedProcedure
    .input(updateSpeakerSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Get speaker and verify organizer owns the event
      const speaker = await ctx.db.speaker.findUnique({
        where: { id },
        include: {
          event: {
            select: { organizerId: true },
          },
        },
      });

      if (!speaker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Speaker not found",
        });
      }

      if (speaker.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this speaker",
        });
      }

      // If email is being updated, check for conflicts
      if (data.email && data.email !== speaker.email) {
        const existingSpeaker = await ctx.db.speaker.findFirst({
          where: {
            eventId: speaker.eventId,
            email: data.email,
            id: { not: id },
          },
        });

        if (existingSpeaker) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A speaker with this email already exists for this event",
          });
        }
      }

      return ctx.db.speaker.update({
        where: { id },
        data,
      });
    }),

  /**
   * Delete a speaker (organizers only)
   * Cascades to remove all session assignments
   */
  delete: protectedProcedure
    .input(speakerIdSchema)
    .mutation(async ({ ctx, input }) => {
      // Get speaker and verify organizer owns the event
      const speaker = await ctx.db.speaker.findUnique({
        where: { id: input.id },
        include: {
          event: {
            select: { organizerId: true },
          },
        },
      });

      if (!speaker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Speaker not found",
        });
      }

      if (speaker.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this speaker",
        });
      }

      return ctx.db.speaker.delete({
        where: { id: input.id },
      });
    }),

  /**
   * Assign a speaker to a schedule session (organizers only)
   * Creates entry in SpeakerSession junction table
   */
  assignToSession: protectedProcedure
    .input(assignToSessionSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify speaker exists and get event
      const speaker = await ctx.db.speaker.findUnique({
        where: { id: input.speakerId },
        include: {
          event: {
            select: { id: true, organizerId: true },
          },
        },
      });

      if (!speaker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Speaker not found",
        });
      }

      // Verify schedule entry exists and belongs to same event
      const scheduleEntry = await ctx.db.scheduleEntry.findUnique({
        where: { id: input.scheduleEntryId },
        select: { eventId: true },
      });

      if (!scheduleEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule entry not found",
        });
      }

      if (scheduleEntry.eventId !== speaker.eventId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Speaker and schedule entry must belong to the same event",
        });
      }

      // Verify organizer owns the event
      if (speaker.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You do not have permission to assign speakers for this event",
        });
      }

      // Check if assignment already exists
      const existingAssignment = await ctx.db.speakerSession.findFirst({
        where: {
          speakerId: input.speakerId,
          scheduleEntryId: input.scheduleEntryId,
        },
      });

      if (existingAssignment) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Speaker is already assigned to this session",
        });
      }

      return ctx.db.speakerSession.create({
        data: {
          speakerId: input.speakerId,
          scheduleEntryId: input.scheduleEntryId,
          role: input.role,
        },
        include: {
          speaker: {
            select: {
              id: true,
              name: true,
              photo: true,
            },
          },
          scheduleEntry: {
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      });
    }),

  /**
   * Unassign a speaker from a schedule session (organizers only)
   */
  unassignFromSession: protectedProcedure
    .input(unassignFromSessionSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify speaker exists and get event
      const speaker = await ctx.db.speaker.findUnique({
        where: { id: input.speakerId },
        include: {
          event: {
            select: { organizerId: true },
          },
        },
      });

      if (!speaker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Speaker not found",
        });
      }

      // Verify organizer owns the event
      if (speaker.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You do not have permission to unassign speakers for this event",
        });
      }

      // Find the assignment
      const assignment = await ctx.db.speakerSession.findFirst({
        where: {
          speakerId: input.speakerId,
          scheduleEntryId: input.scheduleEntryId,
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Speaker is not assigned to this session",
        });
      }

      return ctx.db.speakerSession.delete({
        where: { id: assignment.id },
      });
    }),

  /**
   * Get all speakers for a specific event (same as list, kept for consistency with contract)
   */
  getByEvent: publicProcedure
    .input(eventIdSchema)
    .query(async ({ ctx, input }) => {
      return ctx.db.speaker.findMany({
        where: { eventId: input.eventId },
        orderBy: { name: "asc" },
        include: {
          speakerSessions: {
            include: {
              scheduleEntry: {
                select: {
                  id: true,
                  title: true,
                  startTime: true,
                  endTime: true,
                  location: true,
                  track: true,
                  sessionType: true,
                },
              },
            },
            orderBy: {
              scheduleEntry: {
                startTime: "asc",
              },
            },
          },
        },
      });
    }),
});
