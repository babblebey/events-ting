# API Routers Reference

## Overview

This document provides a comprehensive reference of all tRPC routers and their procedures in the Events-Ting platform. Each router is organized by domain feature.

**Total Routers**: 11  
**Location**: `src/server/api/routers/`

**Note**: The Dashboard module primarily uses the existing `event.list` procedure with organizer filtering. No separate dashboard router is needed for the MVP.

---

## Quick Reference Table

| Router | File | Procedures | Auth | Purpose |
|--------|------|------------|------|---------|
| **event** | `event.ts` | 10 | Mixed | Event CRUD, publishing, archival |
| **ticket** | `ticket.ts` | 6 | Protected | Ticket type management (legacy) |
| **tickets** | `tickets.ts` | 7 | Mixed | Ticket instance assignment & QR codes |
| **attendees** | `attendees.ts` | 6 | Mixed | Attendee management & communications |
| **registration** | `registration.ts` | 7 | Mixed | Registration & buyer management |
| **schedule** | `schedule.ts` | 9 | Mixed | Schedule entries & timeline |
| **speaker** | `speaker.ts` | 7 | Mixed | Speaker profiles & sessions |
| **cfp** | `cfp.ts` | 9 | Mixed | CFP management & submissions |
| **communication** | `communication.ts` | 4 | Protected | Email campaigns |
| **user** | `user.ts` | 3 | Protected | User profile management |
| **post** | `post.ts` | 4 | Mixed | Demo (T3 Stack example) |

---

## 1. Event Router

**File**: `src/server/api/routers/event.ts`  
**Purpose**: Core event management operations

### Procedures

#### `event.create`
- **Type**: Mutation
- **Auth**: Protected (Organizers only)
- **Input**: `CreateEventInput` (name, slug, description, dates, location, timezone)
- **Output**: Created `Event` object
- **Purpose**: Create a new event (always starts as "draft")

#### `event.update`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `UpdateEventInput` (id + partial event fields)
- **Output**: Updated `Event` object
- **Purpose**: Update event details

#### `event.delete`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `{ id: string }`
- **Output**: Deleted `Event` object
- **Purpose**: Hard delete an event (only if no registrations exist)

#### `event.list`
- **Type**: Query
- **Auth**: Public
- **Input**: `{ status?: "draft" | "published" | "archived", organizerId?: string, limit?, cursor? }`
- **Output**: Array of `Event` objects (paginated)
- **Purpose**: List events (public sees only published, organizers see their own)

#### `event.getById`
- **Type**: Query
- **Auth**: Public
- **Input**: `{ id: string }`
- **Output**: `Event` object or null
- **Purpose**: Get event by ID (with related counts)

#### `event.getBySlug`
- **Type**: Query
- **Auth**: Public
- **Input**: `{ slug: string }`
- **Output**: `Event` object or null
- **Purpose**: Get event by slug (for public-facing pages)

#### `event.publish`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `{ id: string }`
- **Output**: Updated `Event` object
- **Purpose**: Change event status from "draft" to "published"

#### `event.archive`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `{ id: string }`
- **Output**: Updated `Event` object
- **Purpose**: Soft delete event (sets `isArchived: true`)

#### `event.getDashboardMetrics`
- **Type**: Query
- **Auth**: Protected (Event owner only)
- **Input**: `{ id: string }`
- **Output**: Metrics object (total registrations, revenue, CFP submissions, etc.)
- **Purpose**: Dashboard overview statistics

#### `event.getOrganizerEvents`
- **Type**: Query
- **Auth**: Protected
- **Input**: None
- **Output**: Array of `Event` objects owned by current user
- **Purpose**: List events created by logged-in organizer

---

## 2. Ticket Router

**File**: `src/server/api/routers/ticket.ts`  
**Purpose**: Ticket type management and availability

### Procedures

