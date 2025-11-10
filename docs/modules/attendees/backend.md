# Attendees Backend Documentation

## Overview

The Attendees module does not have a separate backend router. Instead, it **uses the Registration router** (`registrationRouter`) from the Registration module. This document describes which procedures are used for attendee management and how they're applied in the attendees context.

## Router Location

**File**: `src/server/api/routers/registration.ts`  
**Router**: `registrationRouter`  
**Shared With**: Registration Module

## Key Procedures for Attendee Management

### 1. `list` (Protected)

**Purpose**: List all attendees with filtering and search  
**Type**: Query (Infinite)  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  eventId: string (cuid),
  search?: string, // Search by name or email
  ticketTypeId?: string, // Filter by specific ticket type
  limit?: number (1-100, default: 20),
  cursor?: string (cuid) // For pagination
}
```

**Output**:
```typescript
{
  items: Array<{
    id: string,
    email: string,
    name: string,
    ticketType: {
      id: string,
      name: string
    },
    paymentStatus: string,
    emailStatus: string,
    registeredAt: Date
  }>,
  nextCursor?: string,
  total: number // Total count for pagination
}
```

**Attendee-Specific Usage**:
- **Search**: Debounced search by name or email (500ms)
- **Filter**: Ticket type dropdown for organizing by access level
- **Pagination**: Infinite scroll with cursor-based pagination
- **Sorting**: Always ordered by `registeredAt DESC` (newest first)

**Authorization**:
- Verifies user owns the event

**Query Pattern**:
```typescript
const { data } = api.registration.list.useInfiniteQuery({
  eventId,
  limit: 50,
  search: debouncedSearch || undefined,
  ticketTypeId: selectedTicketType
}, {
  getNextPageParam: (lastPage) => lastPage.nextCursor
});
```

**Indexes Used**:
- `Registration.eventId` - Fast event lookup
- `Registration.eventId + ticketTypeId` - Filtered queries
- `Registration.registeredAt` - Sorting
- `Registration.email` - Search optimization (with contains)

**Feature Requirements**: FR-016

---

### 2. `export` (Protected)

**Purpose**: Export attendee list to CSV format  
**Type**: Query  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  eventId: string (cuid),
  format: 'csv' | 'json' (default: 'csv')
}
```

**Output**:
```typescript
{
  url: string, // Data URI or download URL
  filename: string, // e.g., "tech-conf-2025-attendees-2025-11-10.csv"
  expiresAt?: Date // Future: if using pre-signed cloud URLs
}
```

**CSV Format**:
```csv
Name,Email,Ticket Type,Registration Date,Payment Status
John Doe,john@example.com,General Admission,2025-01-15T10:30:00Z,free
Jane Smith,jane@example.com,VIP Pass,2025-01-16T14:20:00Z,free
```

**Columns Exported**:
1. Name
2. Email
3. Ticket Type (name)
4. Registration Date (ISO format)
5. Payment Status

**Business Logic**:
1. Fetches all registrations for event (no pagination)
2. Generates CSV using custom `generateCSV()` function
3. Returns as data URI for immediate download
4. Filename format: `{event-slug}-attendees-{YYYY-MM-DD}.csv`

**Authorization**:
- Verifies user owns the event

**Data Privacy**:
- Contains PII (names, emails)
- Organizers responsible for secure handling
- Consider GDPR/data protection compliance

**Usage Pattern**:
```typescript
const exportMutation = api.registration.export.useMutation({
  onSuccess: (data) => {
    // Trigger browser download
    const link = document.createElement("a");
    link.href = data.url;
    link.download = data.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
});

exportMutation.mutate({
  eventId,
  format: "csv"
});
```

**Feature Requirements**: FR-018

---

### 3. `resendConfirmation` (Protected)

**Purpose**: Re-send confirmation email to attendee  
**Type**: Mutation  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  id: string (cuid) // Registration ID
}
```

**Output**:
```typescript
{
  success: boolean,
  message: string // "Confirmation email resent to attendee@example.com"
}
```

**Business Logic**:
1. Fetches registration with event and ticket details
2. Retrieves registration code from `customData` JSON field
3. Sends confirmation email using `sendEmail()` service
4. Email template: `RegistrationConfirmation`

**Authorization**:
- Verifies user owns the event associated with registration

**Email Template Data**:
```typescript
{
  attendeeName: registration.name,
  eventName: registration.event.name,
  eventDate: registration.event.startDate,
  ticketType: registration.ticketType.name,
  registrationCode: string,
  eventUrl: string
}
```

**Use Cases**:
- Attendee didn't receive original email
- Email bounced initially but now fixed
- Attendee lost confirmation email

**Error Handling**:
- Email send errors logged but mutation succeeds
- Returns success=false if email fails

---

### 4. `cancel` (Protected)

**Purpose**: Cancel a registration and free up ticket inventory  
**Type**: Mutation  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  id: string (cuid) // Registration ID
}
```

