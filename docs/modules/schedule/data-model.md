# Schedule Data Model

## Primary Models

### ScheduleEntry

**Location**: `prisma/schema.prisma`

Represents a single session or activity in the event schedule.

```prisma
model ScheduleEntry {
  id          String   @id @default(cuid())
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  // Session Details
  title       String
  description String   @db.Text
  startTime   DateTime
  endTime     DateTime
  
  // Location (room, stage, track)
  location    String?
  track       String? // Track name for multi-track conferences
  trackColor  String? // Hex color for track visual indicator
  
  // Session Type
  sessionType String? // 'keynote' | 'talk' | 'workshop' | 'break' | 'networking'
  
  // Relations
  speakerSessions SpeakerSession[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt // For optimistic concurrency control
  
  @@index([eventId])
  @@index([startTime])
  @@index([eventId, startTime]) // For sorting schedule by time
  @@index([eventId, track]) // For filtering by track
}
```

**Field Descriptions**:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String (CUID) | No | Unique identifier |
| `eventId` | String | No | Parent event reference |
| `title` | String | No | Session title (1-200 chars) |
| `description` | Text | No | Full session description |
| `startTime` | DateTime | No | Session start (stored in UTC) |
| `endTime` | DateTime | No | Session end (stored in UTC) |
| `location` | String | Yes | Room, stage, or venue |
| `track` | String | Yes | Track name for multi-track events |
| `trackColor` | String | Yes | Hex color code for track (e.g., "#3B82F6") |
| `sessionType` | String | Yes | Session category |
| `createdAt` | DateTime | No | Creation timestamp |
| `updatedAt` | DateTime | No | Last modification (used for concurrency control) |

**Relationships**:
- **Belongs to**: Event (many-to-one, cascade delete)
- **Has many**: SpeakerSession (junction table for speakers)

**Indexes**:
- `[eventId]`: Query all entries for an event
- `[startTime]`: Chronological sorting
- `[eventId, startTime]`: Event schedule sorted by time (compound)
- `[eventId, track]`: Track filtering (compound)

**Cascading Behavior**:
- When Event is deleted → all ScheduleEntry records deleted
- When ScheduleEntry is deleted → all SpeakerSession records deleted

---

### SpeakerSession (Junction Table)

**Location**: `prisma/schema.prisma`

Links speakers to schedule entries with role information.

```prisma
model SpeakerSession {
  id              String        @id @default(cuid())
  scheduleEntryId String
  scheduleEntry   ScheduleEntry @relation(fields: [scheduleEntryId], references: [id], onDelete: Cascade)
  
  speakerId       String
  speaker         Speaker       @relation(fields: [speakerId], references: [id], onDelete: Cascade)
  
  role            String?       @default("speaker") // 'speaker' | 'moderator' | 'panelist'
  
  createdAt       DateTime      @default(now())
  
  @@unique([scheduleEntryId, speakerId])
  @@index([scheduleEntryId])
  @@index([speakerId])
}
```

**Field Descriptions**:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String (CUID) | No | Unique identifier |
| `scheduleEntryId` | String | No | Reference to schedule entry |
| `speakerId` | String | No | Reference to speaker |
| `role` | String | Yes | Speaker role (default: "speaker") |
| `createdAt` | DateTime | No | Assignment timestamp |

**Relationships**:
- **Belongs to**: ScheduleEntry (many-to-one, cascade delete)
- **Belongs to**: Speaker (many-to-one, cascade delete)

**Constraints**:
- **Unique**: `[scheduleEntryId, speakerId]` - prevents duplicate assignments

**Indexes**:
- `[scheduleEntryId]`: Get all speakers for a session
- `[speakerId]`: Get all sessions for a speaker

**Cascading Behavior**:
- When ScheduleEntry is deleted → assignment deleted
- When Speaker is deleted → assignment deleted

---

## Enums & Constants

### Session Types

Not enforced at database level, but validated in application:

```typescript
const SESSION_TYPES = [
  "keynote",     // Main presentation for all attendees
  "talk",        // Standard conference presentation
  "workshop",    // Hands-on learning session
  "break",       // Coffee break, lunch, networking
  "networking",  // Social or networking activity
] as const;
```

### Speaker Roles

```typescript
const SPEAKER_ROLES = [
  "speaker",     // Primary presenter
  "moderator",   // Panel moderator
  "panelist",    // Panel participant
] as const;
```

---

## Query Patterns

### Get All Schedule Entries for Event (Ordered)