#### `ticket.create`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `CreateTicketTypeInput` (eventId, name, description, price, quantity, sale dates)
- **Output**: Created `TicketType` object
- **Purpose**: Create a new ticket type

#### `ticket.update`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `UpdateTicketTypeInput` (id + partial fields)
- **Output**: Updated `TicketType` object
- **Purpose**: Update ticket type (price cannot be changed after sales)

#### `ticket.delete`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `{ id: string }`
- **Output**: Deleted `TicketType` object
- **Purpose**: Delete ticket type (only if no registrations)

#### `ticket.list`
- **Type**: Query
- **Auth**: Public
- **Input**: `{ eventId: string }`
- **Output**: Array of `TicketType` objects with sold count
- **Purpose**: List all ticket types for an event

#### `ticket.getById`
- **Type**: Query
- **Auth**: Public
- **Input**: `{ id: string }`
- **Output**: `TicketType` object with availability
- **Purpose**: Get ticket type details with current availability

#### `ticket.getStats`
- **Type**: Query
- **Auth**: Protected (Event owner only)
- **Input**: `{ eventId: string }`
- **Output**: Aggregate stats (total quantity, sold, available, revenue)
- **Purpose**: Ticket sales statistics for dashboard

---

## 3A. Tickets Router (NEW)

**File**: `src/server/api/routers/tickets.ts`  
**Purpose**: Individual ticket instance management, assignment, and QR code generation

**Note**: This is different from the legacy `ticket.ts` router which manages ticket types (templates). This router manages individual ticket instances created from purchases.

### Procedures

#### `tickets.list`
- **Type**: Query
- **Auth**: Public (filtered by context)
- **Input**: `ListTicketsInput` (registrationId?, eventId?, isAssigned?, isCheckedIn?, pagination)
- **Output**: Array of `Ticket` objects with attendee details
- **Purpose**: List ticket instances for a registration (buyer view) or event (organizer view)

#### `tickets.getByNumber`
- **Type**: Query
- **Auth**: Public
- **Input**: `{ ticketNumber: string }` (e.g., "TKT-L8Z9K3-A7B2C5D8E9")
- **Output**: `Ticket` object with full event and attendee details
- **Purpose**: Retrieve ticket by ticket number (for attendee ticket view page)

#### `tickets.assign`
- **Type**: Mutation
- **Auth**: Protected (buyer or event organizer)
- **Input**: `AssignTicketInput` (ticketId, attendee details, expectedUpdatedAt for optimistic locking)
- **Output**: `{ ticket, attendee }` objects
- **Purpose**: Assign ticket to an attendee (creates Attendee record, sends email)
- **Business Logic**:
  - Validates assignment cutoff time
  - Performs optimistic lock check
  - Deletes old attendee if reassigning (GDPR compliance)
  - Creates new Attendee record
  - Sends ticket email to attendee

#### `tickets.unassign`
- **Type**: Mutation
- **Auth**: Protected (buyer or event organizer)
- **Input**: `{ ticketId, expectedUpdatedAt }`
- **Output**: Updated `Ticket` object (attendee = null)
- **Purpose**: Remove attendee assignment (before cutoff only)
- **Business Logic**:
  - Verifies cutoff not passed
  - Prevents unassigning checked-in tickets
  - Deletes Attendee record

#### `tickets.generateQRCode`
- **Type**: Query
- **Auth**: Public
- **Input**: `{ ticketId, format: 'svg' | 'dataUrl', size? }`
- **Output**: `{ qrCode: string, ticketNumber: string }`
- **Purpose**: Generate QR code image for ticket
- **Format**: Encodes `{ ticketId, eventId, ticketNumber }` as JSON

#### `tickets.checkIn`
- **Type**: Mutation
- **Auth**: Protected (event organizer or staff)
- **Input**: `{ ticketNumber, staffId? }`
- **Output**: `{ ticket, attendee, checkInTime, message }`
- **Purpose**: Check in attendee at event entrance (deferred to future sprint)
- **Status**: Placeholder implementation - full check-in UI deferred

