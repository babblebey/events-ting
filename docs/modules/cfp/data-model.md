# CFP Data Model

## Overview

The CFP module uses two primary Prisma models to manage the Call for Papers workflow: `CallForPapers` for CFP configuration and `CfpSubmission` for speaker proposals.

## Database Models

### CallForPapers

**Purpose**: Stores CFP configuration and settings for an event

```prisma
model CallForPapers {
  id          String   @id @default(cuid())
  eventId     String   @unique
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  guidelines  String   @db.Text
  deadline    DateTime
  status      String   @default("open") // 'open' | 'closed'
  
  // Required fields for submissions
  requiredFields Json?
  
  // Relations
  submissions CfpSubmission[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([status, deadline])
}
```

**Field Details**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary key, CUID | Unique identifier |
| `eventId` | String | Foreign key, Unique | Links to Event (one-to-one) |
| `guidelines` | String | Text, Required | Submission guidelines and requirements |
| `deadline` | DateTime | Required | Submission cutoff date/time (UTC) |
| `status` | String | Default: 'open' | 'open' or 'closed' |
| `requiredFields` | Json | Nullable | Array of required field names |
| `createdAt` | DateTime | Auto | CFP creation timestamp |
| `updatedAt` | DateTime | Auto | Last update timestamp |

**Relationships**:
- **Event** (one-to-one): Each CFP belongs to exactly one event
- **Submissions** (one-to-many): A CFP can have multiple submissions

**Indexes**:
- `[status, deadline]` - Composite index for querying open/closed CFPs by deadline

**Cascade Behavior**:
- `onDelete: Cascade` - If event is deleted, CFP is deleted

**Status Values**:
- `open` - Accepting new submissions
- `closed` - No longer accepting submissions

**Required Fields Format** (`requiredFields` JSON):
```json
["speakerBio", "speakerPhoto"]
```

Possible values:
- `speakerBio` - Require speaker biography
- `speakerPhoto` - Require speaker photo URL

---

### CfpSubmission

**Purpose**: Stores session proposals submitted by speakers

```prisma
model CfpSubmission {
  id          String   @id @default(cuid())
  eventId     String
  cfpId       String
  cfp         CallForPapers @relation(fields: [cfpId], references: [id], onDelete: Cascade)
  
  // Proposal Details
  title       String
  description String   @db.Text
  sessionFormat String // 'talk' | 'workshop' | 'panel' | 'lightning'
  duration    Int // Minutes
  
  // Speaker Info
  speakerName  String
  speakerEmail String
  speakerBio   String   @db.Text
  speakerPhoto String?
  
  // Social Links
  speakerTwitter  String?
  speakerGithub   String?
  speakerLinkedin String?
  speakerWebsite  String?
  
  // Review
  status      String   @default("pending") // 'pending' | 'accepted' | 'rejected'
  reviewNotes String?  @db.Text
  reviewScore Int?
  
  // Relations
  speakerId   String?
  speaker     Speaker? @relation(fields: [speakerId], references: [id], onDelete: SetNull)
  
  submittedAt DateTime @default(now())
  reviewedAt  DateTime?
  updatedAt   DateTime @updatedAt
  
  @@index([cfpId])
  @@index([status])
  @@index([speakerEmail])
  @@index([cfpId, status]) // For filtering submissions by CFP and status
}
```

**Field Details**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary key, CUID | Unique identifier |
| `eventId` | String | Required | Denormalized event ID for queries |
| `cfpId` | String | Foreign key | Links to CallForPapers |
| `title` | String | Required | Session title |
| `description` | String | Text, Required | Detailed session description |
| `sessionFormat` | String | Required | talk/workshop/panel/lightning |
| `duration` | Int | Required | Session length in minutes |
| `speakerName` | String | Required | Speaker's full name |
| `speakerEmail` | String | Required | Speaker's email (for notifications) |
| `speakerBio` | String | Text, Required | Speaker biography |
| `speakerPhoto` | String | Nullable | Speaker photo URL |
| `speakerTwitter` | String | Nullable | Twitter handle |
| `speakerGithub` | String | Nullable | GitHub username |
| `speakerLinkedin` | String | Nullable | LinkedIn username/ID |
| `speakerWebsite` | String | Nullable | Personal website URL |
| `status` | String | Default: 'pending' | Review status |
| `reviewNotes` | String | Text, Nullable | Organizer feedback |
| `reviewScore` | Int | Nullable | Rating (1-5) |
| `speakerId` | String | Nullable | Links to Speaker if accepted |
| `submittedAt` | DateTime | Auto | Submission timestamp |
| `reviewedAt` | DateTime | Nullable | Review decision timestamp |
| `updatedAt` | DateTime | Auto | Last update timestamp |

**Relationships**:
- **CallForPapers** (many-to-one): Each submission belongs to one CFP
- **Speaker** (many-to-one, optional): Accepted submissions link to Speaker profile

**Indexes**:
- `[cfpId]` - Fast lookup by CFP
- `[status]` - Filter by review status
- `[speakerEmail]` - Check for duplicate speakers
- `[cfpId, status]` - Composite index for filtered queries

