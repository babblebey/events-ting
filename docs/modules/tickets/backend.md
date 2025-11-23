# Tickets Backend Documentation

## Router Location

**File**: `src/server/api/routers/tickets.ts`

Handles individual ticket instance management, assignment, QR code generation, and check-in operations.

## Procedures

### `tickets.list`

**Type**: Query  
**Auth**: Public (filtered by user context)  
**Purpose**: List ticket instances for a registration or event

**Input Schema**:
```typescript
{
  registrationId?: string;  // Filter by buyer's registration
  eventId?: string;         // Filter by event (organizer only)
  isAssigned?: boolean;     // Filter by assignment status
  isCheckedIn?: boolean;    // Filter by check-in status
  
  // Pagination
  limit: number;            // Default: 20, Max: 100
  cursor?: string;          // Pagination cursor
}
```

**Output Schema**:
```typescript
{
  tickets: Array<{
    id: string;
    ticketNumber: string;
    qrCodeData: string;
    
    // Status
    isAssigned: boolean;
    assignedAt: Date | null;
    isCheckedIn: boolean;
    checkedInAt: Date | null;
    
    // Relations
    ticketType: {
      id: string;
      name: string;
      price: number;
    };
    attendee: {
      id: string;
      name: string;
      email: string;
      customData: Record<string, any> | null;
    } | null;
    
    createdAt: Date;
    updatedAt: Date;
  }>;
  nextCursor: string | null;
}
```

**Business Logic**:
- If `registrationId` provided: Returns tickets for that purchase (buyer or admin)
- If `eventId` provided: Returns all tickets for event (organizer only)
- Filters by assignment and check-in status if specified
- Enforces authorization (buyers see only their tickets, organizers see all)

**Example Usage**:
```typescript
// Buyer viewing their tickets
const { data } = api.tickets.list.useQuery({
  registrationId: registrationId,
});

// Organizer viewing event tickets
const { data } = api.tickets.list.useQuery({
  eventId: eventId,
  isAssigned: false, // See unassigned tickets
});
```

**Error Responses**:
- `UNAUTHORIZED` - User not authenticated when required
- `FORBIDDEN` - User not authorized to view these tickets
- `BAD_REQUEST` - Invalid input parameters

---

### `tickets.getByNumber`

**Type**: Query  
**Auth**: Public  
**Purpose**: Retrieve ticket by ticket number (for QR code lookup)

**Input Schema**:
```typescript
{
  ticketNumber: string; // e.g., "TKT-L8Z9K3-A7B2C5D8E9"
}
```

**Output Schema**:
```typescript
{
  id: string;
  ticketNumber: string;
  qrCodeData: string;
  
  // Status
  isAssigned: boolean;
  assignedAt: Date | null;
  isCheckedIn: boolean;
  checkedInAt: Date | null;
  checkedInBy: string | null;
  
  // Event Details
  event: {
    id: string;
    name: string;
    slug: string;
    startDate: Date;
    endDate: Date;
    locationType: string;
    locationAddress: string | null;
    timezone: string;
  };
  
  // Ticket Type
  ticketType: {
    id: string;
    name: string;
    description: string;
    price: number;
  };
  
  // Attendee (if assigned)
  attendee: {
    id: string;
    name: string;
    email: string;
    customData: Record<string, any> | null;
  } | null;
  
  // Buyer Info
  registration: {
    id: string;
    email: string;
    name: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}
```

**Use Case**: Display ticket details when attendee views their ticket page

**Example Usage**:
```typescript
const { data: ticket } = api.tickets.getByNumber.useQuery({
  ticketNumber: "TKT-L8Z9K3-A7B2C5D8E9",
});

// Display ticket page with QR code, event info, attendee details
```

**Error Responses**:
- `NOT_FOUND` - Ticket number does not exist
- `BAD_REQUEST` - Invalid ticket number format

---

### `tickets.assign`

**Type**: Mutation  
**Auth**: Protected (buyer or event organizer)  
**Purpose**: Assign ticket to an attendee

**Input Schema**:
```typescript
{
  ticketId: string;
  
  // Attendee information
  attendee: {
    name: string;              // Min 1 character
    email: string;             // Valid email format
    customData?: Record<string, any>; // Event-specific fields
  };
  
  // Optimistic locking
  expectedUpdatedAt: Date;     // Last known updatedAt
}
```

**Output Schema**:
```typescript
{
  ticket: {
    // Full ticket object with updated status
    ...TicketOutput
  };
  attendee: {
    id: string;
    name: string;
    email: string;
    customData: Record<string, any> | null;
  };
}
```