#### `tickets.getCheckInMetrics`
- **Type**: Query
- **Auth**: Protected (event organizer)
- **Input**: `{ eventId }`
- **Output**: Check-in statistics (total, assigned, checked-in, by ticket type)
- **Purpose**: Real-time check-in dashboard metrics (deferred to future sprint)
- **Status**: Placeholder - full metrics deferred

**Related Documentation**: [Tickets Module](../modules/tickets/)

---

## 3B. Attendees Router (NEW)

**File**: `src/server/api/routers/attendees.ts`  
**Purpose**: Attendee information management and email communication

### Procedures

#### `attendees.list`
- **Type**: Query
- **Auth**: Protected (event organizer)
- **Input**: `ListAttendeesInput` (eventId, emailStatus?, search?, pagination)
- **Output**: Array of `Attendee` objects with ticket details
- **Purpose**: List all attendees for an event with filtering
- **Filters**: Email status (active/bounced/unsubscribed), search by name/email

#### `attendees.getById`
- **Type**: Query
- **Auth**: Public (attendee can view own record)
- **Input**: `{ attendeeId }`
- **Output**: `Attendee` object with full ticket details
- **Purpose**: Get attendee details (used for attendee self-service view)

#### `attendees.update`
- **Type**: Mutation
- **Auth**: Protected (attendee or event organizer)
- **Input**: `UpdateAttendeeInput` (attendeeId, name?, email?, customData?)
- **Output**: Updated `Attendee` object
- **Purpose**: Update attendee information
- **Business Logic**:
  - Validates custom data against event schema
  - If email changed, sends confirmation to new address

#### `attendees.exportList`
- **Type**: Query
- **Auth**: Protected (event organizer)
- **Input**: `ExportAttendeesInput` (eventId, filters, options)
- **Output**: `{ csv: string, filename: string, rowCount: number }`
- **Purpose**: Export attendee list as CSV for event logistics
- **Format**: Includes name, email, ticket info, custom fields, check-in status

#### `attendees.getCustomFieldResponses`
- **Type**: Query
- **Auth**: Protected (event organizer)
- **Input**: `{ eventId, fieldId }`
- **Output**: Aggregated responses (value, count) for a custom field
- **Purpose**: Get summary of custom field responses (e.g., dietary restrictions count)
- **Use Case**: Event planning (catering, t-shirt orders)

#### `attendees.updateEmailStatus`
- **Type**: Mutation
- **Auth**: System/Internal (webhook from Resend)
- **Input**: `{ email, eventId, status, reason? }`
- **Output**: `{ updated: number, attendeeIds: string[] }`
- **Purpose**: Update email delivery status from webhooks
- **Business Logic**:
  - Verifies webhook signature
  - Updates all attendees with matching email for event
  - Tracks bounces and unsubscribes

**Related Documentation**: [Attendees Module](../modules/attendees/)

---

## 4. Registration Router

**File**: `src/server/api/routers/registration.ts`  
**Purpose**: Attendee registration and management

### Procedures

#### `registration.create`
- **Type**: Mutation
- **Auth**: Public
- **Input**: `CreateRegistrationInput` (ticketTypeId, name, email, customData)
- **Output**: Created `Registration` object
- **Purpose**: Public registration form submission (sends confirmation email)

#### `registration.addManually`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: Same as `create`
- **Output**: Created `Registration` object
- **Purpose**: Organizer adds attendee manually (skips email)

#### `registration.list`
- **Type**: Query
- **Auth**: Protected (Event owner only)
- **Input**: `ListRegistrationsInput` (eventId, search, ticketTypeId, pagination)
- **Output**: Array of `Registration` objects (paginated)
- **Purpose**: List registrations with filtering and search

#### `registration.getById`
- **Type**: Query
- **Auth**: Protected (Event owner only)
- **Input**: `{ id: string }`
- **Output**: `Registration` object with related data
- **Purpose**: Get full registration details

