/**
 * Audit Logging Utility
 *
 * Provides functions to log team management actions for compliance,
 * security monitoring, and audit trail purposes.
 *
 * @module audit
 */

import type { PrismaClient } from "generated/prisma";
import type { AuditAction } from "generated/prisma";

/**
 * Audit Log Entry
 */
export interface AuditLogEntry {
  action: AuditAction;
  description: string;
  userId?: string;
  userEmail?: string;
  eventId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 *
 * @param db - Prisma client instance
 * @param entry - Audit log entry details
 * @returns Promise that resolves when log is created (fire-and-forget)
 *
 * @example
 * ```typescript
 * await createAuditLog(db, {
 *   action: "TEAM_INVITE_SENT",
 *   description: `Invited ${email} to event ${eventName}`,
 *   userId: ctx.session.user.id,
 *   userEmail: ctx.session.user.email,
 *   eventId: eventId,
 *   metadata: {
 *     targetEmail: email,
 *     modulePermissions: ["CFP", "SPEAKERS"],
 *   },
 * });
 * ```
 */
export async function createAuditLog(
  db: PrismaClient,
  entry: AuditLogEntry,
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: entry.action,
        description: entry.description,
        userId: entry.userId,
        userEmail: entry.userEmail,
        eventId: entry.eventId,
        metadata: entry.metadata
          ? (JSON.parse(JSON.stringify(entry.metadata)) as Record<
              string,
              unknown
            >)
          : undefined,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break application flow
    console.error("[Audit] Failed to create audit log:", error);
  }
}

/**
 * Team-specific audit log helpers
 */

/**
 * Log team invitation sent
 */
export async function logTeamInviteSent(
  db: PrismaClient,
  params: {
    userId: string;
    userEmail: string | null;
    eventId: string;
    eventName: string;
    targetEmail: string;
    modulePermissions: string[];
  },
): Promise<void> {
  await createAuditLog(db, {
    action: "TEAM_INVITE_SENT",
    description: `Invited ${params.targetEmail} to event "${params.eventName}" with access to modules: ${params.modulePermissions.join(", ")}`,
    userId: params.userId,
    userEmail: params.userEmail ?? undefined,
    eventId: params.eventId,
    metadata: {
      targetEmail: params.targetEmail,
      modulePermissions: params.modulePermissions,
      eventName: params.eventName,
    },
  });
}

/**
 * Log team invitation accepted
 */
export async function logTeamInviteAccepted(
  db: PrismaClient,
  params: {
    userId: string;
    userEmail: string | null;
    eventId: string;
    eventName: string;
    modulePermissions: string[];
  },
): Promise<void> {
  await createAuditLog(db, {
    action: "TEAM_INVITE_ACCEPTED",
    description: `${params.userEmail ?? "User"} accepted invitation to event "${params.eventName}"`,
    userId: params.userId,
    userEmail: params.userEmail ?? undefined,
    eventId: params.eventId,
    metadata: {
      modulePermissions: params.modulePermissions,
      eventName: params.eventName,
    },
  });
}

/**
 * Log team invitation declined
 */
export async function logTeamInviteDeclined(
  db: PrismaClient,
  params: {
    userId: string;
    userEmail: string | null;
    eventId: string;
    eventName: string;
    targetEmail: string;
    modulePermissions: string[];
  },
): Promise<void> {
  await createAuditLog(db, {
    action: "TEAM_INVITE_DECLINED",
    description: `${params.targetEmail} declined invitation to event "${params.eventName}"`,
    userId: params.userId,
    userEmail: params.userEmail ?? undefined,
    eventId: params.eventId,
    metadata: {
      targetEmail: params.targetEmail,
      modulePermissions: params.modulePermissions,
      eventName: params.eventName,
    },
  });
}

/**
 * Log team invitation cancelled
 */
export async function logTeamInviteCancelled(
  db: PrismaClient,
  params: {
    userId: string;
    userEmail: string | null;
    eventId: string;
    eventName: string;
    targetEmail: string;
  },
): Promise<void> {
  await createAuditLog(db, {
    action: "TEAM_INVITE_CANCELLED",
    description: `Cancelled invitation for ${params.targetEmail} to event "${params.eventName}"`,
    userId: params.userId,
    userEmail: params.userEmail ?? undefined,
    eventId: params.eventId,
    metadata: {
      targetEmail: params.targetEmail,
      eventName: params.eventName,
    },
  });
}

