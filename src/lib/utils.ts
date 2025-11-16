/**
 * Utility functions for the application
 */

import { randomBytes } from "crypto";

/**
 * Generate a secure invitation token
 *
 * @returns A 43-character base64url-encoded token (256 bits of entropy)
 *
 * @example
 * const token = generateInvitationToken();
 * // => "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v"
 */
export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url").slice(0, 43); // Consistent length
}

/**
 * Calculate invitation expiry date (7 days from now)
 *
 * @returns Date object representing 7 days from now
 */
export function calculateInvitationExpiry(): Date {
  const INVITATION_EXPIRY_DAYS = 7;
  const now = new Date();
  return new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}