```typescript
const entries = await prisma.scheduleEntry.findMany({
  where: { eventId },
  orderBy: { startTime: 'asc' },
  include: {
    speakerSessions: {
      include: {
        speaker: {
          select: {
            id: true,
            name: true,
            photo: true,
          },
        },
      },
    },
  },
});
```

### Get Entries for Specific Date

```typescript
const entries = await prisma.scheduleEntry.findMany({
  where: {
    eventId,
    startTime: {
      gte: new Date(`${date}T00:00:00Z`),
      lt: new Date(`${date}T23:59:59Z`),
    },
  },
  orderBy: { startTime: 'asc' },
});
```

### Get Entries by Track

```typescript
const trackEntries = await prisma.scheduleEntry.findMany({
  where: {
    eventId,
    track: "Technical",
  },
  orderBy: { startTime: 'asc' },
});
```

### Check for Overlapping Sessions

```typescript
const overlapping = await prisma.scheduleEntry.findMany({
  where: {
    eventId,
    location,
    OR: [
      {
        startTime: {
          lt: endTime,
        },
      },
      {
        endTime: {
          gt: startTime,
        },
      },
    ],
  },
});

// Then apply precise overlap logic in code
const actualOverlaps = overlapping.filter((entry) =>
  doTimeRangesOverlap(startTime, endTime, entry.startTime, entry.endTime)
);
```

### Get All Speakers for a Session

```typescript
const session = await prisma.scheduleEntry.findUnique({
  where: { id: entryId },
  include: {
    speakerSessions: {
      include: {
        speaker: true,
      },
      orderBy: {
        role: 'asc', // Show primary speaker first
      },
    },
  },
});
```

### Get All Sessions for a Speaker

```typescript
const speakerSessions = await prisma.speakerSession.findMany({
  where: { speakerId },
  include: {
    scheduleEntry: {
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        location: true,
        track: true,
      },
    },
  },
  orderBy: {
    scheduleEntry: {
      startTime: 'asc',
    },
  },
});
```

---

## Data Constraints

### Business Rules

1. **Time Validation**: `endTime` must be after `startTime` (enforced in application)
2. **Event Existence**: Schedule entry cannot exist without parent event (foreign key)
3. **Speaker Assignment**: SpeakerSession requires both speaker and entry to exist
4. **Duplicate Prevention**: Same speaker cannot be assigned to same session twice (unique constraint)

### Soft Constraints (Warnings)

- Overlapping sessions in same location (detected but not prevented)
- Sessions scheduled outside event date range (allowed for setup/teardown)
- Very short or very long sessions (no hard limits)

---

## Timezone Handling

### Storage

All `startTime` and `endTime` values are stored in **UTC** in the database.

### Conversion Pattern

```typescript
// User input: date + time in event timezone
const userDate = "2025-06-15";
const userTime = "09:00";
const eventTimezone = "America/Los_Angeles";

// Convert to UTC for storage
const utcDateTime = combineDateTime(userDate, userTime, eventTimezone);

await prisma.scheduleEntry.create({
  data: {
    startTime: utcDateTime,
    // ...
  },
});
```

### Display Pattern

```typescript
// Fetch from database (UTC)
const entry = await prisma.scheduleEntry.findUnique({ where: { id } });

// Convert to event timezone for display
const localTime = format(entry.startTime, "HH:mm", {
  timeZone: event.timezone,
});
```

---

## Optimistic Concurrency Control

The `updatedAt` field enables optimistic locking to prevent lost updates:

### Update Pattern

```typescript
// 1. Client reads entry
const entry = await prisma.scheduleEntry.findUnique({ where: { id } });

// 2. Client modifies data
// ... user edits ...

// 3. Client submits update with last known updatedAt
const result = await prisma.scheduleEntry.update({
  where: {
    id: entry.id,
    updatedAt: entry.updatedAt, // Version check
  },
  data: {
    title: newTitle,
    // ... other changes
  },
});

// If updatedAt doesn't match, Prisma throws PrismaClientKnownRequestError
// Application returns CONFLICT error to client
```

---

## Migration History

Key schema changes:

1. **Initial Creation**: Added ScheduleEntry with basic fields
2. **Track Support**: Added `track` and `trackColor` fields
3. **Session Types**: Added `sessionType` field
4. **Speaker Assignment**: Created `SpeakerSession` junction table
5. **Concurrency Control**: `updatedAt` used for optimistic locking
6. **Indexes**: Added compound indexes for query optimization

---

## Related Documentation

- [Schedule Backend →](./backend.md)
- [Schedule Frontend →](./frontend.md)
- [Schedule Workflows →](./workflows.md)
- [Complete Data Model →](../../architecture/data-model.md)
