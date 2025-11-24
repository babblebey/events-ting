# Data Model: Attendee Check-In Service

**Date**: 2025-11-24  
**Feature**: 004-attendee-check-in  
**Phase**: 1 - Design & Contracts

## Purpose

This document defines the data entities, relationships, and state transitions for the check-in service. The implementation leverages existing Prisma models (Ticket, Attendee, Event, TeamMember) without requiring schema changes.

---

## Existing Entities (No Schema Changes Required)

### Ticket (Primary Entity for Check-In)

**Location**: `prisma/schema.prisma` (existing model)

**Relevant Fields**:
```prisma
model Ticket {
  id               String    @id @default(cuid())
  ticketNumber     String    @unique         // e.g., "EVT-2025-ABC123"
  qrCodeData       String    @unique         // QR code payload
  
  // Check-in tracking (EXISTING FIELDS - use these)
  isCheckedIn      Boolean   @default(false)
  checkedInAt      DateTime?
  checkedInBy      String?                   // Staff member or device ID
  
  // Relations
  eventId          String
  event            Event     @relation(...)
  attendeeId       String?   @unique
  attendee         Attendee? @relation(...)
  registrationId   String
  registration     Registration @relation(...)
  
  // Assignment status
  isAssigned       Boolean   @default(false)
  assignedAt       DateTime?
  
  // Indexes (already defined)
  @@index([eventId, isCheckedIn])           // For filtering by check-in status
  @@index([ticketNumber])                   // For search
  @@index([qrCodeData])                     // For QR validation
}
```

**State Transitions**:
```
┌─────────────────┐
│  Created        │
│  isCheckedIn:   │
│    false        │
└────────┬────────┘
         │
         │ Check-in action
         │ (manual or QR)
         ▼
┌─────────────────┐
│  Checked In     │
│  isCheckedIn:   │
│    true         │
│  checkedInAt:   │
│    timestamp    │
│  checkedInBy:   │
│    user ID      │
└─────────────────┘
```

**Validation Rules**:
- `ticketNumber` must be unique across all events
- `qrCodeData` must be unique across all events
- `checkedInBy` should be set to the team member's user ID
- `checkedInAt` should be set to server timestamp (not client time)
- Cannot check in if `isCheckedIn === true` (prevent duplicates)
- Ticket must belong to specified event (validate `eventId` match)

**Business Logic**:
- **Idempotency**: Re-checking an already checked-in ticket returns success with existing timestamp
- **Assignment Not Required**: Can check in unassigned tickets (buyer picks up their own ticket)
- **Cancellation Check**: Future enhancement - validate ticket hasn't been refunded/cancelled

---

### Attendee (Related Entity)

**Location**: `prisma/schema.prisma` (existing model)

**Relevant Fields**:
```prisma
model Attendee {
  id         String  @id @default(cuid())
  name       String
  email      String
  customData Json?   // Registration form responses
  
  // Relation to ticket (one-to-one)
  ticket     Ticket? // May be null if ticket unassigned
}
```

**Usage in Check-In**:
- Display attendee name and email in check-in list
- Show custom data if needed (e.g., dietary restrictions, company name)
- Ticket can be checked in even if `attendeeId` is null (buyer check-in)

---

### Event (Context Entity)

**Location**: `prisma/schema.prisma` (existing model)

**Relevant Fields**:
```prisma
model Event {
  id          String   @id @default(cuid())
  slug        String   @unique   // Used in route: /events/[slug]/check-in
  name        String
  startDate   DateTime
  endDate     DateTime
  
  // Relations
  tickets     Ticket[]
  teamMembers TeamMember[]
}
```

**Usage in Check-In**:
- Route parameter: `/events/[slug]/check-in`
- Permission check: Verify user is team member with CHECKIN module access
- Filter tickets: Only show tickets for this event

---

### TeamMember (Permission Entity)

**Location**: `prisma/schema.prisma` (existing model)

**Relevant Fields**:
```prisma
model TeamMember {
  id                String   @id @default(cuid())
  eventId           String
  userId            String?
  role              TeamRole @default(COLLABORATOR)  // OWNER or COLLABORATOR
  status            TeamMemberStatus @default(PENDING) // PENDING, ACTIVE, REMOVED
  modulePermissions String[] @default([])  // ["CFP", "ATTENDEES", "CHECKIN", ...]
}
```