**Output**:
```typescript
{
  success: boolean,
  message: string // "Registration cancelled successfully"
}
```

**Business Logic**:
1. Deletes registration record
2. Frees up ticket inventory (one ticket added back)
3. Uses transaction to ensure atomicity

**Authorization**:
- Verifies user owns the event associated with registration

**Transaction Flow**:
```typescript
await db.$transaction(async (tx) => {
  // Delete registration
  await tx.registration.delete({ where: { id } });
  
  // Note: Ticket inventory update would be here in future
  // Currently tickets don't track current availability
});
```

**Side Effects**:
- Registration permanently deleted
- Cannot be undone
- No email sent to attendee (organizer should notify manually if needed)

**Use Cases**:
- Attendee requested cancellation
- Duplicate registration
- Test registration cleanup

---

### 5. `updateEmailStatus` (Public - Webhook)

**Purpose**: Update email delivery status from Resend webhook  
**Type**: Mutation  
**Authentication**: Webhook signature verification (not implemented in current version)

**Input Schema**:
```typescript
{
  email: string,
  status: 'active' | 'bounced' | 'unsubscribed'
}
```

**Output**:
```typescript
{
  updated: number // Count of registrations updated
}
```

**Business Logic**:
- Updates ALL registrations with matching email address
- Sets `emailStatus` field
- Used for tracking email deliverability

**Email Status Values**:
- `active` - Email is deliverable
- `bounced` - Email address bounced
- `unsubscribed` - User opted out of emails

**Webhook Integration**:
```typescript
// Called by Resend webhook
POST /api/webhooks/email-status
{
  email: "attendee@example.com",
  status: "bounced"
}
```

**Future Enhancement**:
- Add webhook signature verification
- Add event-specific filtering
- Track bounce reasons

---

## Query Optimization

### Indexes

The following indexes support attendee management queries:

```prisma
model Registration {
  // ...
  @@index([eventId])
  @@index([ticketTypeId])
  @@index([email])
  @@index([eventId, ticketTypeId])
  @@index([eventId, emailStatus])
  @@index([registeredAt])
}
```

**Usage**:
- `[eventId]` - Base event filtering
- `[eventId, ticketTypeId]` - Ticket type filtering
- `[email]` - Search by email (with LIKE)
- `[eventId, emailStatus]` - Active recipients for campaigns
- `[registeredAt]` - Sorting by date

### Pagination Strategy

**Cursor-Based Pagination**:
```typescript
{
  where: { eventId },
  take: limit + 1, // Fetch one extra to determine if more exist
  cursor: cursor ? { id: cursor } : undefined,
  skip: cursor ? 1 : 0, // Skip cursor item itself
  orderBy: { registeredAt: 'desc' }
}
```

**Benefits**:
- Consistent results even with new registrations
- Efficient for large datasets
- No offset-based issues

---

## Business Rules

### Search Behavior

**Case-Insensitive Search**:
```typescript
{
  OR: [
    { name: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } }
  ]
}
```

**Debouncing**:
- 500ms delay on frontend
- Reduces API calls
- Improves UX

### Email Status Management

**Status Precedence**:
1. `bounced` - Permanent delivery failure
2. `unsubscribed` - User opt-out
3. `active` - Deliverable (default)

**Campaign Filtering**:
- Only send to `emailStatus: 'active'`
- Exclude bounced and unsubscribed

---

## Error Handling

**Common Errors**:
- `NOT_FOUND`: Registration not found
- `FORBIDDEN`: User doesn't own event
- `BAD_REQUEST`: Invalid input data

**Error Response Format**:
```typescript
{
  code: 'FORBIDDEN',
  message: 'You do not have permission to view registrations for this event'
}
```

---

## Performance Considerations

### Large Event Optimization

**For Events with >1000 Attendees**:
1. Use pagination (don't load all at once)
2. Consider server-side export generation
3. Cache ticket type filter options
4. Implement background export jobs for very large datasets

### Search Performance

**Optimization Tips**:
- Use database indexes for contains queries
- Consider full-text search for very large events
- Limit search to active filters (ticketTypeId)

---

## Related Documentation

- [Registration Module Backend](../registration/backend.md) - Full router documentation
- [Frontend Documentation](./frontend.md) - AttendeeTable component
- [Data Model](./data-model.md) - Registration model schema
- [Workflows](./workflows.md) - Management workflows
