/**
 * Payment processor factory
 * Creates and configures payment processors based on type
 */

import type { PaymentProcessor, PaymentProcessorConfig } from "./types";
import { FreeTicketProcessor } from "./free";

/**
 * Get payment processor instance based on configuration
 * @param config - Payment processor configuration
 * @returns Configured payment processor
 */
export function getPaymentProcessor(
  config: PaymentProcessorConfig
): PaymentProcessor {
  switch (config.type) {
    case "free":
      return new FreeTicketProcessor();

    // Future implementations:
    // case "stripe":
    //   return new StripeProcessor({
    //     apiKey: config.credentials?.apiKey ?? "",
    //     webhookSecret: config.credentials?.webhookSecret ?? "",
    //   });
    //
    // case "paystack":
    //   return new PaystackProcessor({
    //     secretKey: config.credentials?.secretKey ?? "",
    //   });

    default:
      throw new Error(`Unknown payment processor type: ${config.type}`);
  }
}

/**
 * Get payment processor for a specific ticket type
 * Currently returns free processor for all tickets (MVP)
 * Future: Read from ticket type or event configuration
 */
export function getProcessorForTicket(ticketPrice: number): PaymentProcessor {
  // MVP: All tickets are free
  if (ticketPrice === 0) {
    return getPaymentProcessor({ type: "free" });
  }

  // Future: Support paid tickets
  throw new Error("Paid tickets not yet supported");
}

/**
 * Check if payment processing is enabled
 */
export function isPaymentEnabled(): boolean {
  // MVP: Only free tickets enabled
  return true;
}

/**
 * Get available payment processors
 */
export function getAvailableProcessors(): string[] {
  const processors: string[] = ["free"];

  // Future: Check environment variables for additional processors
  // if (process.env.STRIPE_SECRET_KEY) {
  //   processors.push("stripe");
  // }
  //
  // if (process.env.PAYSTACK_SECRET_KEY) {
  //   processors.push("paystack");
  // }

  return processors;
}