**Business Logic**:
1. Verify user is buyer (registration.userId) or event organizer
2. Check assignment cutoff time (compare current time with event's cutoff)
3. Perform optimistic lock check (compare expectedUpdatedAt with ticket.updatedAt)
4. Validate custom data against event's custom field schema
5. If ticket already assigned:
   - Delete old attendee record (GDPR compliance)
6. Create new attendee record
7. Update ticket:
   - Set `isAssigned = true`
   - Set `assignedAt = now()`
   - Link `attendeeId`
8. Send email to attendee with ticket details
9. Return updated ticket + attendee

**Example Usage**:
```typescript
const assignMutation = api.tickets.assign.useMutation({
  onSuccess: ({ ticket, attendee }) => {
    toast.success(`Ticket assigned to ${attendee.name}`);
    queryClient.invalidateQueries(['tickets']);
  },
  onError: (error) => {
    if (error.data?.code === 'CONFLICT') {
      toast.error('Ticket was modified. Refreshing...');
      refetch();
    }
  },
});

await assignMutation.mutateAsync({
  ticketId: ticket.id,
  attendee: {
    name: formData.name,
    email: formData.email,
    customData: {
      dietary: formData.dietary,
      tshirtSize: formData.tshirtSize,
    },
  },
  expectedUpdatedAt: ticket.updatedAt,
});
```

**Error Responses**:
- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User not authorized to assign this ticket
- `NOT_FOUND` - Ticket ID does not exist
- `BAD_REQUEST` - Assignment cutoff time passed
- `BAD_REQUEST` - Custom field validation failed
- `CONFLICT` - Ticket modified concurrently (optimistic lock failure)

---

### `tickets.unassign`

**Type**: Mutation  
**Auth**: Protected (buyer or event organizer)  
**Purpose**: Remove attendee assignment from ticket

**Input Schema**:
```typescript
{
  ticketId: string;
  expectedUpdatedAt: Date; // Optimistic locking
}
```

**Output Schema**:
```typescript
{
  ticket: {
    ...TicketOutput  // With attendee = null
  };
}
```

**Business Logic**:
1. Verify user authorization (buyer or organizer)
2. Check assignment cutoff time (must be before cutoff)
3. Verify ticket not checked in (cannot unassign after check-in)
4. Perform optimistic lock check
5. Delete attendee record
6. Update ticket:
   - Set `isAssigned = false`
   - Set `attendeeId = null`
7. Return updated ticket

**Example Usage**:
```typescript
const unassignMutation = api.tickets.unassign.useMutation({
  onSuccess: () => {
    toast.success('Ticket unassigned');
  },
});

await unassignMutation.mutateAsync({
  ticketId: ticket.id,
  expectedUpdatedAt: ticket.updatedAt,
});
```

**Error Responses**:
- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User not authorized
- `NOT_FOUND` - Ticket ID does not exist
- `BAD_REQUEST` - Assignment cutoff passed
- `BAD_REQUEST` - Cannot unassign checked-in ticket
- `CONFLICT` - Ticket modified concurrently

---

### `tickets.generateQRCode` (DEPRECATED - Removed)

**Status**: ❌ **REMOVED** in QR Code Storage Optimization (November 2025)

**Replacement**: QR codes are now pre-generated during ticket creation and stored in the `qrCodeData` field. Use the `ticket.qrCodeData` field directly:

```typescript
// OLD (removed)
const { data } = api.tickets.generateQRCode.useQuery({
  ticketId: ticketId,
  format: 'dataUrl',
  size: 400,
});

// NEW (use stored QR code)
const ticket = api.tickets.getById.useQuery({ ticketId });
<img src={ticket.qrCodeData} alt={`QR Code for ${ticket.ticketNumber}`} />
```

**Migration Notes**:
- All new tickets created after November 2025 have pre-generated QR codes
- Existing tickets were migrated via `scripts/backfill-ticket-qr-codes.ts`
- QR codes are generated once during ticket creation (100-150ms overhead)
- Performance improvement: 300-500ms faster page loads, 100-300ms faster emails

---

### `tickets.checkIn` (Deferred to Future Sprint)

**Type**: Mutation  
**Auth**: Protected (event organizer or staff)  
**Purpose**: Check in an attendee using their ticket

**Note**: Full implementation deferred. See specification for US4 (Check-in Tracking) in separate sprint.

**Planned Input Schema**:
```typescript
{
  ticketNumber: string;  // From QR code scan
  staffId?: string;      // Who performed check-in
}
```

**Planned Business Logic**:
1. Verify user has check-in permission for event
2. Look up ticket by ticketNumber
3. Verify ticket is assigned
4. Check if already checked in (return conflict with attendee name)
5. Update ticket (set isCheckedIn = true, checkedInAt = now, checkedInBy = staffId)
6. Return success with attendee info

---

### `tickets.getCheckInMetrics` (Deferred to Future Sprint)

**Type**: Query  
**Auth**: Protected (event organizer)  
**Purpose**: Get real-time check-in statistics for an event

**Note**: Full implementation deferred to check-in tracking sprint.

**Planned Output Schema**:
```typescript
{
  eventId: string;
  totalTickets: number;
  assignedTickets: number;
  unassignedTickets: number;
  checkedInTickets: number;
  notCheckedInTickets: number;
  checkInPercentage: number; // 0-100
  
  byTicketType: Array<{
    ticketTypeId: string;
    ticketTypeName: string;
    total: number;
    checkedIn: number;
  }>;
  
  recentCheckIns: Array<{
    ticketNumber: string;
    attendeeName: string;
    checkedInAt: Date;
  }>;
}
```

---

## Validation

### Zod Schemas

Located in `src/server/api/routers/tickets.ts`:

```typescript
import { z } from 'zod';

// List input validation
const listTicketsInput = z.object({
  registrationId: z.string().optional(),
  eventId: z.string().optional(),
  isAssigned: z.boolean().optional(),
  isCheckedIn: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// Assignment input validation
const assignTicketInput = z.object({
  ticketId: z.string(),
  attendee: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    customData: z.record(z.any()).optional(),
  }),
  expectedUpdatedAt: z.date(),
});
```

### Custom Field Validation

Custom fields validated against event's schema:

```typescript
// Event has custom field schema
const event = await db.event.findUnique({
  where: { id: eventId },
  select: { customFields: true },
});

// Validate attendee.customData against schema
const customFieldSchema = z.object({
  dietary: z.enum(['None', 'Vegetarian', 'Vegan', 'Gluten-Free']).optional(),
  tshirtSize: z.enum(['S', 'M', 'L', 'XL']).optional(),
  // ... dynamic based on event.customFields
});

customFieldSchema.parse(input.attendee.customData);
```

---

## Authorization

### Buyer Access

Buyers can manage tickets from their registrations:

```typescript
// Check if user is buyer
const registration = await db.registration.findUnique({
  where: { id: ticket.registrationId },
  select: { userId: true },
});

if (registration.userId !== ctx.session.user.id) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'You can only manage your own tickets',
  });
}
```

### Organizer Access

Organizers can manage all tickets for their events:

```typescript
// Check if user is event organizer
const event = await db.event.findUnique({
  where: { id: ticket.eventId },
  select: { organizerId: true },
});

if (event.organizerId !== ctx.session.user.id) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'You are not the event organizer',
  });
}
```

---

## Concurrency Handling

### Optimistic Locking

Prevents race conditions during assignment:

```typescript
// Client sends last known updatedAt
const input = {
  ticketId: 'ticket123',
  attendee: { ... },
  expectedUpdatedAt: ticket.updatedAt, // From previous fetch
};

// Server checks if ticket was modified
const currentTicket = await db.ticket.findUnique({
  where: { id: input.ticketId },
});

if (currentTicket.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
  throw new TRPCError({
    code: 'CONFLICT',
    message: 'This ticket was modified by another user. Please refresh and try again.',
  });
}

// Proceed with update
await db.ticket.update({
  where: { id: input.ticketId },
  data: { /* ... */ },
});
```

**Client Handling**:
```typescript
const assignMutation = api.tickets.assign.useMutation({
  onError: (error) => {
    if (error.data?.code === 'CONFLICT') {
      // Refresh ticket data
      queryClient.invalidateQueries(['tickets', ticketId]);
      toast.error('Ticket was modified. Please try again.');
    }
  },
});
```

---

## Email Integration

### Ticket Assignment Email

Sent when ticket is assigned to attendee with **inline QR code** embedded using CID (Content-ID) attachments:

```typescript
import { sendEmail, dataUrlToAttachment } from '@/server/services/email';
import TicketAssignedEmail from '@/emails/ticket-assigned';

// Convert QR code data URL to inline attachment
const qrCodeAttachment = dataUrlToAttachment(
  ticket.qrCodeData,
  'ticket-qr-code',
  `${ticket.ticketNumber}.png`
);

await sendEmail({
  to: attendee.email,
  subject: `Your ticket for ${event.name} is ready! 🎟️`,
  react: TicketAssignedEmail({
    attendeeName: attendee.name,
    eventName: event.name,
    ticketNumber: ticket.ticketNumber,
    ticketUrl: `${baseUrl}/tickets/${ticket.id}`,
    qrCodeDataUrl: ticket.qrCodeData,
    qrCodeCid: 'ticket-qr-code', // Reference to inline attachment
  }),
  attachments: [qrCodeAttachment],
});
```

**How it works**:
- QR code stored as base64 data URL is converted to an email attachment
- Attachment is marked as `inline` with a unique Content-ID (`ticket-qr-code`)
- Email template references the image using `<img src="cid:ticket-qr-code" />`
- Email clients display the QR code inline instead of as a downloadable attachment
- Better email client compatibility compared to raw data URLs (which are often blocked)

### Ticket Reassignment Email

Sent to new attendee on reassignment:

```typescript
import TicketReassignedEmail from '@/emails/ticket-reassigned';

await sendEmail({
  to: newAttendee.email,
  subject: `Your ticket for ${event.name} (Reassigned)`,
  react: TicketReassignedEmail({
    attendeeName: newAttendee.name,
    eventName: event.name,
    ticketNumber: ticket.ticketNumber,
    ticketUrl: `${baseUrl}/tickets/${ticket.id}`,
  }),
});
```

---

## Error Handling

### Assignment Cutoff Validation

```typescript
// Get event's assignment cutoff
const event = await db.event.findUnique({
  where: { id: ticket.eventId },
  select: {
    assignmentCutoffType: true,
    assignmentCutoffTime: true,
    startDate: true,
  },
});

// Calculate actual cutoff time
let cutoffTime: Date;

switch (event.assignmentCutoffType) {
  case 'event_start':
    cutoffTime = event.startDate;
    break;
  case '1h_before':
    cutoffTime = new Date(event.startDate.getTime() - 3600000);
    break;
  case '24h_before':
    cutoffTime = new Date(event.startDate.getTime() - 86400000);
    break;
  case 'custom':
    cutoffTime = event.assignmentCutoffTime!;
    break;
}

// Check if cutoff passed
if (new Date() > cutoffTime) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Assignment cutoff time has passed',
  });
}
```

### Common Error Patterns

```typescript
// Ticket not found
if (!ticket) {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: 'Ticket not found',
  });
}

// Cannot unassign checked-in ticket
if (ticket.isCheckedIn) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Cannot unassign a checked-in ticket',
  });
}

// Custom field validation error
try {
  customFieldSchema.parse(input.attendee.customData);
} catch (error) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: `Custom field validation failed: ${error.message}`,
  });
}
```

---

## Performance Optimization

### Database Indexes

Required indexes for ticket queries:

```prisma
@@index([ticketNumber])        // Quick lookup by ticket number
@@index([registrationId])      // List tickets by registration
@@index([eventId])             // List tickets by event
@@index([eventId, isAssigned]) // Filter by assignment status
@@index([eventId, isCheckedIn]) // Filter by check-in status (future)
@@index([qrCodeData])          // QR code validation lookups
```

### Caching Strategy

**QR Code Storage** (No caching needed):
```typescript
// QR codes are pre-generated and stored in database
// No runtime generation = no caching required
const ticket = await db.ticket.findUnique({
  where: { id: ticketId },
  select: { qrCodeData: true }, // PNG data URL ready to use
});

return ticket.qrCodeData; // Instant retrieval
```

**Ticket Lookup**:
```typescript
// Cache ticket by number (1-hour TTL)
const cacheKey = `ticket:${ticketNumber}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const ticket = await db.ticket.findUnique({
  where: { ticketNumber },
  include: { /* ... */ },
});

await redis.setex(cacheKey, 3600, JSON.stringify(ticket));

return ticket;
```

---

## Related Files

- **Router**: `src/server/api/routers/tickets.ts`
- **Utilities**: `src/lib/tickets/generate-ticket-number.ts`, `src/lib/qr-code/generator.ts`
- **Email Templates**: `emails/ticket-assigned.tsx`, `emails/ticket-reassigned.tsx`
- **Database**: `prisma/schema.prisma` (Ticket, Attendee models)

---

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { listTicketsInput } from '@/server/api/routers/tickets';

describe('Ticket router schemas', () => {
  it('should validate list input with default limit', () => {
    const input = { registrationId: 'cm3abc123' };
    const parsed = listTicketsInput.parse(input);
    expect(parsed.limit).toBe(20);
  });

  it('should reject limit > 100', () => {
    const input = { limit: 150 };
    expect(() => listTicketsInput.parse(input)).toThrow();
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createCaller } from '@/server/api/routers/tickets';
import { createMockContext } from '@/tests/helpers';

describe('tickets.assign', () => {
  it('should assign ticket to attendee', async () => {
    const ctx = createMockContext({ userId: 'buyer123' });
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
});
```

---

## Summary

The tickets router provides 7 procedures (5 implemented, 2 deferred):
- **list**: Browse tickets with filters
- **getByNumber**: Lookup ticket by QR code scan
- **assign**: Assign ticket to attendee with optimistic locking
- **unassign**: Remove assignment (before cutoff)
- **generateQRCode**: Create QR code images
- **checkIn** (deferred): Mark ticket as checked-in
- **getCheckInMetrics** (deferred): Real-time check-in stats

All procedures use Zod validation, tRPC error codes, and enforce proper authorization.
