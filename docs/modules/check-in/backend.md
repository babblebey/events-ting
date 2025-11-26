# Check-In Backend Documentation

## Overview

The Check-In backend provides a type-safe tRPC API for managing attendee check-ins at events. It handles QR code validation, duplicate prevention, permission checking, and real-time metrics calculation.

## Router Location

**File**: `src/server/api/routers/check-in.ts`

**Router Name**: `checkInRouter`

**Mount Point**: `checkIn` (e.g., `trpc.checkIn.listAttendees.useQuery()`)

## API Procedures

### 1. `listAttendees` (Query)

Lists all attendees for an event with check-in status and filtering support.

#### Purpose
- Display paginated attendee list on check-in dashboard
- Support search by ticket number
- Filter by check-in status
- Provide timezone context for timestamps

#### Input Schema

```typescript
{
  eventId: string;          // Event ID (UUID)
  filter?: string;          // "all" | "checkedIn" | "notCheckedIn" (default: "all")
  search?: string;          // Search by ticket number (optional)
  page?: number;            // Page number, 1-indexed (default: 1)
  pageSize?: number;        // Items per page (default: 50, max: 100)
}
```

#### Output Schema

```typescript
{
  attendees: Array<{
    id: string;                    // Ticket ID
    ticketNumber: string;          // Unique ticket number
    isCheckedIn: boolean;          // Check-in status
    checkedInAt: Date | null;      // Check-in timestamp (UTC)
    attendee: {
      id: string;
      name: string;
      email: string;
    } | null;
    registration: {                // Buyer information
      id: string;
      name: string;
      email: string;
    };
  }>;
  pagination: {
    total: number;                 // Total matching attendees
    page: number;                  // Current page
    pageSize: number;              // Items per page
    totalPages: number;            // Total pages
  };
  eventTimezone: string;           // Event timezone (e.g., "America/New_York")
}
```

#### Permission Requirements
- User must be authenticated
- User must be team member of the event
- User must have `CHECKIN` module permission (or be OWNER)
- User must have `ACTIVE` status (not PENDING or REMOVED)

#### Implementation Details

**Database Query**:
```typescript
await prisma.ticket.findMany({
  where: {
    registration: { eventId },
    // If filter = "checkedIn"
    isCheckedIn: true,
    // If filter = "notCheckedIn"
    isCheckedIn: false,
    // If search provided
    ticketNumber: { contains: search, mode: "insensitive" },
  },
  select: {
    id: true,
    ticketNumber: true,
    isCheckedIn: true,
    checkedInAt: true,
    attendee: {
      select: { id: true, name: true, email: true },
    },
    registration: {
      select: { id: true, name: true, email: true },
    },
  },
  orderBy: { createdAt: "desc" },
  skip: (page - 1) * pageSize,
  take: pageSize,
});
```

**Pagination Calculation**:
- Total count query runs in parallel with data query
- `totalPages = Math.ceil(total / pageSize)`
- Empty results return `{ attendees: [], pagination: {...}, eventTimezone }`

#### Error Codes
- `NOT_FOUND`: Event not found
- `FORBIDDEN`: No CHECKIN permission
- `UNAUTHORIZED`: Not authenticated
- `BAD_REQUEST`: Invalid page/pageSize

#### Usage Example

```typescript
// In a React component
const { data, isLoading } = trpc.checkIn.listAttendees.useQuery({
  eventId: "event-uuid",
  filter: "notCheckedIn",
  search: "TKT-2025",
  page: 1,
  pageSize: 50,
});
```

---

### 2. `checkIn` (Mutation)

Checks in a ticket by ticket number or QR code data. Idempotent operation.

#### Purpose
- Mark attendee as checked in
- Record check-in timestamp and operator
- Prevent duplicate check-ins
- Support both manual and QR code check-in

#### Input Schema

```typescript
{
  eventId: string;          // Event ID (UUID)
  ticketNumber?: string;    // Ticket number (e.g., "TKT-2025-ABC123")
  qrCodeData?: string;      // Raw QR code data (alternative to ticketNumber)
}
```

