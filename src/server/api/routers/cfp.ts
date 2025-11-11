/**
 * CFP (Call for Papers) Router
 *
 * Handles Call for Papers management and submission review for events.
 *
 * Procedures:
 * - open: Create a new CFP for an event
 * - close: Close an existing CFP
 * - update: Update CFP guidelines and settings
 * - submitProposal: Submit a session proposal (public)
 * - listSubmissions: List all submissions for organizer review
 * - reviewSubmission: Add review notes and score to a submission
 * - acceptProposal: Accept a proposal and create speaker profile
 * - rejectProposal: Reject a proposal with feedback
 *
 * @module server/api/routers/cfp
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { sendEmail } from "@/server/services/email";
import { CfpSubmissionReceived } from "../../../../emails/cfp-submission-received";
import { CfpAccepted } from "../../../../emails/cfp-accepted";
import { CfpRejected } from "../../../../emails/cfp-rejected";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const openCfpSchema = z.object({
  eventId: z.string().cuid("Invalid event ID"),
  guidelines: z
    .string()
    .min(50, "Guidelines must be at least 50 characters")
    .max(5000),
  deadline: z.coerce.date(),
  requiredFields: z
    .array(z.enum(["bio", "sessionFormat", "duration", "photo"]))
    .optional(),
});

const updateCfpSchema = z.object({
  cfpId: z.string().cuid("Invalid CFP ID"),
  guidelines: z.string().min(50).max(5000).optional(),
  deadline: z.coerce.date().optional(),
  requiredFields: z
    .array(z.enum(["bio", "sessionFormat", "duration", "photo"]))
    .optional(),
});

const closeCfpSchema = z.object({
  cfpId: z.string().cuid("Invalid CFP ID"),
});

const submitProposalSchema = z.object({
  cfpId: z.string().cuid("Invalid CFP ID"),
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z
    .string()
    .min(50, "Description must be at least 50 characters")
    .max(2000),
  sessionFormat: z.enum(["talk", "workshop", "panel", "lightning"], {
    errorMap: () => ({ message: "Invalid session format" }),
  }),
  duration: z
    .number()
    .int()
    .min(5)
    .max(480, "Duration must be between 5 and 480 minutes"),
  speakerName: z.string().min(2).max(100),
  speakerEmail: z.string().email("Invalid email address"),
  speakerBio: z
    .string()
    .min(50, "Bio must be at least 50 characters")
    .max(1000),
  speakerPhoto: z.string().url("Invalid photo URL").optional(),
  speakerTwitter: z.string().max(100).optional(),
  speakerGithub: z.string().max(100).optional(),
  speakerLinkedin: z.string().max(100).optional(),
  speakerWebsite: z.string().url("Invalid website URL").optional(),
});

const listSubmissionsSchema = z.object({
  cfpId: z.string().cuid("Invalid CFP ID"),
  status: z.enum(["pending", "accepted", "rejected", "all"]).default("all"),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().cuid().optional(),
});

const reviewSubmissionSchema = z.object({
  submissionId: z.string().cuid("Invalid submission ID"),
  reviewNotes: z.string().max(2000).optional(),
  reviewScore: z.number().int().min(1).max(5).optional(),
});

const acceptProposalSchema = z.object({
  submissionId: z.string().cuid("Invalid submission ID"),
  reviewNotes: z.string().max(2000).optional(),
});

const rejectProposalSchema = z.object({
  submissionId: z.string().cuid("Invalid submission ID"),
  reviewNotes: z.string().max(2000).optional(),
});

const getCfpByEventIdSchema = z.object({
  eventId: z.string().cuid("Invalid event ID"),
});

const getPublicCfpSchema = z.union([
  z.object({ eventId: z.string().cuid("Invalid event ID") }),
  z.object({ eventSlug: z.string().min(1, "Event slug is required") }),
]);

// ============================================================================
// ROUTER DEFINITION
// ============================================================================

export const cfpRouter = createTRPCRouter({
  /**
   * Get CFP by event ID (organizer only)
   * @protected Requires authentication and organizer permission
   */
  getCfpByEventId: protectedProcedure
    .input(getCfpByEventIdSchema)
    .query(async ({ ctx, input }) => {
      // Verify organizer permission
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
          message: "Only the event organizer can view CFP details",
        });
      }

      // Fetch CFP
      const cfp = await ctx.db.callForPapers.findUnique({
        where: { eventId: input.eventId },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      return cfp;
    }),

  /**
   * Get public CFP data for submission page
   * @public No authentication required
   */
  getPublicCfp: publicProcedure
    .input(getPublicCfpSchema)
    .query(async ({ ctx, input }) => {
      // Get event by ID or slug
      const event =
        "eventId" in input
          ? await ctx.db.event.findUnique({
              where: { id: input.eventId },
              select: { id: true, name: true, slug: true },
            })
          : await ctx.db.event.findUnique({
              where: { slug: input.eventSlug },
              select: { id: true, name: true, slug: true },
            });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // Fetch CFP (only public-safe fields)
      const cfp = await ctx.db.callForPapers.findUnique({
        where: { eventId: event.id },
        select: {
          id: true,
          guidelines: true,
          deadline: true,
          status: true,
          requiredFields: true,
          eventId: true,
        },
      });

      return cfp;
    }),

  /**
   * Open a new Call for Papers for an event
   * @protected Requires authentication and organizer permission
   */
  open: protectedProcedure
    .input(openCfpSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify organizer permission
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
          message: "Only the event organizer can open a CFP",
        });
      }

      // Check if CFP already exists for this event
      const existingCfp = await ctx.db.callForPapers.findUnique({
        where: { eventId: input.eventId },
      });

      if (existingCfp) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "CFP already exists for this event",
        });
      }

      // Validate deadline is in the future
      if (input.deadline <= new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CFP deadline must be in the future",
        });
      }

      // Create CFP
      const cfp = await ctx.db.callForPapers.create({
        data: {
          eventId: input.eventId,
          guidelines: input.guidelines,
          deadline: input.deadline,
          requiredFields: input.requiredFields ?? [],
          status: "open",
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      return cfp;
    }),

  /**
   * Close an existing CFP
   * @protected Requires authentication and organizer permission
   */
  close: protectedProcedure
    .input(closeCfpSchema)
    .mutation(async ({ ctx, input }) => {
      // Get CFP with event for permission check
      const cfp = await ctx.db.callForPapers.findUnique({
        where: { id: input.cfpId },
        include: {
          event: {
            select: {
              organizerId: true,
            },
          },
        },
      });

      if (!cfp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CFP not found",
        });
      }

      if (cfp.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the event organizer can close the CFP",
        });
      }

      if (cfp.status === "closed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CFP is already closed",
        });
      }

      // Close CFP
      const updatedCfp = await ctx.db.callForPapers.update({
        where: { id: input.cfpId },
        data: {
          status: "closed",
        },
      });

      return updatedCfp;
    }),

  /**
   * Update CFP guidelines and settings
   * @protected Requires authentication and organizer permission
   */
  update: protectedProcedure
    .input(updateCfpSchema)
    .mutation(async ({ ctx, input }) => {
      // Get CFP with event for permission check
      const cfp = await ctx.db.callForPapers.findUnique({
        where: { id: input.cfpId },
        include: {
          event: {
            select: {
              organizerId: true,
            },
          },
        },
      });

      if (!cfp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CFP not found",
        });
      }

      if (cfp.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the event organizer can update the CFP",
        });
      }

      // Validate deadline if provided
      if (input.deadline && input.deadline <= new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CFP deadline must be in the future",
        });
      }

      // Update CFP
      const updatedCfp = await ctx.db.callForPapers.update({
        where: { id: input.cfpId },
        data: {
          ...(input.guidelines && { guidelines: input.guidelines }),
          ...(input.deadline && { deadline: input.deadline }),
          ...(input.requiredFields && { requiredFields: input.requiredFields }),
        },
      });

      return updatedCfp;
    }),

  /**
   * Submit a session proposal (public endpoint)
   * @public No authentication required
   */
  submitProposal: publicProcedure
    .input(submitProposalSchema)
    .mutation(async ({ ctx, input }) => {
      // Get CFP with event info
      const cfp = await ctx.db.callForPapers.findUnique({
        where: { id: input.cfpId },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              organizerId: true,
            },
          },
        },
      });

      if (!cfp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CFP not found",
        });
      }

      // Deadline enforcement (FR-030, Research Section 7)
      if (cfp.status === "closed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This Call for Papers is closed",
        });
      }

      if (cfp.deadline < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The submission deadline has passed",
        });
      }

      // Create submission
      const submission = await ctx.db.cfpSubmission.create({
        data: {
          eventId: cfp.event.id,
          cfpId: input.cfpId,
          title: input.title,
          description: input.description,
          sessionFormat: input.sessionFormat,
          duration: input.duration,
          speakerName: input.speakerName,
          speakerEmail: input.speakerEmail,
          speakerBio: input.speakerBio,
          speakerPhoto: input.speakerPhoto,
          speakerTwitter: input.speakerTwitter,
          speakerGithub: input.speakerGithub,
          speakerLinkedin: input.speakerLinkedin,
          speakerWebsite: input.speakerWebsite,
          status: "pending",
        },
      });

      // Send confirmation email to speaker (T060, T072)
      const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/events/${cfp.eventId}`;

      await sendEmail({
        to: input.speakerEmail,
        subject: `Proposal Received: ${input.title}`,
        react: CfpSubmissionReceived({
          speakerName: input.speakerName,
          eventName: cfp.event.name,
          proposalTitle: input.title,
          eventUrl,
        }),
        tags: [
          { name: "type", value: "cfp-submission" },
          { name: "eventId", value: cfp.eventId },
        ],
      }).catch((error) => {
        // Log error but don't fail the submission
        console.error("[CFP] Failed to send confirmation email:", error);
      });

      return submission;
    }),

  /**
   * List all submissions for a CFP (organizer only)
   * @protected Requires authentication and organizer permission
   */
  listSubmissions: protectedProcedure
    .input(listSubmissionsSchema)
    .query(async ({ ctx, input }) => {
      // Get CFP with event for permission check
      const cfp = await ctx.db.callForPapers.findUnique({
        where: { id: input.cfpId },
        include: {
          event: {
            select: {
              organizerId: true,
            },
          },
        },
      });

      if (!cfp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CFP not found",
        });
      }

      if (cfp.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the event organizer can view submissions",
        });
      }

      // Build where clause
      const whereClause: {
        cfpId: string;
        status?: string;
        id?: { gt: string };
      } = {
        cfpId: input.cfpId,
      };

      if (input.status !== "all") {
        whereClause.status = input.status;
      }

      if (input.cursor) {
        whereClause.id = { gt: input.cursor };
      }

      // Fetch submissions with cursor-based pagination
      const submissions = await ctx.db.cfpSubmission.findMany({
        where: whereClause,
        take: input.limit + 1,
        orderBy: [
          { status: "asc" }, // Pending first
          { submittedAt: "desc" }, // Newest first
        ],
        include: {
          speaker: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Determine next cursor
      let nextCursor: string | undefined = undefined;
      if (submissions.length > input.limit) {
        const nextItem = submissions.pop();
        nextCursor = nextItem?.id;
      }

      return {
        submissions,
        nextCursor,
      };
    }),

  /**
   * Add review notes and score to a submission (FR-032)
   * @protected Requires authentication and organizer permission
   */
  reviewSubmission: protectedProcedure
    .input(reviewSubmissionSchema)
    .mutation(async ({ ctx, input }) => {
      // Get submission with event for permission check
      const submission = await ctx.db.cfpSubmission.findUnique({
        where: { id: input.submissionId },
        include: {
          cfp: {
            include: {
              event: {
                select: {
                  organizerId: true,
                },
              },
            },
          },
        },
      });

      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission not found",
        });
      }

      if (submission.cfp.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the event organizer can review submissions",
        });
      }

      // Update submission with review
      const updatedSubmission = await ctx.db.cfpSubmission.update({
        where: { id: input.submissionId },
        data: {
          ...(input.reviewNotes !== undefined && {
            reviewNotes: input.reviewNotes,
          }),
          ...(input.reviewScore !== undefined && {
            reviewScore: input.reviewScore,
          }),
          reviewedAt: new Date(),
        },
      });

      return updatedSubmission;
    }),

  /**
   * Accept a proposal and create speaker profile (FR-033, FR-034)
   * @protected Requires authentication and organizer permission
   */
  acceptProposal: protectedProcedure
    .input(acceptProposalSchema)
    .mutation(async ({ ctx, input }) => {
      // Get submission with event for permission check
      const submission = await ctx.db.cfpSubmission.findUnique({
        where: { id: input.submissionId },
        include: {
          cfp: {
            include: {
              event: {
                select: {
                  id: true,
                  organizerId: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission not found",
        });
      }

      if (submission.cfp.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the event organizer can accept proposals",
        });
      }

      if (submission.status === "accepted") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This proposal has already been accepted",
        });
      }

      // Create speaker profile if it doesn't exist (FR-034)
      let speaker = submission.speakerId
        ? await ctx.db.speaker.findUnique({
            where: { id: submission.speakerId },
          })
        : null;

      speaker ??= await ctx.db.speaker.create({
        data: {
          eventId: submission.eventId,
          name: submission.speakerName,
          email: submission.speakerEmail,
          bio: submission.speakerBio,
          photo: submission.speakerPhoto,
          twitter: submission.speakerTwitter,
          github: submission.speakerGithub,
          linkedin: submission.speakerLinkedin,
          website: submission.speakerWebsite,
        },
      });

      // Update submission status and link to speaker
      const updatedSubmission = await ctx.db.cfpSubmission.update({
        where: { id: input.submissionId },
        data: {
          status: "accepted",
          speakerId: speaker.id,
          reviewNotes: input.reviewNotes,
          reviewedAt: new Date(),
        },
        include: {
          speaker: true,
        },
      });

      // Send acceptance email to speaker (T061, T072)
      const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/events/${submission.eventId}`;

      await sendEmail({
        to: updatedSubmission.speakerEmail,
        subject: `Proposal Accepted: ${updatedSubmission.title} - ${submission.cfp.event.name}`,
        react: CfpAccepted({
          speakerName: updatedSubmission.speakerName,
          eventName: submission.cfp.event.name,
          proposalTitle: updatedSubmission.title,
          sessionFormat: updatedSubmission.sessionFormat,
          duration: updatedSubmission.duration,
          eventUrl,
        }),
        tags: [
          { name: "type", value: "cfp-accepted" },
          { name: "eventId", value: submission.eventId },
        ],
      }).catch((error) => {
        // Log error but don't fail the acceptance
        console.error("[CFP] Failed to send acceptance email:", error);
      });

      return updatedSubmission;
    }),

  /**
   * Reject a proposal with feedback (FR-035)
   * @protected Requires authentication and organizer permission
   */
  rejectProposal: protectedProcedure
    .input(rejectProposalSchema)
    .mutation(async ({ ctx, input }) => {
      // Get submission with event for permission check
      const submission = await ctx.db.cfpSubmission.findUnique({
        where: { id: input.submissionId },
        include: {
          cfp: {
            include: {
              event: {
                select: {
                  organizerId: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission not found",
        });
      }

      if (submission.cfp.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the event organizer can reject proposals",
        });
      }

      if (submission.status === "rejected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This proposal has already been rejected",
        });
      }

      // Update submission status
      const updatedSubmission = await ctx.db.cfpSubmission.update({
        where: { id: input.submissionId },
        data: {
          status: "rejected",
          reviewNotes: input.reviewNotes,
          reviewedAt: new Date(),
        },
      });

      // Send rejection email to speaker (T062, T072)
      const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/events/${submission.eventId}`;

      await sendEmail({
        to: updatedSubmission.speakerEmail,
        subject: `Proposal Update: ${updatedSubmission.title} - ${submission.cfp.event.name}`,
        react: CfpRejected({
          speakerName: updatedSubmission.speakerName,
          eventName: submission.cfp.event.name,
          proposalTitle: updatedSubmission.title,
          reviewNotes: input.reviewNotes,
          eventUrl,
        }),
        tags: [
          { name: "type", value: "cfp-rejected" },
          { name: "eventId", value: submission.eventId },
        ],
      }).catch((error) => {
        // Log error but don't fail the rejection
        console.error("[CFP] Failed to send rejection email:", error);
      });

      return updatedSubmission;
    }),
});
