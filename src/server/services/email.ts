/**
 * Email service with Resend integration
 * Handles transactional emails and campaign delivery
 */

import { Resend } from "resend";
import { render } from "@react-email/render";
import type { ReactElement } from "react";

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Default sender email (should be verified domain in Resend)
const DEFAULT_FROM = process.env.EMAIL_FROM ?? "events@yourdomain.com";

/**
 * Email service interface
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  react?: ReactElement;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

/**
 * Batch email options for campaigns
 */
export interface BatchEmailOptions {
  recipients: string[];
  subject: string;
  html?: string;
  react?: ReactElement;
  from?: string;
  tags?: Array<{ name: string; value: string }>;
}

/**
 * Email delivery result
 */
export interface EmailResult {
  id: string;
  success: boolean;
  error?: string;
}

/**
 * Send a single email
 * @param options - Email options
 * @returns Email result with message ID
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    // Render React component to HTML if provided
    let html: string;
    if (options.react) {
      html = await render(options.react);
    } else if (options.html) {
      html = options.html;
    } else {
      throw new Error("Either html or react component must be provided");
    }

    const result = await resend.emails.send({
      from: options.from ?? DEFAULT_FROM,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html,
      replyTo: options.replyTo,
      tags: options.tags,
    });

    if (result.error) {
      console.error("[Email] Failed to send email", {
        to: options.to,
        subject: options.subject,
        error: result.error,
      });

      return {
        id: "",
        success: false,
        error: result.error.message,
      };
    }

    console.log("[Email] Sent email", {
      to: options.to,
      subject: options.subject,
      messageId: result.data?.id,
    });

    return {
      id: result.data?.id ?? "",
      success: true,
    };
  } catch (error) {
    console.error("[Email] Unexpected error sending email", error);

    return {
      id: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send batch emails (for campaigns)
 * Automatically chunks recipients into batches of 100 (Resend limit)
 * @param options - Batch email options
 * @returns Array of email results
 */
export async function sendBatchEmails(
  options: BatchEmailOptions
): Promise<EmailResult[]> {
  try {
    // Render React component to HTML if provided
    let html: string;
    if (options.react) {
      html = await render(options.react);
    } else if (options.html) {
      html = options.html;
    } else {
      throw new Error("Either html or react component must be provided");
    }

    // Chunk recipients into batches of 100 (Resend limit)
    const batchSize = 100;
    const batches = chunkArray(options.recipients, batchSize);

    const results: EmailResult[] = [];

    for (const batch of batches) {
      try {
        const batchResult = await resend.batch.send(
          batch.map((to) => ({
            from: options.from ?? DEFAULT_FROM,
            to,
            subject: options.subject,
            html,
            tags: options.tags,
          }))
        );

        if (batchResult.error) {
          console.error("[Email] Batch send failed", {
            batchSize: batch.length,
            error: batchResult.error,
          });

          // Mark all emails in batch as failed
          results.push(
            ...batch.map((to) => ({
              id: "",
              success: false,
              error: batchResult.error?.message,
            }))
          );
          continue;
        }

        // Mark all emails in batch as successful
        results.push(
          ...batch.map((to, index) => ({
            id: (batchResult.data as unknown as Array<{ id: string }>)?.[index]?.id ?? "",
            success: true,
          }))
        );

        console.log("[Email] Batch sent successfully", {
          batchSize: batch.length,
        });
      } catch (error) {
        console.error("[Email] Batch send error", error);

        // Mark all emails in batch as failed
        results.push(
          ...batch.map(() => ({
            id: "",
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }))
        );
      }

      // Add delay between batches to avoid rate limiting
      if (batches.length > 1) {
        await delay(1000); // 1 second delay
      }
    }

    return results;
  } catch (error) {
    console.error("[Email] Unexpected error sending batch emails", error);

    return options.recipients.map(() => ({
      id: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }));
  }
}

/**
 * Send batch emails with retry logic and exponential backoff
 * @param options - Batch email options
 * @param maxRetries - Maximum number of retries per batch
 * @returns Array of email results
 */
export async function sendBatchEmailsWithRetry(
  options: BatchEmailOptions,
  maxRetries = 3
): Promise<EmailResult[]> {
  try {
    let html: string;
    if (options.react) {
      html = await render(options.react);
    } else if (options.html) {
      html = options.html;
    } else {
      throw new Error("Either html or react component must be provided");
    }

    const batchSize = 100;
    const batches = chunkArray(options.recipients, batchSize);
    const results: EmailResult[] = [];

    for (const batch of batches) {
      let retries = 0;
      let success = false;
      let lastError: string | undefined;

      while (retries < maxRetries && !success) {
        try {
          const batchResult = await resend.batch.send(
            batch.map((to) => ({
              from: options.from ?? DEFAULT_FROM,
              to,
              subject: options.subject,
              html,
              tags: options.tags,
            }))
          );

          if (batchResult.error) {
            throw new Error(batchResult.error.message);
          }

          // Success
          results.push(
            ...batch.map((to, index) => ({
              id: (batchResult.data as unknown as Array<{ id: string }>)?.[index]?.id ?? "",
              success: true,
            }))
          );

          success = true;
          console.log("[Email] Batch sent successfully", {
            batchSize: batch.length,
            retries,
          });
        } catch (error) {
          retries++;
          lastError = error instanceof Error ? error.message : "Unknown error";

          if (retries < maxRetries) {
            // Exponential backoff: 2^retries seconds
            const delayMs = Math.pow(2, retries) * 1000;
            console.warn(
              `[Email] Batch send failed (attempt ${retries}/${maxRetries}), retrying in ${delayMs}ms`,
              error
            );
            await delay(delayMs);
          }
        }
      }

      // If all retries failed, mark batch as failed
      if (!success) {
        console.error("[Email] Batch send failed after max retries", {
          batchSize: batch.length,
          maxRetries,
        });

        results.push(
          ...batch.map(() => ({
            id: "",
            success: false,
            error: lastError,
          }))
        );
      }

      // Add delay between batches
      if (batches.length > 1) {
        await delay(1000);
      }
    }

    return results;
  } catch (error) {
    console.error("[Email] Unexpected error in retry logic", error);

    return options.recipients.map(() => ({
      id: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }));
  }
}

/**
 * Verify that email sending is configured correctly
 * @returns true if Resend API key is set
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Get email sender address
 * @returns From email address
 */
export function getEmailSender(): string {
  return DEFAULT_FROM;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Chunk an array into smaller arrays
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}

/**
 * Delay execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// EMAIL TEMPLATE HELPERS
// ============================================================================

/**
 * Generate email preview text (fallback for email clients)
 * @param text - Preview text
 * @returns Invisible preview text HTML
 */
export function generatePreviewText(text: string): string {
  // Pad with zero-width spaces to hide extra content
  const padding = "\u200C".repeat(100);
  return `<div style="display: none; max-height: 0px; overflow: hidden;">${text}${padding}</div>`;
}

/**
 * Build unsubscribe link
 * @param recipientEmail - Recipient email
 * @param campaignId - Campaign ID
 * @returns Unsubscribe URL
 */
export function buildUnsubscribeLink(
  recipientEmail: string,
  campaignId: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/api/unsubscribe?email=${encodeURIComponent(recipientEmail)}&campaign=${campaignId}`;
}