**Note**: Must provide either `ticketNumber` OR `qrCodeData` (not both).

#### Output Schema

```typescript
{
  success: boolean;                    // Always true if no error thrown
  alreadyCheckedIn: boolean;           // True if already checked in before this call
  ticket: {
    id: string;
    ticketNumber: string;
    isCheckedIn: boolean;              // Always true after check-in
    checkedInAt: Date;                 // UTC timestamp
    attendee: {
      id: string;
      name: string;
      email: string;
    } | null;
    registration: {
      id: string;
      name: string;
      email: string;
    };
  };
  eventTimezone: string;               // Event timezone for display
}
```

#### Permission Requirements
- User must be authenticated
- User must be team member of the event
- User must have `CHECKIN` module permission (or be OWNER)
- User must have `ACTIVE` status

#### Implementation Details

**1. QR Code Parsing** (if `qrCodeData` provided):
```typescript
import { parseQRCode } from "~/lib/qr-code";

const ticketNumber = parseQRCode(qrCodeData);
// Supports: simple string, JSON with ticketNumber field, future JWT
```

**2. Ticket Lookup**:
```typescript
const ticket = await prisma.ticket.findFirst({
  where: {
    ticketNumber,
    registration: { eventId },
  },
  include: {
    attendee: { select: { id: true, name: true, email: true } },
    registration: { select: { id: true, name: true, email: true } },
  },
});

if (!ticket) {
  throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
}
```

**3. Check-In Update** (Idempotent):
```typescript
const updatedTicket = await prisma.ticket.update({
  where: { id: ticket.id },
  data: {
    isCheckedIn: true,
    checkedInAt: new Date(), // UTC
    checkedInBy: ctx.session.user.id,
  },
});

return {
  success: true,
  alreadyCheckedIn: ticket.isCheckedIn, // Original state before update
  ticket: updatedTicket,
  eventTimezone: event.timezone,
};
```

**4. Idempotency**:
- If `ticket.isCheckedIn === true` before update, `alreadyCheckedIn: true`
- Update still runs (overwrites checkedInAt and checkedInBy)
- No error thrown for duplicate check-in
- UI can show "Already Checked In" message

#### Error Codes
- `NOT_FOUND`: Ticket or event not found
- `FORBIDDEN`: No CHECKIN permission
- `UNAUTHORIZED`: Not authenticated
- `BAD_REQUEST`: Invalid QR code format, missing ticketNumber/qrCodeData

#### Usage Example

```typescript
// Via ticket number
const { mutate: checkIn } = trpc.checkIn.checkIn.useMutation({
  onSuccess: (data) => {
    if (data.alreadyCheckedIn) {
      toast.warning("Attendee was already checked in");
    } else {
      toast.success("Check-in successful!");
    }
  },
});

checkIn({ eventId: "event-uuid", ticketNumber: "TKT-2025-ABC123" });

// Via QR code
checkIn({ eventId: "event-uuid", qrCodeData: '{"ticketNumber":"TKT-2025-ABC123"}' });
```

---

### 3. `getMetrics` (Query)

Retrieves real-time check-in statistics for an event.

#### Purpose
- Display check-in progress on dashboard
- Show recent check-ins feed
- Calculate completion percentage
- Provide overview of check-in status

#### Input Schema

```typescript
{
  eventId: string;          // Event ID (UUID)
}
```

#### Output Schema

```typescript
{
  totalTickets: number;              // Total tickets sold
  checkedInCount: number;            // Number checked in
  notCheckedInCount: number;         // Number not checked in
  checkInPercentage: number;         // Percentage (0-100, rounded to 1 decimal)
  recentCheckIns: Array<{
    id: string;                      // Ticket ID
    ticketNumber: string;
    checkedInAt: Date;               // UTC timestamp
    attendee: {
      id: string;
      name: string;
    } | null;
    registration: {                  // Buyer (fallback if no attendee)
      id: string;
      name: string;
    };
  }>;                                // Last 10 check-ins, ordered by recency
}
```

