/**
 * Permission Helpers for Team Collaboration
 * 
 * Utilities for checking team member permissions in tRPC procedures.
 * These helpers verify that authenticated users have appropriate access
 * to events and specific modules based on their team membership.
 * 
 * @module server/api/permissions
 */

import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "../../../generated/prisma";
import type { ModuleName } from "@/lib/validators";

/**
 * Extended context type with team member information
 */
export interface TeamMemberContext {
  teamMember: {
    id: string;
    role: "OWNER" | "COLLABORATOR";
    status: "PENDING" | "ACTIVE" | "REMOVED";
    modulePermissions: string[];
  };
  isOwner: boolean;
}

/**
 * Check if user has access to an event (either as owner or team member)
 * 
 * @param params - Parameters for permission check
 * @returns Team member context with permission info
 * @throws TRPCError with FORBIDDEN code if user doesn't have access
 * 
 * @example
 * ```ts
 * const { teamMember, isOwner } = await checkEventAccess({
 *   db: ctx.db,
 *   eventId: input.eventId,
 *   userId: ctx.session.user.id,
 * });
 * ```
 */
export async function checkEventAccess(params: {
  db: PrismaClient;
  eventId: string;
  userId: string;
}): Promise<TeamMemberContext> {
  const { db, eventId, userId } = params;

  // Check if user is a team member with ACTIVE status
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const member = await db.teamMember.findFirst({
    where: {
      eventId,
      userId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      role: true,
      status: true,
      modulePermissions: true,
    },
  });

  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this event",
    });
  }

  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    teamMember: member,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    isOwner: member.role === "OWNER",
  };
}

/**
 * Check if user has access to a specific module within an event
 * 
 * @param params - Parameters for module permission check
 * @returns Team member context with permission info
 * @throws TRPCError with FORBIDDEN code if user doesn't have module access
 * 
 * @example
 * ```ts
 * const { teamMember, isOwner } = await checkModuleAccess({
 *   db: ctx.db,
 *   eventId: input.eventId,
 *   userId: ctx.session.user.id,
 *   requiredModule: "CFP",
 * });
 * 
 * // If this doesn't throw, user has access to CFP module
 * // Proceed with CFP operations
 * ```
 */
export async function checkModuleAccess(params: {
  db: PrismaClient;
  eventId: string;
  userId: string;
  requiredModule: ModuleName;
}): Promise<TeamMemberContext> {
  const { db, eventId, userId, requiredModule } = params;

  // First check event access
  const context = await checkEventAccess({ db, eventId, userId });

  // Owners have access to all modules
  if (context.isOwner) {
    return context;
  }

  // Collaborators need specific module permission
  const hasModuleAccess = context.teamMember.modulePermissions.includes(requiredModule);

  if (!hasModuleAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You don't have access to the ${requiredModule} module`,
    });
  }

  return context;
}

/**
 * Check if user is the event owner
 * 
 * @param params - Parameters for owner check
 * @throws TRPCError with FORBIDDEN code if user is not the owner
 * 
 * @example
 * ```ts
 * await checkIsOwner({
 *   db: ctx.db,
 *   eventId: input.eventId,
 *   userId: ctx.session.user.id,
 * });
 * 
 * // If this doesn't throw, user is the owner
 * // Proceed with owner-only operations
 * ```
 */
export async function checkIsOwner(params: {
  db: PrismaClient;
  eventId: string;
  userId: string;
}): Promise<void> {
  const { db, eventId, userId } = params;

  const context = await checkEventAccess({ db, eventId, userId });

  if (!context.isOwner) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only event owners can perform this action",
    });
  }
}
