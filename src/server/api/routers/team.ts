/**
 * Team Router
 * Handles team collaboration operations including invitations, permissions, and member management
 */

import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  inviteTeamMemberSchema,
  acceptInvitationSchema,
  declineInvitationSchema,
  getCurrentMemberSchema,
  getTeamMembersSchema,
  getPendingInvitationsSchema,
  resendInvitationSchema,
  cancelInvitationSchema,
  updateTeamMemberPermissionsSchema,
  removeTeamMemberSchema,
} from "@/lib/validators";
import {
  generateInvitationToken,
  calculateInvitationExpiry,
} from "@/lib/utils";
import {
  sendTeamInvitationEmail,
  sendTeamInvitationAcceptedEmail,
  sendTeamInvitationDeclinedEmail,
  sendTeamPermissionChangedEmail,
  sendTeamAccessRemovedEmail,
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
   * Get all team members for an event
   * Supports filtering by status (PENDING, ACTIVE, REMOVED) and pagination
   */
  getMembers: protectedProcedure
    .input(getTeamMembersSchema)
    .query(async ({ ctx, input }) => {
      const { eventId, status, page = 1, limit = 20 } = input;

      // Verify user has access to this event
      const currentMember = await ctx.db.teamMember.findFirst({
        where: {
          eventId,
          userId: ctx.session.user.id,
          status: "ACTIVE",
        },
      });

      if (!currentMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this event",
        });
      }

      // Only owners can view all team members
      if (currentMember.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only event owners can view team members",
        });
      }

      // Build where clause
      const where = {
        eventId,
        ...(status ? { status } : {}),
      };

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Get total count for pagination
      const totalCount = await ctx.db.teamMember.count({ where });

      // Fetch team members with pagination
      const members = await ctx.db.teamMember.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          invitedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { role: "asc" }, // OWNER first, then COLLABORATOR
          { invitedAt: "desc" }, // Most recent first
        ],
        skip,
        take: limit,
      });

      return {
        members,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: skip + members.length < totalCount,
        },
      };
    }),

  /**
   * Get all pending invitations for an event
   * Returns invitations with PENDING status
   */
  getPendingInvitations: protectedProcedure
    .input(getPendingInvitationsSchema)
    .query(async ({ ctx, input }) => {
      const { eventId } = input;

      // Verify user has access to this event
      const currentMember = await ctx.db.teamMember.findFirst({
        where: {
          eventId,
          userId: ctx.session.user.id,
          status: "ACTIVE",
        },
      });

      if (!currentMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this event",
        });
      }

      // Only owners can view invitations
      if (currentMember.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only event owners can view pending invitations",
        });
      }

      // Fetch pending invitations
      const invitations = await ctx.db.invitation.findMany({
        where: {
          eventId,
          status: "PENDING",
        },
        include: {
          sentBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          sentAt: "desc", // Most recent first
        },
      });

      // Check for expired invitations and mark them
      const now = new Date();
      const expiredInvitationIds = invitations
        .filter((inv) => inv.expiresAt < now)
        .map((inv) => inv.id);

      if (expiredInvitationIds.length > 0) {
        // Update expired invitations in background
        void ctx.db.invitation
          .updateMany({
            where: {
              id: { in: expiredInvitationIds },
            },
            data: {
              status: "EXPIRED",
            },
          })
          .catch((error) => {
            console.error("Failed to mark invitations as expired:", error);
          });

        // Filter out expired invitations from response
        return invitations.filter((inv) => inv.expiresAt >= now);
      }

      return invitations;
    }),

  /**
   * Get all declined invitations for an event
   * Returns invitations with DECLINED status (last 30 days)
   */
  getDeclinedInvitations: protectedProcedure
    .input(getPendingInvitationsSchema)
    .query(async ({ ctx, input }) => {
      const { eventId } = input;

      // Verify user has access to this event
      const currentMember = await ctx.db.teamMember.findFirst({
        where: {
          eventId,
          userId: ctx.session.user.id,
          status: "ACTIVE",
        },
      });

      if (!currentMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this event",
        });
      }

      // Only owners can view invitations
      if (currentMember.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only event owners can view declined invitations",
        });
      }

      // Fetch declined invitations from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const invitations = await ctx.db.invitation.findMany({
        where: {
          eventId,
          status: "DECLINED",
          respondedAt: {
            gte: thirtyDaysAgo,
          },
        },
        include: {
          sentBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          respondedAt: "desc", // Most recent first
        },
      });

      return invitations;
    }),

  /**
   * Get all expired invitations for an event
   * Returns invitations with EXPIRED status (last 30 days)
   */
  getExpiredInvitations: protectedProcedure
    .input(getPendingInvitationsSchema)
    .query(async ({ ctx, input }) => {
      const { eventId } = input;

      // Verify user has access to this event
      const currentMember = await ctx.db.teamMember.findFirst({
        where: {
          eventId,
          userId: ctx.session.user.id,
          status: "ACTIVE",
        },
      });

      if (!currentMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this event",
        });
      }

      // Only owners can view invitations
      if (currentMember.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only event owners can view expired invitations",
        });
      }

      // Fetch expired invitations from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const invitations = await ctx.db.invitation.findMany({
        where: {
          eventId,
          status: "EXPIRED",
          respondedAt: {
            gte: thirtyDaysAgo,
          },
        },
        include: {
          sentBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          respondedAt: "desc", // Most recent first
        },
      });

      return invitations;
    }),

  /**
   * Invite a new collaborator to the event
   * Creates both Invitation and TeamMember records, sends email
   */
  invite: protectedProcedure
    .input(inviteTeamMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const { eventId, email, modulePermissions } = input;

      // Check if user is a team member and owner
      const currentMember = await ctx.db.teamMember.findFirst({
        where: {
          eventId,
          userId: ctx.session.user.id,
          status: "ACTIVE",
        },
      });

      if (!currentMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this event",
        });
      }

      if (currentMember.role !== "OWNER") {
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
   * Resend invitation to pending or expired invitation
   * Generates new token and resets expiry date
   */
  resendInvitation: protectedProcedure
    .input(resendInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const { invitationId } = input;

      // Find the invitation
      const invitation = await ctx.db.invitation.findUnique({
        where: { id: invitationId },
        include: {
          event: {
            select: { id: true, name: true },
          },
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Verify user is event owner
      const currentMember = await ctx.db.teamMember.findFirst({
        where: {
          eventId: invitation.eventId,
          userId: ctx.session.user.id,
          status: "ACTIVE",
        },
      });

      if (currentMember?.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only event owners can resend invitations",
        });
      }

      // Check if invitation can be resent
      if (
        invitation.status === "ACCEPTED" ||
        invitation.status === "DECLINED" ||
        invitation.status === "CANCELLED"
      ) {
        const statusMessage = {
          ACCEPTED: "This invitation has already been accepted",
          DECLINED:
            "This invitation was declined. Send a new invitation instead",
          CANCELLED:
            "This invitation was cancelled. Send a new invitation instead",
        }[invitation.status];

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: statusMessage ?? "This invitation cannot be resent",
        });
      }

      // Generate new token and expiry
      const newToken = generateInvitationToken();
      const newExpiresAt = calculateInvitationExpiry();

      // Update invitation with new token and expiry
      const updatedInvitation = await ctx.db.invitation.update({
        where: { id: invitationId },
        data: {
          token: newToken,
          expiresAt: newExpiresAt,
          status: "PENDING", // Reset to PENDING if was EXPIRED
          sentAt: new Date(), // Update sent timestamp
        },
      });

      // Send invitation email (async, don't await to avoid blocking)
      void sendTeamInvitationEmail({
        to: invitation.email,
        inviteeName: invitation.email.split("@")[0] ?? "there",
        eventName: invitation.event.name,
        eventId: invitation.event.id,
        organizerName: ctx.session.user.name ?? "Event Organizer",
        token: newToken,
        modules: invitation.modulePermissions,
        expiresAt: newExpiresAt,
      }).catch((error) => {
        console.error("Failed to resend team invitation email:", error);
      });

      return {
        invitation: {
          id: updatedInvitation.id,
          email: updatedInvitation.email,
          token: updatedInvitation.token,
          status: updatedInvitation.status,
          expiresAt: updatedInvitation.expiresAt,
          sentAt: updatedInvitation.sentAt,
        },
      };
    }),

  /**
   * Cancel a pending invitation
   * Updates invitation status and removes pending team member
   */
  cancelInvitation: protectedProcedure
    .input(cancelInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const { invitationId } = input;

      // Find the invitation
      const invitation = await ctx.db.invitation.findUnique({
        where: { id: invitationId },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Verify user is event owner
      const currentMember = await ctx.db.teamMember.findFirst({
        where: {
          eventId: invitation.eventId,
          userId: ctx.session.user.id,
          status: "ACTIVE",
        },
      });

      if (currentMember?.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only event owners can cancel invitations",
        });
      }

      // Check if invitation can be cancelled
      if (invitation.status === "ACCEPTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This invitation has already been accepted. Use 'Remove Member' to revoke access instead.",
        });
      }

      if (invitation.status === "DECLINED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation was already declined",
        });
      }

      if (invitation.status === "CANCELLED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation is already cancelled",
        });
      }

      // Cancel invitation and remove pending team member in transaction
      await ctx.db.$transaction(async (tx) => {
        // Update invitation status to CANCELLED
        await tx.invitation.update({
          where: { id: invitationId },
          data: {
            status: "CANCELLED",
            respondedAt: new Date(),
          },
        });

        // Remove corresponding pending team member
        await tx.teamMember.deleteMany({
          where: {
            eventId: invitation.eventId,
            email: invitation.email,
            status: "PENDING",
          },
        });
      });

      return {
        success: true,
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
        organizerName: invitation.sentBy.name ?? "Event Organizer",
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

  /**
   * Decline an invitation using the token from email link
   * Updates invitation status and removes pending team member
   */
  declineInvitation: protectedProcedure
    .input(declineInvitationSchema)
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
          DECLINED: "This invitation was already declined",
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

      // Decline invitation in transaction
      await ctx.db.$transaction(async (tx) => {
        // Update invitation status to DECLINED
        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            status: "DECLINED",
            respondedAt: new Date(),
          },
        });

        // Remove corresponding pending team member
        await tx.teamMember.deleteMany({
          where: {
            eventId: invitation.eventId,
            email: invitation.email,
            status: "PENDING",
          },
        });
      });

      // Send declination notification email to organizer (async)
      void sendTeamInvitationDeclinedEmail({
        to: invitation.sentBy.email ?? "",
        organizerName: invitation.sentBy.name ?? "Event Organizer",
        eventName: invitation.event.name,
        eventId: invitation.event.id,
        inviteeName: ctx.session.user.name ?? invitation.email,
        inviteeEmail: invitation.email,
        modules: invitation.modulePermissions,
      }).catch((error) => {
        console.error("Failed to send invitation declined email:", error);
      });

      return {
        success: true,
        eventName: invitation.event.name,
      };
    }),

  /**
   * Update a collaborator's module permissions
   * Owner-only operation that replaces existing permissions
   */
  updatePermissions: protectedProcedure
    .input(updateTeamMemberPermissionsSchema)
    .mutation(async ({ ctx, input }) => {
      const { teamMemberId, modulePermissions } = input;

      // Find the team member
      const teamMember = await ctx.db.teamMember.findUnique({
        where: { id: teamMemberId },
        include: {
          event: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!teamMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team member not found",
        });
      }

      // Verify user is event owner
      const currentMember = await ctx.db.teamMember.findFirst({
        where: {
          eventId: teamMember.eventId,
          userId: ctx.session.user.id,
          status: "ACTIVE",
        },
      });

      if (currentMember?.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only event owners can update team member permissions",
        });
      }

      // Cannot modify owner's permissions
      if (teamMember.role === "OWNER") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot modify owner's permissions. Owner has full access to all modules.",
        });
      }

      // TeamMember must be active
      if (teamMember.status !== "ACTIVE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot update permissions for inactive team member. Member must accept invitation first.",
        });
      }

      // Store previous permissions for email notification
      const previousPermissions = teamMember.modulePermissions;

      // Update permissions
      const updatedMember = await ctx.db.teamMember.update({
        where: { id: teamMemberId },
        data: {
          modulePermissions,
          updatedAt: new Date(),
        },
      });

      // Send permission change notification email (async)
      if (teamMember.user?.email) {
        void sendTeamPermissionChangedEmail({
          to: teamMember.user.email,
          collaboratorName: teamMember.user.name ?? teamMember.email,
          organizerName: ctx.session.user.name ?? "Event Organizer",
          eventName: teamMember.event.name,
          eventId: teamMember.event.id,
          previousPermissions,
          newPermissions: modulePermissions,
        }).catch((error) => {
          console.error("Failed to send permission changed email:", error);
        });
      }

      return {
        teamMember: {
          id: updatedMember.id,
          email: updatedMember.email,
          role: updatedMember.role,
          status: updatedMember.status,
          modulePermissions: updatedMember.modulePermissions,
          updatedAt: updatedMember.updatedAt,
        },
      };
    }),

  /**
   * Get all team memberships for the current user
   * Returns all events where the user is a collaborator or owner
   */
  getMyMemberships: protectedProcedure.query(async ({ ctx }) => {
    // Fetch all active team memberships for current user
    const memberships = await ctx.db.teamMember.findMany({
      where: {
        userId: ctx.session.user.id,
        status: "ACTIVE",
      },
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
            locationUrl: true,
            description: true,
          },
        },
      },
      orderBy: [
        { role: "asc" }, // OWNER first, then COLLABORATOR
        { invitedAt: "desc" }, // Most recent first
      ],
    });

    return memberships.map((member) => ({
      id: member.id,
      role: member.role,
      modulePermissions: member.modulePermissions,
      invitedAt: member.invitedAt,
      lastAccessedAt: member.lastAccessedAt,
      event: member.event,
    }));
  }),

  /**
   * Remove a collaborator from the team
   * Owner-only operation that revokes all access
   */
  removeMember: protectedProcedure
    .input(removeTeamMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const { teamMemberId } = input;

      // Find the team member
      const teamMember = await ctx.db.teamMember.findUnique({
        where: { id: teamMemberId },
        include: {
          event: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!teamMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team member not found",
        });
      }

      // Verify user is event owner
      const currentMember = await ctx.db.teamMember.findFirst({
        where: {
          eventId: teamMember.eventId,
          userId: ctx.session.user.id,
          status: "ACTIVE",
        },
      });

      if (currentMember?.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only event owners can remove team members",
        });
      }

      // Cannot remove owner (self-removal protection)
      if (teamMember.role === "OWNER") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot remove yourself as owner. Transfer ownership to another user first.",
        });
      }

      // Check if already removed
      if (teamMember.status === "REMOVED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This team member has already been removed",
        });
      }

      // Store module permissions for email notification
      const removedModules = teamMember.modulePermissions;

      // Update team member status to REMOVED
      await ctx.db.teamMember.update({
        where: { id: teamMemberId },
        data: {
          status: "REMOVED",
          updatedAt: new Date(),
        },
      });

      // Send access removal notification email (async)
      if (teamMember.user?.email) {
        void sendTeamAccessRemovedEmail({
          to: teamMember.user.email,
          collaboratorName: teamMember.user.name ?? teamMember.email,
          organizerName: ctx.session.user.name ?? "Event Organizer",
          eventName: teamMember.event.name,
          modules: removedModules,
        }).catch((error) => {
          console.error("Failed to send access removed email:", error);
        });
      }

      return {
        success: true,
      };
    }),
});