#### Permission Requirements
- User must be authenticated
- User must be team member of the event
- User must have `CHECKIN` module permission (or be OWNER)
- User must have `ACTIVE` status

#### Implementation Details

**Parallel Query Execution**:
```typescript
const [totalTickets, checkedInCount, recentCheckIns] = await Promise.all([
  // Total tickets
  prisma.ticket.count({
    where: { registration: { eventId } },
  }),
  
  // Checked in count
  prisma.ticket.count({
    where: { 
      registration: { eventId },
      isCheckedIn: true,
    },
  }),
  
  // Recent check-ins (last 10)
  prisma.ticket.findMany({
    where: { 
      registration: { eventId },
      isCheckedIn: true,
    },
    select: {
      id: true,
      ticketNumber: true,
      checkedInAt: true,
      attendee: { select: { id: true, name: true } },
      registration: { select: { id: true, name: true } },
    },
    orderBy: { checkedInAt: "desc" },
    take: 10,
  }),
]);
```

**Calculation**:
```typescript
const notCheckedInCount = totalTickets - checkedInCount;
const checkInPercentage = totalTickets > 0 
  ? Math.round((checkedInCount / totalTickets) * 1000) / 10  // 1 decimal place
  : 0;
```

#### Error Codes
- `NOT_FOUND`: Event not found
- `FORBIDDEN`: No CHECKIN permission
- `UNAUTHORIZED`: Not authenticated

#### Usage Example

```typescript
const { data: metrics, isLoading } = trpc.checkIn.getMetrics.useQuery(
  { eventId: "event-uuid" },
  { refetchInterval: 10000 } // Auto-refresh every 10 seconds
);

// Display
console.log(`${metrics.checkedInCount} / ${metrics.totalTickets} (${metrics.checkInPercentage}%)`);
```

---

### 4. `getTicketDetails` (Mutation)

Fetches ticket details before check-in for confirmation modal.

#### Purpose
- Display attendee information before check-in
- Show if already checked in
- Provide buyer information
- Support QR code and manual lookup

#### Input Schema

```typescript
{
  eventId: string;          // Event ID (UUID)
  ticketNumber: string;     // Ticket number to look up
}
```

#### Output Schema

```typescript
{
  ticket: {
    id: string;
    ticketNumber: string;
    isCheckedIn: boolean;
    checkedInAt: Date | null;
    attendee: {
      id: string;
      name: string;
      email: string;
    } | null;
    registration: {
      id: string;
      name: string;
      email: string;
    };
  };
  eventTimezone: string;
}
```

#### Permission Requirements
- User must be authenticated
- User must be team member of the event
- User must have `CHECKIN` module permission (or be OWNER)
- User must have `ACTIVE` status

#### Implementation Details

**Ticket Lookup**:
```typescript
const ticket = await prisma.ticket.findFirst({
  where: {
    ticketNumber,
    registration: { eventId },
  },
  select: {
    id: true,
    ticketNumber: true,
    isCheckedIn: true,
    checkedInAt: true,
    attendee: {
      select: { id: true, name: true, email: true },
    },
    registration: {
      select: { id: true, name: true, email: true },
    },
  },
});

if (!ticket) {
  throw new TRPCError({ 
    code: "NOT_FOUND", 
    message: "Ticket not found for this event" 
  });
}
```

#### Error Codes
- `NOT_FOUND`: Ticket or event not found
- `FORBIDDEN`: No CHECKIN permission
- `UNAUTHORIZED`: Not authenticated
- `BAD_REQUEST`: Missing ticketNumber

#### Usage Example

```typescript
const { mutate: getDetails } = trpc.checkIn.getTicketDetails.useMutation({
  onSuccess: (data) => {
    setDrawerData(data.ticket);
    setDrawerOpen(true);
  },
  onError: (error) => {
    toast.error(error.message);
  },
});

getDetails({ eventId: "event-uuid", ticketNumber: "TKT-2025-ABC123" });
```

---

## Database Schema