**Permission Logic**:
- **OWNER**: Automatic access to all modules including CHECKIN
- **COLLABORATOR**: Must have "CHECKIN" in `modulePermissions` array
- **Status**: Must be "ACTIVE" (not PENDING or REMOVED)

---

## Data Queries

### 1. List Attendees for Check-In

**Input**:
- `eventId` (string, CUID)
- `filter` (optional): "all" | "checked-in" | "not-checked-in"
- `search` (optional): ticket number partial match
- `page` (number, default: 0)
- `pageSize` (number, default: 50)

**Query**:
```typescript
const tickets = await ctx.db.ticket.findMany({
  where: {
    eventId: input.eventId,
    // Filter by check-in status
    ...(input.filter === "checked-in" && { isCheckedIn: true }),
    ...(input.filter === "not-checked-in" && { isCheckedIn: false }),
    // Search by ticket number
    ...(input.search && {
      ticketNumber: { contains: input.search, mode: 'insensitive' }
    }),
  },
  include: {
    attendee: { select: { name: true, email: true } },
    registration: { select: { name: true, email: true } }, // Buyer info
  },
  orderBy: [
    { isCheckedIn: 'asc' },  // Not checked in first
    { createdAt: 'desc' },   // Newest first
  ],
  skip: input.page * input.pageSize,
  take: input.pageSize,
});

// Also get total count for pagination
const totalCount = await ctx.db.ticket.count({
  where: { /* same where clause */ },
});
```

**Output Shape**:
```typescript
{
  attendees: [
    {
      ticketId: "cuid_123",
      ticketNumber: "EVT-2025-ABC123",
      isCheckedIn: false,
      checkedInAt: null,
      // Attendee info (if assigned)
      attendeeName: "John Doe",
      attendeeEmail: "john@example.com",
      // Buyer info (always present)
      buyerName: "Jane Smith",
      buyerEmail: "jane@example.com",
    },
    // ...more tickets
  ],
  pagination: {
    total: 834,
    page: 0,
    pageSize: 50,
    totalPages: 17,
  },
}
```

---

### 2. Check In Ticket (Manual or QR)

**Input**:
- `eventId` (string, CUID)
- `ticketNumber` (string) OR `qrCodeData` (string)

**Query**:
```typescript
// Find ticket
const ticket = await ctx.db.ticket.findFirst({
  where: {
    eventId: input.eventId,
    OR: [
      { ticketNumber: input.ticketNumber },
      { qrCodeData: input.qrCodeData },
    ],
  },
  include: {
    attendee: { select: { name: true, email: true } },
    registration: { select: { name: true, email: true } },
  },
});

if (!ticket) {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Ticket not found for this event",
  });
}

// Check if already checked in (idempotent - return success)
if (ticket.isCheckedIn) {
  return {
    success: true,
    alreadyCheckedIn: true,
    ticket: { /* ticket data */ },
    checkedInAt: ticket.checkedInAt,
  };
}

// Perform check-in
const updatedTicket = await ctx.db.ticket.update({
  where: { id: ticket.id },
  data: {
    isCheckedIn: true,
    checkedInAt: new Date(),
    checkedInBy: ctx.session.user.id,  // Team member performing check-in
  },
  include: {
    attendee: { select: { name: true, email: true } },
    registration: { select: { name: true, email: true } },
  },
});
```

**Output Shape**:
```typescript
{
  success: true,
  alreadyCheckedIn: false,
  ticket: {
    ticketId: "cuid_123",
    ticketNumber: "EVT-2025-ABC123",
    isCheckedIn: true,
    checkedInAt: "2025-11-24T14:30:00Z",
    attendeeName: "John Doe",
    attendeeEmail: "john@example.com",
  },
}
```

---

### 3. Get Check-In Metrics (Optional - for dashboard)

**Input**:
- `eventId` (string, CUID)

**Query**:
```typescript
const [totalTickets, checkedInCount, recentCheckIns] = await Promise.all([
  // Total tickets
  ctx.db.ticket.count({
    where: { eventId: input.eventId },
  }),
  
  // Checked in count
  ctx.db.ticket.count({
    where: { eventId: input.eventId, isCheckedIn: true },
  }),
  
  // Recent check-ins (last 10)
  ctx.db.ticket.findMany({
    where: { eventId: input.eventId, isCheckedIn: true },
    orderBy: { checkedInAt: 'desc' },
    take: 10,
    include: {
      attendee: { select: { name: true } },
      registration: { select: { name: true } },
    },
  }),
]);

const checkInPercentage = totalTickets > 0 
  ? (checkedInCount / totalTickets) * 100 
  : 0;
```

