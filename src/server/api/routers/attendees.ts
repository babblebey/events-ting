/**
 * Attendees Router
 * Handles attendee import operations and attendee management for event organizers
 */

import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { z } from "zod";
import { checkModuleAccess } from "@/server/api/permissions";
import Papa from "papaparse";
import { randomBytes } from "crypto";
import { sendEmail } from "@/server/services/email";
import { TicketAssigned } from "../../../../emails/ticket-assigned";
import { generateTicketNumber } from "@/lib/tickets/generate-ticket-number";
import { generateTicketQRCode } from "@/lib/qr-code/generator";
import {
  listAttendeesInputSchema,
  getAttendeeByIdInputSchema,
  getCustomFieldResponsesInputSchema,
  exportAttendeesInputSchema,
  updateAttendeeInputSchema,
  updateEmailStatusInputSchema,
} from "@/lib/validators";

/**
 * Input schema for CSV parsing
 */
const parseCSVSchema = z.object({
  eventId: z.string().cuid(),
  fileContent: z.string(),
});

/**
 * Input schema for CSV validation
 */
const validateImportSchema = z.object({
  eventId: z.string().cuid(),
  fileContent: z.string(),
  fieldMapping: z.record(z.string()), // CSV column -> system field
  duplicateStrategy: z.enum(["skip", "create"]).default("skip"),
});

/**
 * Input schema for CSV import execution
 */
const executeImportSchema = z.object({
  eventId: z.string().cuid(),
  fileContent: z.string(),
  fieldMapping: z.record(z.string()), // CSV column -> system field
  duplicateStrategy: z.enum(["skip", "create"]).default("skip"),
  sendConfirmationEmails: z.boolean().default(false),
  idempotencyKey: z.string().optional(), // Prevent duplicate submissions
});

// In-memory cache to track recent imports (expires after 5 minutes)
const importCache = new Map<string, { timestamp: number; result: any }>();
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of importCache.entries()) {
    if (now - value.timestamp > CACHE_EXPIRY_MS) {
      importCache.delete(key);
    }
  }
}, 60 * 1000); // Run cleanup every minute

/**
 * Validation error structure
 */
interface ValidationError {
  row: number;
  field: string;
  value: string;
  error: string;
}

/**
 * Import result for a single row
 */
interface ImportRowResult {
  row: number;
  success: boolean;
  email?: string;
  error?: string;
}

/**
 * Parsed row with mapped fields
 */
interface MappedRow {
  rowNumber: number;
  email?: string;
  name?: string;
  ticketType?: string;
  paymentStatus?: string;
  emailStatus?: string;
  registeredAt?: string;
  customData: Record<string, string>;
  originalData: Record<string, string>;
}

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
 * Generate unique registration code
 */
function generateRegistrationCode(): string {
  return randomBytes(8).toString("hex").toUpperCase();
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

/**
 * Validate email format
 */
function validateEmail(email: string): boolean {
  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validate name field
 */
function validateName(name: string): boolean {
  return name.length >= 2 && name.length <= 255;
}

/**
 * Validate payment status enum
 */
function validatePaymentStatus(status: string): boolean {
  const validStatuses = ["free", "pending", "paid", "failed", "refunded"];
  return validStatuses.includes(status.toLowerCase());
}

/**
 * Validate email status enum
 */
function validateEmailStatus(status: string): boolean {
  const validStatuses = ["active", "bounced", "unsubscribed"];
  return validStatuses.includes(status.toLowerCase());
}

/**
 * Parse and map CSV rows according to field mapping
 */
function parseAndMapRows(
  data: Record<string, string>[],
  fieldMapping: Record<string, string>,
): MappedRow[] {
  const mappedRows: MappedRow[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i]!;
    const mappedRow: MappedRow = {
      rowNumber: i + 2, // +2 because row 1 is headers, and arrays are 0-indexed
      customData: {},
      originalData: row,
    };

    // Map fields according to fieldMapping
    for (const [csvColumn, systemField] of Object.entries(fieldMapping)) {
      const value = row[csvColumn]?.trim() ?? "";

      if (!value) continue; // Skip empty values

      switch (systemField) {
        case "email":
          mappedRow.email = value.toLowerCase(); // Normalize email
          break;
        case "name":
          mappedRow.name = value;
          break;
        case "ticketType":
          mappedRow.ticketType = value;
          break;
        case "paymentStatus":
          mappedRow.paymentStatus = value.toLowerCase();
          break;
        case "emailStatus":
          mappedRow.emailStatus = value.toLowerCase();
          break;
        case "registeredAt":
          mappedRow.registeredAt = value;
          break;
        default:
          // Store as custom field (without custom_ prefix)
          const customFieldName = systemField.replace(/^custom_/, "");
          mappedRow.customData[customFieldName] = value;
          break;
      }
    }

    mappedRows.push(mappedRow);
  }

  return mappedRows;
}

/**
 * Perform field-level validation on a mapped row
 */
function validateRow(row: MappedRow): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required field: email
  if (!row.email) {
    errors.push({
      row: row.rowNumber,
      field: "email",
      value: "",
      error: "Email is required",
    });
  } else if (!validateEmail(row.email)) {
    errors.push({
      row: row.rowNumber,
      field: "email",
      value: row.email,
      error: "Invalid email format",
    });
  }

  // Required field: name
  if (!row.name) {
    errors.push({
      row: row.rowNumber,
      field: "name",
      value: "",
      error: "Name is required",
    });
  } else if (!validateName(row.name)) {
    errors.push({
      row: row.rowNumber,
      field: "name",
      value: row.name,
      error: "Name must be between 2 and 255 characters",
    });
  }

  // Required field: ticketType
  if (!row.ticketType) {
    errors.push({
      row: row.rowNumber,
      field: "ticketType",
      value: "",
      error: "Ticket type is required",
    });
  }

  // Optional field: paymentStatus
  if (row.paymentStatus && !validatePaymentStatus(row.paymentStatus)) {
    errors.push({
      row: row.rowNumber,
      field: "paymentStatus",
      value: row.paymentStatus,
      error:
        "Invalid payment status. Must be one of: free, pending, paid, failed, refunded",
    });
  }

  // Optional field: emailStatus
  if (row.emailStatus && !validateEmailStatus(row.emailStatus)) {
    errors.push({
      row: row.rowNumber,
      field: "emailStatus",
      value: row.emailStatus,
      error:
        "Invalid email status. Must be one of: active, bounced, unsubscribed",
    });
  }

  // Optional field: registeredAt (ISO 8601 date validation)
  if (row.registeredAt) {
    const date = new Date(row.registeredAt);
    if (isNaN(date.getTime())) {
      errors.push({
        row: row.rowNumber,
        field: "registeredAt",
        value: row.registeredAt,
        error:
          "Invalid date format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)",
      });
    }
  }

  return errors;
}