### Ticket Model

The check-in module uses these fields from the `Ticket` model:

```prisma
model Ticket {
  id            String    @id @default(cuid())
  ticketNumber  String    @unique          // Unique identifier
  qrCodeData    String    @unique          // QR code content
  
  // Check-in fields
  isCheckedIn   Boolean   @default(false)  // Check-in status
  checkedInAt   DateTime?                  // Check-in timestamp (UTC)
  checkedInBy   String?                    // Team member ID who checked in
  
  // Relationships
  registrationId String
  registration   Registration @relation(fields: [registrationId], references: [id])
  
  assignedToId   String?
  attendee       Attendee?  @relation(fields: [assignedToId], references: [id])
  
  checkedInByUser User?    @relation("CheckedInByUser", fields: [checkedInBy], references: [id])
  
  @@index([ticketNumber])
  @@index([qrCodeData])
  @@index([isCheckedIn])
  @@index([registrationId])
}
```

#### Check-In Field Details

| Field | Type | Purpose | Notes |
|-------|------|---------|-------|
| `isCheckedIn` | Boolean | Quick status check | Default: false, indexed for fast filtering |
| `checkedInAt` | DateTime? | Audit timestamp | UTC, nullable (null = not checked in) |
| `checkedInBy` | String? | Audit trail | User ID of team member, nullable |

**No Schema Migration Required**: These fields already exist in the database.

#### Indexes

Performance-optimized indexes for check-in operations:

- **ticketNumber**: Fast lookup during manual check-in
- **qrCodeData**: Fast lookup during QR scanning
- **isCheckedIn**: Fast filtering by check-in status
- **registrationId**: Fast event scoping

---

## Utilities

### QR Code Parsing

**File**: `src/lib/qr-code.ts`

#### `parseQRCode(qrCodeData: string): string`

Extracts ticket number from QR code data with multiple format support.

**Supported Formats**:

1. **Simple Ticket Number** (most common):
   ```typescript
   parseQRCode("TKT-2025-ABC123") // Returns: "TKT-2025-ABC123"
   ```

2. **JSON Format**:
   ```typescript
   parseQRCode('{"ticketNumber":"TKT-2025-ABC123","eventId":"..."}')
   // Returns: "TKT-2025-ABC123"
   ```

3. **JWT Token** (future):
   ```typescript
   parseQRCode("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
   // Returns: ticket number from decoded payload
   ```

**Error Handling**:
```typescript
try {
  const ticketNumber = parseQRCode(qrData);
} catch (error) {
  // User-friendly error messages
  // "Invalid QR code format"
  // "QR code is missing ticket number"
}
```

**Implementation**:
```typescript
export function parseQRCode(qrCodeData: string): string {
  // Try simple ticket number
  if (qrCodeData.startsWith("TKT-")) {
    return qrCodeData;
  }
  
  // Try JSON format
  try {
    const parsed = JSON.parse(qrCodeData);
    if (parsed.ticketNumber) {
      return parsed.ticketNumber;
    }
  } catch {
    // Not JSON, continue to JWT check
  }
  
  // Try JWT (future)
  // ...
  
  throw new Error("Invalid QR code format");
}
```

---

### Date Utilities

**File**: `src/lib/utils/date.ts`

#### `formatInEventTimezone(date: Date, timezone: string, format: string): string`

Formats dates in the event's timezone for consistent display.

**Usage**:
```typescript
import { formatInTimeZone } from "date-fns-tz";

const displayTime = formatInTimeZone(
  ticket.checkedInAt,
  event.timezone,
  "MMM d, yyyy 'at' h:mm a zzz"
);
// Output: "Nov 26, 2025 at 3:45 PM EST"
```

**Common Formats**:
- Check-in timestamp: `"MMM d, yyyy 'at' h:mm a zzz"`
- Short date: `"MMM d, yyyy"`
- Time only: `"h:mm a"`

---

## Permission System

### `hasTeamModulePermission` Utility

**File**: `src/server/api/lib/team-permissions.ts`

