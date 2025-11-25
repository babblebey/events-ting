# Quickstart: Attendee Check-In Service

**Feature**: 004-attendee-check-in  
**Last Updated**: 2025-11-24

## Overview

The check-in service allows event team members to process attendee arrivals using two methods:
1. **Manual Check-In**: Search by ticket number in a list view
2. **QR Code Scanning**: Scan ticket QR codes for rapid check-in

**Route**: `/events/[slug]/check-in`  
**Permission Required**: `CHECKIN` module access  
**Authentication**: Required (NextAuth.js session)

---

## Quick Start (For Developers)

### 1. Access the Check-In Page

```typescript
// Navigate to check-in page
https://yourapp.com/events/my-event-slug/check-in

// Route structure
src/app/events/[slug]/check-in/page.tsx
```

**Requirements**:
- ✅ User must be logged in
- ✅ User must be an ACTIVE team member for the event
- ✅ User must have CHECKIN module permission (or be event OWNER)

### 2. Use the Check-In API

```typescript
import { api } from "@/trpc/react";

function CheckInComponent({ eventId }: { eventId: string }) {
  // List attendees
  const { data, isLoading } = api.checkIn.listAttendees.useQuery({
    eventId,
    filter: "not-checked-in", // "all" | "checked-in" | "not-checked-in"
    search: "",                // Optional: filter by ticket number
    page: 0,
    pageSize: 50,
  });

  // Check in a ticket
  const checkInMutation = api.checkIn.checkInTicket.useMutation({
    onSuccess: (result) => {
      if (result.alreadyCheckedIn) {
        toast.info("Ticket already checked in");
      } else {
        toast.success("Check-in successful!");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCheckIn = (ticketNumber: string) => {
    checkInMutation.mutate({ eventId, ticketNumber });
  };

  // ...render UI
}
```

### 3. Testing Locally

#### Create Test Data

```typescript
// Run database seed (if not already run)
pnpm db:seed

// Or create test event with tickets
import { db } from "@/server/db";

const event = await db.event.create({
  data: {
    name: "Test Event",
    slug: "test-event-checkin",
    // ...other fields
  },
});

// Create test tickets
await db.ticket.createMany({
  data: [
    {
      ticketNumber: "TEST-001",
      qrCodeData: "TEST-QR-001",
      eventId: event.id,
      // ...other fields
    },
    // ...more tickets
  ],
});
```

#### Grant CHECKIN Permission

```typescript
// Add yourself as team member with CHECKIN permission
await db.teamMember.create({
  data: {
    eventId: "your-event-id",
    userId: "your-user-id",
    email: "you@example.com",
    role: "OWNER", // or COLLABORATOR
    status: "ACTIVE",
    modulePermissions: ["CHECKIN"], // Required for COLLABORATOR
    invitedById: "your-user-id",
  },
});
```

#### Test QR Code Scanning

```typescript
// Generate QR code for testing
// Option 1: Use existing qrCodeData from database
const ticket = await db.ticket.findFirst({
  where: { eventId: "your-event-id" },
  select: { qrCodeData: true },
});

// Option 2: Generate QR code image
import QRCode from "qrcode";

const qrCodeImageUrl = await QRCode.toDataURL(ticket.qrCodeData);
// Display this image and scan with camera

// Option 3: Mock camera input in tests
// (See testing section below)
```

---

## User Workflows

### Workflow 1: Manual Check-In (List View)

**User Story**: Team member checks in attendees by searching ticket numbers.

**Steps**:
1. Navigate to `/events/my-event/check-in`
2. View list of all attendees (default: not-checked-in filter)
3. Use search bar to find specific ticket number
4. Click "Check In" button next to attendee
5. Status updates to "Checked In" with timestamp
6. Repeat for next attendee

**UI Components**:
- `CheckInList`: Main attendee list with search and filters
- `SearchBar`: Ticket number search input with debounce
- `AttendeeRow`: Individual row with check-in button
- `StatusBadge`: Visual indicator (green = checked in, gray = not checked in)

---

### Workflow 2: QR Code Check-In

**User Story**: Team member rapidly checks in attendees by scanning QR codes.

**Steps**:
1. Navigate to `/events/my-event/check-in`
2. Click "Scan QR Code" button
3. Allow camera permissions (first time only)
4. Point camera at attendee's ticket QR code
5. System automatically detects QR code and checks in
6. Show success message with attendee name
7. Camera stays active for next scan
8. Press "Close Scanner" when done

**UI Components**:
- `QRScanner`: Camera view with QR detection (client component)
- `ScannerOverlay`: Visual guide for centering QR code
- `ScanResult`: Success/error feedback after scan
- `CameraPermissionPrompt`: Help text for granting camera access

---

### Workflow 3: Status Filtering

**User Story**: Team member monitors check-in progress and identifies who hasn't arrived.

**Steps**:
1. Navigate to `/events/my-event/check-in`
2. Use filter dropdown: "All" | "Checked In" | "Not Checked In"
3. View filtered list
4. See check-in percentage and total counts at top
5. Sort by check-in status (not checked in first)