#### `registration.cancel`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `{ id: string }`
- **Output**: Updated `Registration` object
- **Purpose**: Cancel registration (future: trigger refund)

#### `registration.updateEmailStatus`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `{ id: string, emailStatus: "active" | "bounced" | "unsubscribed" }`
- **Output**: Updated `Registration` object
- **Purpose**: Mark email status for deliverability tracking

#### `registration.export`
- **Type**: Query
- **Auth**: Protected (Event owner only)
- **Input**: `{ eventId: string, format: "csv" | "json" }`
- **Output**: CSV string or JSON array
- **Purpose**: Export attendee list for external use

---

## 5. Schedule Router

**File**: `src/server/api/routers/schedule.ts`  
**Purpose**: Event schedule and session management

### Procedures

#### `schedule.create`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `CreateScheduleEntryInput` (eventId, title, date, times, track, speakerIds)
- **Output**: Created `ScheduleEntry` object
- **Purpose**: Create schedule entry with speaker assignments

#### `schedule.update`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `UpdateScheduleEntryInput` (id, updatedAt, partial fields)
- **Output**: Updated `ScheduleEntry` object
- **Purpose**: Update schedule entry (with concurrency control)

#### `schedule.delete`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `{ id: string }`
- **Output**: Deleted `ScheduleEntry` object
- **Purpose**: Remove schedule entry

#### `schedule.list`
- **Type**: Query
- **Auth**: Public
- **Input**: `ListScheduleEntriesInput` (eventId, date, track)
- **Output**: Array of `ScheduleEntry` objects with speakers
- **Purpose**: List schedule entries with filtering

#### `schedule.getById`
- **Type**: Query
- **Auth**: Public
- **Input**: `{ id: string }`
- **Output**: `ScheduleEntry` object with full speaker details
- **Purpose**: Get schedule entry details

#### `schedule.checkOverlap`
- **Type**: Query
- **Auth**: Protected (Event owner only)
- **Input**: `{ eventId, date, startTime, endTime, excludeId? }`
- **Output**: `{ hasOverlap: boolean, conflictingEntries: ScheduleEntry[] }`
- **Purpose**: Detect time conflicts before creating/updating

#### `schedule.getByDate`
- **Type**: Query
- **Auth**: Public
- **Input**: `{ eventId: string, date: string }`
- **Output**: Array of `ScheduleEntry` objects grouped by track
- **Purpose**: Get full schedule for a specific day

#### `schedule.getTracks`
- **Type**: Query
- **Auth**: Public
- **Input**: `{ eventId: string }`
- **Output**: Array of `{ track: string, trackColor: string, count: number }`
- **Purpose**: Get list of unique tracks for filtering

#### `schedule.getByEvent`
- **Type**: Query
- **Auth**: Public
- **Input**: `{ eventId: string }`
- **Output**: Array of `ScheduleEntry` objects (all dates)
- **Purpose**: Get entire event schedule

---

## 6. Speaker Router

**File**: `src/server/api/routers/speaker.ts`  
**Purpose**: Speaker profile management and session assignments

### Procedures

#### `speaker.create`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `CreateSpeakerInput` (eventId, name, bio, email, photo, social links)
- **Output**: Created `Speaker` object
- **Purpose**: Add speaker manually (checks email uniqueness per event)

#### `speaker.update`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `UpdateSpeakerInput` (id + partial fields)
- **Output**: Updated `Speaker` object
- **Purpose**: Update speaker profile

#### `speaker.delete`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `{ id: string }`
- **Output**: Deleted `Speaker` object
- **Purpose**: Remove speaker (also removes session assignments)

#### `speaker.list`
- **Type**: Query
- **Auth**: Public
- **Input**: `{ eventId: string }`
- **Output**: Array of `Speaker` objects with session count
- **Purpose**: List all speakers for an event