**Output Shape**:
```typescript
{
  totalTickets: 834,
  checkedInCount: 567,
  notCheckedInCount: 267,
  checkInPercentage: 68.0,
  recentCheckIns: [
    {
      ticketNumber: "EVT-2025-XYZ789",
      name: "John Doe",
      checkedInAt: "2025-11-24T14:30:00Z",
    },
    // ...more recent check-ins
  ],
}
```

---

## State Management (Client-Side)

### Optimistic Update Pattern

```typescript
// Check-in mutation with optimistic update
const checkInMutation = api.checkIn.checkInTicket.useMutation({
  onMutate: async (input) => {
    // Cancel any outgoing refetches
    await utils.checkIn.listAttendees.cancel({ eventId: input.eventId });
    
    // Snapshot the previous value
    const previousData = utils.checkIn.listAttendees.getData({ eventId: input.eventId });
    
    // Optimistically update to the new value
    utils.checkIn.listAttendees.setData({ eventId: input.eventId }, (old) => {
      if (!old) return old;
      
      return {
        ...old,
        attendees: old.attendees.map(attendee =>
          attendee.ticketNumber === input.ticketNumber
            ? {
                ...attendee,
                isCheckedIn: true,
                checkedInAt: new Date(),
              }
            : attendee
        ),
      };
    });
    
    return { previousData };
  },
  
  onError: (err, input, context) => {
    // Rollback on error
    if (context?.previousData) {
      utils.checkIn.listAttendees.setData(
        { eventId: input.eventId },
        context.previousData
      );
    }
  },
  
  onSettled: (data, error, input) => {
    // Always refetch after error or success to ensure consistency
    utils.checkIn.listAttendees.invalidate({ eventId: input.eventId });
  },
});
```

---

## Error Cases

| Error Condition | Error Code | Error Message | User Action |
|-----------------|------------|---------------|-------------|
| Ticket not found | `NOT_FOUND` | "Ticket not found for this event" | Verify ticket number, try QR scan |
| Invalid event | `NOT_FOUND` | "Event not found" | Check event slug in URL |
| No CHECKIN permission | `FORBIDDEN` | "You don't have access to the CHECKIN module" | Request permission from event owner |
| Not team member | `FORBIDDEN` | "You do not have access to this event" | Verify event slug, check team membership |
| Not authenticated | `UNAUTHORIZED` | "You must be logged in" | Redirect to login page |
| Invalid QR code format | `BAD_REQUEST` | "Invalid QR code data" | Try manual ticket number entry |
| Database error | `INTERNAL_SERVER_ERROR` | "Check-in failed. Please try again." | Retry operation, contact support if persists |

---

## Performance Considerations

### Database Indexes (Already Exist)

✅ `@@index([eventId, isCheckedIn])` - Fast filtering by check-in status  
✅ `@@index([ticketNumber])` - Fast search by ticket number  
✅ `@@index([qrCodeData])` - Fast QR code lookup  

### Query Optimization

- **Pagination**: Default 50 tickets per page (configurable)
- **Selective Field Loading**: Use Prisma `select` to load only needed fields
- **Parallel Queries**: Use `Promise.all` for metrics calculation
- **Client-Side Caching**: React Query caches with 30s stale time

### Expected Performance

- List query: <500ms for 1000 tickets (with pagination)
- Check-in mutation: <200ms (single row update)
- Search query: <300ms (indexed ticket number search)
- QR scan + check-in: <1s total (camera processing + mutation)

---

## Summary

**No Database Changes Required**: All check-in functionality uses existing Ticket model fields (`isCheckedIn`, `checkedInAt`, `checkedInBy`).

**Key Design Decisions**:
1. Use existing Ticket.isCheckedIn field (already designed for this purpose)
2. Store team member ID in checkedInBy field for audit trail
3. Idempotent check-in operations (safe to retry, returns success if already checked in)
4. Pagination for large event support (50 tickets per page)
5. Optimistic UI updates for instant feedback

**Next**: Define tRPC procedure contracts in `contracts/check-in-api.ts`.
