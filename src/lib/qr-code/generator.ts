/**
 * QR Code Generator Utilities
 *
 * Generates QR codes for ticket instances in multiple formats:
 * - Data URL (for embedding in emails and PDFs)
 * - SVG (for responsive web display)
 *
 * QR codes encode the ticket number (Ticket.ticketNumber) which is used
 * during check-in to look up the ticket and validate attendee.
 *
 * Uses error correction level H (high) for maximum redundancy - QR codes
 * can be scanned even if partially damaged or obscured.
 */

import QRCode from "qrcode";

/**
 * QR code generation options
 */
const QR_OPTIONS = {
  errorCorrectionLevel: "H" as const, // High redundancy (30% damage tolerance)
  margin: 2, // Quiet zone around QR code
  width: 300, // Default size in pixels
  color: {
    dark: "#000000", // QR code foreground color
    light: "#FFFFFF", // QR code background color
  },
};

/**
 * Generate a QR code as a data URL for a ticket.
 *
 * Data URLs can be embedded directly in HTML/emails without external hosting.
 * Format: data:image/png;base64,...
 *
 * @param ticketNumber - The unique ticket number to encode
 * @param options - Optional overrides for QR code appearance
 * @returns Promise resolving to data URL string
 *
 * @example
 * ```typescript
 * const qrDataUrl = await generateTicketQRCode("TKT-L8Z9K3-A7B2C5D8E9");
 * // Use in email: <img src={qrDataUrl} alt="Ticket QR Code" />
 * ```
 */
export async function generateTicketQRCode(
  ticketNumber: string,
  options?: {
    width?: number;
    darkColor?: string;
    lightColor?: string;
  },
): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(ticketNumber, {
      ...QR_OPTIONS,
      width: options?.width ?? QR_OPTIONS.width,
      color: {
        dark: options?.darkColor ?? QR_OPTIONS.color.dark,
        light: options?.lightColor ?? QR_OPTIONS.color.light,
      },
    });

    return qrDataUrl;
  } catch (error) {
    throw new Error(
      `Failed to generate QR code for ticket ${ticketNumber}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Generate a QR code as an SVG string for a ticket.
 *
 * SVG format is vector-based and scales infinitely without quality loss.
 * Ideal for responsive web displays and print materials.
 *
 * @param ticketNumber - The unique ticket number to encode
 * @param options - Optional overrides for QR code appearance
 * @returns Promise resolving to SVG string
 *
 * @example
 * ```typescript
 * const qrSvg = await generateTicketQRCodeSVG("TKT-L8Z9K3-A7B2C5D8E9");
 * // Use in component: <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
 * ```
 */
export async function generateTicketQRCodeSVG(
  ticketNumber: string,
  options?: {
    darkColor?: string;
    lightColor?: string;
  },
): Promise<string> {
  try {
    const svg = await QRCode.toString(ticketNumber, {
      type: "svg",
      errorCorrectionLevel: QR_OPTIONS.errorCorrectionLevel,
      margin: QR_OPTIONS.margin,
      color: {
        dark: options?.darkColor ?? QR_OPTIONS.color.dark,
        light: options?.lightColor ?? QR_OPTIONS.color.light,
      },
    });

    return svg;
  } catch (error) {
    throw new Error(
      `Failed to generate QR code SVG for ticket ${ticketNumber}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Batch generate QR codes for multiple tickets.
 *
 * Useful for pre-generating QR codes when creating multiple tickets
 * from a registration purchase.
 *
 * @param ticketNumbers - Array of ticket numbers to generate QR codes for
 * @param format - Output format ('dataUrl' or 'svg')
 * @returns Promise resolving to map of ticketNumber -> QR code
 *
 * @example
 * ```typescript
 * const tickets = ["TKT-L8Z9K3-A7B2C5D8E9", "TKT-M9A0B4-B8C3D6E0F1"];
 * const qrCodes = await generateBatchTicketQRCodes(tickets, 'dataUrl');
 * // { "TKT-L8Z9K3-A7B2C5D8E9": "data:image/png;base64,...", ... }
 * ```
 */
export async function generateBatchTicketQRCodes(
  ticketNumbers: string[],
  format: "dataUrl" | "svg" = "dataUrl",
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  const generator =
    format === "svg" ? generateTicketQRCodeSVG : generateTicketQRCode;

  // Generate in parallel for performance
  const promises = ticketNumbers.map(async (ticketNumber) => {
    const qrCode = await generator(ticketNumber);
    results[ticketNumber] = qrCode;
  });

  await Promise.all(promises);

  return results;
}

/**
 * Validate if a string is a valid ticket number before generating QR code.
 *
 * @param ticketNumber - The ticket number to validate
 * @returns True if the format is valid
 *
 * @example
 * ```typescript
 * if (isValidTicketNumber("TKT-L8Z9K3-A7B2C5D8E9")) {
 *   await generateTicketQRCode("TKT-L8Z9K3-A7B2C5D8E9");
 * }
 * ```
 */
export function isValidTicketNumber(ticketNumber: string): boolean {
  // Basic validation: must be non-empty string
  if (!ticketNumber || typeof ticketNumber !== "string") {
    return false;
  }

  // Should match TKT-{timestamp}-{random} format
  const pattern = /^TKT-[A-Z0-9]{6,10}-[A-Z0-9]{10}$/;
  return pattern.test(ticketNumber);
}
