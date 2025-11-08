/**
 * Shared Zod validation schemas for event management system
 * Used across tRPC procedures and form validations
 */

import { z } from "zod";

// ============================================================================
// EVENT VALIDATION
// ============================================================================

export const createEventSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters").max(200),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters")
      .max(5000),
    slug: z
      .string()
      .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only")
      .min(3)
      .max(100),
    locationType: z.enum(["in-person", "virtual", "hybrid"]),
    locationAddress: z.string().optional(),
    locationUrl: z
      .string()
      .optional()
      .transform((val) => (!val || val.trim() === "" ? undefined : val))
      .pipe(z.string().url().optional()),
    timezone: z.string(), // IANA timezone (validated separately)
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    status: z.enum(["draft", "published", "archived"]).default("draft"),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  })
  .refine(
    (data) => {
      if (data.locationType === "in-person" || data.locationType === "hybrid") {
        return !!data.locationAddress;
      }
      return true;
    },
    {
      message: "Address required for in-person or hybrid events",
      path: ["locationAddress"],
    }
  )
  .refine(
    (data) => {
      if (data.locationType === "virtual" || data.locationType === "hybrid") {
        return !!data.locationUrl;
      }
      return true;
    },
    {
      message: "URL required for virtual or hybrid events",
      path: ["locationUrl"],
    }
  );

export const updateEventSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(100).optional(),
  locationType: z.enum(["in-person", "virtual", "hybrid"]).optional(),
  locationAddress: z.string().optional(),
  locationUrl: z
    .string()
    .optional()
    .transform((val) => (!val || val.trim() === "" ? undefined : val))
    .pipe(z.string().url().optional()),
  timezone: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export const eventIdSchema = z.object({
  id: z.string().cuid(),
});

export const eventSlugSchema = z.object({
  slug: z.string(),
});

// ============================================================================
// TICKET TYPE VALIDATION
// ============================================================================

export const createTicketTypeSchema = z.object({
  eventId: z.string().cuid(),
  name: z.string().min(3).max(100),
  description: z.string().max(2000),
  price: z.number().nonnegative().default(0), // MVP: must be 0
  currency: z.string().length(3).default("USD"),
  quantity: z.number().int().positive(),
  saleStart: z.coerce.date().optional(),
  saleEnd: z.coerce.date().optional(),
});

export const updateTicketTypeSchema = createTicketTypeSchema
  .partial()
  .extend({
    id: z.string().cuid(),
  });

// ============================================================================
// REGISTRATION VALIDATION
// ============================================================================

export const createRegistrationSchema = z.object({
  ticketTypeId: z.string().cuid(),
  email: z.string().email(),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  customData: z.record(z.any()).optional(),
});

export const updateRegistrationEmailStatusSchema = z.object({
  id: z.string().cuid(),
  emailStatus: z.enum(["active", "bounced", "unsubscribed"]),
});

export const exportRegistrationsSchema = z.object({
  eventId: z.string().cuid(),
  format: z.enum(["csv", "json"]).default("csv"),
});

// ============================================================================
// SCHEDULE ENTRY VALIDATION
// ============================================================================

