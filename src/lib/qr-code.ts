/**
 * QR Code Utilities
 *
 * Utilities for validating and parsing QR code data from event tickets.
 * Supports both simple ticket number formats and JWT-based signed tokens.
 *
 * @module lib/qr-code
 */

import { z } from "zod";

/**
 * QR code data can be:
 * 1. Simple ticket number (e.g., "TKT-2025-ABC123")
 * 2. JWT token containing ticket metadata
 * 3. JSON object with ticket information
 */
const ticketNumberRegex = /^[A-Z0-9-]+$/i;

/**
 * Result of QR code parsing
 */
export interface QrCodeParseResult {
  success: boolean;
  ticketNumber?: string;
  qrCodeData?: string;
  error?: string;
}

/**
 * Parse QR code data and extract ticket information
 *
 * @param qrCodeData - Raw QR code string scanned from ticket
 * @returns Parse result with ticket number or error
 *
 * @example
 * ```ts
 * const result = parseQrCode("TKT-2025-ABC123");
 * if (result.success) {
 *   console.log(result.ticketNumber); // "TKT-2025-ABC123"
 * }
 * ```
 */
export function parseQrCode(qrCodeData: string): QrCodeParseResult {
  if (!qrCodeData || typeof qrCodeData !== "string") {
    return {
      success: false,
      error: "Invalid QR code data: empty or not a string",
    };
  }

  const trimmed = qrCodeData.trim();

  if (trimmed.length === 0) {
    return {
      success: false,
      error: "Invalid QR code data: empty string",
    };
  }

  // Case 1: Simple ticket number format (most common)
  if (ticketNumberRegex.test(trimmed)) {
    return {
      success: true,
      ticketNumber: trimmed,
      qrCodeData: trimmed,
    };
  }

  // Case 2: Try parsing as JSON (for structured QR codes)
  try {
    const parsed = JSON.parse(trimmed) as unknown;

    // Expected format: { ticketNumber: "TKT-...", eventId?: "...", ... }
    if (parsed && typeof parsed === "object" && "ticketNumber" in parsed) {
      const ticketNumber = String(
        (parsed as Record<string, unknown>).ticketNumber,
      );

      if (ticketNumberRegex.test(ticketNumber)) {
        return {
          success: true,
          ticketNumber,
          qrCodeData: trimmed,
        };
      }
    }

    return {
      success: false,
      error: "Invalid QR code format: JSON missing ticketNumber field",
    };
  } catch {
    // Not JSON, continue to JWT check
  }

  // Case 3: JWT token (starts with eyJ)
  if (trimmed.startsWith("eyJ")) {
    // For now, pass the entire JWT as qrCodeData
    // Backend will verify signature and extract ticket number
    return {
      success: true,
      qrCodeData: trimmed,
    };
  }

  // Unrecognized format
  return {
    success: false,
    error: "Invalid QR code format: unrecognized data structure",
  };
}

/**
 * Validate that QR code data is well-formed
 *
 * @param qrCodeData - QR code string to validate
 * @returns true if valid, false otherwise
 */
export function isValidQrCode(qrCodeData: string): boolean {
  const result = parseQrCode(qrCodeData);
  return result.success;
}

/**
 * Format error message for display to users
 *
 * @param error - Error message from parse result
 * @returns User-friendly error message
 */
export function formatQrCodeError(error: string): string {
  const errorMap: Record<string, string> = {
    "Invalid QR code data: empty or not a string":
      "Unable to read QR code. Please try again.",
    "Invalid QR code data: empty string":
      "Unable to read QR code. Please try again.",
    "Invalid QR code format: JSON missing ticketNumber field":
      "Invalid ticket QR code. Please verify this is a valid event ticket.",
    "Invalid QR code format: unrecognized data structure":
      "Unrecognized QR code format. Please use the manual ticket number entry.",
  };

  return errorMap[error] ?? "Failed to scan QR code. Please try manual entry.";
}

/**
 * Zod schema for QR code validation
 * Use this in forms that accept QR code input
 */
export const qrCodeSchema = z
  .string()
  .min(1, "QR code data is required")
  .refine(isValidQrCode, {
    message: "Invalid QR code format",
  });

/**
 * Extract ticket number from QR code data
 * Convenience function that combines parsing and extraction
 *
 * @param qrCodeData - Raw QR code string
 * @returns Ticket number if found, null otherwise
 */
export function extractTicketNumber(qrCodeData: string): string | null {
  const result = parseQrCode(qrCodeData);
  return result.success ? (result.ticketNumber ?? null) : null;
}
