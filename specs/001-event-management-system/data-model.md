# Data Model: Event Management System

**Feature**: All-in-One Event Management System  
**Phase**: 1 - Design & Contracts  
**Date**: November 8, 2025

## Overview

This document defines the complete Prisma schema for the event management system. The schema supports all functional requirements (FR-001 through FR-060) and accommodates future extensibility (paid tickets, payment processors).

**Design Principles**:
- UTC timestamps for all dates (timezone-agnostic storage)
- Soft deletes for events (archival status, not hard deletion)
- Future-ready payment fields (MVP uses free tickets only)
- Explicit foreign key relations with cascade rules
- Prisma conventions: PascalCase models, camelCase fields, `createdAt`/`updatedAt` timestamps

---

## Entity Relationship Diagram

```
User (organizers, attendees)
  │
  ├── Event (1:many, organizer creates events)
  │     │
  │     ├── TicketType (1:many)
  │     │     │
  │     │     └── Registration (1:many) ─── User (optional, if authenticated)
  │     │
  │     ├── ScheduleEntry (1:many)
  │     │     │
  │     │     └── SpeakerSession (many:many bridge) ─── Speaker
  │     │
  │     ├── CallForPapers (1:1)
  │     │     │
  │     │     └── CfpSubmission (1:many) ─── Speaker (auto-created on acceptance)
  │     │
  │     ├── Speaker (1:many)
  │     │
  │     └── EmailCampaign (1:many)
  │
  └── Account, Session (NextAuth.js models)
```

---

## Complete Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// AUTHENTICATION (NextAuth.js models - already exist, keeping for reference)
// ============================================================================

