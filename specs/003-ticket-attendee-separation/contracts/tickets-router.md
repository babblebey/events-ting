# tRPC Tickets Router Contract

**Feature**: `003-ticket-attendee-separation`  
**Router**: `src/server/api/routers/tickets.ts`  
**Purpose**: Ticket instance management, assignment, and check-in operations

## Procedures

### 1. `tickets.list`

**Type**: Query  
**Auth**: Public (filtered by user context)  
**Description**: List tickets for a registration or event

#### Input Schema

```typescript
import { z } from 'zod';

const ListTicketsInput = z.object({
  registrationId: z.string().optional(), // Filter by buyer's registration
  eventId: z.string().optional(),        // Filter by event (organizer only)
  isAssigned: z.boolean().optional(),    // Filter by assignment status
  isCheckedIn: z.boolean().optional(),   // Filter by check-in status
  
  // Pagination
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(), // Cursor for pagination
});
```

#### Output Schema

```typescript
const TicketOutput = z.object({
  id: z.string(),
  ticketNumber: z.string(),
  qrCodeData: z.string(),
  
  // Assignment
  isAssigned: z.boolean(),
  assignedAt: z.date().nullable(),
  
  // Check-in
  isCheckedIn: z.boolean(),
  checkedInAt: z.date().nullable(),
  
  // Relations
  ticketType: z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
  }),
  attendee: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    customData: z.record(z.any()).nullable(),
  }).nullable(),
  
  createdAt: z.date(),
  updatedAt: z.date(),
});

const ListTicketsOutput = z.object({
  tickets: z.array(TicketOutput),
  nextCursor: z.string().nullable(),
});
```

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User not authorized to view these tickets
- `BAD_REQUEST` - Invalid input parameters

---

### 2. `tickets.getByNumber`

**Type**: Query  
**Auth**: Public (anyone with ticket number can view)  
**Description**: Get ticket details by ticket number (for QR code lookup)

#### Input Schema

```typescript
const GetTicketByNumberInput = z.object({
  ticketNumber: z.string(), // e.g., "TKT-L8Z9K3-A7B2C5D8E9"
});
```

#### Output Schema