Checks if a user has permission to access a specific module for an event.

#### Function Signature

```typescript
async function hasTeamModulePermission(
  userId: string,
  eventId: string,
  module: ModulePermission // "CHECKIN" for check-in
): Promise<boolean>
```

#### Permission Logic

```typescript
const teamMember = await prisma.teamMember.findFirst({
  where: {
    userId,
    event: { id: eventId },
    status: "ACTIVE", // Must be active
  },
  select: {
    role: true,
    modulePermissions: true,
  },
});

if (!teamMember) return false;

// Owners have all permissions
if (teamMember.role === "OWNER") return true;

// Collaborators need specific module permission
return teamMember.modulePermissions.includes(module);
```

#### Usage in Procedures

```typescript
const hasPermission = await hasTeamModulePermission(
  ctx.session.user.id,
  input.eventId,
  "CHECKIN"
);

if (!hasPermission) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You don't have permission to check in attendees",
  });
}
```

---

## API Contracts

**File**: `specs/004-attendee-check-in/contracts/check-in-api.ts`

All input/output schemas are defined using Zod with exported TypeScript types.

### Schema Definitions

```typescript
import { z } from "zod";

// List Attendees
export const ListAttendeesInputSchema = z.object({
  eventId: z.string().uuid(),
  filter: z.enum(["all", "checkedIn", "notCheckedIn"]).default("all"),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
});

export type ListAttendeesInput = z.infer<typeof ListAttendeesInputSchema>;

// Check In
export const CheckInInputSchema = z.object({
  eventId: z.string().uuid(),
  ticketNumber: z.string().optional(),
  qrCodeData: z.string().optional(),
}).refine(
  (data) => !!(data.ticketNumber || data.qrCodeData),
  { message: "Either ticketNumber or qrCodeData must be provided" }
);

export type CheckInInput = z.infer<typeof CheckInInputSchema>;

// Get Metrics
export const GetMetricsInputSchema = z.object({
  eventId: z.string().uuid(),
});

export type GetMetricsInput = z.infer<typeof GetMetricsInputSchema>;

// Get Ticket Details
export const GetTicketDetailsInputSchema = z.object({
  eventId: z.string().uuid(),
  ticketNumber: z.string().min(1),
});

export type GetTicketDetailsInput = z.infer<typeof GetTicketDetailsInputSchema>;
```

### Error Constants

```typescript
export const ERROR_CODES = {
  TICKET_NOT_FOUND: "Ticket not found for this event",
  EVENT_NOT_FOUND: "Event not found",
  NO_PERMISSION: "You don't have permission to check in attendees",
  INVALID_QR_CODE: "Invalid QR code format",
  MISSING_TICKET_DATA: "Either ticketNumber or qrCodeData must be provided",
} as const;
```

---

## Error Handling

### Error Response Format

All errors follow tRPC's standard error format:

```typescript
{
  error: {
    code: "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST" | "UNAUTHORIZED" | "INTERNAL_SERVER_ERROR",
    message: string,
    data?: {
      code?: string,
      httpStatus?: number,
      path?: string,
    }
  }
}
```

### Common Error Scenarios

#### 1. Permission Denied

```typescript
throw new TRPCError({
  code: "FORBIDDEN",
  message: "You don't have permission to check in attendees",
});
```

**When**: User lacks CHECKIN permission or not ACTIVE team member

**Client Handling**: Redirect to event dashboard, show error toast

#### 2. Ticket Not Found

```typescript
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Ticket not found for this event",
});
```

**When**: Invalid ticket number or QR code for the event

**Client Handling**: Show error in drawer, offer manual search

#### 3. Invalid QR Code

```typescript
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Invalid QR code format",
});
```

**When**: QR code cannot be parsed by `parseQRCode`

**Client Handling**: Show error, suggest manual entry

#### 4. Event Not Found

```typescript
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Event not found",
});
```

**When**: Invalid eventId provided

**Client Handling**: Redirect to events list

---

## Performance Optimizations

### 1. Database Indexes

