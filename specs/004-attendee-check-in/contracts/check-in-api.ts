/**
 * tRPC API Contracts: Attendee Check-In Service
 * 
 * This file defines the input/output schemas and TypeScript types for all
 * check-in related tRPC procedures. These contracts serve as the API
 * specification between the client and server.
 * 
 * Location (implementation): src/server/api/routers/check-in.ts
 * Usage (client): src/app/events/[slug]/check-in/page.tsx
 */

import { z } from "zod";

// ============================================================================
// INPUT SCHEMAS (Request Validation)
// ============================================================================

/**
 * List attendees for check-in page
 * Supports filtering, searching, and pagination
 */
export const listAttendeesInputSchema = z.object({
  eventId: z.string().cuid("Invalid event ID format"),
  
  // Filtering
  filter: z.enum(["all", "checked-in", "not-checked-in"]).default("all"),
  
  // Search by ticket number
  search: z.string().optional(),
  
  // Pagination
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(50),
});

export type ListAttendeesInput = z.infer<typeof listAttendeesInputSchema>;

/**
 * Check in a ticket (manual entry or QR code)
 * Exactly one of ticketNumber or qrCodeData must be provided
 */
export const checkInTicketInputSchema = z.object({
  eventId: z.string().cuid("Invalid event ID format"),
  
  // Ticket identifier (one of these required)
  ticketNumber: z.string().optional(),
  qrCodeData: z.string().optional(),
}).refine(
  (data) => {
    // Exactly one must be provided
    const hasTicketNumber = !!data.ticketNumber;
    const hasQrCode = !!data.qrCodeData;
    return (hasTicketNumber && !hasQrCode) || (!hasTicketNumber && hasQrCode);
  },
  {
    message: "Provide either ticketNumber or qrCodeData, not both",
    path: ["ticketNumber"],
  }
);

export type CheckInTicketInput = z.infer<typeof checkInTicketInputSchema>;

/**
 * Get check-in metrics for event dashboard
 */
export const getCheckInMetricsInputSchema = z.object({
  eventId: z.string().cuid("Invalid event ID format"),
});

export type GetCheckInMetricsInput = z.infer<typeof getCheckInMetricsInputSchema>;

/**
 * Undo check-in (optional feature for correcting mistakes)
 */
export const undoCheckInInputSchema = z.object({
  eventId: z.string().cuid("Invalid event ID format"),
  ticketId: z.string().cuid("Invalid ticket ID format"),
});

export type UndoCheckInInput = z.infer<typeof undoCheckInInputSchema>;

// ============================================================================
// OUTPUT SCHEMAS (Response Validation)
// ============================================================================

/**
 * Attendee item in check-in list
 */
export const attendeeItemSchema = z.object({
  ticketId: z.string().cuid(),
  ticketNumber: z.string(),
  
  // Check-in status
  isCheckedIn: z.boolean(),
  checkedInAt: z.date().nullable(),
  checkedInBy: z.string().nullable(), // User ID of team member
  
  // Attendee info (if ticket is assigned)
  attendeeName: z.string().nullable(),
  attendeeEmail: z.string().email().nullable(),
  
  // Buyer info (always present from Registration)
  buyerName: z.string(),
  buyerEmail: z.string().email(),
  
  // Assignment status
  isAssigned: z.boolean(),
});

export type AttendeeItem = z.infer<typeof attendeeItemSchema>;

/**
 * Pagination metadata
 */
