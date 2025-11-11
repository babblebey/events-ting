import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { sendBatchEmailsWithRetry } from "@/server/services/email";
import type { db } from "@/server/db";

/**
 * Communication Router
 * Handles email campaign management and bulk sending
 *
 * FR Coverage: FR-043 through FR-050, FR-056, FR-057
 */
export const communicationRouter = createTRPCRouter({
  /**
   * Create a new email campaign (draft)
   * FR-043: Organizers can compose email campaigns with subject and content
   */
  createCampaign: protectedProcedure
    .input(
      z.object({
        eventId: z.string().cuid(),
        subject: z.string().min(1).max(200),
        body: z.string().min(10), // HTML content
        recipientType: z.enum([
          "all_attendees",
          "ticket_type",
          "speakers",
          "custom",
        ]),
        recipientFilter: z.record(z.any()).optional(), // JSON filter criteria
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify organizer owns this event
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
            "You do not have permission to create campaigns for this event",
        });
      }

      // Create campaign in draft status
      return ctx.db.emailCampaign.create({
        data: {
          eventId: input.eventId,
          subject: input.subject,
          body: input.body,
          recipientType: input.recipientType,
          recipientFilter: input.recipientFilter ?? undefined,
          status: "draft",
        },
      });
    }),

  /**
   * List all campaigns for an event
   * FR-043: View campaign history and status
   */
  listCampaigns: protectedProcedure
    .input(
      z.object({
        eventId: z.string().cuid(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().cuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify organizer owns this event
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
            "You do not have permission to view campaigns for this event",
        });
      }

      const campaigns = await ctx.db.emailCampaign.findMany({
        where: { eventId: input.eventId },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });

      const nextCursor =
        campaigns.length > input.limit ? campaigns[input.limit]?.id : undefined;

      return {
        items: campaigns.slice(0, input.limit),
        nextCursor,
      };
    }),

  /**
   * Get a single campaign by ID
   */
  getCampaign: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.emailCampaign.findUnique({
        where: { id: input.id },
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

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (campaign.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this campaign",
        });
      }

      return campaign;
    }),

  /**
   * Update a campaign (only draft campaigns can be edited)
   * FR-043: Edit campaign details before sending
   */
  updateCampaign: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        subject: z.string().min(1).max(200).optional(),
        body: z.string().min(10).optional(),
        recipientType: z
          .enum(["all_attendees", "ticket_type", "speakers", "custom"])
          .optional(),
        recipientFilter: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.emailCampaign.findUnique({
        where: { id: input.id },
        include: {
          event: {
            select: { organizerId: true },
          },
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (campaign.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this campaign",
        });
      }

      if (campaign.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft campaigns can be edited",
        });
      }

      return ctx.db.emailCampaign.update({
        where: { id: input.id },
        data: {
          subject: input.subject,
          body: input.body,
          recipientType: input.recipientType,
          recipientFilter: input.recipientFilter,
        },
      });
    }),

  /**
   * Send a campaign immediately
   * FR-045: Send emails to selected recipient groups
   * FR-056: Batch sending with retry logic
   */
  sendCampaign: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.emailCampaign.findUnique({
        where: { id: input.id },
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

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (campaign.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to send this campaign",
        });
      }

      if (campaign.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft campaigns can be sent",
        });
      }

      // Get recipients based on filter
      const recipients = await getRecipients(ctx, campaign);

      if (recipients.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No recipients match the selected criteria",
        });
      }

      // Update campaign status to sending
      await ctx.db.emailCampaign.update({
        where: { id: input.id },
        data: {
          status: "sending",
          totalRecipients: recipients.length,
        },
      });

      // Send emails asynchronously (in production, use a queue)
      // For now, we'll send synchronously but this should be moved to a background job
      try {
        const { successCount, failureCount } = await sendBulkEmails(
          campaign,
          recipients,
        );

        // Update campaign status to sent
        await ctx.db.emailCampaign.update({
          where: { id: input.id },
          data: {
            status: "sent",
            sentAt: new Date(),
            delivered: successCount,
            // Note: Actual delivery tracking happens via webhooks
          },
        });

        return {
          success: true,
          recipientCount: recipients.length,
          successCount,
          failureCount,
        };
      } catch (error) {
        // Update campaign status to failed
        await ctx.db.emailCampaign.update({
          where: { id: input.id },
          data: {
            status: "failed",
          },
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send campaign emails",
          cause: error,
        });
      }
    }),

  /**
   * Schedule a campaign for future sending
   * FR-047: Schedule campaigns for specific date/time
   */
  scheduleCampaign: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        scheduledFor: z.coerce.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.emailCampaign.findUnique({
        where: { id: input.id },
        include: {
          event: {
            select: { organizerId: true },
          },
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (campaign.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to schedule this campaign",
        });
      }

      if (campaign.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft campaigns can be scheduled",
        });
      }

      // Validate scheduled time is in the future
      if (input.scheduledFor <= new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Scheduled time must be in the future",
        });
      }

      return ctx.db.emailCampaign.update({
        where: { id: input.id },
        data: {
          status: "scheduled",
          scheduledFor: input.scheduledFor,
        },
      });
    }),

  /**
   * Get campaign statistics
   * FR-048: Track delivery metrics (sent, delivered, bounces, opens, clicks)
   */
  getCampaignStats: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.emailCampaign.findUnique({
        where: { id: input.id },
        include: {
          event: {
            select: { organizerId: true },
          },
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (campaign.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You do not have permission to view this campaign's statistics",
        });
      }

      return {
        totalRecipients: campaign.totalRecipients,
        delivered: campaign.delivered,
        bounces: campaign.bounces,
        opens: campaign.opens,
        clicks: campaign.clicks,
        status: campaign.status,
        sentAt: campaign.sentAt,
        scheduledFor: campaign.scheduledFor,
      };
    }),
});

