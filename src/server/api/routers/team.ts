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
import {
  inviteRateLimiter,
  resendInvitationRateLimiter,
  updatePermissionsRateLimiter,
  removeMemberRateLimiter,
} from "@/lib/rate-limit";
import {
  logTeamInviteSent,
  logTeamInviteAccepted,
  logTeamInviteDeclined,
  logTeamInviteCancelled,
  logTeamInviteResent,
  logTeamPermissionsUpdated,
  logTeamMemberRemoved,
} from "@/lib/audit";

/**
 * Team Collaboration Router
 *
 * Handles all team collaboration operations including:
 * - Inviting collaborators with module-specific permissions
 * - Managing invitation lifecycle (send, accept, decline, resend, cancel)
 * - Updating team member permissions
 * - Removing team members
 * - Querying team composition and individual memberships
 *
 * @module teamRouter
 * @see {@link ../../../docs/modules/team/README.md} for module documentation
 * @see {@link ../../../specs/002-team-collaborators/contracts/team-router.md} for API contracts
 */
export const teamRouter = createTRPCRouter({
  /**
   * Get Current User's Team Membership
   *
   * Retrieves the current authenticated user's team membership for a specific event.
   * Returns null if the user is not a member. Used for client-side permission checks
   * and determining which modules the user can access.
   *
   * @access Authenticated users only
   * @returns TeamMember object with role, status, and modulePermissions, or null if not a member
   *
   * @example
   * ```typescript
   * const member = await api.team.getCurrentMember.useQuery({ eventId: "evt_123" });
   * if (member?.role === "OWNER") {
   *   // User is the event owner
   * } else if (member?.modulePermissions.includes("CFP")) {
   *   // User has CFP access
   * }
   * ```
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
   * Get All Team Members
   *
   * Retrieves all team members for an event with optional status filtering and pagination.
   * Only event owners can view the full team list. Returns complete member information
   * including user details, inviter information, and permission assignments.
   *
   * @access Event owner only
   * @param eventId - Event ID to query
   * @param status - Optional filter by TeamMemberStatus (PENDING | ACTIVE | REMOVED)
   * @param page - Page number for pagination (default: 1)
   * @param limit - Results per page (default: 20, max: 50)
   * @returns Paginated list of team members with user details and pagination metadata
   * @throws FORBIDDEN - If user is not the event owner
   * @throws NOT_FOUND - If event does not exist
   *
   * @example
   * ```typescript
   * const { members, pagination } = await api.team.getMembers.useQuery({
   *   eventId: "evt_123",
   *   status: "ACTIVE",
   *   page: 1,
   *   limit: 20
   * });
   * ```
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
   * Get Pending Invitations
   *
   * Retrieves all pending invitations for an event. Automatically marks expired invitations
   * and filters them from the response. Only event owners can view pending invitations.
   *
   * @access Event owner only
   * @param eventId - Event ID to query
   * @returns Array of pending invitations with sender information
   * @throws FORBIDDEN - If user is not the event owner
   * @throws NOT_FOUND - If event does not exist
   *
   * @sideEffects Updates expired invitations to EXPIRED status in the background
   *
   * @example
   * ```typescript
   * const invitations = await api.team.getPendingInvitations.useQuery({
   *   eventId: "evt_123"
   * });
   * ```
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
   * Invite Collaborator
   *
   * Invites a new collaborator to the event with specified module permissions.
   * Creates both Invitation and TeamMember records, generates a secure token,
   * and sends an invitation email. Includes validation to prevent duplicate
   * invitations and self-invitations.
   *
   * @access Event owner only
   * @param eventId - Event ID
   * @param email - Email address of the person to invite
   * @param modulePermissions - Array of module names the collaborator can access
   * @returns Created invitation and team member records
   * @throws FORBIDDEN - If user is not the event owner
   * @throws BAD_REQUEST - If email has active membership, pending invitation, or is self-invitation
   * @throws NOT_FOUND - If event does not exist
   *
   * @sideEffects
   * - Creates Invitation record with unique token
   * - Creates TeamMember record with PENDING status
   * - Sends invitation email asynchronously
   * - Invalidates team query caches
   *
   * @example
   * ```typescript
   * const { invitation, teamMember } = await api.team.invite.mutate({
   *   eventId: "evt_123",
   *   email: "collaborator@example.com",
   *   modulePermissions: ["CFP", "SPEAKERS"]
   * });
   * ```
   */
  invite: protectedProcedure
    .input(inviteTeamMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const { eventId, email, modulePermissions } = input;

      // Rate limiting: 20 invitations per hour
      const rateLimitResult = inviteRateLimiter.check(ctx.session.user.id);
      if (!rateLimitResult.allowed) {
        const resetTime = new Date(
          rateLimitResult.resetAt,
        ).toLocaleTimeString();
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Rate limit exceeded. You can send ${rateLimitResult.limit} invitations per hour. Try again after ${resetTime}.`,
        });
      }

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

      // Audit log: Team invitation sent
      void logTeamInviteSent(ctx.db, {
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email ?? null,
        eventId,
        eventName: event.name,
        targetEmail: email,
        modulePermissions,
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
   * Resend Invitation
   *
   * Resends an invitation by generating a new token and resetting the expiry date.
   * Can be used for pending or expired invitations. Cannot be used for accepted,
   * declined, or cancelled invitations.
   *
   * @access Event owner only
   * @param invitationId - ID of the invitation to resend
   * @returns Updated invitation with new token and expiry
   * @throws FORBIDDEN - If user is not the event owner
   * @throws BAD_REQUEST - If invitation is accepted, declined, or cancelled
   * @throws NOT_FOUND - If invitation does not exist
   *
   * @sideEffects
   * - Generates new token (invalidates old token)
   * - Resets expiry to 7 days from now
   * - Updates status to PENDING if was EXPIRED
   * - Sends new invitation email
   *
   * @example
   * ```typescript
   * const { invitation } = await api.team.resendInvitation.mutate({
   *   invitationId: "inv_123"
   * });
   * ```
   */
  resendInvitation: protectedProcedure
    .input(resendInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const { invitationId } = input;

      // Rate limiting: 5 resends per hour
      const rateLimitResult = resendInvitationRateLimiter.check(
        ctx.session.user.id,
      );
      if (!rateLimitResult.allowed) {
        const resetTime = new Date(
          rateLimitResult.resetAt,
        ).toLocaleTimeString();
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Rate limit exceeded. You can resend ${rateLimitResult.limit} invitations per hour. Try again after ${resetTime}.`,
        });
      }

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

      // Audit log: Team invitation resent
      void logTeamInviteResent(ctx.db, {
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email ?? null,
        eventId: invitation.eventId,
        eventName: invitation.event.name,
        targetEmail: invitation.email,
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

      // Get event name for audit log
      const event = await ctx.db.event.findUnique({
        where: { id: invitation.eventId },
        select: { name: true },
      });

      // Audit log: Team invitation cancelled
      void logTeamInviteCancelled(ctx.db, {
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email ?? null,
        eventId: invitation.eventId,
        eventName: event?.name ?? "Unknown Event",
        targetEmail: invitation.email,
      });

      return {
        success: true,
      };
    }),

  /**
   * Accept Invitation
   *
   * Accepts an invitation using the token from the email link. Links the team member
   * to the authenticated user, activates their membership, and sends notification to
   * the event owner. Validates token, expiry, and prevents duplicate acceptances.
   *
   * @access Authenticated users with valid token
   * @param token - Unique 43-character invitation token from email
   * @returns Event details and activated team member information
   * @throws NOT_FOUND - If token is invalid
   * @throws BAD_REQUEST - If invitation is already accepted, declined, cancelled, or expired
   * @throws BAD_REQUEST - If user already has active membership (edge case)
   *
   * @sideEffects
   * - Updates Invitation status to ACCEPTED
   * - Sets respondedAt timestamp
   * - Updates TeamMember status to ACTIVE
   * - Links TeamMember.userId to current user
   * - Sets lastAccessedAt timestamp
   * - Sends acceptance notification email to organizer
   * - Invalidates team query caches
   *
   * @example
   * ```typescript
   * const { event, teamMember } = await api.team.acceptInvitation.mutate({
   *   token: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v"
   * });
   * // Redirect to: `/${event.slug}`
   * ```
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

      // Audit log: Team invitation accepted
      void logTeamInviteAccepted(ctx.db, {
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email ?? null,
        eventId: invitation.event.id,
        eventName: invitation.event.name,
        modulePermissions: invitation.modulePermissions,
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

      // Audit log: Team invitation declined
      void logTeamInviteDeclined(ctx.db, {
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email ?? null,
        eventId: invitation.event.id,
        eventName: invitation.event.name,
        targetEmail: invitation.email,
        modulePermissions: invitation.modulePermissions,
      });

      return {
        success: true,
        eventName: invitation.event.name,
      };
    }),

  /**
   * Update Collaborator Permissions
   *
   * Updates a collaborator's module permissions. This is a full replacement operation -
   * the provided modulePermissions array completely replaces the existing permissions.
   * Cannot be used to modify owner permissions. Sends notification email to the collaborator.
   *
   * @access Event owner only
   * @param teamMemberId - ID of the team member to update
   * @param modulePermissions - New full list of module permissions (replaces existing)
   * @returns Updated team member with new permissions
   * @throws FORBIDDEN - If user is not the event owner
   * @throws BAD_REQUEST - If trying to modify owner permissions or inactive member
   * @throws NOT_FOUND - If team member does not exist
   *
   * @sideEffects
   * - Replaces TeamMember.modulePermissions
   * - Updates TeamMember.updatedAt timestamp
   * - Sends permission change notification email to collaborator
   * - Invalidates team query caches
   *
   * @example
   * ```typescript
   * // Add SCHEDULE to existing CFP access
   * const { teamMember } = await api.team.updatePermissions.mutate({
   *   teamMemberId: "tm_123",
   *   modulePermissions: ["CFP", "SPEAKERS", "SCHEDULE"] // Full replacement
   * });
   * ```
   */
  updatePermissions: protectedProcedure
    .input(updateTeamMemberPermissionsSchema)
    .mutation(async ({ ctx, input }) => {
      const { teamMemberId, modulePermissions } = input;

      // Rate limiting: 30 permission updates per hour
      const rateLimitResult = updatePermissionsRateLimiter.check(
        ctx.session.user.id,
      );
      if (!rateLimitResult.allowed) {
        const resetTime = new Date(
          rateLimitResult.resetAt,
        ).toLocaleTimeString();
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Rate limit exceeded. You can update permissions ${rateLimitResult.limit} times per hour. Try again after ${resetTime}.`,
        });
      }

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

      // Audit log: Team permissions updated
      void logTeamPermissionsUpdated(ctx.db, {
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email ?? null,
        eventId: teamMember.event.id,
        eventName: teamMember.event.name,
        targetUserId: teamMember.user?.id ?? null,
        targetEmail: teamMember.email,
        previousPermissions,
        newPermissions: modulePermissions,
      });

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
   * Remove Team Member
   *
   * Revokes a collaborator's access to the event. Sets their status to REMOVED,
   * which prevents access to all modules. Cannot be used for self-removal (owner
   * protection). Sends notification email to the removed collaborator.
   *
   * @access Event owner only
   * @param teamMemberId - ID of the team member to remove
   * @returns Success confirmation
   * @throws FORBIDDEN - If user is not the event owner
   * @throws BAD_REQUEST - If trying to remove owner (self-removal) or already removed member
   * @throws NOT_FOUND - If team member does not exist
   *
   * @sideEffects
   * - Updates TeamMember status to REMOVED
   * - Updates TeamMember.updatedAt timestamp
   * - Sends access removal notification email to collaborator
   * - Invalidates team query caches
   * - Next API call from removed user will return FORBIDDEN
   *
   * @example
   * ```typescript
   * await api.team.removeMember.mutate({
   *   teamMemberId: "tm_123"
   * });
   * // Removed user will be redirected to /[id]/removed on next action
   * ```
   */
  removeMember: protectedProcedure
    .input(removeTeamMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const { teamMemberId } = input;

      // Rate limiting: 20 removals per hour
      const rateLimitResult = removeMemberRateLimiter.check(
        ctx.session.user.id,
      );
      if (!rateLimitResult.allowed) {
        const resetTime = new Date(
          rateLimitResult.resetAt,
        ).toLocaleTimeString();
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Rate limit exceeded. You can remove ${rateLimitResult.limit} members per hour. Try again after ${resetTime}.`,
        });
      }

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

      // Audit log: Team member removed
      void logTeamMemberRemoved(ctx.db, {
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email ?? null,
        eventId: teamMember.event.id,
        eventName: teamMember.event.name,
        targetUserId: teamMember.user?.id ?? null,
        targetEmail: teamMember.email,
        removedModules,
      });

      return {
        success: true,
      };
    }),
});