**Cascade Behavior**:
- `onDelete: Cascade` (CFP) - If CFP deleted, submissions deleted
- `onDelete: SetNull` (Speaker) - If speaker deleted, submission remains with null speakerId

**Session Format Values**:
- `talk` - Standard presentation
- `workshop` - Hands-on workshop
- `panel` - Panel discussion
- `lightning` - Short lightning talk (5-15 min)

**Status Values**:
- `pending` - Awaiting review
- `accepted` - Proposal accepted, speaker profile created
- `rejected` - Proposal declined

**Review Score Range**: 1-5 (lowest to highest)

---

## Relationships with Other Models

### Event → CallForPapers (One-to-One)

```prisma
model Event {
  // ...
  callForPapers    CallForPapers?
  // ...
}
```

An event can have at most one CFP. This is enforced by:
- `@unique` constraint on `CallForPapers.eventId`
- One-to-one relationship

### CallForPapers → CfpSubmission (One-to-Many)

```prisma
model CallForPapers {
  // ...
  submissions CfpSubmission[]
  // ...
}
```

A CFP can have multiple submissions from different speakers.

### CfpSubmission → Speaker (Many-to-One, Optional)

```prisma
model CfpSubmission {
  // ...
  speakerId   String?
  speaker     Speaker? @relation(fields: [speakerId], references: [id], onDelete: SetNull)
  // ...
}

model Speaker {
  // ...
  cfpSubmissions CfpSubmission[]
  // ...
}
```

When a submission is accepted:
1. Speaker profile is created (if doesn't exist)
2. `speakerId` is set to link submission to speaker
3. This allows tracking which speaker came from which CFP submission

---

## Query Patterns

### Find CFP for Event

```typescript
const cfp = await db.callForPapers.findUnique({
  where: { eventId: eventId },
  include: {
    event: {
      select: {
        id: true,
        name: true,
        slug: true
      }
    }
  }
});
```

### List Submissions by Status

```typescript
const submissions = await db.cfpSubmission.findMany({
  where: {
    cfpId: cfpId,
    status: 'pending'
  },
  orderBy: [
    { status: 'asc' }, // Pending first
    { submittedAt: 'desc' } // Newest first
  ],
  include: {
    speaker: {
      select: {
        id: true,
        name: true,
        email: true
      }
    }
  }
});
```

### Check for Existing Speaker by Email

```typescript
const existingSpeaker = await db.speaker.findFirst({
  where: {
    eventId: eventId,
    email: speakerEmail
  }
});
```

---

## Data Integrity

### Constraints

1. **One CFP per Event**: Enforced by `@unique` on `eventId`
2. **Required Fields**: Non-nullable fields enforced at database level
3. **Cascading Deletes**: CFP and submissions deleted when event deleted

### Validation Rules

Enforced by Zod schemas and tRPC procedures:

**CFP**:
- Guidelines: Min 10 characters
- Deadline: Must be in future
- Status: Must be 'open' or 'closed'

**Submission**:
- Title: 5-200 characters
- Description: 50-3000 characters
- Duration: 15-240 minutes
- Speaker name: 2-100 characters
- Speaker bio: 50-1000 characters
- Email: Valid email format
- URLs: Valid URL format

### Business Rules

1. **Deadline Enforcement**: Submissions rejected if CFP closed or deadline passed
2. **One Review Decision**: Once accepted/rejected, submission cannot return to pending
3. **Speaker Creation**: Only on acceptance, creates speaker if email doesn't exist
4. **Denormalized eventId**: Stored in submission for efficient queries

---

## Migration Considerations

**Adding CFP to Existing Event**:
```typescript
// CFP is optional - old events without CFP continue to work
const event = await db.event.findUnique({
  where: { id },
  include: { callForPapers: true }
});

if (!event.callForPapers) {
  // No CFP exists yet - show "Open CFP" button
}
```

**Handling Orphaned Submissions**:
- If a speaker is deleted, `speakerId` becomes null
- Submission record remains for historical tracking
- reviewNotes and other data preserved

---

## Performance Considerations

**Indexes**:
- `[status, deadline]` on `CallForPapers` - Fast queries for open CFPs
- `[cfpId]` on `CfpSubmission` - Fast lookup of submissions for a CFP
- `[cfpId, status]` - Optimized for filtered submission lists
- `[speakerEmail]` - Check for duplicate speakers

**Pagination**:
- Use cursor-based pagination for large submission lists
- Cursor on `id` field (CUID is sortable)

**Select Optimization**:
- Public endpoints: Only select public-safe fields
- Avoid loading full text fields when showing cards

---

## Data Privacy

**Public CFP Data** (exposed to unauthenticated users):
- `id`, `guidelines`, `deadline`, `status`, `requiredFields`, `eventId`

**Protected CFP Data** (organizer only):
- All fields including submission details
- Full speaker information from submissions

**Submission Data**:
- Speakers: Only see their own submission confirmation
- Organizers: Full access to all submissions
- Public: No access to any submissions

---

## Related Documentation

- [Backend Documentation](./backend.md) - tRPC procedures using these models
- [Frontend Documentation](./frontend.md) - UI components displaying this data
- [Workflows](./workflows.md) - How data flows through the system
- [Architecture: Data Model](../../architecture/data-model.md) - Complete schema overview
