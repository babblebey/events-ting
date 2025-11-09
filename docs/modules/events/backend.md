# Events Backend Documentation

## Router Location

**File**: `src/server/api/routers/event.ts`

This router handles all event CRUD operations, dashboard metrics, and archival functionality.

## Procedures

### `event.create`

**Type**: Mutation  
**Auth**: Protected (requires authentication)  
**Purpose**: Create a new event as an organizer

**Input Schema**:
```typescript
{
  name: string;              // 3-200 characters
  description: string;       // 10-5000 characters
  slug: string;              // lowercase, numbers, hyphens only
  locationType: 'in-person' | 'virtual' | 'hybrid';
  locationAddress?: string;  // Required for in-person/hybrid
  locationUrl?: string;      // Required for virtual/hybrid
  timezone: string;          // IANA timezone (e.g., "America/New_York")
  startDate: Date;
  endDate: Date;             // Must be after startDate
  status?: 'draft' | 'published' | 'archived'; // Default: 'draft'
}
```

**Business Logic**:
- Validates slug uniqueness across all events
- Ensures endDate is after startDate
- Validates location requirements based on locationType
- Automatically sets organizerId from authenticated session
- Creates event in draft status by default

**Authorization**: Any authenticated user can create events

**Example Usage**:
```typescript
const event = await api.event.create.useMutation({
  name: "Tech Conference 2025",
  description: "Annual technology conference...",
  slug: "tech-conf-2025",
  locationType: "hybrid",
  locationAddress: "123 Main St, San Francisco, CA",
  locationUrl: "https://zoom.us/j/123456789",
  timezone: "America/Los_Angeles",
  startDate: new Date("2025-06-15T09:00:00Z"),
  endDate: new Date("2025-06-17T18:00:00Z"),
});
```

**Error Responses**:
- `CONFLICT`: Slug already exists
- `BAD_REQUEST`: Validation errors (date logic, location requirements)

---

### `event.list`

**Type**: Query  
**Auth**: Public (with filters for authenticated users)  
**Purpose**: List events with filtering and pagination

**Input Schema**:
```typescript
{
  limit?: number;          // 1-100, default: 20
  cursor?: string;         // For pagination
  status?: 'draft' | 'published' | 'archived';
  organizerId?: string;    // Filter by organizer
}
```

**Output**:
```typescript
{
  events: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    locationType: string;
    locationAddress: string | null;
    locationUrl: string | null;
    timezone: string;
    startDate: Date;
    endDate: Date;
    status: string;
    isArchived: boolean;
    organizer: {
      id: string;
      name: string | null;
      image: string | null;
    };
    _count: {
      registrations: number;
      ticketTypes: number;
    };
  }>;
  nextCursor?: string;
}
```

**Business Logic**:
- **Unauthenticated users**: Only see published, non-archived events
- **Authenticated users**: Can filter by status and see own events
- Results ordered by startDate (descending - newest first)
- Includes registration and ticket count for each event

**Example Usage**:
```typescript
// Public listing
const { data } = api.event.list.useQuery({ limit: 10 });

// Organizer viewing their drafts
const { data } = api.event.list.useQuery({
  status: 'draft',
  organizerId: currentUser.id,
});
```

---

### `event.getBySlug`

**Type**: Query  
**Auth**: Public  
**Purpose**: Get a single event by its URL-friendly slug

**Input Schema**:
```typescript
{
  slug: string;
}
```

**Output**: Full event details with relationships:
```typescript
{
  id: string;
  slug: string;
  name: string;
  description: string;
  // ... all event fields
  organizer: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  ticketTypes: Array<{
    id: string;
    name: string;
    description: string;
    price: Decimal;
    currency: string;
    quantity: number;
    saleStart: Date | null;
    saleEnd: Date | null;
    _count: { registrations: number };
  }>;
  _count: {
    registrations: number;
    scheduleEntries: number;
    speakers: number;
  };
}
```

**Business Logic**:
- Returns only tickets currently on sale (within saleStart/saleEnd window)
- Blocks access to draft/archived events unless viewer is the organizer
- Includes counts for registrations, schedule entries, and speakers

**Authorization**:
- Public events: Anyone can access
- Draft/Archived events: Only the organizer can access

**Example Usage**:
```typescript
const { data: event } = api.event.getBySlug.useQuery({
  slug: "tech-conf-2025"
});
```

**Error Responses**:
- `NOT_FOUND`: Event doesn't exist
- `FORBIDDEN`: Attempting to access draft/archived event without permission

---

### `event.getById`