All check-in queries use indexed fields:
- `ticketNumber` - unique index for O(1) lookups
- `qrCodeData` - unique index for QR scanning
- `isCheckedIn` - non-unique index for filtering
- `registrationId` - foreign key index for event scoping

### 2. Parallel Queries

Metrics calculation uses `Promise.all`:
```typescript
const [total, checkedIn, recent] = await Promise.all([
  countTotal(),
  countCheckedIn(),
  getRecentCheckIns(),
]);
```

**Benefit**: 3 queries run concurrently instead of sequentially

### 3. Selective Field Loading

Only load required fields with Prisma `select`:
```typescript
select: {
  id: true,
  ticketNumber: true,
  isCheckedIn: true,
  // Don't load qrCodeData, qrCodeUrl, etc.
}
```

**Benefit**: Reduces data transfer and memory usage

### 4. Pagination

Default page size: 50 items
- Prevents loading thousands of attendees at once
- Uses `skip` and `take` for efficient offset pagination
- Total count calculated in parallel

### 5. Idempotent Updates

Check-in mutation always succeeds, never throws duplicate error:
- Reduces error handling complexity
- Prevents UI confusion on retry
- `alreadyCheckedIn` flag informs UI

---

## Testing Considerations

### Unit Tests

**Test Cases**:
1. ✅ List attendees with no filters
2. ✅ List attendees filtered by check-in status
3. ✅ List attendees with search term
4. ✅ List attendees with pagination
5. ✅ Check in via ticket number
6. ✅ Check in via QR code
7. ✅ Check in already checked-in ticket (idempotency)
8. ✅ Get metrics with zero tickets
9. ✅ Get metrics with partial check-ins
10. ✅ Get ticket details
11. ✅ Permission denied scenarios
12. ✅ Invalid QR code formats
13. ✅ Ticket not found scenarios

### Integration Tests

**Test Scenarios**:
1. ✅ Check in multiple attendees concurrently
2. ✅ Verify checkedInBy is set correctly
3. ✅ Verify timestamps are in UTC
4. ✅ Verify metrics update after check-in
5. ✅ Verify pagination integrity
6. ✅ Verify search works case-insensitively
7. ✅ Verify filters exclude opposite status

### Mock Data

```typescript
const mockTicket = {
  id: "ticket-1",
  ticketNumber: "TKT-2025-ABC123",
  qrCodeData: "TKT-2025-ABC123",
  isCheckedIn: false,
  checkedInAt: null,
  checkedInBy: null,
  attendee: {
    id: "attendee-1",
    name: "John Doe",
    email: "john@example.com",
  },
  registration: {
    id: "reg-1",
    name: "Jane Doe",
    email: "jane@example.com",
  },
};
```

---

## Security Best Practices

### 1. Always Verify Permissions

Every procedure checks:
- ✅ User authenticated (`ctx.session.user`)
- ✅ User is team member of event
- ✅ User has CHECKIN permission
- ✅ User has ACTIVE status

### 2. Server-Side Validation

Never trust client input:
- ✅ Zod schema validation on all inputs
- ✅ UUID validation for IDs
- ✅ Ticket number format validation
- ✅ QR code parsing with error handling

### 3. Event Scoping

All queries scoped to specific event:
```typescript
where: {
  registration: { eventId },
  ticketNumber,
}
```

**Prevents**: Cross-event data access

### 4. Audit Trail

Every check-in records:
- ✅ Who performed it (`checkedInBy`)
- ✅ When it occurred (`checkedInAt`)
- ✅ Which ticket (`id`, `ticketNumber`)

**Enables**: Dispute resolution, analytics, compliance

### 5. Idempotency

Check-in mutation is safe to retry:
- ✅ No duplicate creation
- ✅ No error on re-check-in
- ✅ Consistent state

---

## Related Documentation

- [Check-In Module Overview](./README.md)
- [Frontend Documentation](./frontend.md)
- [Workflows](./workflows.md)
- [API Contracts](../../specs/004-attendee-check-in/contracts/check-in-api.ts)
