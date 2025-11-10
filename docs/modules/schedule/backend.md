# Schedule Backend Documentation

## Router Location

`src/server/api/routers/schedule.ts`

## Overview

The schedule router handles all server-side logic for managing event schedules, including CRUD operations, overlap detection, speaker assignments, and timeline data retrieval.

## Procedures

### `schedule.create`

**Type**: Mutation  
**Auth**: Protected (Organizer only)  
**Purpose**: Create a new schedule entry with timezone conversion and optional speaker assignments

**Input Schema**:
```typescript
{
  eventId: string,           // CUID
  title: string,             // 1-200 chars
  description: string,       // 10-5000 chars
  date: string,              // ISO date "YYYY-MM-DD"
  startTime: string,         // "HH:MM" in event timezone
  endTime: string,           // "HH:MM" in event timezone
  location?: string,         // Optional room/venue
  track?: string,            // Optional track name
  trackColor?: string,       // Hex color for track
  sessionType?: string,      // 'keynote' | 'talk' | 'workshop' | 'break' | 'networking'
  speakerIds?: string[],     // Optional array of speaker CUIDs
}
```

**Output**: ScheduleEntry object with speaker sessions

**Business Logic**:
1. Verify event exists and user is organizer
2. Combine date + time in event timezone → convert to UTC
3. Create schedule entry
4. If `speakerIds` provided, create SpeakerSession junction records
5. Return entry with nested speaker data

**Authorization**: Event organizer only

**Example Usage**:
```typescript
const entry = await api.schedule.create.mutate({
  eventId: "clx123...",
  title: "Opening Keynote",
  description: "Welcome address and event overview",
  date: "2025-06-15",
  startTime: "09:00",
  endTime: "10:00",
  location: "Main Hall",
  track: "Keynotes",
  trackColor: "#3B82F6",
  sessionType: "keynote",
  speakerIds: ["speaker1", "speaker2"],
});
```

---

### `schedule.list`

**Type**: Query  
**Auth**: Public  
**Purpose**: List schedule entries for an event with optional filters

**Input Schema**:
```typescript
{
  eventId: string,
  date?: string,    // Filter by specific date "YYYY-MM-DD"
  track?: string,   // Filter by track name
}
```

**Output**: Array of ScheduleEntry objects with speaker sessions

**Business Logic**:
1. Build where clause with eventId
2. Apply optional date filter (startTime between start/end of day)
3. Apply optional track filter
4. Order by startTime ascending
5. Include speaker sessions with speaker details

**Example Usage**:
```typescript
// All entries
const entries = await api.schedule.list.useQuery({
  eventId: "clx123..."
});

// Filter by date
const dayEntries = await api.schedule.list.useQuery({
  eventId: "clx123...",
  date: "2025-06-15",
});

// Filter by track
const trackEntries = await api.schedule.list.useQuery({
  eventId: "clx123...",
  track: "Technical",
});
```

---

### `schedule.getById`

**Type**: Query  
**Auth**: Public  
**Purpose**: Get a single schedule entry by ID with full details

**Input Schema**:
```typescript
{
  id: string  // Schedule entry CUID
}
```

**Output**: ScheduleEntry with event details and speaker sessions

**Throws**: `NOT_FOUND` if entry doesn't exist

**Example Usage**:
```typescript
const entry = await api.schedule.getById.useQuery({
  id: "clx456..."
});
```

---

### `schedule.update`

**Type**: Mutation  
**Auth**: Protected (Organizer only)  
**Purpose**: Update a schedule entry with optimistic concurrency control

**Input Schema**:
```typescript
{
  id: string,
  updatedAt: Date,           // Last known updatedAt (for concurrency)
  eventId: string,           // Required for authorization
  title?: string,
  description?: string,
  date?: string,             // If changing date
  startTime?: string,        // If changing time
  endTime?: string,
  location?: string | null,
  track?: string | null,
  trackColor?: string | null,
  sessionType?: string | null,
  speakerIds?: string[],     // Replace all speaker assignments
}
```

**Output**: Updated ScheduleEntry

**Business Logic**:
1. Fetch entry with event details
2. Verify organizer ownership
3. **Optimistic concurrency check**: Compare `updatedAt` timestamp
4. If mismatch, throw `CONFLICT` error → client must refresh
5. Build update data object (only changed fields)
6. If date/time changed, recombine with timezone
7. If `speakerIds` changed, delete old sessions and create new ones
8. Update entry and return with nested data

**Authorization**: Event organizer only

**Concurrency Control**: Implements optimistic locking to prevent lost updates

**Example Usage**:
```typescript
const updated = await api.schedule.update.mutate({
  id: "clx456...",
  updatedAt: entry.updatedAt,
  eventId: "clx123...",
  title: "Updated Keynote Title",
  startTime: "09:30",  // Change start time
  speakerIds: ["speaker3"],  // Replace speakers
});
```

**Error Handling**:
```typescript
try {
  await api.schedule.update.mutate({ ... });
} catch (error) {
  if (error.data?.code === "CONFLICT") {
    // Entry was modified by another user
    // Refresh data and show message to user
    await refetch();
    alert("This entry was modified by another user. Please review changes and try again.");
  }
}
```

---

### `schedule.delete`

**Type**: Mutation  
**Auth**: Protected (Organizer only)  
**Purpose**: Delete a schedule entry (cascades to speaker sessions)

**Input Schema**:
```typescript
{
  id: string  // Schedule entry CUID
}
```

**Output**: `{ success: true }`

**Business Logic**:
1. Verify entry exists and user is organizer
2. Delete entry (cascades to SpeakerSession records)

