import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { sendBatchEmailsWithRetry } from "@/server/services/email";

/**
 * Cron job endpoint to send scheduled email campaigns
 * FR-047: Scheduled campaign delivery
 * 
 * This endpoint should be called periodically (e.g., every 5-10 minutes) by a cron service
 * to check for and send any campaigns that are scheduled for delivery.
 * 
 * Security: Verify cron secret to prevent unauthorized access
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (Vercel Cron or similar service)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[CRON] CRON_SECRET not configured");
      return NextResponse.json(
        { error: "Cron jobs not configured" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[CRON] Unauthorized cron access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find all campaigns scheduled for delivery
    const scheduledCampaigns = await db.emailCampaign.findMany({
      where: {
        status: "scheduled",
        scheduledFor: {
          lte: now, // Scheduled time has passed
        },
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (scheduledCampaigns.length === 0) {
      console.log("[CRON] No scheduled campaigns to send");
      return NextResponse.json({
        success: true,
        message: "No campaigns to send",
        sent: 0,
      });
    }

    console.log(
      `[CRON] Found ${scheduledCampaigns.length} scheduled campaigns to send`
    );

    const results = await Promise.allSettled(
      scheduledCampaigns.map(async (campaign) => {
        try {
          // Update campaign status to sending
          await db.emailCampaign.update({
            where: { id: campaign.id },
            data: { status: "sending" },
          });

          // Get recipients based on campaign filters
          const recipients = await getRecipientsForCampaign(campaign);

          if (recipients.length === 0) {
            await db.emailCampaign.update({
              where: { id: campaign.id },
              data: {
                status: "failed",
                // Could add an error field here
              },
            });

            console.warn(`[CRON] Campaign ${campaign.id} has no recipients`);
            return { campaignId: campaign.id, success: false, reason: "No recipients" };
          }

          // Send emails
          const emailResults = await sendBatchEmailsWithRetry({
            recipients: recipients.map((r) => r.email),
            subject: campaign.subject,
            html: campaign.body,
            tags: [
              { name: "campaign_id", value: campaign.id },
              { name: "type", value: "scheduled_campaign" },
            ],
          });

          // Count successes
          const successCount = emailResults.filter((r) => r.success).length;

          // Update campaign status to sent
          await db.emailCampaign.update({
            where: { id: campaign.id },
            data: {
              status: "sent",
              sentAt: new Date(),
              totalRecipients: recipients.length,
              delivered: successCount,
            },
          });

          console.log(
            `[CRON] Campaign ${campaign.id} sent successfully: ${successCount}/${recipients.length} delivered`
          );

          return { campaignId: campaign.id, success: true, sent: successCount };
        } catch (error) {
          console.error(`[CRON] Failed to send campaign ${campaign.id}`, error);

          // Update campaign status to failed
          await db.emailCampaign.update({
            where: { id: campaign.id },
            data: { status: "failed" },
          });

          return {
            campaignId: campaign.id,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;

    console.log(
      `[CRON] Scheduled campaign batch complete: ${successCount}/${scheduledCampaigns.length} sent successfully`
    );

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: scheduledCampaigns.length - successCount,
      details: results.map((r) => (r.status === "fulfilled" ? r.value : { error: "Promise rejected" })),
    });
  } catch (error) {
    console.error("[CRON] Unexpected error in scheduled campaign cron", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get recipients for a campaign
 * Duplicates logic from communication router but necessary for cron context
 */
async function getRecipientsForCampaign(campaign: {
  id: string;
  eventId: string;
  recipientType: string;
  recipientFilter: unknown;
}): Promise<Array<{ email: string; name: string }>> {
  switch (campaign.recipientType) {
    case "all_attendees": {
      const registrations = await db.registration.findMany({
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
      const filter = campaign.recipientFilter as Record<string, unknown> | null;
      const ticketTypeId = filter?.ticketTypeId as string | undefined;

      if (!ticketTypeId) {
        throw new Error("Ticket type ID required for ticket_type recipient filter");
      }

      const registrations = await db.registration.findMany({
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
      const speakers = await db.speaker.findMany({
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
      const filter = campaign.recipientFilter as Record<string, unknown> | null;
      const emails = filter?.emails as Array<{ email: string; name: string }> | undefined;

      if (!emails || !Array.isArray(emails)) {
        throw new Error("Custom recipient list required for custom recipient type");
      }

      return emails;
    }

    default:
      throw new Error(`Unknown recipient type: ${campaign.recipientType}`);
  }
}
