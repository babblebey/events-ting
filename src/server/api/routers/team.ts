/**
 * Team Router
 * Handles team collaboration operations including invitations, permissions, and member management
 */

import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  teamProtectedProcedure,
} from "@/server/api/trpc";
import {
  inviteTeamMemberSchema,
  acceptInvitationSchema,
  getCurrentMemberSchema,
} from "@/lib/validators";
import {
  generateInvitationToken,
  calculateInvitationExpiry,
} from "@/lib/utils";
import {
  sendTeamInvitationEmail,
  sendTeamInvitationAcceptedEmail,
} from "@/lib/email";

export const teamRouter = createTRPCRouter({
  /**
   * Get current user's team membership for an event
   * Used for permission checks on the client side
   */
  getCurrentMember: protectedProcedure
    .input(getCurrentMemberSchema)
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.teamMember.findFirst({
        where: {
          eventId: input.eventId,
          userId: ctx.session.user.id,
          status: "ACTIVE",
        },
        select: {
          id: true,
          role: true,
          status: true,
          modulePermissions: true,
        },
      });

      return member;
    }),

  /**
   * Invite a new collaborator to the event
   * Creates both Invitation and TeamMember records, sends email
   */
  invite: teamProtectedProcedure
    .input(inviteTeamMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const { eventId, email, modulePermissions } = input;

      // Verify user is owner
      if (ctx.teamMember.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only event owners can invite collaborators",
        });
      }

      // Check for self-invitation
      if (email.toLowerCase() === ctx.session.user.email?.toLowerCase()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot invite yourself - you already own this event",
        });
      }

      // Check for existing active member
      const existingMember = await ctx.db.teamMember.findUnique({
        where: {
          eventId_email: {
            eventId,
            email: email.toLowerCase(),
          },
        },
      });

      if (existingMember?.status === "ACTIVE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This email already has an active membership. Use 'Modify Permissions' to update their access.",
        });
      }

      // Check for pending invitation
      const pendingInvitation = await ctx.db.invitation.findFirst({
        where: {
          eventId,
          email: email.toLowerCase(),
          status: "PENDING",
        },
      });

      if (pendingInvitation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "An invitation has already been sent to this email. Use 'Resend Invitation' to send it again.",
        });
      }

      // Generate token and expiry
      const token = generateInvitationToken();
      const expiresAt = calculateInvitationExpiry();

      // Get event details for email
      const event = await ctx.db.event.findUnique({
        where: { id: eventId },
        select: { name: true, id: true },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // Create invitation and team member in transaction
      const result = await ctx.db.$transaction(async (tx) => {
        // Create invitation
        const invitation = await tx.invitation.create({
          data: {
            eventId,
            email: email.toLowerCase(),
            token,
            modulePermissions,
            status: "PENDING",
            expiresAt,
            sentById: ctx.session.user.id,
            sentAt: new Date(),
          },
        });

        // Create team member with PENDING status
        const teamMember = await tx.teamMember.create({
          data: {
            eventId,
            email: email.toLowerCase(),
            role: "COLLABORATOR",
            status: "PENDING",
            modulePermissions,
            invitedById: ctx.session.user.id,
            invitedAt: new Date(),
          },
        });

        return { invitation, teamMember };
      });

      // Send invitation email (async, don't await to avoid blocking)
      void sendTeamInvitationEmail({
        to: email,
        inviteeName: email.split("@")[0] ?? "there",
        eventName: event.name,
        eventId: event.id,
        organizerName: ctx.session.user.name ?? "Event Organizer",
        token,
        modules: modulePermissions,
        expiresAt,
      }).catch((error) => {
        console.error("Failed to send team invitation email:", error);
      });

      return {
        invitation: {
          id: result.invitation.id,
          email: result.invitation.email,
          token: result.invitation.token,
          modulePermissions: result.invitation.modulePermissions,
          status: result.invitation.status,
          expiresAt: result.invitation.expiresAt,
          sentAt: result.invitation.sentAt,
        },
        teamMember: {
          id: result.teamMember.id,
          email: result.teamMember.email,
          role: result.teamMember.role,
          status: result.teamMember.status,
          modulePermissions: result.teamMember.modulePermissions,
        },
      };
    }),

  /**
   * Accept an invitation using the token from email link
   * Updates invitation status and activates team member
   */
  acceptInvitation: protectedProcedure
    .input(acceptInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const { token } = input;

      // Find invitation by token
      const invitation = await ctx.db.invitation.findUnique({
        where: { token },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          sentBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found or invalid token",
        });
      }

      // Check if already accepted/declined/cancelled
      if (invitation.status !== "PENDING") {
        const statusMessage = {
          ACCEPTED: "This invitation has already been accepted",
          DECLINED: "This invitation was declined",
          CANCELLED: "This invitation was cancelled by the organizer",
          EXPIRED: "This invitation has expired",
        }[invitation.status];

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: statusMessage ?? "This invitation is no longer valid",
        });
      }

      // Check if expired
      if (invitation.expiresAt < new Date()) {
        // Mark as expired
        await ctx.db.invitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This invitation has expired. Please request a new invitation from the event organizer.",
        });
      }

      // Check if user already has active membership (edge case: invited to two emails)
      const existingMembership = await ctx.db.teamMember.findFirst({
        where: {
          eventId: invitation.eventId,
          userId: ctx.session.user.id,
          status: "ACTIVE",
        },
      });

      if (existingMembership) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already have an active membership for this event",
        });
      }

      // Accept invitation in transaction
      const result = await ctx.db.$transaction(async (tx) => {
        // Update invitation status
        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            status: "ACCEPTED",
            respondedAt: new Date(),
          },
        });

        // Find and update team member
        const teamMember = await tx.teamMember.findUnique({
          where: {
            eventId_email: {
              eventId: invitation.eventId,
              email: invitation.email,
            },
          },
        });

        if (!teamMember) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Team member record not found",
          });
        }

        // Update team member to ACTIVE and link to user
        const updatedMember = await tx.teamMember.update({
          where: { id: teamMember.id },
          data: {
            status: "ACTIVE",
            userId: ctx.session.user.id,
            lastAccessedAt: new Date(),
          },
        });

        return { teamMember: updatedMember };
      });

      // Send acceptance notification email to organizer (async)
      void sendTeamInvitationAcceptedEmail({
        to: invitation.sentBy.email ?? "",
        eventName: invitation.event.name,
        eventId: invitation.event.id,
        inviteeName: ctx.session.user.name ?? invitation.email,
        inviteeEmail: invitation.email,
        modules: invitation.modulePermissions,
      }).catch((error) => {
        console.error("Failed to send invitation accepted email:", error);
      });

      return {
        event: {
          id: invitation.event.id,
          name: invitation.event.name,
          slug: invitation.event.slug,
        },
        teamMember: {
          id: result.teamMember.id,
          role: result.teamMember.role,
          status: result.teamMember.status,
          modulePermissions: result.teamMember.modulePermissions,
        },
      };
    }),
});
