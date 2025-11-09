/**
 * Registration Router
 * Handles attendee registration, management, and exports
 */

import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import {
  createRegistrationSchema,
  eventIdSchema,
  listRegistrationsSchema,
  exportRegistrationsSchema,
} from "@/lib/validators";
import { z } from "zod";
import { sendEmail } from "@/server/services/email";
import { RegistrationConfirmation } from "../../../../emails/registration-confirmation";
import { randomBytes } from "crypto";

/**
 * Generate unique registration code
 */
function generateRegistrationCode(): string {
  return randomBytes(8).toString("hex").toUpperCase();
}

/**
 * Generate CSV from registrations
 */
function generateCSV(
  registrations: Array<{
    name: string;
    email: string;
    ticketType: { name: string };
    registeredAt: Date;
    paymentStatus: string;
  }>
): string {
  const headers = [
    "Name",
    "Email",
    "Ticket Type",
    "Registration Date",
    "Payment Status",
  ];

  const rows = registrations.map((reg) => [
    reg.name,
    reg.email,
    reg.ticketType.name,
    reg.registeredAt.toISOString(),
    reg.paymentStatus,
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma or quote
          const cellStr = String(cell);
          if (cellStr.includes(",") || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(",")
    ),
  ].join("\n");

  return csv;
}

export const registrationRouter = createTRPCRouter({
  /**
   * Create registration (public - for attendee self-registration)
   */
  create: publicProcedure
    .input(createRegistrationSchema)
    .mutation(async ({ ctx, input }) => {
      // Get ticket type with event details and lock for update
      const result = await ctx.db.$transaction(async (tx) => {
        // Lock the ticket type row to prevent race conditions using SELECT FOR UPDATE
        // This ensures atomicity when checking availability and prevents overselling
        const ticketTypeRows = await tx.$queryRaw<
          Array<{
            id: string;
            name: string;
            quantity: number;
            saleStart: Date | null;
            saleEnd: Date | null;
            soldCount: bigint;
          }>
        >`
          SELECT 
            tt.id,
            tt.name,
            tt.quantity,
            tt."saleStart",
            tt."saleEnd",
            COUNT(r.id)::bigint as "soldCount"
          FROM "TicketType" tt
          LEFT JOIN "Registration" r ON r."ticketTypeId" = tt.id
          WHERE tt.id = ${input.ticketTypeId}
          GROUP BY tt.id, tt.name, tt.quantity, tt."saleStart", tt."saleEnd"
          FOR UPDATE OF tt
        `;

        const ticketType = ticketTypeRows[0];

        if (!ticketType) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Ticket type not found",
          });
        }

        // Convert BigInt to number for availability check
        const soldCount = Number(ticketType.soldCount);
        const available = ticketType.quantity - soldCount;

        if (available <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This ticket type is sold out. Please try another ticket type.",
          });
        }

        // Check sale period
        const now = new Date();
        if (ticketType.saleStart && ticketType.saleStart > now) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ticket sales have not started yet",
          });
        }

        if (ticketType.saleEnd && ticketType.saleEnd < now) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ticket sales have ended",
          });
        }

        // Get event details for confirmation email
        const event = await tx.event.findUnique({
          where: { id: (await tx.ticketType.findUnique({
            where: { id: input.ticketTypeId },
            select: { eventId: true },
          }))?.eventId },
          select: {
            id: true,
            name: true,
            slug: true,
            startDate: true,
          },
        });

        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }

        // Create registration (atomic with lock)
        const registrationCode = generateRegistrationCode();
        const userId = ctx.session?.user?.id;

        const registration = await tx.registration.create({
          data: {
            eventId: event.id,
            ticketTypeId: input.ticketTypeId,
            email: input.email,
            name: input.name,
            userId,
            paymentStatus: "free",
            emailStatus: "active",
            // Store registration code in customData
            customData: {
              ...(input.customData as Record<string, unknown> | undefined),
              registrationCode,
            },
          },
        });

        return {
          registrationId: registration.id,
          registrationCode,
          eventName: event.name,
          eventSlug: event.slug,
          eventStartDate: event.startDate,
          eventId: event.id,
          ticketTypeName: ticketType.name,
          attendeeEmail: input.email,
          attendeeName: input.name,
        };
      });

      // Send confirmation email asynchronously (don't block response)
      sendEmail({
        to: result.attendeeEmail,
        subject: `Registration Confirmed: ${result.eventName}`,
        react: RegistrationConfirmation({
          attendeeName: result.attendeeName,
          eventName: result.eventName,
          eventDate: result.eventStartDate,
          ticketType: result.ticketTypeName,
          registrationCode: result.registrationCode,
          eventUrl: `${process.env.NEXT_PUBLIC_APP_URL}/events/${result.eventSlug}`,
        }),
        tags: [
          { name: "type", value: "registration-confirmation" },
          { name: "eventId", value: result.eventId },
        ],
      }).catch((error) => {
        console.error("[Registration] Failed to send confirmation email", error);
        // Don't throw - registration is already created
      });

      return {
        id: result.registrationId,
        event: {
          name: result.eventName,
          slug: result.eventSlug,
          startDate: result.eventStartDate,
        },
        ticketType: {
          name: result.ticketTypeName,
        },
        registrationCode: result.registrationCode,
        message: "Registration successful! Confirmation email sent.",
      };
    }),

  /**
   * List registrations for an event (organizer only)
   */
  list: protectedProcedure
    .input(listRegistrationsSchema)
    .query(async ({ ctx, input }) => {
      const { eventId, limit, cursor, search, ticketTypeId } = input;

      // Verify user is event organizer
      const event = await ctx.db.event.findUnique({
        where: { id: eventId },
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
          message: "You do not have permission to view registrations for this event",
        });
      }

      // Build where clause
      const where = {
        eventId,
        ...(ticketTypeId && { ticketTypeId }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };

      // Get registrations
      const registrations = await ctx.db.registration.findMany({
        where,
        take: limit + 1,
        ...(cursor && {
          cursor: { id: cursor },
          skip: 1,
        }),
        orderBy: { registeredAt: "desc" },
        include: {
          ticketType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Get total count
      const total = await ctx.db.registration.count({ where });

      let nextCursor: string | undefined = undefined;
      if (registrations.length > limit) {
        const nextItem = registrations.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: registrations.map((reg) => ({
          id: reg.id,
          email: reg.email,
          name: reg.name,
          ticketType: reg.ticketType,
          paymentStatus: reg.paymentStatus,
          emailStatus: reg.emailStatus,
          registeredAt: reg.registeredAt,
        })),
        nextCursor,
        total,
      };
    }),

  /**
   * Get single registration by ID (organizer only)
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const registration = await ctx.db.registration.findUnique({
        where: { id: input.id },
        include: {
          event: {
            select: { organizerId: true },
          },
          ticketType: {
            select: { name: true, price: true },
          },
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      // Verify user is event organizer
      if (registration.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this registration",
        });
      }

      return {
        id: registration.id,
        email: registration.email,
        name: registration.name,
        ticketType: registration.ticketType,
        paymentStatus: registration.paymentStatus,
        paymentIntentId: registration.paymentIntentId,
        emailStatus: registration.emailStatus,
        customData: registration.customData as Record<string, unknown> | null,
        registrationCode: (registration.customData as { registrationCode?: string })?.registrationCode ?? "",
        registeredAt: registration.registeredAt,
      };
    }),

  /**
   * Manually add attendee (organizer only)
   */
  addManually: protectedProcedure
    .input(
      z.object({
        eventId: z.string().cuid(),
        ticketTypeId: z.string().cuid(),
        email: z.string().email(),
        name: z.string().min(2).max(100),
        sendConfirmation: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is event organizer
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        select: {
          organizerId: true,
          name: true,
          slug: true,
          startDate: true,
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
          message: "You do not have permission to add attendees to this event",
        });
      }

      // Verify ticket type exists
      const ticketType = await ctx.db.ticketType.findUnique({
        where: { id: input.ticketTypeId },
        select: { name: true },
      });

      if (!ticketType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ticket type not found",
        });
      }

      // Create registration (bypass availability check - organizer override)
      const registrationCode = generateRegistrationCode();

      const registration = await ctx.db.registration.create({
        data: {
          eventId: input.eventId,
          ticketTypeId: input.ticketTypeId,
          email: input.email,
          name: input.name,
          paymentStatus: "free",
          emailStatus: "active",
          customData: {
            registrationCode,
            addedManually: true,
          },
        },
        include: {
          ticketType: {
            select: { name: true },
          },
        },
      });

      // Send confirmation email if requested
      if (input.sendConfirmation) {
        sendEmail({
          to: input.email,
          subject: `Registration Confirmed: ${event.name}`,
          react: RegistrationConfirmation({
            attendeeName: input.name,
            eventName: event.name,
            eventDate: event.startDate,
            ticketType: ticketType.name,
            registrationCode,
            eventUrl: `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}`,
          }),
          tags: [
            { name: "type", value: "registration-confirmation" },
            { name: "eventId", value: input.eventId },
          ],
        }).catch((error) => {
          console.error("[Registration] Failed to send confirmation email", error);
        });
      }

      return registration;
    }),

  /**
   * Cancel registration (organizer only)
   */
  cancel: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        reason: z.string().optional(),
        sendNotification: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.registration.findUnique({
        where: { id: input.id },
        include: {
          event: {
            select: {
              organizerId: true,
              name: true,
            },
          },
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      // Verify user is event organizer
      if (registration.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to cancel this registration",
        });
      }

      // Delete registration (hard delete - frees up ticket)
      await ctx.db.registration.delete({
        where: { id: input.id },
      });

      // Send cancellation email if requested
      if (input.sendNotification) {
        // TODO: Create cancellation email template
        sendEmail({
          to: registration.email,
          subject: `Registration Cancelled: ${registration.event.name}`,
          html: `
            <h1>Registration Cancelled</h1>
            <p>Dear ${registration.name},</p>
            <p>Your registration for ${registration.event.name} has been cancelled.</p>
            ${input.reason ? `<p>Reason: ${input.reason}</p>` : ""}
            <p>If you have any questions, please contact the event organizer.</p>
          `,
          tags: [
            { name: "type", value: "registration-cancelled" },
            { name: "eventId", value: registration.eventId },
          ],
        }).catch((error) => {
          console.error("[Registration] Failed to send cancellation email", error);
        });
      }

      return {
        success: true,
        message: "Registration cancelled successfully",
      };
    }),

  /**
   * Export registrations as CSV (organizer only)
   */
  export: protectedProcedure
    .input(exportRegistrationsSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify user is event organizer
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        select: {
          organizerId: true,
          slug: true,
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
          message: "You do not have permission to export registrations for this event",
        });
      }

      // Get all registrations for the event
      const registrations = await ctx.db.registration.findMany({
        where: { eventId: input.eventId },
        include: {
          ticketType: {
            select: { name: true },
          },
        },
        orderBy: { registeredAt: "desc" },
      });

      // Generate CSV
      const csv = generateCSV(registrations);

      // Convert to data URI
      const dataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;

      return {
        url: dataUri,
        filename: `${event.slug}-attendees-${new Date().toISOString().split("T")[0]}.csv`,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      };
    }),

  /**
   * Resend confirmation email (organizer only)
   */
  resendConfirmation: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.registration.findUnique({
        where: { id: input.id },
        include: {
          event: {
            select: {
              organizerId: true,
              name: true,
              slug: true,
              startDate: true,
            },
          },
          ticketType: {
            select: { name: true },
          },
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      // Verify user is event organizer
      if (registration.event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to resend confirmation for this registration",
        });
      }

      const registrationCode =
        (registration.customData as { registrationCode?: string })?.registrationCode ??
        "N/A";

      // Send confirmation email
      await sendEmail({
        to: registration.email,
        subject: `Registration Confirmed: ${registration.event.name}`,
        react: RegistrationConfirmation({
          attendeeName: registration.name,
          eventName: registration.event.name,
          eventDate: registration.event.startDate,
          ticketType: registration.ticketType.name,
          registrationCode,
          eventUrl: `${process.env.NEXT_PUBLIC_APP_URL}/events/${registration.event.slug}`,
        }),
        tags: [
          { name: "type", value: "registration-confirmation" },
          { name: "eventId", value: registration.eventId },
        ],
      });

      return {
        success: true,
        message: `Confirmation email resent to ${registration.email}`,
      };
    }),

  /**
   * Update email status (called by webhook)
   */
  updateEmailStatus: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        status: z.enum(["active", "bounced", "unsubscribed"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update all registrations with matching email
      const result = await ctx.db.registration.updateMany({
        where: { email: input.email },
        data: { emailStatus: input.status },
      });

      return {
        updated: result.count,
      };
    }),
});