#### `speaker.getById`
- **Type**: Query
- **Auth**: Public
- **Input**: `{ id: string }`
- **Output**: `Speaker` object with full session details
- **Purpose**: Get speaker profile and sessions

#### `speaker.assignToSession`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `{ speakerId, scheduleEntryId, role: "speaker" | "moderator" | "panelist" }`
- **Output**: Created `SpeakerSession` object
- **Purpose**: Assign speaker to schedule entry

#### `speaker.unassignFromSession`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `{ speakerId, scheduleEntryId }`
- **Output**: Deleted `SpeakerSession` object
- **Purpose**: Remove speaker from session

---

## 7. CFP Router

**File**: `src/server/api/routers/cfp.ts`  
**Purpose**: Call for Papers management and submission review

### Procedures

#### `cfp.open`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `OpenCfpInput` (eventId, guidelines, deadline, requiredFields)
- **Output**: Created `CallForPapers` object
- **Purpose**: Open CFP for an event

#### `cfp.update`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `UpdateCfpInput` (id + partial fields)
- **Output**: Updated `CallForPapers` object
- **Purpose**: Update CFP settings (only if no submissions yet)

#### `cfp.close`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `{ id: string }`
- **Output**: Updated `CallForPapers` object (status: 'closed')
- **Purpose**: Close CFP early