**UI Components**:
- `FilterDropdown`: Status filter selector
- `CheckInMetrics`: Summary card showing totals and percentage
- `PaginationControls`: Navigate through large attendee lists

---

## API Reference

### Queries

#### `checkIn.listAttendees`

List all attendees for check-in with filtering and search.

**Input**:
```typescript
{
  eventId: string;          // Event CUID
  filter?: "all" | "checked-in" | "not-checked-in"; // Default: "all"
  search?: string;          // Ticket number partial match
  page?: number;            // Default: 0
  pageSize?: number;        // Default: 50, max: 100
}
```

**Output**:
```typescript
{
  attendees: Array<{
    ticketId: string;
    ticketNumber: string;
    isCheckedIn: boolean;
    checkedInAt: Date | null;        // UTC timestamp, display in event timezone
    attendeeName: string | null;     // If ticket assigned
    attendeeEmail: string | null;    // If ticket assigned
    buyerName: string;               // Always present
    buyerEmail: string;              // Always present
    isAssigned: boolean;
  }>;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  eventTimezone: string;              // IANA timezone (e.g., "America/New_York")
}
```

**Errors**:
- `FORBIDDEN`: User lacks CHECKIN permission
- `NOT_FOUND`: Event not found

---

#### `checkIn.getMetrics`

Get check-in statistics for event dashboard.

**Input**:
```typescript
{
  eventId: string;
}
```

**Output**:
```typescript
{
  totalTickets: number;
  checkedInCount: number;
  notCheckedInCount: number;
  checkInPercentage: number;        // 0-100
  recentCheckIns: Array<{
    ticketNumber: string;
    name: string;
    checkedInAt: Date;
  }>;
}
```

---

### Mutations

#### `checkIn.checkInTicket`

Check in a ticket (manual or QR code).

**Input**:
```typescript
{
  eventId: string;
  ticketNumber?: string;    // Provide ticketNumber OR qrCodeData
  qrCodeData?: string;      // Not both
}
```

**Output**:
```typescript
{
  success: boolean;
  alreadyCheckedIn: boolean;
  eventTimezone: string;              // IANA timezone for date formatting
  ticket: {
    ticketId: string;
    ticketNumber: string;
    isCheckedIn: boolean;
    checkedInAt: Date;                // UTC timestamp, display in event timezone
    attendeeName: string | null;
    attendeeEmail: string | null;
    buyerName: string;
    buyerEmail: string;
  };
}
```

**Errors**:
- `NOT_FOUND`: Ticket not found for event
- `FORBIDDEN`: User lacks CHECKIN permission
- `BAD_REQUEST`: Both ticketNumber and qrCodeData provided, or neither

**Idempotency**: Checking in an already checked-in ticket returns `success: true, alreadyCheckedIn: true` with original timestamp.

---

#### `checkIn.undoCheckIn` (Optional)

Undo a check-in (for correcting mistakes).

**Input**:
```typescript
{
  eventId: string;
  ticketId: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  ticket: {
    ticketId: string;
    ticketNumber: string;
    isCheckedIn: boolean;
  };
}
```

---

## Testing

### Timezone Handling

Check-in timestamps are stored in UTC but displayed in the event's timezone.

**Example**:
```typescript
// Event timezone: America/New_York (EST/EDT)
const event = await db.event.findUnique({
  where: { id: eventId },
  select: { timezone: true },
});

// Timestamp stored in database (UTC)
checkedInAt: 2025-11-24T19:30:00.000Z

// Displayed to user (event timezone)
// Using formatEventTime from @/lib/utils/date
formatEventTime(checkedInAt, event.timezone, "M/d/yy, h:mm a zzz")
// Output: "11/24/25, 2:30 PM EST"
```

**Testing Timezone Display**:
```typescript
test("displays check-in time in event timezone", async ({ page }) => {
  // Create event with specific timezone
  const event = await db.event.create({
    data: {
      timezone: "America/Los_Angeles", // PST/PDT
      // ...other fields
    },
  });

  // Check in at known UTC time
  const utcTime = new Date("2025-11-24T19:30:00.000Z");
  
  // Expected display in PST (UTC-8)
  const expectedDisplay = "11/24/25, 11:30 AM PST";
  
  await page.goto(`/events/${event.slug}/check-in`);
  await expect(page.getByText(expectedDisplay)).toBeVisible();
});
```

### Integration Tests

Location: `tests/integration/check-in/`

**Test Files**:
- `manual-check-in.test.ts`: List view and manual check-in flow
- `qr-check-in.test.ts`: QR code scanning flow
- `filtering.test.ts`: Status filters and search
- `permissions.test.ts`: CHECKIN module access control

**Example Test**:
```typescript
import { test, expect } from "@playwright/test";

test("team member can check in attendee manually", async ({ page }) => {
  // Setup: Login as team member with CHECKIN permission
  await page.goto("/auth/signin");
  await page.fill('input[name="email"]', "team@example.com");
  await page.fill('input[name="password"]', "password");
  await page.click('button[type="submit"]');

  // Navigate to check-in page
  await page.goto("/events/test-event/check-in");

  // Verify page loads
  await expect(page.getByText("Check-In")).toBeVisible();

  // Search for ticket
  await page.fill('input[placeholder="Search ticket number"]', "TEST-001");
  await page.waitForTimeout(500); // Wait for debounce

  // Click check-in button
  await page.click('button:has-text("Check In")');

  // Verify success
  await expect(page.getByText("Checked In")).toBeVisible();
  await expect(page.getByText("Check-in successful!")).toBeVisible();
});
```

