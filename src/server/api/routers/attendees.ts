/**
 * Attendees Router
 * Handles attendee import operations for event organizers
 */

import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import Papa from "papaparse";

/**
 * Input schema for CSV parsing
 */
const parseCSVSchema = z.object({
  eventId: z.string().cuid(),
  fileContent: z.string(),
});

/**
 * Fuzzy match column names to suggest field mappings
 */
function suggestFieldMapping(columnName: string): string | null {
  const normalized = columnName.toLowerCase().trim();

  // Email field patterns
  if (
    normalized.startsWith("email") ||
    normalized.endsWith("email") ||
    normalized === "e-mail"
  ) {
    return "email";
  }

  // Name field patterns
  if (
    normalized === "name" ||
    normalized === "full name" ||
    normalized === "fullname" ||
    normalized === "attendee" ||
    normalized === "attendee name"
  ) {
    return "name";
  }

  // Ticket type patterns
  if (
    normalized === "ticket" ||
    normalized === "ticket type" ||
    normalized === "tickettype" ||
    normalized === "ticket_type" ||
    normalized === "type"
  ) {
    return "ticketType";
  }

  // Payment status patterns
  if (
    normalized === "payment" ||
    normalized === "payment status" ||
    normalized === "paymentstatus" ||
    normalized === "payment_status" ||
    normalized === "status"
  ) {
    return "paymentStatus";
  }

  // Email status patterns
  if (
    normalized === "email status" ||
    normalized === "emailstatus" ||
    normalized === "email_status"
  ) {
    return "emailStatus";
  }

  // Registered at patterns
  if (
    normalized === "date" ||
    normalized === "registered" ||
    normalized === "registration date" ||
    normalized === "registrationdate" ||
    normalized === "registered_at" ||
    normalized === "registeredat"
  ) {
    return "registeredAt";
  }

  // No match - will be treated as custom field
  return null;
}

/**
 * Strip BOM (Byte Order Mark) from string
 */
function stripBOM(str: string): string {
  // Remove UTF-8 BOM if present
  if (str.charCodeAt(0) === 0xfeff) {
    return str.slice(1);
  }
  return str;
}

/**
 * Validate file size and row count
 */
function validateFileConstraints(
  fileContent: string,
  rowCount: number,
): { valid: boolean; error?: string } {
  // Check file size (10MB = 10 * 1024 * 1024 bytes)
  const fileSizeBytes = new Blob([fileContent]).size;
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB

  if (fileSizeBytes > maxSizeBytes) {
    return {
      valid: false,
      error: "File exceeds 10MB limit. Please split into smaller files.",
    };
  }

  // Check row count (10,000 rows max)
  const maxRows = 10000;
  if (rowCount > maxRows) {
    return {
      valid: false,
      error: `File exceeds ${maxRows.toLocaleString()} row limit. Please split into smaller files.`,
    };
  }

  return { valid: true };
}

/**
 * Sanitize cell content to prevent CSV injection
 */
function sanitizeCell(value: string): string {
  // Strip formula characters that could cause CSV injection
  const dangerous = ["=", "+", "-", "@", "\t", "\r"];
  let sanitized = value;

  for (const char of dangerous) {
    if (sanitized.startsWith(char)) {
      sanitized = "'" + sanitized; // Prefix with single quote to treat as text
      break;
    }
  }

  return sanitized;
}

export const attendeesRouter = createTRPCRouter({
  /**
   * Parse CSV file and return preview with suggested field mappings
   */
  parseCSV: protectedProcedure
    .input(parseCSVSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify user is event organizer
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        select: { organizerId: true },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You do not have permission to import attendees for this event",
        });
      }

      // Strip BOM and decode content
      const cleanContent = stripBOM(input.fileContent);

      // Parse CSV
      const parseResult = Papa.parse<Record<string, string>>(cleanContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => sanitizeCell(value.trim()),
      });

      if (parseResult.errors.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `CSV parsing failed: ${parseResult.errors[0]?.message ?? "Unknown error"}`,
        });
      }

      const data = parseResult.data;
      const columns = parseResult.meta.fields ?? [];

      // Validate empty file
      if (data.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CSV file is empty. Please upload a file with at least one row of data.",
        });
      }

      // Validate no columns
      if (columns.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CSV file has no columns. Please ensure the first row contains column headers.",
        });
      }

      // Validate file size and row count
      const validation = validateFileConstraints(cleanContent, data.length);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.error,
        });
      }

      // Generate suggested mappings for each column
      const suggestedMapping: Record<string, string> = {};
      for (const column of columns) {
        const suggestion = suggestFieldMapping(column);
        if (suggestion) {
          // Only suggest if not already mapped
          if (!Object.values(suggestedMapping).includes(suggestion)) {
            suggestedMapping[column] = suggestion;
          }
        }
      }

      // Get preview data (first 10 rows)
      const preview = data.slice(0, 10);

      return {
        columns,
        preview,
        totalRows: data.length,
        suggestedMapping,
      };
    }),
});
