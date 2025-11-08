/**
 * User Router
 * Handles user profile operations, password changes, and account management
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  updateUserProfileSchema,
  changePasswordSchema,
} from "@/lib/validators";

export const userRouter = createTRPCRouter({
  /**
   * Get current user's profile
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        _count: {
          select: {
            events: true,
            registrations: true,
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),

  /**
   * Update current user's profile
   */
  updateProfile: protectedProcedure
    .input(updateUserProfileSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if email is being changed and is already taken
      if (input.email) {
        const existingUser = await ctx.db.user.findUnique({
          where: { email: input.email },
        });

        if (existingUser && existingUser.id !== ctx.session.user.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This email address is already in use",
          });
        }

        // If email changed, reset emailVerified status
        if (input.email !== ctx.session.user.email) {
          input = { ...input };
        }
      }

      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          ...input,
          // Reset email verification if email changed
          ...(input.email &&
            input.email !== ctx.session.user.email && {
              emailVerified: null,
            }),
        },
      });
    }),

  /**
   * Change password (requires current password verification)
   */
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { password: true },
      });

      if (!user || !user.password) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change password for OAuth-only accounts",
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(
        input.currentPassword,
        user.password
      );

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      // Update password
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { password: hashedPassword },
        select: { id: true },
      });
    }),

  /**
   * Delete user account (requires confirmation)
   * WARNING: This cascades to sessions/accounts, sets null on registrations
   */
  deleteAccount: protectedProcedure
    .input(
      z.object({
        confirmation: z
          .literal("DELETE")
          .describe("Must type 'DELETE' to confirm"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has active events
      const activeEvents = await ctx.db.event.count({
        where: {
          organizerId: ctx.session.user.id,
          isArchived: false,
        },
      });

      if (activeEvents > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You have ${activeEvents} active event(s). Please archive or delete them before deleting your account.`,
        });
      }

      // Delete user (cascades to accounts/sessions, sets null on registrations)
      await ctx.db.user.delete({
        where: { id: ctx.session.user.id },
      });

      return { success: true };
    }),

  /**
   * Get user's events summary
   */
  getEventsSummary: protectedProcedure.query(async ({ ctx }) => {
    const [totalEvents, activeEvents, archivedEvents, totalAttendees] =
      await Promise.all([
        ctx.db.event.count({
          where: { organizerId: ctx.session.user.id },
        }),
        ctx.db.event.count({
          where: {
            organizerId: ctx.session.user.id,
            isArchived: false,
            status: "published",
          },
        }),
        ctx.db.event.count({
          where: {
            organizerId: ctx.session.user.id,
            isArchived: true,
          },
        }),
        ctx.db.registration.count({
          where: {
            event: {
              organizerId: ctx.session.user.id,
            },
          },
        }),
      ]);

    return {
      totalEvents,
      activeEvents,
      archivedEvents,
      totalAttendees,
    };
  }),
});