export const createScheduleEntrySchema = z
  .object({
    eventId: z.string().cuid(),
    title: z.string().min(3).max(200),
    description: z.string().max(2000),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:mm)"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:mm)"),
    location: z.string().optional(),
    track: z.string().optional(),
    trackColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
      .optional(),
    sessionType: z
      .enum(["keynote", "talk", "workshop", "break", "networking"])
      .optional(),
    speakerIds: z.array(z.string().cuid()).optional(),
  })
  .refine(
    (data) => {
      const [startHour, startMin] = data.startTime.split(":").map(Number);
      const [endHour, endMin] = data.endTime.split(":").map(Number);
      const startMinutes = (startHour ?? 0) * 60 + (startMin ?? 0);
      const endMinutes = (endHour ?? 0) * 60 + (endMin ?? 0);
      return endMinutes > startMinutes;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

export const updateScheduleEntrySchema = z.object({
  id: z.string().cuid(),
  updatedAt: z.coerce.date(), // For optimistic concurrency control
  eventId: z.string().cuid().optional(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  location: z.string().optional(),
  track: z.string().optional(),
  trackColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  sessionType: z.enum(["keynote", "talk", "workshop", "break", "networking"]).optional(),
  speakerIds: z.array(z.string().cuid()).optional(),
});

// ============================================================================
// SPEAKER VALIDATION
// ============================================================================

export const createSpeakerSchema = z.object({
  eventId: z.string().cuid(),
  name: z.string().min(2).max(100),
  bio: z.string().min(10).max(2000),
  email: z.string().email(),
  photo: z.string().url().optional(),
  twitter: z.string().optional(),
  github: z.string().optional(),
  linkedin: z.string().optional(),
  website: z.string().url().optional(),
});

export const updateSpeakerSchema = createSpeakerSchema.partial().extend({
  id: z.string().cuid(),
});

export const assignSpeakerToSessionSchema = z.object({
  scheduleEntryId: z.string().cuid(),
  speakerId: z.string().cuid(),
  role: z.enum(["speaker", "moderator", "panelist"]).default("speaker"),
});

// ============================================================================
// CALL FOR PAPERS VALIDATION
// ============================================================================

export const openCfpSchema = z.object({
  eventId: z.string().cuid(),
  guidelines: z.string().min(50).max(5000),
  deadline: z.coerce.date(),
  requiredFields: z.array(z.string()).optional(),
});

export const updateCfpSchema = openCfpSchema.partial().extend({
  id: z.string().cuid(),
});

export const submitCfpProposalSchema = z.object({
  eventId: z.string().cuid(),
  title: z.string().min(10).max(200),
  description: z.string().min(50).max(5000),
  sessionFormat: z.enum(["talk", "workshop", "panel", "lightning"]),
  duration: z.number().int().positive().max(240), // Max 4 hours
  speakerName: z.string().min(2).max(100),
  speakerEmail: z.string().email(),
  speakerBio: z.string().min(50).max(2000),
  speakerPhoto: z.string().url().optional(),
  speakerTwitter: z.string().optional(),
  speakerGithub: z.string().optional(),
  speakerLinkedin: z.string().optional(),
  speakerWebsite: z.string().url().optional(),
});

export const reviewCfpSubmissionSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(["accepted", "rejected"]),
  reviewNotes: z.string().max(2000).optional(),
  reviewScore: z.number().int().min(1).max(5).optional(),
});

// ============================================================================
// EMAIL CAMPAIGN VALIDATION
// ============================================================================

export const createCampaignSchema = z.object({
  eventId: z.string().cuid(),
  subject: z.string().min(5).max(200),
  body: z.string().min(10).max(50000), // HTML content
  recipientType: z.enum(["all_attendees", "ticket_type", "speakers", "custom"]),
  recipientFilter: z.record(z.any()).optional(),
  scheduledFor: z.coerce.date().optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial().extend({
  id: z.string().cuid(),
});

export const sendCampaignSchema = z.object({
  id: z.string().cuid(),
});

// ============================================================================
// USER PROFILE VALIDATION
// ============================================================================

export const updateUserProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ============================================================================
// PAGINATION & FILTERING
// ============================================================================

export const paginationSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  cursor: z.string().cuid().optional(),
});

export const listEventsSchema = paginationSchema.extend({
  status: z.enum(["draft", "published", "archived"]).optional(),
  organizerId: z.string().cuid().optional(),
});

export const listRegistrationsSchema = paginationSchema.extend({
  eventId: z.string().cuid(),
  search: z.string().optional(), // Search by name or email
  ticketTypeId: z.string().cuid().optional(),
});

export const listScheduleEntriesSchema = z.object({
  eventId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  track: z.string().optional(),
});

export const listCfpSubmissionsSchema = paginationSchema.extend({
  eventId: z.string().cuid(),
  status: z.enum(["pending", "accepted", "rejected"]).optional(),
});

export const listCampaignsSchema = paginationSchema.extend({
  eventId: z.string().cuid(),
  status: z.enum(["draft", "scheduled", "sending", "sent", "failed"]).optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type CreateTicketTypeInput = z.infer<typeof createTicketTypeSchema>;
export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;
export type CreateScheduleEntryInput = z.infer<typeof createScheduleEntrySchema>;
export type CreateSpeakerInput = z.infer<typeof createSpeakerSchema>;
export type SubmitCfpProposalInput = z.infer<typeof submitCfpProposalSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