#### `cfp.reopen`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `{ id: string }`
- **Output**: Updated `CallForPapers` object (status: 'open')
- **Purpose**: Reopen a closed CFP (only if deadline hasn't passed)

#### `cfp.getByEvent`
- **Type**: Query
- **Auth**: Public
- **Input**: `{ eventId: string }`
- **Output**: `CallForPapers` object or null
- **Purpose**: Get CFP details for submission form

#### `cfp.submitProposal`
- **Type**: Mutation
- **Auth**: Public
- **Input**: `SubmitCfpProposalInput` (proposal + speaker details)
- **Output**: Created `CfpSubmission` object
- **Purpose**: Public submission form (sends confirmation email)

#### `cfp.listSubmissions`
- **Type**: Query
- **Auth**: Protected (Event owner only)
- **Input**: `ListCfpSubmissionsInput` (eventId, status, pagination)
- **Output**: Array of `CfpSubmission` objects (paginated)
- **Purpose**: Organizer reviews submissions

#### `cfp.acceptProposal`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `{ id: string, reviewNotes?: string }`
- **Output**: Updated `CfpSubmission` + created `Speaker` + `ScheduleEntry` (placeholder)
- **Purpose**: Accept proposal (auto-creates speaker, sends acceptance email)

#### `cfp.rejectProposal`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `{ id: string, reviewNotes?: string }`
- **Output**: Updated `CfpSubmission` object
- **Purpose**: Reject proposal (sends rejection email with feedback)

---

## 8. Communication Router

**File**: `src/server/api/routers/communication.ts`  
**Purpose**: Email campaign management and bulk sending

### Procedures

#### `communication.createCampaign`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `CreateCampaignInput` (eventId, subject, body, recipientType, recipientFilter, scheduledFor)
- **Output**: Created `EmailCampaign` object (status: "draft")
- **Purpose**: Create email campaign draft

#### `communication.sendCampaign`
- **Type**: Mutation
- **Auth**: Protected (Event owner only)
- **Input**: `{ id: string }`
- **Output**: Updated `EmailCampaign` object (status: "sending" → "sent")
- **Purpose**: Send campaign to filtered recipients (background job)

#### `communication.listCampaigns`
- **Type**: Query
- **Auth**: Protected (Event owner only)
- **Input**: `ListCampaignsInput` (eventId, status, pagination)
- **Output**: Array of `EmailCampaign` objects (paginated)
- **Purpose**: List campaigns for event

#### `communication.getCampaignStats`
- **Type**: Query
- **Auth**: Protected (Event owner only)
- **Input**: `{ id: string }`
- **Output**: `EmailCampaign` object with delivery stats
- **Purpose**: Get campaign performance metrics

---

## 9. User Router

**File**: `src/server/api/routers/user.ts`  
**Purpose**: User profile and account management

### Procedures

#### `user.getProfile`
- **Type**: Query
- **Auth**: Protected
- **Input**: None
- **Output**: Current user object with event/registration counts
- **Purpose**: Get logged-in user's profile

#### `user.updateProfile`
- **Type**: Mutation
- **Auth**: Protected
- **Input**: `UpdateUserProfileInput` (name, email, image)
- **Output**: Updated `User` object
- **Purpose**: Update user profile details

#### `user.changePassword`
- **Type**: Mutation
- **Auth**: Protected
- **Input**: `ChangePasswordInput` (currentPassword, newPassword, confirmPassword)
- **Output**: Success message
- **Purpose**: Change user password (validates current password first)

---

## 10. Post Router (Demo)

**File**: `src/server/api/routers/post.ts`  
**Purpose**: Example router from T3 Stack template

### Procedures

#### `post.hello`
- **Type**: Query
- **Auth**: Public
- **Input**: `{ text: string }`
- **Output**: `{ greeting: string }`
- **Purpose**: Demo query

#### `post.create`
- **Type**: Mutation
- **Auth**: Protected
- **Input**: `{ name: string }`
- **Output**: Created `Post` object
- **Purpose**: Demo mutation

#### `post.getLatest`
- **Type**: Query
- **Auth**: Protected
- **Input**: None
- **Output**: Latest `Post` by current user or null
- **Purpose**: Demo user-scoped query

#### `post.getSecretMessage`
- **Type**: Query
- **Auth**: Protected
- **Input**: None
- **Output**: `{ message: string }`
- **Purpose**: Demo protected query

---

## Type Inference Helpers

Use these helpers to infer types from routers:

```typescript
import type { RouterInputs, RouterOutputs } from "@/trpc/react";

// Input types
type CreateEventInput = RouterInputs["event"]["create"];
type ListEventsInput = RouterInputs["event"]["list"];

// Output types
type Event = RouterOutputs["event"]["getById"];
type EventList = RouterOutputs["event"]["list"];
```

---

## Common Patterns

### 1. Pagination

Many list procedures support cursor-based pagination:

```typescript
const { data, fetchNextPage, hasNextPage } = api.event.list.useInfiniteQuery(
  { status: "published" },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  }
);
```

### 2. Authorization Checks

Protected procedures automatically verify:
1. User is logged in
2. For event-related procedures: User owns the event

```typescript
// Ownership check pattern
const event = await ctx.db.event.findUnique({
  where: { id: input.eventId },
  select: { organizerId: true },
});

if (!event || event.organizerId !== ctx.session.user.id) {
  throw new TRPCError({ code: "FORBIDDEN" });
}
```

### 3. Transaction Handling

Critical operations use database transactions:

```typescript
const result = await ctx.db.$transaction(async (tx) => {
  // Multiple related operations here
  const ticket = await tx.ticketType.update(...);
  const registration = await tx.registration.create(...);
  return registration;
});
```

---

## Related Documentation

- **[tRPC Overview](./trpc-overview.md)** - Core concepts and setup
- **[Authentication](./authentication.md)** - Authorization patterns
- **[Error Handling](./error-handling.md)** - Error codes and patterns
- **[Module Docs](../modules/)** - Detailed feature documentation

---

## Adding New Procedures

### 1. Create Procedure in Router

```typescript
// src/server/api/routers/event.ts
export const eventRouter = createTRPCRouter({
  // ... existing procedures

  myNewProcedure: protectedProcedure
    .input(z.object({ eventId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      // Implementation
    }),
});
```

### 2. Use in Client

```typescript
// Automatically available with full type safety
const { data } = api.event.myNewProcedure.useQuery({ eventId: "..." });
```

No code generation or build step needed! ✨
