# Speakers Backend Documentation

## Router Location

`src/server/api/routers/speaker.ts`

## Overview

The speaker router handles speaker profile management, including CRUD operations and session assignments via the SpeakerSession junction table.

## Procedures

### `speaker.create`

**Type**: Mutation  
**Auth**: Protected (Organizer only)  
**Purpose**: Create a new speaker profile manually

**Input Schema**:
```typescript
{
  eventId: string,           // CUID
  name: string,              // 2-200 chars
  bio: string,               // 10-5000 chars
  email: string,             // Valid email
  photo?: string,            // URL or relative path
  twitter?: string,
  github?: string,
  linkedin?: string,
  website?: string,          // Valid URL
}
```

**Output**: Speaker object

**Business Logic**:
1. Verify organizer owns event
2. Check for existing speaker with same email in event (prevent duplicates)
3. Create speaker record
4. Return created speaker

**Authorization**: Event organizer only

**Example Usage**:
```typescript
const speaker = await api.speaker.create.mutate({
  eventId: "clx123...",
  name: "Jane Doe",
  bio: "Software engineer with 10 years experience...",
  email: "jane@example.com",
  photo: "/uploads/images/jane-doe.jpg",
  twitter: "@janedoe",
  github: "janedoe",
  website: "https://janedoe.dev",
});
```

---

### `speaker.list`

**Type**: Query  
**Auth**: Public  
**Purpose**: List all speakers for an event with session information

**Input Schema**:
```typescript
{
  eventId: string
}
```

**Output**: Array of speakers with sessions ordered by name

**Business Logic**:
1. Query all speakers for event
2. Include speaker sessions with schedule entry details
3. Order sessions by start time
4. Order speakers alphabetically by name

**Example Usage**:
```typescript
const speakers = await api.speaker.list.useQuery({
  eventId: "clx123..."
});

speakers.forEach(speaker => {
  console.log(speaker.name);
  speaker.speakerSessions.forEach(session => {
    console.log(`  - ${session.scheduleEntry.title}`);
  });
});
```

---

### `speaker.getById`

**Type**: Query  
**Auth**: Public  
**Purpose**: Get detailed speaker profile with full session information

**Input Schema**:
```typescript
{
  id: string  // Speaker CUID
}
```

**Output**: Speaker with event details, sessions, and CFP submissions

**Includes**:
- Event basic info (id, name, slug)
- All sessions with full schedule entry details
- Related CFP submissions (if speaker came from CFP)

**Throws**: `NOT_FOUND` if speaker doesn't exist

**Example Usage**:
```typescript
const speaker = await api.speaker.getById.useQuery({
  id: "clx456..."
});
```

---

### `speaker.update`

**Type**: Mutation  
**Auth**: Protected (Organizer only)  
**Purpose**: Update speaker profile information

**Input Schema**:
```typescript
{
  id: string,
  name?: string,
  bio?: string,
  email?: string,
  photo?: string,
  twitter?: string,
  github?: string,
  linkedin?: string,
  website?: string,
}
```

**Output**: Updated speaker

**Business Logic**:
1. Verify speaker exists and user is event organizer
2. If email changing, check for conflicts with other speakers
3. Update only provided fields
4. Return updated speaker

**Authorization**: Event organizer only

**Example Usage**:
```typescript
const updated = await api.speaker.update.mutate({
  id: "clx456...",
  bio: "Updated bio with new accomplishments...",
  website: "https://newsite.dev",
});
```

---

### `speaker.delete`

**Type**: Mutation  
**Auth**: Protected (Organizer only)  
**Purpose**: Delete speaker profile (cascades to remove session assignments)

**Input Schema**:
```typescript
{
  id: string
}
```

**Output**: Deleted speaker object

**Business Logic**:
1. Verify speaker exists and user is event organizer
2. Delete speaker (cascades to SpeakerSession records)
3. Speaker sessions automatically removed
4. Schedule entries remain (only assignment removed)

**Authorization**: Event organizer only

**Example Usage**:
```typescript
await api.speaker.delete.mutate({
  id: "clx456..."
});
```

---

### `speaker.assignToSession`

**Type**: Mutation  
**Auth**: Protected (Organizer only)  
**Purpose**: Link a speaker to a schedule entry with role

**Input Schema**:
```typescript
{
  speakerId: string,
  scheduleEntryId: string,
  role?: "speaker" | "moderator" | "panelist",  // default: "speaker"
}
```

**Output**: SpeakerSession with nested speaker and session data