/**
 * Detect in-file duplicate emails (Phase 1)
 */
function detectInFileDuplicates(rows: MappedRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const emailMap = new Map<string, number[]>(); // email -> row numbers

  // Build email frequency map
  for (const row of rows) {
    if (row.email) {
      const existing = emailMap.get(row.email) ?? [];
      existing.push(row.rowNumber);
      emailMap.set(row.email, existing);
    }
  }

  // Report duplicates (skip first occurrence, report subsequent ones)
  for (const [email, rowNumbers] of emailMap.entries()) {
    if (rowNumbers.length > 1) {
      // Report all occurrences after the first
      for (let i = 1; i < rowNumbers.length; i++) {
        errors.push({
          row: rowNumbers[i]!,
          field: "email",
          value: email,
          error: `Duplicate email found in CSV (first occurrence at row ${rowNumbers[0]})`,
        });
      }
    }
  }

  return errors;
}

export const attendeesRouter = createTRPCRouter({
  /**
   * List attendees for an event
   * Protected procedure - event organizer only
   */
  list: protectedProcedure
    .input(listAttendeesInputSchema)
    .query(async ({ ctx, input }) => {
      const { eventId, emailStatus, search, limit, cursor } = input;

      // Verify user is event organizer
      await checkModuleAccess({
        db: ctx.db,
        eventId,
        userId: ctx.session.user.id,
        requiredModule: "ATTENDEES",
      });

      // Build where clause
      const where = {
        ticket: {
          eventId,
          isAssigned: true, // Only show attendees with assigned tickets
        },
        ...(emailStatus && { emailStatus }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }),
        ...(cursor && { id: { gt: cursor } }),
      };

      // Get total count (for pagination UI)
      const total = await ctx.db.attendee.count({
        where: {
          ticket: {
            eventId,
            isAssigned: true,
          },
          ...(emailStatus && { emailStatus }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }),
        },
      });

      // Fetch attendees with pagination
      const attendees = await ctx.db.attendee.findMany({
        where,
        take: limit + 1, // Fetch one extra to determine if there's a next page
        orderBy: { createdAt: "asc" },
        include: {
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              isCheckedIn: true,
              checkedInAt: true,
              ticketType: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // Determine if there's a next page
      let nextCursor: string | null = null;
      if (attendees.length > limit) {
        const nextItem = attendees.pop();
        nextCursor = nextItem?.id ?? null;
      }

      // Transform to output format
      const transformedAttendees = attendees.map((attendee) => {
        if (!attendee.ticket) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Attendee has no associated ticket",
          });
        }

        return {
          id: attendee.id,
          name: attendee.name,
          email: attendee.email,
          emailStatus: attendee.emailStatus as
            | "active"
            | "bounced"
            | "unsubscribed",
          customData: attendee.customData as Record<string, unknown> | null,
          ticket: {
            id: attendee.ticket.id,
            ticketNumber: attendee.ticket.ticketNumber,
            isCheckedIn: attendee.ticket.isCheckedIn,
            checkedInAt: attendee.ticket.checkedInAt,
            ticketType: {
              id: attendee.ticket.ticketType.id,
              name: attendee.ticket.ticketType.name,
            },
          },
          createdAt: attendee.createdAt,
          updatedAt: attendee.updatedAt,
        };
      });

      return {
        attendees: transformedAttendees,
        nextCursor,
        total,
      };
    }),

  /**
   * Get attendee by ID
   * Public procedure - attendee can view own record, organizer can view all
   */
  getById: publicProcedure
    .input(getAttendeeByIdInputSchema)
    .query(async ({ ctx, input }) => {
      const { attendeeId } = input;

      // Fetch attendee with ticket info
      const attendee = await ctx.db.attendee.findUnique({
        where: { id: attendeeId },
        include: {
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              isCheckedIn: true,
              checkedInAt: true,
              eventId: true,
              ticketType: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!attendee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attendee not found",
        });
      }

      if (!attendee.ticket) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Attendee has no associated ticket",
        });
      }

      // Check authorization
      // Allow if: user is the attendee, or user is event organizer
      if (ctx.session?.user) {
        const isAttendee = attendee.userId === ctx.session.user.id;

        if (!isAttendee) {
          try {
            await checkModuleAccess({
              db: ctx.db,
              eventId: attendee.ticket.eventId,
              userId: ctx.session.user.id,
              requiredModule: "ATTENDEES",
            });
          } catch {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You do not have permission to view this attendee",
            });
          }
        }
      }

      // Transform to output format
      return {
        id: attendee.id,
        name: attendee.name,
        email: attendee.email,
        emailStatus: attendee.emailStatus as
          | "active"
          | "bounced"
          | "unsubscribed",
        customData: attendee.customData as Record<string, unknown> | null,
        ticket: {
          id: attendee.ticket.id,
          ticketNumber: attendee.ticket.ticketNumber,
          isCheckedIn: attendee.ticket.isCheckedIn,
          checkedInAt: attendee.ticket.checkedInAt,
          ticketType: {
            id: attendee.ticket.ticketType.id,
            name: attendee.ticket.ticketType.name,
          },
        },
        createdAt: attendee.createdAt,
        updatedAt: attendee.updatedAt,
      };
    }),

  /**
   * Get aggregated custom field responses for an event
   * Protected procedure - event organizer only
   */
  getCustomFieldResponses: protectedProcedure
    .input(getCustomFieldResponsesInputSchema)
    .query(async ({ ctx, input }) => {
      const { eventId, fieldId } = input;

      // Verify user is event organizer
      await checkModuleAccess({
        db: ctx.db,
        eventId,
        userId: ctx.session.user.id,
        requiredModule: "ATTENDEES",
      });

      // Get event to access custom field definitions
      const event = await ctx.db.event.findUnique({
        where: { id: eventId },
        select: {
          // TODO: Add customFields to Event schema (will be done in T044)
          // customFields: true,
          name: true,
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // TODO: Enable this validation once Event.customFields is added to the schema (T044)
      /*
      if (!event.customFields) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Event has no custom fields configured",
        });
      }

      // Parse custom field definitions
      let customFieldDefinitions: CustomFieldDefinition[];
      try {
        customFieldDefinitions = customFieldDefinitionsSchema.parse(
          event.customFields
        ) as CustomFieldDefinition[];
      } catch (error) {
        console.error("[Attendees] Invalid custom fields schema in event", {
          eventId,
          error,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Event has invalid custom field configuration",
        });
      }

      // Find the field definition
      const fieldDef = customFieldDefinitions.find((f) => f.id === fieldId);
      if (!fieldDef) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom field not found in event configuration",
        });
      }
      */

      // For now, return mock data since Event.customFields doesn't exist yet
      // This will be replaced with actual implementation in T044
      const fieldDef = {
        id: fieldId,
        label: "Sample Field",
        type: "text" as const,
      };

      // Fetch all attendees for this event
      const attendees = await ctx.db.attendee.findMany({
        where: {
          ticket: {
            eventId,
            isAssigned: true,
          },
        },
        select: {
          customData: true,
        },
      });

      // Aggregate responses
      const responseCounts = new Map<string, number>();
      let totalResponses = 0;

      for (const attendee of attendees) {
        if (!attendee.customData) continue;

        const customData = attendee.customData as Record<string, unknown>;
        const response = customData[fieldId];

        if (response !== undefined && response !== null && response !== "") {
          // Convert response to string, handling arrays and objects
          let responseStr: string;
          if (Array.isArray(response)) {
            responseStr = response
              .map((item) =>
                typeof item === "string" ? item : JSON.stringify(item),
              )
              .join(", ");
          } else if (typeof response === "object") {
            responseStr = JSON.stringify(response);
          } else if (typeof response === "string") {
            responseStr = response;
          } else if (
            typeof response === "number" ||
            typeof response === "boolean"
          ) {
            responseStr = String(response);
          } else {
            responseStr = "";
          }

          if (responseStr) {
            responseCounts.set(
              responseStr,
              (responseCounts.get(responseStr) ?? 0) + 1,
            );
            totalResponses++;
          }
        }
      }

      // Convert to output format
      const responses = Array.from(responseCounts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count); // Sort by count descending

      return {
        fieldId,
        fieldLabel: fieldDef.label,
        fieldType: fieldDef.type,
        responses,
        totalResponses,
      };
    }),

  /**
   * Export attendee list as CSV for event logistics
   * Protected procedure - event organizer only
   */
  exportList: protectedProcedure
    .input(exportAttendeesInputSchema)
    .query(async ({ ctx, input }) => {
      const {
        eventId,
        emailStatus,
        includeCustomFields,
        includeCheckInStatus,
      } = input;

      // Verify user is event organizer
      await checkModuleAccess({
        db: ctx.db,
        eventId,
        userId: ctx.session.user.id,
        requiredModule: "ATTENDEES",
      });

      // Fetch event details for filename
      const event = await ctx.db.event.findUnique({
        where: { id: eventId },
        select: {
          name: true,
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // Fetch all attendees for the event (no pagination for export)
      const attendees = await ctx.db.attendee.findMany({
        where: {
          ticket: {
            eventId,
            isAssigned: true,
          },
          ...(emailStatus && { emailStatus }),
        },
        orderBy: { createdAt: "asc" },
        include: {
          ticket: {
            select: {
              ticketNumber: true,
              isCheckedIn: true,
              checkedInAt: true,
              ticketType: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      // Build CSV headers
      const headers = ["Name", "Email", "Ticket Number", "Ticket Type"];

      if (includeCheckInStatus) {
        headers.push("Check-In Status", "Check-In Time");
      }

      // Collect custom field names from all attendees (if includeCustomFields)
      const customFieldNames = new Set<string>();
      if (includeCustomFields) {
        for (const attendee of attendees) {
          if (attendee.customData) {
            const customData = attendee.customData as Record<string, unknown>;
            for (const fieldName of Object.keys(customData)) {
              customFieldNames.add(fieldName);
            }
          }
        }
        // Add custom field columns
        for (const fieldName of Array.from(customFieldNames).sort()) {
          headers.push(fieldName);
        }
      }

      // Build CSV rows
      const rows: string[][] = [];

      for (const attendee of attendees) {
        if (!attendee.ticket) continue;

        const row: string[] = [
          sanitizeCell(attendee.name),
          sanitizeCell(attendee.email),
          sanitizeCell(attendee.ticket.ticketNumber),
          sanitizeCell(attendee.ticket.ticketType.name),
        ];

        if (includeCheckInStatus) {
          row.push(
            attendee.ticket.isCheckedIn ? "Checked In" : "Not Checked In",
          );
          row.push(
            attendee.ticket.checkedInAt
              ? attendee.ticket.checkedInAt.toISOString()
              : "",
          );
        }

        // Add custom field values (if includeCustomFields)
        if (includeCustomFields) {
          const customData =
            (attendee.customData as Record<string, unknown>) ?? {};
          for (const fieldName of Array.from(customFieldNames).sort()) {
            const value = customData[fieldName];
            let valueStr = "";
            if (value !== undefined && value !== null) {
              if (Array.isArray(value)) {
                valueStr = value
                  .map((item) =>
                    typeof item === "string" ? item : JSON.stringify(item),
                  )
                  .join("; ");
              } else if (typeof value === "object") {
                valueStr = JSON.stringify(value);
              } else if (typeof value === "string") {
                valueStr = value;
              } else if (
                typeof value === "number" ||
                typeof value === "boolean"
              ) {
                valueStr = String(value);
              }
            }
            row.push(sanitizeCell(valueStr));
          }
        }

        rows.push(row);
      }

      // Generate CSV string using papaparse
      const csv = Papa.unparse({
        fields: headers,
        data: rows,
      });

      // Generate filename with event name and date
      const dateStr = new Date().toISOString().split("T")[0];
      const sanitizedEventName = event.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const filename = `attendees-${sanitizedEventName}-${dateStr}.csv`;

      return {
        csv,
        filename,
        rowCount: attendees.length,
      };
    }),

  /**
   * Update attendee information
   * Protected procedure - attendee themselves or event organizer
   */
  update: protectedProcedure
    .input(updateAttendeeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { attendeeId, name, email, customData } = input;

      // Fetch attendee with ticket info
      const attendee = await ctx.db.attendee.findUnique({
        where: { id: attendeeId },
        include: {
          ticket: {
            select: {
              eventId: true,
            },
          },
        },
      });

      if (!attendee || !attendee.ticket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attendee not found",
        });
      }

      // Check authorization: user is attendee or event organizer
      const isAttendee = attendee.userId === ctx.session.user.id;

      if (!isAttendee) {
        try {
          await checkModuleAccess({
            db: ctx.db,
            eventId: attendee.ticket.eventId,
            userId: ctx.session.user.id,
            requiredModule: "ATTENDEES",
          });
        } catch {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to update this attendee",
          });
        }
      }

      // Validate custom data if provided (TODO: validate against event schema when T044 is complete)
      if (customData !== undefined) {
        // For now, just accept any record structure
        // In T044, we'll add validation against event.customFields schema
      }

      // Build update data object
      const updateData: {
        name?: string;
        email?: string;
        customData?: Record<string, unknown>;
      } = {};

      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email.toLowerCase();
      if (customData !== undefined) updateData.customData = customData;

      // Update attendee
      const updatedAttendee = await ctx.db.attendee.update({
        where: { id: attendeeId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          emailStatus: true,
          customData: true,
          createdAt: true,
          updatedAt: true,
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              isCheckedIn: true,
              checkedInAt: true,
              ticketType: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!updatedAttendee.ticket) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Attendee has no associated ticket",
        });
      }

      // Type assertion - we've verified ticket exists above
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const ticket = updatedAttendee.ticket;

      // TODO: If email changed, send confirmation email to new address
      // This will be implemented as part of email notification system enhancement

      // Transform to output format
      return {
        attendee: {
          id: updatedAttendee.id,
          name: updatedAttendee.name,
          email: updatedAttendee.email,
          emailStatus: updatedAttendee.emailStatus as
            | "active"
            | "bounced"
            | "unsubscribed",
          customData: updatedAttendee.customData as Record<
            string,
            unknown
          > | null,
          ticket: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            id: ticket.id,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            ticketNumber: ticket.ticketNumber,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            isCheckedIn: ticket.isCheckedIn,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            checkedInAt: ticket.checkedInAt,
            ticketType: {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              id: ticket.ticketType.id,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              name: ticket.ticketType.name,
            },
          },
          createdAt: updatedAttendee.createdAt,
          updatedAt: updatedAttendee.updatedAt,
        },
      };
    }),

  /**
   * Update email delivery status (webhook from Resend)
   * System/Internal procedure - webhook authentication required
   */
  updateEmailStatus: protectedProcedure
    .input(updateEmailStatusInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { email, eventId, status, reason } = input;

      // TODO: Add webhook signature validation when implementing Resend webhook endpoint
      // For now, this is a protected procedure that requires authentication

      // Find all attendees with this email for the event
      const attendees = await ctx.db.attendee.findMany({
        where: {
          email: email.toLowerCase(),
          ticket: {
            eventId,
            isAssigned: true,
          },
        },
        select: {
          id: true,
        },
      });

      if (attendees.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No attendees found with this email for the event",
        });
      }

      // Update email status for all matching attendees
      const attendeeIds = attendees.map((a) => a.id);

      await ctx.db.attendee.updateMany({
        where: {
          id: {
            in: attendeeIds,
          },
        },
        data: {
          emailStatus: status,
        },
      });

      // Log the update for debugging
      console.log(
        `[Attendees] Updated email status for ${attendeeIds.length} attendee(s):`,
        {
          email,
          eventId,
          status,
          reason,
          attendeeIds,
        },
      );

      return {
        updated: attendeeIds.length,
        attendeeIds,
      };
    }),

  /**
   * Parse CSV file and return preview with suggested field mappings
   */
  parseCSV: protectedProcedure
    .input(parseCSVSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to ATTENDEES module
      await checkModuleAccess({
        db: ctx.db,
        eventId: input.eventId,
        userId: ctx.session.user.id,
        requiredModule: "ATTENDEES",
      });

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
          message:
            "CSV file is empty. Please upload a file with at least one row of data.",
        });
      }

      // Validate no columns
      if (columns.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "CSV file has no columns. Please ensure the first row contains column headers.",
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

  /**
   * Validate CSV import data before execution
   * Performs comprehensive validation including:
   * - Field-level validation (email, name, ticket type)
   * - Phase 1: In-file duplicate detection
   * - Phase 2: Database duplicate detection
   * - Ticket type existence check
   * - Ticket availability warning
   */
  validateImport: protectedProcedure
    .input(validateImportSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to ATTENDEES module
      await checkModuleAccess({
        db: ctx.db,
        eventId: input.eventId,
        userId: ctx.session.user.id,
        requiredModule: "ATTENDEES",
      });

      // Fetch event with ticket types for validation
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        select: {
          ticketTypes: {
            select: {
              id: true,
              name: true,
              quantity: true,
              _count: {
                select: { registrations: true },
              },
            },
          },
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // Parse CSV
      const cleanContent = stripBOM(input.fileContent);
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

      // Validate required fields are mapped
      const requiredFields = ["email", "name", "ticketType"];
      const mappedFields = Object.values(input.fieldMapping);
      const missingFields = requiredFields.filter(
        (field) => !mappedFields.includes(field),
      );

      if (missingFields.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Required fields not mapped: ${missingFields.join(", ")}`,
        });
      }

      // Parse and map rows
      const mappedRows = parseAndMapRows(data, input.fieldMapping);

      // Collect all validation errors
      const allErrors: ValidationError[] = [];

      // Step 1: Field-level validation
      for (const row of mappedRows) {
        const rowErrors = validateRow(row);
        allErrors.push(...rowErrors);
      }

      // Step 2: Phase 1 - In-file duplicate detection
      const inFileDuplicates = detectInFileDuplicates(mappedRows);
      allErrors.push(...inFileDuplicates);

      // Create ticket type lookup map (name -> id)
      const ticketTypeMap = new Map(
        event.ticketTypes.map((tt) => [tt.name.toLowerCase(), tt]),
      );

      // Step 3: Ticket type existence validation
      for (const row of mappedRows) {
        if (row.ticketType) {
          const ticketType = ticketTypeMap.get(row.ticketType.toLowerCase());
          if (!ticketType) {
            allErrors.push({
              row: row.rowNumber,
              field: "ticketType",
              value: row.ticketType,
              error: `Ticket type '${row.ticketType}' does not exist for this event`,
            });
          }
        }
      }

      // Step 4: Phase 2 - Database duplicate detection
      // Get all valid emails from CSV (only those without field-level errors)
      const rowsWithErrors = new Set(allErrors.map((e) => e.row));
      const validEmails = mappedRows
        .filter((row) => row.email && !rowsWithErrors.has(row.rowNumber))
        .map((row) => row.email!);

      // Query existing registrations for these emails
      const existingRegistrations = await ctx.db.registration.findMany({
        where: {
          eventId: input.eventId,
          email: {
            in: validEmails,
          },
        },
        select: {
          email: true,
        },
      });

      // Create set of existing emails for fast lookup
      const existingEmailSet = new Set(
        existingRegistrations.map((r) => r.email.toLowerCase()),
      );

      // Report database duplicates
      const dbDuplicates: ValidationError[] = [];
      for (const row of mappedRows) {
        if (row.email && existingEmailSet.has(row.email)) {
          dbDuplicates.push({
            row: row.rowNumber,
            field: "email",
            value: row.email,
            error: "Email already registered for this event",
          });
        }
      }
      allErrors.push(...dbDuplicates);

      // Step 5: Ticket availability warnings (non-blocking)
      const warnings: ValidationError[] = [];

      // Count how many registrations per ticket type will be created
      const ticketTypeCounts = new Map<string, number>();
      for (const row of mappedRows) {
        if (row.ticketType && !rowsWithErrors.has(row.rowNumber)) {
          const ticketType = ticketTypeMap.get(row.ticketType.toLowerCase());
          if (ticketType) {
            const count = ticketTypeCounts.get(ticketType.id) ?? 0;
            ticketTypeCounts.set(ticketType.id, count + 1);
          }
        }
      }

      // Check availability for each ticket type
      for (const [ticketTypeId, importCount] of ticketTypeCounts.entries()) {
        const ticketType = event.ticketTypes.find(
          (tt) => tt.id === ticketTypeId,
        );
        if (ticketType) {
          const currentSold = ticketType._count.registrations;
          const availableSlots = ticketType.quantity - currentSold;

          if (importCount > availableSlots) {
            // This is a warning, not a blocking error
            warnings.push({
              row: 0, // Not specific to a row
              field: "ticketType",
              value: ticketType.name,
              error: `Warning: Importing ${importCount} registrations for '${ticketType.name}' but only ${availableSlots} slots available (${currentSold}/${ticketType.quantity} already sold)`,
            });
          }
        }
      }

      // Calculate summary statistics
      const totalRows = mappedRows.length;
      const invalidRowNumbers = new Set(allErrors.map((e) => e.row));
      const duplicateRowNumbers = new Set([
        ...inFileDuplicates.map((e) => e.row),
        ...dbDuplicates.map((e) => e.row),
      ]);

      const validRows = totalRows - invalidRowNumbers.size;
      const invalidRows = invalidRowNumbers.size;
      const duplicates = duplicateRowNumbers.size;

      return {
        validRows,
        invalidRows,
        duplicates,
        errors: allErrors,
        warnings,
        totalRows,
      };
    }),

  /**
   * Execute CSV import with partial commit strategy
   * Imports valid rows, skips/reports invalid rows
   * Optionally sends confirmation emails to imported attendees
   */
  executeImport: protectedProcedure
    .input(executeImportSchema)
    .mutation(async ({ ctx, input }) => {
      // Check idempotency key to prevent duplicate submissions
      if (input.idempotencyKey) {
        const cached = importCache.get(input.idempotencyKey);
        if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
          console.log(
            `[Import] Returning cached result for idempotency key: ${input.idempotencyKey}`,
          );
          return cached.result;
        }
      }

      // Verify user has access to ATTENDEES module
      await checkModuleAccess({
        db: ctx.db,
        eventId: input.eventId,
        userId: ctx.session.user.id,
        requiredModule: "ATTENDEES",
      });

      // Fetch event data for import
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        select: {
          id: true,
          name: true,
          slug: true,
          startDate: true,
          endDate: true,
          locationType: true,
          locationAddress: true,
          locationUrl: true,
          ticketTypes: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // Parse CSV
      const cleanContent = stripBOM(input.fileContent);
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

      // Validate required fields are mapped
      const requiredFields = ["email", "name", "ticketType"];
      const mappedFields = Object.values(input.fieldMapping);
      const missingFields = requiredFields.filter(
        (field) => !mappedFields.includes(field),
      );

      if (missingFields.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Required fields not mapped: ${missingFields.join(", ")}`,
        });
      }

      // Parse and map rows
      const mappedRows = parseAndMapRows(data, input.fieldMapping);

      // Create ticket type lookup map (name -> id)
      const ticketTypeMap = new Map(
        event.ticketTypes.map((tt) => [tt.name.toLowerCase(), tt.id]),
      );

      // Validate each row and collect errors
      const rowsWithErrors = new Set<number>();
      const allErrors: ValidationError[] = [];

      // Phase 1: Field-level validation
      for (const row of mappedRows) {
        const rowErrors = validateRow(row);
        if (rowErrors.length > 0) {
          allErrors.push(...rowErrors);
          rowsWithErrors.add(row.rowNumber);
        }
      }

      // Phase 2: In-file duplicate detection
      const inFileDuplicates = detectInFileDuplicates(mappedRows);
      for (const duplicate of inFileDuplicates) {
        allErrors.push(duplicate);
        rowsWithErrors.add(duplicate.row);
      }

      // Phase 3: Ticket type existence validation
      for (const row of mappedRows) {
        if (row.ticketType && !rowsWithErrors.has(row.rowNumber)) {
          const ticketTypeId = ticketTypeMap.get(row.ticketType.toLowerCase());
          if (!ticketTypeId) {
            allErrors.push({
              row: row.rowNumber,
              field: "ticketType",
              value: row.ticketType,
              error: `Ticket type '${row.ticketType}' does not exist for this event`,
            });
            rowsWithErrors.add(row.rowNumber);
          }
        }
      }

      // Phase 4: Database duplicate detection (based on strategy)
      const validEmails = mappedRows
        .filter((row) => row.email && !rowsWithErrors.has(row.rowNumber))
        .map((row) => row.email!);

      const existingRegistrations = await ctx.db.registration.findMany({
        where: {
          eventId: input.eventId,
          email: {
            in: validEmails,
          },
        },
        select: {
          email: true,
        },
      });

      const existingEmailSet = new Set(
        existingRegistrations.map((r) => r.email.toLowerCase()),
      );

      // Handle duplicates according to strategy
      let duplicateCount = 0;
      if (input.duplicateStrategy === "skip") {
        // Skip duplicates - mark them as errors
        for (const row of mappedRows) {
          if (
            row.email &&
            existingEmailSet.has(row.email) &&
            !rowsWithErrors.has(row.rowNumber)
          ) {
            allErrors.push({
              row: row.rowNumber,
              field: "email",
              value: row.email,
              error: "Email already registered for this event (skipped)",
            });
            rowsWithErrors.add(row.rowNumber);
            duplicateCount++;
          }
        }
      }
      // If strategy is "create", duplicates will be imported as new records

      // Filter to only valid rows
      const validRows = mappedRows.filter(
        (row) => !rowsWithErrors.has(row.rowNumber),
      );

      // Execute import with partial commit strategy
      // Each row is processed in its own transaction (atomicity per row)
      // Successful rows commit immediately, failed rows are logged and skipped
      // This ensures valid data is saved even if some rows fail
      const importResults: ImportRowResult[] = [];
      let successCount = 0;
      let failureCount = 0;

      // Collect email tasks to send after import (with rate limiting)
      const emailTasks: Array<{
        email: string;
        name: string;
        ticketNumber: string;
        ticketType: string;
        ticketPrice: number;
        customData?: Record<string, unknown>;
      }> = [];

      // Process each CSV row individually
      for (const row of validRows) {
        try {
          // Get ticket type ID
          const ticketTypeId = ticketTypeMap.get(row.ticketType!.toLowerCase());
          if (!ticketTypeId) {
            // Should not happen due to validation, but safety check
            importResults.push({
              row: row.rowNumber,
              success: false,
              email: row.email,
              error: `Ticket type '${row.ticketType}' not found`,
            });
            failureCount++;
            continue;
          }

          // Parse registeredAt if provided, otherwise use current time
          let registeredAt = new Date();
          if (row.registeredAt) {
            const parsedDate = new Date(row.registeredAt);
            if (!isNaN(parsedDate.getTime())) {
              registeredAt = parsedDate;
            }
          }

          // Generate unique ticket number for this import
          // Format: EVT-{YEAR}-{RANDOM8} (e.g., EVT-2025-ABC12345)
          // This number serves triple purpose:
          // 1. Ticket.ticketNumber - Unique identifier for the ticket
          // 2. Ticket.qrCodeData - QR code payload for check-in scanning
          // 3. Attendee.customData.registrationCode - Legacy registration reference
          const ticketNumber = generateTicketNumber();

          // Prepare custom data for attendee record
          // Includes ticket number as registrationCode + all unmapped CSV columns
          const customData = {
            registrationCode: ticketNumber, // Use ticket number as registration code
            ...row.customData,
          };

          // ========================================
          // Transaction: Create Registration + Ticket + Attendee
          // ========================================
          // This transaction creates all required records for a complete import:
          // 1. Registration - Buyer/purchase record (quantity=1)
          // 2. Ticket - Ticket instance with unique number and QR code
          // 3. Attendee - Person attending with details and custom fields
          // 4. Ticket Update - Link attendee and mark as assigned
          //
          // All 4 operations must succeed or none (atomicity)
          // Follows data model from Spec 003: Ticket/Attendee Separation
          // ========================================
          await ctx.db.$transaction(async (tx) => {
            // 1. Create Registration record (buyer = imported attendee)
            const registration = await tx.registration.create({
              data: {
                eventId: input.eventId,
                ticketTypeId,
                email: row.email!,
                name: row.name!,
                quantity: 1, // Each import row = 1 ticket
                paymentStatus:
                  (row.paymentStatus as
                    | "free"
                    | "pending"
                    | "paid"
                    | "failed"
                    | "refunded") ?? "free",
                registeredAt,
              },
            });

            // 2. Create Ticket record with ticket number and QR code
            const ticket = await tx.ticket.create({
              data: {
                registrationId: registration.id,
                eventId: input.eventId,
                ticketTypeId,
                ticketNumber,
                qrCodeData: ticketNumber, // QR code contains the ticket number
                isAssigned: false, // Will be set to true after attendee creation
                isCheckedIn: false,
              },
            });

            // 3. Create Attendee record with attendee details
            // NOTE: emailStatus and customData moved from Registration to Attendee
            // This aligns with data model where:
            // - Registration = Purchase/buyer info
            // - Attendee = Person details + email status + custom fields
            const attendee = await tx.attendee.create({
              data: {
                name: row.name!,
                email: row.email!.toLowerCase(), // Normalized to lowercase
                emailStatus:
                  (row.emailStatus as "active" | "bounced" | "unsubscribed") ??
                  "active", // Default to 'active' if not provided in CSV
                customData, // Contains registrationCode + unmapped CSV columns
                userId: ctx.session?.user?.id,
              },
            });

            // 4. Update Ticket to link attendee and mark as assigned
            // Links the ticket to the attendee and sets assignment metadata
            // This completes the Registration → Ticket → Attendee chain
            await tx.ticket.update({
              where: { id: ticket.id },
              data: {
                attendeeId: attendee.id, // Link to attendee
                isAssigned: true, // Mark as assigned
                assignedAt: new Date(), // Record assignment timestamp
              },
            });
          });
          // Transaction complete - all records committed atomically

          importResults.push({
            row: row.rowNumber,
            success: true,
            email: row.email,
          });
          successCount++;

          // Queue email task if enabled
          if (input.sendConfirmationEmails) {
            // Get ticket type details for email
            const ticketType = event.ticketTypes.find(
              (tt) => tt.id === ticketTypeId,
            );
            const ticketTypeName = ticketType?.name ?? "General Admission";
            const ticketPrice = ticketType?.price.toNumber() ?? 0;

            emailTasks.push({
              email: row.email!,
              name: row.name!,
              ticketNumber,
              ticketType: ticketTypeName,
              ticketPrice,
              customData: row.customData,
            });
          }
        } catch (error) {
          // Individual row failure - log and continue
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          console.error(
            `[Import] Failed to import row ${row.rowNumber}:`,
            error,
          );

          importResults.push({
            row: row.rowNumber,
            success: false,
            email: row.email,
            error: errorMessage,
          });
          failureCount++;

          // Add to errors array for reporting
          allErrors.push({
            row: row.rowNumber,
            field: "database",
            value: row.email ?? "",
            error: `Database error: ${errorMessage}`,
          });
        }
      }

      const result = {
        successCount,
        failureCount,
        duplicateCount,
        errors: allErrors,
        status:
          failureCount === 0 && validRows.length > 0
            ? "completed"
            : failureCount === validRows.length
              ? "failed"
              : "completed",
      };

      // Send queued emails sequentially with rate limiting (500ms delay between emails)
      // This respects Resend's 2 req/sec rate limit
      if (emailTasks.length > 0) {
        console.log(
          `[Import] Sending ${emailTasks.length} confirmation emails with rate limiting...`,
        );

        // Fire and forget - don't block the response
        (async () => {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
          const ticketUrl = `${appUrl}/events/${event.slug}/tickets`;

          for (const task of emailTasks) {
            try {
              // Generate QR code
              const qrCodeDataUrl = await generateTicketQRCode(
                task.ticketNumber,
                { width: 400 },
              );

              // Send email
              await sendEmail({
                to: task.email,
                subject: `Your ticket for ${event.name} is ready! 🎟️`,
                react: TicketAssigned({
                  attendeeName: task.name,
                  eventName: event.name,
                  eventDate: event.startDate,
                  eventEndDate: event.endDate ?? undefined,
                  eventLocationType: event.locationType as
                    | "virtual"
                    | "hybrid"
                    | "physical",
                  eventLocationAddress: event.locationAddress ?? undefined,
                  ticketType: task.ticketType,
                  ticketNumber: task.ticketNumber,
                  ticketPrice: task.ticketPrice,
                  buyerName: task.name, // For imports, buyer = attendee
                  buyerEmail: task.email,
                  ticketUrl,
                  qrCodeDataUrl,
                  customData: task.customData,
                }),
                tags: [
                  { name: "category", value: "ticket-assigned" },
                  { name: "eventId", value: event.id },
                ],
              });

              console.log(
                `[Import] Sent ticket assignment email to ${task.email}`,
              );

              // Rate limiting: Wait 500ms between emails (2 per second)
              await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (error) {
              console.error(
                `[Import] Failed to send ticket assignment email to ${task.email}:`,
                error,
              );
            }
          }

          console.log(`[Import] Finished sending all confirmation emails`);
        })().catch((error) => {
          console.error("[Import] Email sending task failed:", error);
        });
      }

      // Cache result for idempotency
      if (input.idempotencyKey) {
        importCache.set(input.idempotencyKey, {
          timestamp: Date.now(),
          result,
        });
      }

      return result;
    }),
});