export const paginationSchema = z.object({
  total: z.number().int().min(0),
  page: z.number().int().min(0),
  pageSize: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

export type Pagination = z.infer<typeof paginationSchema>;

/**
 * List attendees output
 */
export const listAttendeesOutputSchema = z.object({
  attendees: z.array(attendeeItemSchema),
  pagination: paginationSchema,
});

export type ListAttendeesOutput = z.infer<typeof listAttendeesOutputSchema>;

/**
 * Check-in ticket output
 */
export const checkInTicketOutputSchema = z.object({
  success: z.boolean(),
  alreadyCheckedIn: z.boolean(),
  
  ticket: z.object({
    ticketId: z.string().cuid(),
    ticketNumber: z.string(),
    isCheckedIn: z.boolean(),
    checkedInAt: z.date(),
    
    // Display info
    attendeeName: z.string().nullable(),
    attendeeEmail: z.string().email().nullable(),
    buyerName: z.string(),
    buyerEmail: z.string().email(),
  }),
});

export type CheckInTicketOutput = z.infer<typeof checkInTicketOutputSchema>;

/**
 * Recent check-in item for metrics
 */
export const recentCheckInSchema = z.object({
  ticketNumber: z.string(),
  name: z.string(), // Attendee or buyer name
  checkedInAt: z.date(),
});

export type RecentCheckIn = z.infer<typeof recentCheckInSchema>;

/**
 * Check-in metrics output
 */
export const getCheckInMetricsOutputSchema = z.object({
  totalTickets: z.number().int().min(0),
  checkedInCount: z.number().int().min(0),
  notCheckedInCount: z.number().int().min(0),
  checkInPercentage: z.number().min(0).max(100),
  
  // Recent activity (last 10 check-ins)
  recentCheckIns: z.array(recentCheckInSchema),
});

export type GetCheckInMetricsOutput = z.infer<typeof getCheckInMetricsOutputSchema>;

/**
 * Undo check-in output
 */
export const undoCheckInOutputSchema = z.object({
  success: z.boolean(),
  ticket: z.object({
    ticketId: z.string().cuid(),
    ticketNumber: z.string(),
    isCheckedIn: z.boolean(),
  }),
});

export type UndoCheckInOutput = z.infer<typeof undoCheckInOutputSchema>;

// ============================================================================
// ERROR CODES (tRPC Error Handling)
// ============================================================================

/**
 * Expected error codes for check-in operations
 * 
 * NOT_FOUND: Ticket or event doesn't exist
 * FORBIDDEN: User lacks CHECKIN module permission or not a team member
 * UNAUTHORIZED: User not authenticated
 * BAD_REQUEST: Invalid input (malformed QR code, invalid ticket number format)
 * INTERNAL_SERVER_ERROR: Database error or unexpected failure
 */
export const CHECK_IN_ERROR_CODES = {
  TICKET_NOT_FOUND: "Ticket not found for this event",
  EVENT_NOT_FOUND: "Event not found",
  NO_PERMISSION: "You don't have access to the CHECKIN module",
  NOT_TEAM_MEMBER: "You do not have access to this event",
  NOT_AUTHENTICATED: "You must be logged in",
  INVALID_QR_CODE: "Invalid QR code data",
  CHECK_IN_FAILED: "Check-in failed. Please try again.",
} as const;

// ============================================================================
// tRPC ROUTER INTERFACE (For Documentation)
// ============================================================================

/**
 * Expected tRPC router structure:
 * 
 * export const checkInRouter = createTRPCRouter({
 *   listAttendees: protectedProcedure
 *     .input(listAttendeesInputSchema)
 *     .output(listAttendeesOutputSchema)
 *     .query(async ({ ctx, input }) => { ... }),
 * 
 *   checkInTicket: protectedProcedure
 *     .input(checkInTicketInputSchema)
 *     .output(checkInTicketOutputSchema)
 *     .mutation(async ({ ctx, input }) => { ... }),
 * 
 *   getMetrics: protectedProcedure
 *     .input(getCheckInMetricsInputSchema)
 *     .output(getCheckInMetricsOutputSchema)
 *     .query(async ({ ctx, input }) => { ... }),
 * 
 *   undoCheckIn: protectedProcedure
 *     .input(undoCheckInInputSchema)
 *     .output(undoCheckInOutputSchema)
 *     .mutation(async ({ ctx, input }) => { ... }),
 * });
 * 
 * All procedures must:
 * 1. Verify authentication (handled by protectedProcedure)
 * 2. Check CHECKIN module permission via checkModuleAccess()
 * 3. Validate input against schema (automatic via .input())
 * 4. Return data matching output schema
 * 5. Throw TRPCError with appropriate code for failures
 */

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * CLIENT-SIDE USAGE (React Component):
 * 
 * import { api } from "@/trpc/react";
 * 
 * function CheckInPage({ eventId }: { eventId: string }) {
 *   // Query for attendee list
 *   const { data, isLoading } = api.checkIn.listAttendees.useQuery({
 *     eventId,
 *     filter: "not-checked-in",
 *     page: 0,
 *     pageSize: 50,
 *   });
 * 
 *   // Mutation for check-in
 *   const utils = api.useUtils();
 *   const checkInMutation = api.checkIn.checkInTicket.useMutation({
 *     onSuccess: () => {
 *       utils.checkIn.listAttendees.invalidate({ eventId });
 *     },
 *   });
 * 
 *   const handleCheckIn = (ticketNumber: string) => {
 *     checkInMutation.mutate({ eventId, ticketNumber });
 *   };
 * 
 *   // ...render UI
 * }
 */

/**
 * SERVER-SIDE USAGE (tRPC Procedure):
 * 
 * import { checkModuleAccess } from "@/server/api/permissions";
 * import { checkInTicketInputSchema, checkInTicketOutputSchema } from "./contracts/check-in-api";
 * 
 * export const checkInRouter = createTRPCRouter({
 *   checkInTicket: protectedProcedure
 *     .input(checkInTicketInputSchema)
 *     .output(checkInTicketOutputSchema)
 *     .mutation(async ({ ctx, input }) => {
 *       // 1. Check permission
 *       await checkModuleAccess({
 *         db: ctx.db,
 *         eventId: input.eventId,
 *         userId: ctx.session.user.id,
 *         requiredModule: "CHECKIN",
 *       });
 * 
 *       // 2. Find ticket
 *       const ticket = await ctx.db.ticket.findFirst({
 *         where: {
 *           eventId: input.eventId,
 *           OR: [
 *             { ticketNumber: input.ticketNumber },
 *             { qrCodeData: input.qrCodeData },
 *           ],
 *         },
 *       });
 * 
 *       if (!ticket) {
 *         throw new TRPCError({
 *           code: "NOT_FOUND",
 *           message: CHECK_IN_ERROR_CODES.TICKET_NOT_FOUND,
 *         });
 *       }
 * 
 *       // 3. Check if already checked in
 *       if (ticket.isCheckedIn) {
 *         return {
 *           success: true,
 *           alreadyCheckedIn: true,
 *           ticket: { ...ticket },
 *         };
 *       }
 * 
 *       // 4. Perform check-in
 *       const updated = await ctx.db.ticket.update({
 *         where: { id: ticket.id },
 *         data: {
 *           isCheckedIn: true,
 *           checkedInAt: new Date(),
 *           checkedInBy: ctx.session.user.id,
 *         },
 *       });
 * 
 *       return {
 *         success: true,
 *         alreadyCheckedIn: false,
 *         ticket: { ...updated },
 *       };
 *     }),
 * });
 */
