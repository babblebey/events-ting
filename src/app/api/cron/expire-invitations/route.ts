/**
 * Cron endpoint to expire invitations
 * Should be called by a cron service (e.g., Vercel Cron, GitHub Actions, external cron)
 * Recommended: Run every 15-30 minutes
 *
 * Example cron configuration in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/expire-invitations",
 *     "schedule": "0,15,30,45 * * * *"
 *   }]
 * }
 */

import { NextResponse } from "next/server";
import { runExpireInvitationsJob } from "@/lib/cron/expire-invitations";

export async function GET(request: Request) {
  // Verify authorization token to prevent unauthorized access
  // In production, this should match a secret token from environment
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  // If CRON_SECRET is set, require authorization
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runExpireInvitationsJob();

    return NextResponse.json(
      {
        success: result.success,
        expiredCount: result.expiredCount,
        message: result.message,
        timestamp: new Date().toISOString(),
      },
      { status: result.success ? 200 : 500 },
    );
  } catch (error) {
    console.error("[API] Error running expire invitations job:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// Disable static optimization to allow dynamic execution
export const dynamic = "force-dynamic";
