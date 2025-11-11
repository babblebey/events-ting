/**
 * Free ticket payment processor (MVP)
 * Handles free ticket registrations without actual payment processing
 */

import type { PaymentProcessor, PaymentIntent } from "./types";

/**
 * Free ticket processor implementation
 * All payments automatically succeed with zero amount
 */
export class FreeTicketProcessor implements PaymentProcessor {
  readonly name = "free";

  /**
   * Create a free payment intent (auto-succeeds)
   */
  async createIntent(params: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }): Promise<PaymentIntent> {
    // Validate that amount is zero for free tickets
    if (params.amount !== 0) {
      throw new Error(
        "FreeTicketProcessor only supports zero-amount transactions",
      );
    }

    // Generate a unique intent ID
    const intentId = `free_${crypto.randomUUID()}`;

    // Return immediately successful intent
    return {
      id: intentId,
      amount: 0,
      currency: params.currency,
      status: "succeeded",
      metadata: params.metadata,
    };
  }

  /**
   * Confirm a free payment intent (always succeeds)
   */
  async confirmIntent(intentId: string): Promise<PaymentIntent> {
    // Free tickets are always confirmed
    return {
      id: intentId,
      amount: 0,
      currency: "USD",
      status: "succeeded",
      metadata: {},
    };
  }

  /**
   * Refund a free payment (no-op, nothing to refund)
   */
  async refund(_intentId: string, _amount?: number): Promise<void> {
    console.log(
      `[Payment] Free ticket refund requested for ${_intentId} (no-op)`,
    );
    // No actual refund needed for free tickets
  }

  /**
   * Verify webhook signature (always valid for free tickets)
   */
  verifyWebhook(_signature: string, _payload: string): boolean {
    // No webhook verification needed for free tickets
    return true;
  }

  /**
   * Handle webhook event (no-op for free tickets)
   */
  async handleWebhook(event: unknown): Promise<void> {
    console.log("[Payment] Free ticket webhook received (no-op)", event);
    // No webhook handling needed for free tickets
  }
}

/**
 * Create a free ticket processor instance
 */
export function createFreeTicketProcessor(): FreeTicketProcessor {
  return new FreeTicketProcessor();
}
