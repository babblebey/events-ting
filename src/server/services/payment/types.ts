/**
 * Payment processor type definitions and interfaces
 * Supports pluggable payment processors (Stripe, Paystack, etc.)
 */

/**
 * Payment intent represents a payment transaction
 */
export interface PaymentIntent {
  /** Unique payment intent ID */
  id: string;

  /** Amount in smallest currency unit (cents for USD) */
  amount: number;

  /** ISO currency code (e.g., "USD", "EUR", "NGN") */
  currency: string;

  /** Payment status */
  status: "pending" | "processing" | "succeeded" | "failed" | "refunded";

  /** Additional metadata for tracking */
  metadata: Record<string, string>;

  /** Client secret for completing payment (Stripe) */
  clientSecret?: string;

  /** Authorization URL for redirect-based flows (Paystack) */
  authorizationUrl?: string;
}

/**
 * Payment processor interface
 * All payment processors must implement this interface
 */
export interface PaymentProcessor {
  /** Processor name (e.g., "stripe", "paystack", "free") */
  readonly name: string;

  /**
   * Create a payment intent
   * @param params - Payment intent parameters
   * @returns Payment intent
   */
  createIntent(params: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }): Promise<PaymentIntent>;

  /**
   * Confirm/complete a payment intent
   * @param intentId - Payment intent ID
   * @returns Updated payment intent
   */
  confirmIntent(intentId: string): Promise<PaymentIntent>;

  /**
   * Refund a payment
   * @param intentId - Payment intent ID
   * @param amount - Optional partial refund amount
   */
  refund(intentId: string, amount?: number): Promise<void>;

  /**
   * Verify webhook signature
   * @param signature - Webhook signature header
   * @param payload - Raw webhook payload
   * @returns true if signature is valid
   */
  verifyWebhook(signature: string, payload: string): boolean;

  /**
   * Handle webhook event
   * @param event - Webhook event payload
   */
  handleWebhook(event: unknown): Promise<void>;
}

/**
 * Payment processor configuration
 */
export interface PaymentProcessorConfig {
  /** Processor type */
  type: "free" | "stripe" | "paystack";

  /** API credentials */
  credentials?: {
    apiKey?: string;
    secretKey?: string;
    webhookSecret?: string;
  };

  /** Additional options */
  options?: Record<string, unknown>;
}

/**
 * Payment error types
 */
export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly processorError?: unknown
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

/**
 * Payment result for tracking
 */
export interface PaymentResult {
  success: boolean;
  intentId: string;
  error?: string;
  metadata?: Record<string, unknown>;
}