/**
 * Log team invitation resent
 */
export async function logTeamInviteResent(
  db: PrismaClient,
  params: {
    userId: string;
    userEmail: string | null;
    eventId: string;
    eventName: string;
    targetEmail: string;
  },
): Promise<void> {
  await createAuditLog(db, {
    action: "TEAM_INVITE_RESENT",
    description: `Resent invitation to ${params.targetEmail} for event "${params.eventName}"`,
    userId: params.userId,
    userEmail: params.userEmail ?? undefined,
    eventId: params.eventId,
    metadata: {
      targetEmail: params.targetEmail,
      eventName: params.eventName,
    },
  });
}

/**
 * Log team member permissions updated
 */
export async function logTeamPermissionsUpdated(
  db: PrismaClient,
  params: {
    userId: string;
    userEmail: string | null;
    eventId: string;
    eventName: string;
    targetUserId: string | null;
    targetEmail: string;
    previousPermissions: string[];
    newPermissions: string[];
  },
): Promise<void> {
  const added = params.newPermissions.filter(
    (p) => !params.previousPermissions.includes(p),
  );
  const removed = params.previousPermissions.filter(
    (p) => !params.newPermissions.includes(p),
  );

  let changeDescription = "";
  if (added.length > 0 && removed.length > 0) {
    changeDescription = `Added: ${added.join(", ")}; Removed: ${removed.join(", ")}`;
  } else if (added.length > 0) {
    changeDescription = `Added: ${added.join(", ")}`;
  } else if (removed.length > 0) {
    changeDescription = `Removed: ${removed.join(", ")}`;
  } else {
    changeDescription = "No changes";
  }

  await createAuditLog(db, {
    action: "TEAM_PERMISSIONS_UPDATED",
    description: `Updated permissions for ${params.targetEmail} in event "${params.eventName}". ${changeDescription}`,
    userId: params.userId,
    userEmail: params.userEmail ?? undefined,
    eventId: params.eventId,
    metadata: {
      targetUserId: params.targetUserId,
      targetEmail: params.targetEmail,
      previousPermissions: params.previousPermissions,
      newPermissions: params.newPermissions,
      added,
      removed,
      eventName: params.eventName,
    },
  });
}

/**
 * Log team member removed
 */
export async function logTeamMemberRemoved(
  db: PrismaClient,
  params: {
    userId: string;
    userEmail: string | null;
    eventId: string;
    eventName: string;
    targetUserId: string | null;
    targetEmail: string;
    removedModules: string[];
  },
): Promise<void> {
  await createAuditLog(db, {
    action: "TEAM_MEMBER_REMOVED",
    description: `Removed ${params.targetEmail} from event "${params.eventName}". Revoked access to: ${params.removedModules.join(", ")}`,
    userId: params.userId,
    userEmail: params.userEmail ?? undefined,
    eventId: params.eventId,
    metadata: {
      targetUserId: params.targetUserId,
      targetEmail: params.targetEmail,
      removedModules: params.removedModules,
      eventName: params.eventName,
    },
  });
}

/**
 * Query audit logs for an event
 *
 * @param db - Prisma client instance
 * @param eventId - Event ID to query
 * @param options - Query options (limit, offset, action filter)
 * @returns Array of audit log entries
 *
 * @example
 * ```typescript
 * const logs = await getEventAuditLogs(db, eventId, {
 *   limit: 50,
 *   offset: 0,
 *   action: "TEAM_MEMBER_REMOVED"
 * });
 * ```
 */
export async function getEventAuditLogs(
  db: PrismaClient,
  eventId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: AuditAction;
  },
) {
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  return await db.auditLog.findMany({
    where: {
      eventId,
      ...(options?.action ? { action: options.action } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    skip: offset,
  });
}

/**
 * Query audit logs for a user
 *
 * @param db - Prisma client instance
 * @param userId - User ID to query
 * @param options - Query options (limit, offset, action filter)
 * @returns Array of audit log entries
 *
 * @example
 * ```typescript
 * const logs = await getUserAuditLogs(db, userId, {
 *   limit: 50,
 *   offset: 0
 * });
 * ```
 */
export async function getUserAuditLogs(
  db: PrismaClient,
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: AuditAction;
  },
) {
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  return await db.auditLog.findMany({
    where: {
      userId,
      ...(options?.action ? { action: options.action } : {}),
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
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    skip: offset,
  });
}
