# tRPC Router Contract: Event

**File**: `src/server/api/routers/event.ts`  
**Responsibility**: Event CRUD operations, dashboard metrics, archival

---

## Procedures

### `event.create`

**Type**: Mutation (Protected)  
**Purpose**: Create a new event (FR-001)  
**Authorization**: Authenticated users only

**Input Schema**:
```typescript
{
  name: string (3-200 chars),
  description: string (10-5000 chars),
  slug: string (URL-safe, 3-100 chars, unique),
  locationType: 'in-person' | 'virtual' | 'hybrid',
  locationAddress?: string, // required if in-person or hybrid
  locationUrl?: string (URL), // required if virtual or hybrid
  timezone: string (IANA timezone ID),
  startDate: Date,
  endDate: Date, // must be after startDate
}
```

**Output**:
```typescript
{
  id: string,
  slug: string,
  name: string,
  // ... full event object
  createdAt: Date,
}
```

**Business Rules**:
- `endDate` must be after `startDate`
- `slug` must be globally unique
- In-person/hybrid events require `locationAddress`
- Virtual/hybrid events require `locationUrl`

---

### `event.list`

**Type**: Query (Protected)  
**Purpose**: List events created by authenticated user (FR-002)  
**Authorization**: Authenticated users only

**Input Schema**:
```typescript
{
  includeArchived?: boolean, // default: false (FR-058)
  limit?: number, // default: 20, max: 100
  cursor?: string, // for pagination
}
```

**Output**:
```typescript
{
  items: Array<{
    id: string,
    slug: string,
    name: string,
    startDate: Date,
    endDate: Date,
    status: string,
    isArchived: boolean,
    _count: {
      registrations: number,
      scheduleEntries: number,
      speakers: number,
    },
  }>,
  nextCursor?: string,
}
```

---

### `event.getBySlug`

**Type**: Query (Public)  
**Purpose**: Get event details by slug for public viewing  
**Authorization**: Public (unauthenticated)

**Input Schema**:
```typescript
{
  slug: string,
}
```

**Output**:
```typescript
{
  id: string,
  slug: string,
  name: string,
  description: string,
  locationType: string,
  locationAddress?: string,
  locationUrl?: string,
  timezone: string,
  startDate: Date,
  endDate: Date,
  status: string,
  organizer: {
    id: string,
    name: string,
  },
  _count: {
    registrations: number,
    scheduleEntries: number,
    speakers: number,
  },
}
```

**Error Cases**:
- `NOT_FOUND`: Event does not exist or is archived (unless organizer viewing)

---

### `event.getById`

**Type**: Query (Protected)  
**Purpose**: Get full event details for dashboard (FR-003, FR-005)  
**Authorization**: Event organizer only

**Input Schema**:
```typescript
{
  id: string,
}
```

**Output**:
```typescript
{
  // Full event object including all fields
  // Plus aggregated metrics for dashboard
  metrics: {
    totalRegistrations: number,
    registrationsByTicketType: Array<{
      ticketTypeId: string,
      ticketTypeName: string,
      count: number,
    }>,
    upcomingSessions: number, // Schedule entries in future
    pendingCfpSubmissions: number,
    totalSpeakers: number,
    emailCampaigns: {
      total: number,
      sent: number,
      scheduled: number,
    },
  },
}
```

**Error Cases**:
- `NOT_FOUND`: Event does not exist
- `FORBIDDEN`: User is not the organizer

---

### `event.update`

**Type**: Mutation (Protected)  
**Purpose**: Update event details (FR-003)  
**Authorization**: Event organizer only

**Input Schema**:
```typescript
{
  id: string,
  name?: string (3-200 chars),
  description?: string (10-5000 chars),
  locationType?: 'in-person' | 'virtual' | 'hybrid',
  locationAddress?: string,
  locationUrl?: string,
  timezone?: string,
  startDate?: Date,
  endDate?: Date,
  status?: 'draft' | 'published' | 'archived',
}
```

**Output**:
```typescript
{
  // Updated event object
}
```

**Business Rules**:
- Same validation rules as `create`
- Cannot change `slug` after creation (redirect management complexity)
- Changing `status` to 'published' validates all required fields

**Error Cases**:
- `NOT_FOUND`: Event does not exist
- `FORBIDDEN`: User is not the organizer

---

### `event.archive`

**Type**: Mutation (Protected)  
**Purpose**: Soft delete event (FR-004, FR-058)  
**Authorization**: Event organizer only

**Input Schema**:
```typescript
{
  id: string,
}
```

**Output**:
```typescript
{
  success: boolean,
  message: string,
  impactSummary: {
    registrations: number,
    scheduleEntries: number,
    speakers: number,
    emailCampaigns: number,
  },
}
```

**Business Rules**:
- Sets `isArchived = true`, preserves all related data (FR-060)
- Confirmation dialog on frontend shows `impactSummary`

---

### `event.restore`

**Type**: Mutation (Protected)  
**Purpose**: Restore archived event (FR-059)  
**Authorization**: Event organizer only

**Input Schema**:
```typescript
{
  id: string,
}
```

**Output**:
```typescript
{
  // Restored event object with isArchived = false
}
```

---

### `event.delete`

**Type**: Mutation (Protected)  
**Purpose**: Permanently delete event (use cautiously, archival preferred)  
**Authorization**: Event organizer only

**Input Schema**:
```typescript
{
  id: string,
  confirmSlug: string, // Must match event slug (safety check)
}
```

**Output**:
```typescript
{
  success: boolean,
  message: string,
}
```

**Business Rules**:
- Cascade deletes all related entities (tickets, registrations, schedules, speakers, etc.)
- Irreversible action, frontend requires explicit confirmation with slug matching
- Logs deletion for audit trail

---

## Error Codes

| Code | Scenario | HTTP Status |
|------|----------|-------------|
| `UNAUTHORIZED` | User not authenticated | 401 |
| `FORBIDDEN` | User not event organizer | 403 |
| `NOT_FOUND` | Event does not exist | 404 |
| `BAD_REQUEST` | Invalid input (validation errors) | 400 |
| `CONFLICT` | Slug already exists | 409 |

---

## Implementation Notes

- Use `protectedProcedure` for authenticated endpoints
- Use `publicProcedure` for public event viewing
- Ownership check: `ctx.session.user.id === event.organizerId`
- Pagination: Use Prisma cursor-based pagination for large lists
- Metrics calculation: Use Prisma aggregations (`_count`, `groupBy`) for performance