**Type**: Query  
**Auth**: Protected (requires ownership)  
**Purpose**: Get event by ID for organizer dashboard

**Input Schema**:
```typescript
{
  id: string; // CUID
}
```

**Output**: Similar to `getBySlug` but includes:
- All ticket types (not just those on sale)
- Email campaign count
- Full organizer details

**Authorization**: Only the event organizer can access

**Example Usage**:
```typescript
const { data: event } = api.event.getById.useQuery({
  id: "clx123abc..."
});
```

**Error Responses**:
- `NOT_FOUND`: Event doesn't exist
- `FORBIDDEN`: User is not the event organizer

---

### `event.update`

**Type**: Mutation  
**Auth**: Protected (requires ownership)  
**Purpose**: Update event details

**Input Schema**:
```typescript
{
  id: string;
  // All other event fields are optional
  name?: string;
  description?: string;
  slug?: string;
  // ... etc
}
```

**Business Logic**:
- Validates slug uniqueness if changed
- Ensures endDate > startDate if dates updated
- Only the organizer can update their event

**Authorization**: Must be the event organizer

**Example Usage**:
```typescript
await api.event.update.mutate({
  id: eventId,
  name: "Updated Conference Name",
  status: "published",
});
```

**Error Responses**:
- `NOT_FOUND`: Event doesn't exist
- `FORBIDDEN`: User is not the organizer
- `CONFLICT`: New slug already taken

---

### `event.archive`

**Type**: Mutation  
**Auth**: Protected (requires ownership)  
**Purpose**: Soft delete an event (set isArchived flag)

**Input Schema**:
```typescript
{
  id: string;
}
```

**Business Logic**:
- Sets `isArchived: true` and `status: "archived"`
- Does not delete related data (registrations, tickets, etc.)
- Event becomes hidden from public listings
- Can be restored later via `restore` procedure

**Authorization**: Must be the event organizer

**Example Usage**:
```typescript
await api.event.archive.mutate({ id: eventId });
```

**Error Responses**:
- `NOT_FOUND`: Event doesn't exist
- `FORBIDDEN`: User is not the organizer
- `BAD_REQUEST`: Event already archived

---

### `event.restore`

**Type**: Mutation  
**Auth**: Protected (requires ownership)  
**Purpose**: Restore an archived event

**Input Schema**:
```typescript
{
  id: string;
}
```

**Business Logic**:
- Sets `isArchived: false` and `status: "draft"`
- Restored to draft status for organizer review before republishing

**Authorization**: Must be the event organizer

---

### `event.delete`

**Type**: Mutation  
**Auth**: Protected (requires ownership)  
**Purpose**: Permanently delete an event

**⚠️ WARNING**: This cascades to all related entities:
- Ticket types
- Registrations
- Schedule entries
- Speakers
- CFP submissions
- Email campaigns

**Input Schema**:
```typescript
{
  id: string;
}
```

**Authorization**: Must be the event organizer

**Best Practice**: Use `archive` instead of `delete` to preserve data.

---

### `event.getMetrics`

**Type**: Query  
**Auth**: Protected (requires ownership)  
**Purpose**: Get dashboard metrics for an event

**Input Schema**:
```typescript
{
  id: string;
}
```

**Output**:
```typescript
{
  totalRegistrations: number;
  totalTicketTypes: number;
  totalScheduleEntries: number;
  totalSpeakers: number;
  totalEmailCampaigns: number;
  recentRegistrations: Array<{
    id: string;
    name: string;
    email: string;
    registeredAt: Date;
    ticketType: {
      name: string;
    };
  }>;
}
```

**Business Logic**:
- Aggregates counts from all related modules
- Returns 5 most recent registrations
- Used to populate the organizer dashboard

**Example Usage**:
```typescript
const { data: metrics } = api.event.getMetrics.useQuery({
  id: eventId
});

// Display: {metrics.totalRegistrations} attendees registered
```

---

## Validation

All input validation is handled by Zod schemas from `src/lib/validators.ts`:
- `createEventSchema`
- `updateEventSchema`
- `eventIdSchema`
- `eventSlugSchema`
- `listEventsSchema`

## Error Handling

Common error patterns:
- **Slug conflicts**: Check uniqueness before create/update
- **Authorization**: Verify organizer ownership for mutations
- **Date validation**: Ensure endDate > startDate
- **Location requirements**: Validate based on locationType

## Related Files

- **Router**: `src/server/api/routers/event.ts`
- **Validators**: `src/lib/validators.ts`
- **Database**: `prisma/schema.prisma` (Event model)