**Authorization**: Event organizer only

**Example Usage**:
```typescript
await api.schedule.delete.mutate({
  id: "clx456..."
});
```

---

### `schedule.reorder`

**Type**: Mutation  
**Auth**: Protected (Organizer only)  
**Purpose**: Placeholder for future drag-to-reorder functionality

**Input Schema**:
```typescript
{
  eventId: string,
  entryIds: string[],  // Ordered array of entry IDs
}
```

**Output**: `{ success: true, message: "Schedule is ordered by start time" }`

**Note**: Currently a placeholder. Schedule entries are automatically ordered by `startTime`. Future implementation could add a `displayOrder` field for manual reordering within the same time slot.

---

### `schedule.checkOverlap`

**Type**: Query  
**Auth**: Protected (Organizer only)  
**Purpose**: Detect scheduling conflicts in the same location

**Input Schema**:
```typescript
{
  eventId: string,
  startTime: Date,
  endTime: Date,
  location?: string,
  excludeId?: string,  // Exclude this entry (for updates)
}
```

**Output**:
```typescript
{
  hasOverlap: boolean,
  count: number,
  entries: Array<{
    id: string,
    title: string,
    startTime: Date,
    endTime: Date,
    location: string | null,
    track: string | null,
  }>
}
```

**Business Logic**:
1. Query entries in same event
2. Exclude specified entry (if updating)
3. Filter entries where:
   - `startTime < endTime` (potential overlap)
   - `endTime > startTime` (potential overlap)
   - Same location (if specified)
4. Apply precise overlap detection using `doTimeRangesOverlap()` utility
5. Return overlap status and conflicting entries

**Non-Blocking**: Returns warning data but does not prevent scheduling. Organizers can override if conflict is intentional.

**Example Usage**:
```typescript
const overlap = await api.schedule.checkOverlap.useQuery({
  eventId: "clx123...",
  startTime: new Date("2025-06-15T09:00:00Z"),
  endTime: new Date("2025-06-15T10:00:00Z"),
  location: "Main Hall",
  excludeId: "clx456...",  // If updating existing entry
});

if (overlap.hasOverlap) {
  console.warn(`Conflict with ${overlap.count} sessions:`, overlap.entries);
}
```

---

### `schedule.getByDate`

**Type**: Query  
**Auth**: Public  
**Purpose**: Get all schedule entries for a specific date, grouped by track

**Input Schema**:
```typescript
{
  eventId: string,
  date: string,  // "YYYY-MM-DD"
}
```

**Output**:
```typescript
{
  date: string,
  tracks: string[],  // Unique track names
  entries: ScheduleEntry[],
  timezone: string,
}
```

**Business Logic**:
1. Get event timezone
2. Filter entries where startTime is on the specified date
3. Extract unique track names
4. Return entries ordered by startTime and track

**Example Usage**:
```typescript
const daySchedule = await api.schedule.getByDate.useQuery({
  eventId: "clx123...",
  date: "2025-06-15",
});

console.log(`${daySchedule.entries.length} sessions on ${daySchedule.date}`);
console.log(`Tracks: ${daySchedule.tracks.join(", ")}`);
```

---

### `schedule.getTracks`

**Type**: Query  
**Auth**: Public  
**Purpose**: Get all unique tracks for an event with their colors

**Input Schema**:
```typescript
{
  id: string  // Event ID
}
```

**Output**:
```typescript
Array<{
  name: string,
  color: string,  // Hex color or default gray
}>
```

**Business Logic**:
1. Query distinct track values for event
2. Map to track objects with names and colors
3. Default to `#6B7280` (gray) if no color specified

**Example Usage**:
```typescript
const tracks = await api.schedule.getTracks.useQuery({
  id: "clx123..."
});

// Use for track filter UI
tracks.forEach(track => {
  console.log(`${track.name}: ${track.color}`);
});
```

---

## Utility Functions

### `combineDateTime(date, time, timezone)`

**Location**: `src/lib/utils/date.ts`

Combines a date string and time string in a specific timezone, returning a UTC Date object.

```typescript
const utcDate = combineDateTime("2025-06-15", "09:00", "America/Los_Angeles");
// Returns: Date object representing 2025-06-15 09:00:00 PDT in UTC
```

### `doTimeRangesOverlap(start1, end1, start2, end2)`

**Location**: `src/lib/utils/date.ts`

Precise time range overlap detection:

```typescript
const overlaps = doTimeRangesOverlap(
  new Date("2025-06-15T09:00:00Z"),
  new Date("2025-06-15T10:00:00Z"),
  new Date("2025-06-15T09:30:00Z"),
  new Date("2025-06-15T10:30:00Z")
);
// Returns: true (ranges overlap from 09:30-10:00)
```

---

## Error Codes

| Code | Scenario |
|------|----------|
| `NOT_FOUND` | Event or schedule entry not found |
| `FORBIDDEN` | User is not event organizer |
| `CONFLICT` | Optimistic concurrency conflict (entry modified) |

---

## Database Indexes

Optimized queries with indexes:
- `[eventId]`: List entries by event
- `[startTime]`: Chronological ordering
- `[eventId, startTime]`: Event schedule sorted by time
- `[eventId, track]`: Filter by track

---

## Related Documentation

- [Schedule Frontend →](./frontend.md)
- [Schedule Data Model →](./data-model.md)
- [Schedule Workflows →](./workflows.md)
- [Timezone Handling Research →](../../specs/001-event-management-system/research.md#4-timezone-handling)
- [Optimistic Concurrency Research →](../../specs/001-event-management-system/research.md#5-optimistic-concurrency-control-schedule-edits)
