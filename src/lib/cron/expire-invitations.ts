/**
 * Background job to mark expired invitations
 * Should be run periodically (e.g., every 15 minutes via cron or API route)
 * Updates PENDING invitations past their expiry date to EXPIRED status
 */

import { db } from "@/server/db";

/**
 * Expire all pending invitations that have passed their expiry date
 * @returns Object with count of expired invitations
 */
export async function expireInvitations() {
  const now = new Date();

  try {
    // Find all pending invitations that have expired
    const expiredInvitations = await db.invitation.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: now,
        },
      },
      select: {
        id: true,
        email: true,
        eventId: true,
      },
    });

    if (expiredInvitations.length === 0) {
      return {
        success: true,
        expiredCount: 0,
        message: "No expired invitations found",
      };
    }

    // Update invitations and remove pending team members in transaction
    await db.$transaction(async (tx) => {
      // Update invitation status to EXPIRED
      await tx.invitation.updateMany({
        where: {
          id: {
            in: expiredInvitations.map((inv) => inv.id),
          },
        },
        data: {
          status: "EXPIRED",
          respondedAt: now,
        },
      });

      // Remove corresponding pending team members
      // This ensures the team list stays clean
      for (const invitation of expiredInvitations) {
        await tx.teamMember.deleteMany({
          where: {
            eventId: invitation.eventId,
            email: invitation.email,
            status: "PENDING",
          },
        });
      }
    });

    console.log(
      `[ExpireInvitations] Expired ${expiredInvitations.length} invitation(s)`,
    );

    return {
      success: true,
      expiredCount: expiredInvitations.length,
      message: `Expired ${expiredInvitations.length} invitation(s)`,
    };
  } catch (error) {
    console.error("[ExpireInvitations] Error expiring invitations:", error);
    return {
      success: false,
      expiredCount: 0,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Wrapper function for API routes or serverless functions
 * Can be called via a scheduled API route (e.g., /api/cron/expire-invitations)
 */
export async function runExpireInvitationsJob() {
  console.log("[ExpireInvitations] Starting job...");
  const result = await expireInvitations();
  console.log("[ExpireInvitations] Job completed:", result);
  return result;
}