/**
 * Helper function to get recipients based on campaign filters
 * FR-044: Select recipients (all attendees, specific ticket types, speakers, or custom lists)
 */
async function getRecipients(
  ctx: { db: typeof db },
  campaign: {
    eventId: string;
    recipientType: string;
    recipientFilter: unknown;
  },
): Promise<Array<{ email: string; name: string }>> {
  switch (campaign.recipientType) {
    case "all_attendees": {
      // Get all registrations for this event with active email status
      const registrations = await ctx.db.registration.findMany({
        where: {
          eventId: campaign.eventId,
          emailStatus: "active",
        },
        select: {
          email: true,
          name: true,
        },
      });
      return registrations;
    }

    case "ticket_type": {
      // Get registrations for specific ticket type
      const filter = campaign.recipientFilter;
      let ticketTypeId: string | undefined;

      if (filter && typeof filter === "object" && "ticketTypeId" in filter) {
        ticketTypeId = (filter as Record<string, unknown>).ticketTypeId as
          | string
          | undefined;
      }

      if (!ticketTypeId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ticket type ID required for ticket_type recipient filter",
        });
      }

      const registrations = await ctx.db.registration.findMany({
        where: {
          eventId: campaign.eventId,
          ticketTypeId,
          emailStatus: "active",
        },
        select: {
          email: true,
          name: true,
        },
      });
      return registrations;
    }

    case "speakers": {
      // Get all speakers for this event
      const speakers = await ctx.db.speaker.findMany({
        where: {
          eventId: campaign.eventId,
        },
        select: {
          email: true,
          name: true,
        },
      });
      return speakers;
    }

    case "custom": {
      // Custom recipient list from filter
      const filter = campaign.recipientFilter;
      let emails: Array<{ email: string; name: string }> | undefined;

      if (filter && typeof filter === "object" && "emails" in filter) {
        const maybe = (filter as Record<string, unknown>).emails;
        if (Array.isArray(maybe)) {
          // Narrow array items to expected shape
          emails = maybe as Array<{ email: string; name: string }>;
        }
      }

      if (!emails || !Array.isArray(emails)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Custom recipient list required for custom recipient type",
        });
      }
      return emails;
    }

    default:
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Unknown recipient type: ${campaign.recipientType}`,
      });
  }
}

/**
 * Helper function to send bulk emails
 * Implements batching and retry logic per Research Section 1
 */
async function sendBulkEmails(
  campaign: { id: string; subject: string; body: string },
  recipients: Array<{ email: string; name: string }>,
): Promise<{ successCount: number; failureCount: number }> {
  // Send emails using the email service with retry logic
  const results = await sendBatchEmailsWithRetry({
    recipients: recipients.map((r) => r.email),
    subject: campaign.subject,
    html: campaign.body,
    tags: [
      { name: "campaign_id", value: campaign.id },
      { name: "type", value: "campaign" },
    ],
  });

  // Count successes and failures
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  console.log(
    `[CAMPAIGN] Campaign ${campaign.id} sent: ${successCount} successful, ${failureCount} failed`,
  );

  return { successCount, failureCount };
}