model Account {
  id                       String  @id @default(cuid())
  userId                   String
  type                     String
  provider                 String
  providerAccountId        String
  refresh_token            String?
  access_token             String?
  expires_at               Int?
  token_type               String?
  scope                    String?
  id_token                 String?
  session_state            String?
  refresh_token_expires_in Int?
  user                     User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ============================================================================
// USER & EVENT CORE
// ============================================================================

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  password      String? // For email/password auth (bcrypt hashed)
  
  // Relations
  accounts      Account[]
  sessions      Session[]
  events        Event[] // Events created by this user (organizer)
  registrations Registration[] // Attendee registrations (optional authenticated registration)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Event {
  id          String   @id @default(cuid())
  slug        String   @unique // URL-friendly identifier (e.g., "nextjs-conf-2025")
  name        String
  description String   @db.Text
  
  // Location & Timing
  locationType String // 'in-person' | 'virtual' | 'hybrid'
  locationAddress String? // Physical address if in-person/hybrid
  locationUrl String? // Virtual URL if virtual/hybrid
  timezone    String   @default("UTC") // IANA timezone (e.g., "America/New_York")
  startDate   DateTime // Stored in UTC
  endDate     DateTime // Stored in UTC
  
  // Status & Visibility
  status      String   @default("draft") // 'draft' | 'published' | 'archived'
  isArchived  Boolean  @default(false) // Soft delete flag (FR-004, FR-058)
  
  // Organizer
  organizerId String
  organizer   User     @relation(fields: [organizerId], references: [id], onDelete: Restrict)
  
  // Relations
  ticketTypes      TicketType[]
  registrations    Registration[]
  scheduleEntries  ScheduleEntry[]
  callForPapers    CallForPapers?
  speakers         Speaker[]
  emailCampaigns   EmailCampaign[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([organizerId])
  @@index([slug])
  @@index([status, isArchived]) // Optimize listing queries
}

// ============================================================================
// TICKETING & REGISTRATION
// ============================================================================

model TicketType {
  id          String   @id @default(cuid())
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  name        String
  description String   @db.Text
  
  // Pricing (MVP: must be 0.00 for free tickets)
  price       Decimal  @default(0.00) @db.Decimal(10, 2)
  currency    String   @default("USD")
  
  // Availability
  quantity    Int // Total available
  saleStart   DateTime? // Nullable: no restriction if null
  saleEnd     DateTime? // Nullable: no restriction if null
  
  // Relations
  registrations Registration[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([eventId])
}

model Registration {
  id          String   @id @default(cuid())
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  ticketTypeId String
  ticketType   TicketType @relation(fields: [ticketTypeId], references: [id], onDelete: Restrict)
  
  // Attendee Info
  email       String
  name        String
  userId      String? // Optional: link to authenticated user
  user        User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  // Payment (future-ready fields)
  paymentStatus     String  @default("free") // 'free' | 'pending' | 'paid' | 'failed' | 'refunded'
  paymentIntentId   String? // Stripe/Paystack intent ID
  paymentProcessor  String? // 'stripe' | 'paystack' | null
  
  // Email Status (FR-049: bounce handling)
  emailStatus String  @default("active") // 'active' | 'bounced' | 'unsubscribed'
  
  // Custom Fields (future: JSON field for organizer-defined custom questions)
  customData  Json?
  
  registeredAt DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@index([eventId])
  @@index([ticketTypeId])
  @@index([email])
  @@index([userId])
}

// ============================================================================
// SCHEDULE MANAGEMENT
// ============================================================================

model ScheduleEntry {
  id          String   @id @default(cuid())
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  title       String
  description String   @db.Text
  
  // Timing (stored in UTC, displayed in event's timezone)
  startTime   DateTime
  endTime     DateTime
  
  // Location (room, stage, track)
  location    String? // Physical location or room name
  track       String? // Track name for multi-track conferences (FR-025)
  trackColor  String? // Hex color for track visual indicator
  
  // Session Type
  sessionType String? // 'keynote' | 'talk' | 'workshop' | 'break' | 'networking'
  
  // Relations
  speakerSessions SpeakerSession[] // Many-to-many with Speaker via bridge
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt // For optimistic concurrency control
  
  @@index([eventId])
  @@index([startTime]) // Optimize chronological sorting
}

// Bridge table for many-to-many relationship between ScheduleEntry and Speaker
model SpeakerSession {
  id              String        @id @default(cuid())
  scheduleEntryId String
  scheduleEntry   ScheduleEntry @relation(fields: [scheduleEntryId], references: [id], onDelete: Cascade)
  
  speakerId       String
  speaker         Speaker       @relation(fields: [speakerId], references: [id], onDelete: Cascade)
  
  role            String?       @default("speaker") // 'speaker' | 'moderator' | 'panelist'
  
  createdAt       DateTime      @default(now())
  
  @@unique([scheduleEntryId, speakerId]) // Prevent duplicate assignments
  @@index([scheduleEntryId])
  @@index([speakerId])
}

// ============================================================================
// CALL FOR PAPERS (CFP)
// ============================================================================

model CallForPapers {
  id          String   @id @default(cuid())
  eventId     String   @unique // 1:1 relationship with Event
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  guidelines  String   @db.Text
  deadline    DateTime
  status      String   @default("open") // 'open' | 'closed'
  
  // Required fields for submissions (JSON array of field configs)
  requiredFields Json? // Example: ["bio", "sessionFormat", "duration"]
  
  // Relations
  submissions CfpSubmission[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([status, deadline]) // Optimize cron query for auto-closing
}

model CfpSubmission {
  id          String   @id @default(cuid())
  eventId     String
  cfpId       String
  cfp         CallForPapers @relation(fields: [cfpId], references: [id], onDelete: Cascade)
  
  // Proposal Details
  title       String
  description String   @db.Text
  sessionFormat String // 'talk' | 'workshop' | 'panel' | 'lightning'
  duration    Int // Minutes
  
  // Speaker Info (submitted with proposal)
  speakerName  String
  speakerEmail String
  speakerBio   String   @db.Text
  speakerPhoto String? // URL to uploaded photo
  
  // Social Links
  speakerTwitter  String?
  speakerGithub   String?
  speakerLinkedin String?
  speakerWebsite  String?
  
  // Review
  status      String   @default("pending") // 'pending' | 'accepted' | 'rejected'
  reviewNotes String?  @db.Text // Organizer notes (FR-032)
  reviewScore Int? // Optional numeric score (1-5)
  
  // Relations
  speakerId   String? // Linked after acceptance (FR-034)
  speaker     Speaker? @relation(fields: [speakerId], references: [id], onDelete: SetNull)
  
  submittedAt DateTime @default(now())
  reviewedAt  DateTime?
  updatedAt   DateTime @updatedAt
  
  @@index([cfpId])
  @@index([status])
  @@index([speakerEmail])
}

// ============================================================================
// SPEAKERS
// ============================================================================

model Speaker {
  id          String   @id @default(cuid())
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  name        String
  bio         String   @db.Text
  email       String
  photo       String? // URL to uploaded photo
  
  // Social Links
  twitter     String?
  github      String?
  linkedin    String?
  website     String?
  
  // Relations
  speakerSessions SpeakerSession[] // Sessions assigned to this speaker
  cfpSubmissions  CfpSubmission[] // Original CFP submission (if created from CFP)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([eventId])
  @@index([email])
}

// ============================================================================
// COMMUNICATIONS (Email Campaigns)
// ============================================================================

model EmailCampaign {
  id          String   @id @default(cuid())
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  subject     String
  body        String   @db.Text // HTML content (rendered from React Email)
  
  // Recipient Selection
  recipientType String // 'all_attendees' | 'ticket_type' | 'speakers' | 'custom'
  recipientFilter Json? // Filter criteria (e.g., { ticketTypeId: "xyz" })
  
  // Sending
  status      String   @default("draft") // 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
  scheduledFor DateTime? // Nullable: send immediately if null (FR-047)
  sentAt      DateTime?
  
  // Delivery Stats
  totalRecipients Int?
  delivered       Int      @default(0)
  bounces         Int      @default(0)
  opens           Int      @default(0) // If tracking enabled
  clicks          Int      @default(0) // If tracking enabled
  
  // Resend Integration
  resendBatchId   String? // Resend batch send ID for tracking
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([eventId])
  @@index([status, scheduledFor]) // Optimize scheduled campaign queries
}

// ============================================================================
// INDEXES & CONSTRAINTS SUMMARY
// ============================================================================

/*
Performance Optimizations:
- Event: Indexed by organizerId, slug, status+isArchived (listing queries)
- Registration: Indexed by eventId, ticketTypeId, email, userId (attendee lookup, sold count)
- ScheduleEntry: Indexed by eventId, startTime (chronological display)
- SpeakerSession: Indexed by scheduleEntryId, speakerId (junction table lookups)
- CfpSubmission: Indexed by cfpId, status, speakerEmail (review dashboard)
- Speaker: Indexed by eventId, email (speaker directory)
- EmailCampaign: Indexed by eventId, status+scheduledFor (campaign management)

Cascade Rules:
- Event deleted → cascade delete all related entities (tickets, schedules, speakers, etc.)
- TicketType deleted → restrict if registrations exist (data integrity)
- User deleted → cascade delete sessions/accounts, set null on registrations (preserve registration data)
*/
```

---

## Validation Rules (Zod Schemas)

Prisma schema defines database structure; Zod schemas enforce business rules in tRPC procedures.

**Example: Event Creation**
```typescript
// src/lib/validators.ts
import { z } from 'zod';

export const createEventSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(100), // URL-safe
  locationType: z.enum(['in-person', 'virtual', 'hybrid']),
  locationAddress: z.string().optional(),
  locationUrl: z.string().url().optional(),
  timezone: z.string(), // Validated against IANA timezone database
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
}).refine(data => {
  if (data.locationType === 'in-person' || data.locationType === 'hybrid') {
    return !!data.locationAddress;
  }
  return true;
}, {
  message: 'Address required for in-person or hybrid events',
  path: ['locationAddress'],
}).refine(data => {
  if (data.locationType === 'virtual' || data.locationType === 'hybrid') {
    return !!data.locationUrl;
  }
  return true;
}, {
  message: 'URL required for virtual or hybrid events',
  path: ['locationUrl'],
});
```

**Example: Registration**
```typescript
export const createRegistrationSchema = z.object({
  ticketTypeId: z.string().cuid(),
  email: z.string().email(),
  name: z.string().min(2).max(100),
  customData: z.record(z.any()).optional(), // Custom fields defined by organizer
});
```

**Example: Schedule Entry**
```typescript
export const createScheduleEntrySchema = z.object({
  eventId: z.string().cuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(2000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date
  startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:mm format
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  location: z.string().optional(),
  track: z.string().optional(),
  trackColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), // Hex color
  sessionType: z.enum(['keynote', 'talk', 'workshop', 'break', 'networking']).optional(),
  speakerIds: z.array(z.string().cuid()).optional(), // Assign speakers
}).refine(data => {
  const start = parseTime(data.startTime);
  const end = parseTime(data.endTime);
  return end > start;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
});
```

---

## Migration Strategy

### Initial Migration (from existing schema)

Existing models to preserve:
- `User`, `Account`, `Session`, `VerificationToken` (NextAuth.js)
- `Post` (can be removed if not used, or kept for blog feature)

New models to add:
- `Event`, `TicketType`, `Registration`, `ScheduleEntry`, `SpeakerSession`, `CallForPapers`, `CfpSubmission`, `Speaker`, `EmailCampaign`

**Migration Steps**:
1. Run `prisma migrate dev --name add_event_management_models` to generate migration
2. Apply migration to development database
3. Generate Prisma client: `pnpm run db:generate`
4. Seed database with sample data for testing (optional)

### Sample Seed Data (for development)

```typescript
// prisma/seed.ts
import { PrismaClient } from '../generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create test user
  const user = await prisma.user.create({
    data: {
      name: 'Test Organizer',
      email: 'organizer@example.com',
      password: await bcrypt.hash('password123', 10),
    },
  });
  
  // Create sample event
  const event = await prisma.event.create({
    data: {
      slug: 'nextjs-conf-2025',
      name: 'Next.js Conf 2025',
      description: 'The annual Next.js conference',
      locationType: 'hybrid',
      locationAddress: '123 Main St, San Francisco, CA',
      locationUrl: 'https://zoom.us/j/example',
      timezone: 'America/Los_Angeles',
      startDate: new Date('2025-10-24T09:00:00Z'),
      endDate: new Date('2025-10-25T17:00:00Z'),
      status: 'published',
      organizerId: user.id,
    },
  });
  
  // Create ticket types
  await prisma.ticketType.create({
    data: {
      eventId: event.id,
      name: 'General Admission',
      description: 'Access to all talks and workshops',
      price: 0,
      quantity: 1000,
    },
  });
  
  console.log('✅ Seed data created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## Data Integrity & Constraints

| Constraint | Implementation | Purpose |
|------------|----------------|---------|
| Event slug uniqueness | `@unique` on `Event.slug` | SEO-friendly URLs, no duplicates |
| Ticket sold-out prevention | Transaction + `SELECT FOR UPDATE` | Prevent race conditions (NFR-006) |
| Email uniqueness | `@unique` on `User.email` | One account per email |
| Registration limit | Application-level check in tRPC mutation | Enforce ticket quantity |
| CFP deadline | Application-level check + cron auto-close | FR-030 compliance |
| Soft delete | `isArchived` boolean flag | FR-004, FR-058 (preserve data) |
| Cascade deletes | `onDelete: Cascade` on relations | Clean up orphaned records |
| Foreign key constraints | Explicit `@relation` with `onDelete` rules | Referential integrity |

---

## Next Steps

- **Phase 1 Continued**: Generate tRPC router contracts based on this data model
- **Phase 1 Continued**: Create `quickstart.md` for developer onboarding
- **Phase 2**: Task decomposition per user story, mapping to specific tRPC procedures and UI components