**Business Logic**:
1. Verify speaker and schedule entry exist
2. Verify both belong to same event
3. Verify user is event organizer
4. Check for existing assignment (unique constraint prevents duplicates)
5. Create SpeakerSession record

**Authorization**: Event organizer only

**Duplicate Prevention**: Database unique constraint on `[scheduleEntryId, speakerId]`

**Example Usage**:
```typescript
const assignment = await api.speaker.assignToSession.mutate({
  speakerId: "clx789...",
  scheduleEntryId: "clx456...",
  role: "moderator",
});
```

---

### `speaker.unassignFromSession`

**Type**: Mutation  
**Auth**: Protected (Organizer only)  
**Purpose**: Remove a speaker from a schedule entry

**Input Schema**:
```typescript
{
  speakerId: string,
  scheduleEntryId: string,
}
```

**Output**: Deleted SpeakerSession

**Business Logic**:
1. Verify speaker exists and user is event organizer
2. Find SpeakerSession assignment
3. Delete assignment record

**Authorization**: Event organizer only

**Example Usage**:
```typescript
await api.speaker.unassignFromSession.mutate({
  speakerId: "clx789...",
  scheduleEntryId: "clx456...",
});
```

---

### `speaker.getByEvent`

**Type**: Query  
**Auth**: Public  
**Purpose**: Alias for `speaker.list` (kept for contract consistency)

**Input**: Same as `list`  
**Output**: Same as `list`

---

## Validation Rules

### Name
- Min: 2 characters
- Max: 200 characters
- Required

### Bio
- Min: 10 characters
- Max: 5000 characters
- Required

### Email
- Must be valid email format
- Unique per event
- Required

### Photo
- Accepts URLs or relative paths
- Optional
- No format validation (trust upload handler)

### Social Links
- Twitter: Plain username or handle (no validation)
- GitHub: Username only
- LinkedIn: Username only
- Website: Must be valid URL
- All optional

---

## Database Constraints

### Unique Email Per Event
```sql
-- Enforced in application, not database
-- Query before insert/update:
SELECT * FROM Speaker WHERE eventId = ? AND email = ?
```

### Speaker-Session Uniqueness
```sql
-- Database constraint
@@unique([scheduleEntryId, speakerId])
```

---

## Photo Upload Flow

### Upload Endpoint
Handled separately from speaker router (see file upload documentation).

**Pattern**:
1. Client uploads image to `/api/upload`
2. Server saves to `/public/uploads/images/`
3. Returns relative path: `/uploads/images/filename.jpg`
4. Client uses path in `speaker.create` or `speaker.update`

### Storage Locations
- **Local**: `/public/uploads/images/` (development & MVP)
- **Future**: S3 or cloud storage (production)

---

## CFP Integration

When CFP proposal accepted (`cfp.acceptProposal`):

```typescript
// 1. Create speaker from proposal data
const speaker = await ctx.db.speaker.create({
  data: {
    eventId: submission.eventId,
    name: submission.speakerName,
    email: submission.speakerEmail,
    bio: submission.speakerBio,
    photo: submission.speakerPhoto,
    twitter: submission.speakerTwitter,
    github: submission.speakerGithub,
    linkedin: submission.speakerLinkedin,
    website: submission.speakerWebsite,
  },
});

// 2. Link submission to speaker
await ctx.db.cfpSubmission.update({
  where: { id: submission.id },
  data: { speakerId: speaker.id },
});

// 3. Optionally create schedule entry
// (Implementation pending)
```

---

## Error Codes

| Code | Scenario |
|------|----------|
| `NOT_FOUND` | Event or speaker not found |
| `FORBIDDEN` | User is not event organizer |
| `CONFLICT` | Duplicate email for event |

---

## Query Optimization

### Indexes
- `[eventId]`: List speakers by event
- `[email]`: Check for duplicates

### Include Patterns
```typescript
// Minimal speaker list
include: {
  speakerSessions: {
    include: {
      scheduleEntry: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  },
}

// Full speaker profile
include: {
  event: true,
  speakerSessions: {
    include: {
      scheduleEntry: {
        select: {
          id: true,
          title: true,
          description: true,
          startTime: true,
          endTime: true,
          location: true,
          track: true,
          trackColor: true,
          sessionType: true,
        },
      },
    },
  },
  cfpSubmissions: true,
}
```

---

## Related Documentation

- [Speakers Frontend →](./frontend.md)
- [Speakers Data Model →](./data-model.md)
- [Speakers Workflows →](./workflows.md)
- [CFP Acceptance Workflow →](../cfp/workflows.md#workflow-4-accept-cfp-proposal)
