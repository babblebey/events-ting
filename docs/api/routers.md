# API Routers Reference

## Overview

This document provides a comprehensive reference of all tRPC routers and their procedures in the Events-Ting platform. Each router is organized by domain feature.

**Total Routers**: 9  
**Location**: `src/server/api/routers/`

**Note**: The Dashboard module primarily uses the existing `event.list` procedure with organizer filtering. No separate dashboard router is needed for the MVP.

---

## Quick Reference Table

| Router | File | Procedures | Auth | Purpose |
|--------|------|------------|------|---------|
| **event** | `event.ts` | 10 | Mixed | Event CRUD, publishing, archival |
| **ticket** | `ticket.ts` | 6 | Protected | Ticket type management |
| **registration** | `registration.ts` | 7 | Mixed | Registration & attendee management |
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

## 3. Registration Router

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

## 4. Schedule Router

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

## 5. Speaker Router

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

## 6. CFP Router

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

## 7. Communication Router

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

## 8. User Router

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

## 9. Post Router (Demo)

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
