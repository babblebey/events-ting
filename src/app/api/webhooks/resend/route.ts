/**
 * Resend webhook handler
 * Handles email delivery events (bounces, opens, clicks)
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * Resend webhook event types
 */
interface ResendWebhookEvent {
  type:
    | "email.sent"
    | "email.delivered"
    | "email.bounced"
    | "email.opened"
    | "email.clicked"
    | "email.complained";
  data: {
    email_id: string;
    to: string;
    subject: string;
    tags?: Array<{ name: string; value: string }>;
    bounce?: {
      type: "hard" | "soft";
      message: string;
    };
  };
}

/**
 * POST /api/webhooks/resend
 * Handle Resend webhook events
 */
export async function POST(req: NextRequest) {
  try {
    // Verify webhook signature (Resend provides this in header)
    const signature = req.headers.get("resend-signature");

    if (!signature && process.env.NODE_ENV === "production") {
      console.warn("[Webhook] Missing Resend signature");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    // TODO: Verify signature with Resend webhook secret
    // const isValid = await verifyResendSignature(signature, body);
    // if (!isValid) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    // Parse webhook event
    const event = (await req.json()) as ResendWebhookEvent;

    console.log("[Webhook] Received Resend event", {
      type: event.type,
      to: event.data.to,
      emailId: event.data.email_id,
    });

    // Extract campaign ID from tags if present
    const campaignId = event.data.tags?.find(
      (tag) => tag.name === "campaign_id",
    )?.value;

    // Handle different event types
    switch (event.type) {
      case "email.delivered":
        await handleEmailDelivered(event, campaignId);
        break;

      case "email.bounced":
        await handleEmailBounced(event, campaignId);
        break;

      case "email.opened":
        await handleEmailOpened(event, campaignId);
        break;

      case "email.clicked":
        await handleEmailClicked(event, campaignId);
        break;

      case "email.complained":
        await handleEmailComplained(event);
        break;

      default:
        console.log("[Webhook] Unhandled event type", event.type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Webhook] Error processing Resend webhook", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process webhook",
      },
      { status: 500 },
    );
  }
}

/**
 * Handle email delivered event
 */
async function handleEmailDelivered(
  event: ResendWebhookEvent,
  campaignId?: string,
) {
  if (!campaignId) return;

  try {
    await db.emailCampaign.update({
      where: { id: campaignId },
      data: {
        delivered: { increment: 1 },
      },
    });

    console.log("[Webhook] Email delivered", {
      campaignId,
      to: event.data.to,
    });
  } catch (error) {
    console.error("[Webhook] Error updating delivered count", error);
  }
}

/**
 * Handle email bounced event
 */
async function handleEmailBounced(
  event: ResendWebhookEvent,
  campaignId?: string,
) {
  const recipientEmail = event.data.to;
  const bounceType = event.data.bounce?.type ?? "hard";

  try {
    // Update campaign bounce count
    if (campaignId) {
      await db.emailCampaign.update({
        where: { id: campaignId },
        data: {
          bounces: { increment: 1 },
        },
      });
    }

    // Mark recipient email as bounced (for hard bounces)
    if (bounceType === "hard") {
      await db.registration.updateMany({
        where: { email: recipientEmail },
        data: { emailStatus: "bounced" },
      });

      console.log("[Webhook] Marked email as bounced", {
        email: recipientEmail,
        bounceType,
      });
    }
  } catch (error) {
    console.error("[Webhook] Error handling bounced email", error);
  }
}

/**
 * Handle email opened event
 */
async function handleEmailOpened(
  event: ResendWebhookEvent,
  campaignId?: string,
) {
  if (!campaignId) return;

  try {
    await db.emailCampaign.update({
      where: { id: campaignId },
      data: {
        opens: { increment: 1 },
      },
    });

    console.log("[Webhook] Email opened", {
      campaignId,
      to: event.data.to,
    });
  } catch (error) {
    console.error("[Webhook] Error updating open count", error);
  }
}

/**
 * Handle email clicked event
 */
async function handleEmailClicked(
  event: ResendWebhookEvent,
  campaignId?: string,
) {
  if (!campaignId) return;

  try {
    await db.emailCampaign.update({
      where: { id: campaignId },
      data: {
        clicks: { increment: 1 },
      },
    });

    console.log("[Webhook] Email link clicked", {
      campaignId,
      to: event.data.to,
    });
  } catch (error) {
    console.error("[Webhook] Error updating click count", error);
  }
}

/**
 * Handle spam complaint event
 */
async function handleEmailComplained(event: ResendWebhookEvent) {
  const recipientEmail = event.data.to;

  try {
    // Mark recipient as unsubscribed
    await db.registration.updateMany({
      where: { email: recipientEmail },
      data: { emailStatus: "unsubscribed" },
    });

    console.log("[Webhook] Marked email as unsubscribed due to complaint", {
      email: recipientEmail,
    });
  } catch (error) {
    console.error("[Webhook] Error handling spam complaint", error);
  }
}
