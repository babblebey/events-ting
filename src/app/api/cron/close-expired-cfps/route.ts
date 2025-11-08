/**
 * Cron Job: Close Expired CFPs
 * 
 * Automatically closes Call for Papers that have passed their deadline.
 * This endpoint should be called periodically (e.g., every hour) by a cron service.
 * 
 * FR-030: Automatic CFP closure
 * Research Section 7: Scheduled deadline enforcement
 * 
 * @module app/api/cron/close-expired-cfps
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * GET /api/cron/close-expired-cfps
 * 
 * Closes all CFPs where:
 * - status is "open"
 * - deadline has passed
 * 
 * Authentication: Uses Vercel Cron Secret or custom auth header
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (for security)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const now = new Date();

    // Find all open CFPs with passed deadlines
    const expiredCfps = await db.callForPapers.findMany({
      where: {
        status: "open",
        deadline: {
          lt: now,
        },
      },
      select: {
        id: true,
        deadline: true,
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Close each expired CFP
    const closedCfpIds = [];
    for (const cfp of expiredCfps) {
      await db.callForPapers.update({
        where: { id: cfp.id },
        data: { status: "closed" },
      });
      closedCfpIds.push(cfp.id);
    }

    // Log results
    console.log(
      `[CRON] Closed ${closedCfpIds.length} expired CFPs:`,
      closedCfpIds
    );

    return NextResponse.json({
      success: true,
      closedCount: closedCfpIds.length,
      closedCfpIds,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Error closing expired CFPs:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