```typescript
const GetTicketByNumberOutput = z.object({
  id: z.string(),
  ticketNumber: z.string(),
  qrCodeData: z.string(),
  
  // Assignment
  isAssigned: z.boolean(),
  assignedAt: z.date().nullable(),
  
  // Check-in
  isCheckedIn: z.boolean(),
  checkedInAt: z.date().nullable(),
  checkedInBy: z.string().nullable(),
  
  // Relations
  event: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    startDate: z.date(),
    endDate: z.date(),
    locationType: z.string(),
    locationAddress: z.string().nullable(),
    timezone: z.string(),
  }),
  ticketType: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    price: z.number(),
  }),
  attendee: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    customData: z.record(z.any()).nullable(),
  }).nullable(),
  registration: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
  }),
  
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

#### Error Codes

- `NOT_FOUND` - Ticket number does not exist
- `BAD_REQUEST` - Invalid ticket number format

---

### 3. `tickets.assign`

**Type**: Mutation  
**Auth**: Protected (buyer or event organizer)  
**Description**: Assign a ticket to an attendee

#### Input Schema

```typescript
const AssignTicketInput = z.object({
  ticketId: z.string(),
  
  // Attendee information
  attendee: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    customData: z.record(z.any()).optional(), // Event-specific fields
  }),
  
  // Optimistic locking
  expectedUpdatedAt: z.date(), // Client sends last known updatedAt
});
```

#### Output Schema

```typescript
const AssignTicketOutput = z.object({
  ticket: TicketOutput, // Full ticket with attendee
  attendee: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    customData: z.record(z.any()).nullable(),
  }),
});
```

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User not authorized to assign this ticket
- `NOT_FOUND` - Ticket ID does not exist
- `BAD_REQUEST` - Assignment cutoff time passed
- `CONFLICT` - Ticket was modified by another user (optimistic lock failure)
- `BAD_REQUEST` - Custom field validation failed

#### Business Logic

1. Verify user is buyer (registration.userId) or event organizer
2. Check assignment cutoff time (compare with event's cutoff)
3. Perform optimistic lock check (compare expectedUpdatedAt)
4. Validate custom data against event's custom field schema
5. If ticket already assigned, delete old attendee record
6. Create new attendee record
7. Update ticket (set isAssigned, assignedAt, attendeeId)
8. Send email to new attendee with ticket details
9. Return updated ticket + attendee

---

### 4. `tickets.unassign`

**Type**: Mutation  
**Auth**: Protected (buyer or event organizer)  
**Description**: Remove attendee assignment from ticket

#### Input Schema

```typescript
const UnassignTicketInput = z.object({
  ticketId: z.string(),
  expectedUpdatedAt: z.date(), // Optimistic locking
});
```

#### Output Schema

```typescript
const UnassignTicketOutput = z.object({
  ticket: TicketOutput, // Ticket with attendee = null
});
```

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User not authorized to unassign this ticket
- `NOT_FOUND` - Ticket ID does not exist
- `BAD_REQUEST` - Assignment cutoff time passed
- `BAD_REQUEST` - Cannot unassign checked-in ticket
- `CONFLICT` - Ticket was modified by another user

#### Business Logic

1. Verify user authorization
2. Check assignment cutoff time
3. Verify ticket not checked in (immutable after check-in)
4. Perform optimistic lock check
5. Delete attendee record
6. Update ticket (set isAssigned = false, attendeeId = null)
7. Return updated ticket

---

### 5. `tickets.checkIn`

**Type**: Mutation  
**Auth**: Protected (event organizer or staff)  
**Description**: Check in an attendee using their ticket

#### Input Schema

```typescript
const CheckInTicketInput = z.object({
  ticketNumber: z.string(), // From QR code scan
  staffId: z.string().optional(), // Who performed check-in
});
```

#### Output Schema

```typescript
const CheckInTicketOutput = z.object({
  ticket: TicketOutput,
  attendee: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  checkInTime: z.date(),
  message: z.string(), // Success message to display
});
```

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User not authorized to check in for this event
- `NOT_FOUND` - Ticket number does not exist
- `BAD_REQUEST` - Ticket not assigned to attendee
- `CONFLICT` - Ticket already checked in

#### Business Logic

1. Verify user is event organizer or has check-in permission
2. Look up ticket by ticketNumber
3. Verify ticket is assigned (has attendee)
4. Check if already checked in (return conflict error with attendee name)
5. Update ticket (set isCheckedIn = true, checkedInAt = now, checkedInBy = staffId)
6. Return success with attendee info to display

---

### 6. `tickets.generateQRCode`

**Type**: Query  
**Auth**: Public (anyone with ticket ID)  
**Description**: Generate QR code image for a ticket

#### Input Schema

```typescript
const GenerateQRCodeInput = z.object({
  ticketId: z.string(),
  format: z.enum(['svg', 'dataUrl']).default('dataUrl'),
  size: z.number().min(100).max(1000).default(300), // Pixels
});
```

#### Output Schema

```typescript
const GenerateQRCodeOutput = z.object({
  qrCode: z.string(), // SVG string or data URL
  ticketNumber: z.string(),
});
```

#### Error Codes

- `NOT_FOUND` - Ticket ID does not exist
- `BAD_REQUEST` - Invalid format or size

#### Business Logic

1. Fetch ticket by ID
2. Generate QR code from ticket.qrCodeData
3. Return QR code in requested format (SVG or data URL)

---

### 7. `tickets.getCheckInMetrics`

**Type**: Query  
**Auth**: Protected (event organizer)  
**Description**: Get real-time check-in statistics for an event

#### Input Schema

```typescript
const GetCheckInMetricsInput = z.object({
  eventId: z.string(),
});
```

#### Output Schema

```typescript
const GetCheckInMetricsOutput = z.object({
  eventId: z.string(),
  totalTickets: z.number(),
  assignedTickets: z.number(),
  unassignedTickets: z.number(),
  checkedInTickets: z.number(),
  notCheckedInTickets: z.number(),
  checkInPercentage: z.number(), // 0-100
  
  // Breakdown by ticket type
  byTicketType: z.array(z.object({
    ticketTypeId: z.string(),
    ticketTypeName: z.string(),
    total: z.number(),
    checkedIn: z.number(),
  })),
  
  // Recent check-ins (last 10)
  recentCheckIns: z.array(z.object({
    ticketNumber: z.string(),
    attendeeName: z.string(),
    checkedInAt: z.date(),
  })),
});
```

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User not authorized to view this event's metrics
- `NOT_FOUND` - Event ID does not exist

#### Business Logic

1. Verify user is event organizer or has metrics permission
2. Count tickets by status (assigned, checked-in, etc.)
3. Group by ticket type for breakdown
4. Fetch recent check-ins (last 10, ordered by checkedInAt DESC)
5. Calculate percentages
6. Return metrics

---

## Error Handling

### Standard tRPC Error Codes

All procedures use tRPC's error codes:

```typescript
import { TRPCError } from '@trpc/server';

