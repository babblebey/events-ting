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
 * Input schema for CSV validation
 */
const validateImportSchema = z.object({
  eventId: z.string().cuid(),
  fileContent: z.string(),
  fieldMapping: z.record(z.string()), // CSV column -> system field
  duplicateStrategy: z.enum(["skip", "create"]).default("skip"),
});

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
        error: "Invalid date format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)",
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
      // Verify user is event organizer
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        select: {
          organizerId: true,
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

      if (event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You do not have permission to validate imports for this event",
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
        const ticketType = event.ticketTypes.find((tt) => tt.id === ticketTypeId);
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
});