**QR Code Test with Mock**:
```typescript
test("team member can check in via QR code", async ({ page, context }) => {
  // Mock camera API
  await context.grantPermissions(["camera"]);
  
  await page.addInitScript(() => {
    // Mock getUserMedia to return test video stream
    navigator.mediaDevices.getUserMedia = async () => {
      // Return mock stream
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      return canvas.captureStream() as MediaStream;
    };
  });

  await page.goto("/events/test-event/check-in");
  
  // Open QR scanner
  await page.click('button:has-text("Scan QR Code")');
  
  // Simulate QR code detection (inject QR data)
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("qr-code-detected", {
      detail: { data: "TEST-QR-001" }
    }));
  });

  // Verify check-in success
  await expect(page.getByText("Check-in successful!")).toBeVisible();
});
```

### Contract Tests

Location: `tests/contract/check-in-api.test.ts`

**Example**:
```typescript
import { describe, it, expect } from "vitest";
import { 
  listAttendeesInputSchema, 
  checkInTicketInputSchema 
} from "@/specs/004-attendee-check-in/contracts/check-in-api";

describe("Check-In API Contracts", () => {
  it("validates listAttendees input", () => {
    const validInput = {
      eventId: "clx1234567890",
      filter: "not-checked-in",
      page: 0,
      pageSize: 50,
    };

    expect(() => listAttendeesInputSchema.parse(validInput)).not.toThrow();
  });

  it("rejects invalid eventId format", () => {
    const invalidInput = {
      eventId: "invalid-id",
      filter: "all",
    };

    expect(() => listAttendeesInputSchema.parse(invalidInput)).toThrow();
  });

  it("requires exactly one of ticketNumber or qrCodeData", () => {
    const bothProvided = {
      eventId: "clx1234567890",
      ticketNumber: "TEST-001",
      qrCodeData: "TEST-QR-001",
    };

    expect(() => checkInTicketInputSchema.parse(bothProvided)).toThrow();
  });
});
```

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| List render (50 attendees) | < 2s | With pagination and database indexes |
| QR scan + check-in | < 3s | Includes camera processing + mutation |
| Search query | < 500ms | Debounced to 300ms, server-side filter |
| Check-in mutation | < 200ms | Single database UPDATE |
| Status update (optimistic) | < 100ms | Client-side cache update |
| Real-time sync (invalidation) | < 2s | TanStack Query refetch after mutation |

---

## Troubleshooting

### Camera Not Working

**Problem**: QR scanner shows "Camera access denied" or black screen.

**Solutions**:
1. **Check browser permissions**: Settings → Privacy → Camera → Allow for your site
2. **Use HTTPS**: Camera API requires secure context (localhost or HTTPS)
3. **Test on different browser**: Safari on iOS sometimes blocks camera
4. **Fallback to manual**: Always provide manual ticket number input

### Duplicate Check-Ins

**Problem**: Same attendee checked in twice by different team members.

**Solution**: This is handled gracefully! Second check-in returns `alreadyCheckedIn: true` with original timestamp. No error thrown.

### Permission Denied

**Problem**: User gets "You don't have access to the CHECKIN module" error.

**Solutions**:
1. Verify user is team member: Check TeamMember table for `status: "ACTIVE"`
2. Verify permission: Check `modulePermissions` includes "CHECKIN"
3. Event owners: Automatic access (no CHECKIN needed in permissions array)

### Slow List Loading

**Problem**: Check-in list takes >5s to load for large events.

**Solutions**:
1. Use pagination (default: 50 per page)
2. Verify database indexes exist (already in schema)
3. Check server resources during high traffic
4. Enable query logging: `prisma generate --log queries`

---

## Future Enhancements (Not in MVP)

- **Offline Support**: Service Worker + IndexedDB for check-in without internet
- **Bulk Check-In**: Upload CSV of ticket numbers to check in
- **Check-In Analytics**: Charts showing check-in rate over time
- **Export Check-In Report**: Download CSV of check-in timestamps
- **Undo Check-In**: Allow team members to reverse accidental check-ins (partially implemented in contracts)
- **Multi-Language QR Codes**: Support international character sets
- **Wheelchair Access Notes**: Flag accessibility requirements in check-in list

---

## Related Documentation

- [Feature Spec](./spec.md) - User stories and acceptance criteria
- [Implementation Plan](./plan.md) - Technical approach and architecture
- [Data Model](./data-model.md) - Database schema and state transitions
- [API Contracts](./contracts/check-in-api.ts) - tRPC procedure definitions
- [Team Collaboration Docs](../../docs/modules/team/) - Permission system overview

---

**Questions or Issues?** Check `docs/troubleshooting.md` or open a GitHub issue.