// Example usage
throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Assignment cutoff time has passed',
});
```

**Error Codes Used**:
- `BAD_REQUEST` - Invalid input or business rule violation
- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User authenticated but lacks permission
- `NOT_FOUND` - Resource does not exist
- `CONFLICT` - Optimistic lock failure or duplicate check-in
- `INTERNAL_SERVER_ERROR` - Unexpected server error

### Client Error Handling

```typescript
// Example client-side error handling
import { api } from '@/trpc/react';

const assignMutation = api.tickets.assign.useMutation({
  onError: (error) => {
    if (error.data?.code === 'CONFLICT') {
      toast.error('This ticket was just assigned by someone else. Refreshing...');
      refetchTickets();
    } else if (error.data?.code === 'BAD_REQUEST') {
      toast.error(error.message);
    } else {
      toast.error('An unexpected error occurred. Please try again.');
    }
  },
});
```

---

## Rate Limiting

**Check-in endpoint**:
- Limit: 100 requests per minute per event
- Prevents spam scanning during event entrance rush

**Assignment endpoint**:
- Limit: 20 requests per minute per user
- Prevents bulk assignment abuse

---

## Caching Strategy

**Ticket lookup (getByNumber)**:
- Cache: Redis or in-memory
- TTL: 1 hour
- Invalidate on: Assignment, check-in

**Check-in metrics**:
- Cache: Redis
- TTL: 30 seconds
- Invalidate on: Any check-in

---

## Testing Contracts

### Unit Tests

```typescript
// Example contract test
import { describe, it, expect } from 'vitest';
import { ListTicketsInput } from './tickets';

describe('ListTicketsInput schema', () => {
  it('should validate correct input', () => {
    const input = { registrationId: 'cm3abc123', limit: 10 };
    expect(() => ListTicketsInput.parse(input)).not.toThrow();
  });

  it('should reject limit > 100', () => {
    const input = { limit: 150 };
    expect(() => ListTicketsInput.parse(input)).toThrow();
  });

  it('should default limit to 20', () => {
    const input = {};
    const parsed = ListTicketsInput.parse(input);
    expect(parsed.limit).toBe(20);
  });
});
```

### Integration Tests

```typescript
// Example integration test
import { describe, it, expect } from 'vitest';
import { createCaller } from '@/server/api/routers/tickets';
import { createMockContext } from '@/tests/helpers';

describe('tickets.assign', () => {
  it('should assign ticket to attendee', async () => {
    const ctx = createMockContext({ userId: 'user123' });
    const caller = createCaller(ctx);
    
    const result = await caller.assign({
      ticketId: 'ticket123',
      attendee: {
        name: 'John Doe',
        email: 'john@example.com',
      },
      expectedUpdatedAt: new Date(),
    });
    
    expect(result.ticket.isAssigned).toBe(true);
    expect(result.attendee.name).toBe('John Doe');
  });
  
  it('should throw CONFLICT if ticket modified concurrently', async () => {
    const ctx = createMockContext({ userId: 'user123' });
    const caller = createCaller(ctx);
    
    await expect(caller.assign({
      ticketId: 'ticket123',
      attendee: { name: 'John Doe', email: 'john@example.com' },
      expectedUpdatedAt: new Date('2024-01-01'), // Stale timestamp
    })).rejects.toThrow('CONFLICT');
  });
});
```

---

## Summary

This contract defines 7 tRPC procedures for ticket management:
1. **list** - Browse tickets with filters
2. **getByNumber** - Lookup ticket by QR code
3. **assign** - Assign ticket to attendee
4. **unassign** - Remove assignment
5. **checkIn** - Check in attendee
6. **generateQRCode** - Create QR code image
7. **getCheckInMetrics** - Real-time check-in stats

All procedures use Zod for type-safe validation and return structured errors with tRPC error codes.
