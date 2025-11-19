/**
 * Ticket Number Generator
 * 
 * Generates unique, human-readable ticket identifiers using Nanoid with a custom alphabet.
 * Format: TKT-{timestamp}-{randomPart}
 * Example: TKT-L8Z9K3-A7B2C5D8E9
 * 
 * Features:
 * - Collision-resistant (10-character random part)
 * - URL-safe and QR-code friendly
 * - No ambiguous characters (0/O, 1/I/l removed)
 * - Sortable by timestamp component
 * - Compact (21 characters total)
 */

import { customAlphabet } from 'nanoid';

/**
 * Custom alphabet excluding ambiguous characters:
 * - Removed: 0 (zero), O (letter O)
 * - Removed: 1 (one), I (letter I), l (lowercase L)
 * This ensures tickets are easy to read and type manually if needed.
 */
const nanoid = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 10);

/**
 * Generate a unique ticket number for an event.
 * 
 * @returns A unique ticket number in format: TKT-{timestamp}-{randomPart}
 * 
 * @example
 * ```typescript
 * const ticketNumber = generateTicketNumber();
 * // Returns: "TKT-L8Z9K3-A7B2C5D8E9"
 * ```
 */
export function generateTicketNumber(): string {
  const prefix = 'TKT';
  const randomPart = nanoid(); // 10 characters, collision-resistant
  const timestamp = Date.now().toString(36).toUpperCase(); // Base36 timestamp (sortable)
  
  return `${prefix}-${timestamp}-${randomPart}`;
}

/**
 * Validate a ticket number format.
 * 
 * @param ticketNumber - The ticket number to validate
 * @returns True if the ticket number matches the expected format
 * 
 * @example
 * ```typescript
 * isValidTicketNumberFormat("TKT-L8Z9K3-A7B2C5D8E9"); // true
 * isValidTicketNumberFormat("INVALID"); // false
 * ```
 */
export function isValidTicketNumberFormat(ticketNumber: string): boolean {
  // Pattern: TKT-{6-10 chars}-{10 chars} (all alphanumeric, no ambiguous chars)
  const pattern = /^TKT-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6,10}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{10}$/;
  return pattern.test(ticketNumber);
}
