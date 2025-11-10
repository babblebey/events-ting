# Speakers Data Model

## Primary Model

### Speaker

**Location**: `prisma/schema.prisma`

Represents a speaker profile for an event.

```prisma
model Speaker {
  id       String @id @default(cuid())
  eventId  String
  event    Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  // Speaker Info
  name     String
  bio      String @db.Text
  email    String
  photo    String? // URL or relative path
  
  // Social Links
  twitter  String?
  github   String?
  linkedin String?
  website  String?
  
  // Relations
  speakerSessions SpeakerSession[]
  cfpSubmissions  CfpSubmission[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([eventId])
  @@index([email])
}
```

**Field Descriptions**:

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | String (CUID) | No | Unique identifier |
| `eventId` | String | No | Parent event reference |
| `name` | String | No | Speaker full name (2-200 chars) |
| `bio` | Text | No | Speaker biography (10-5000 chars) |
| `email` | String | No | Contact email (unique per event) |
| `photo` | String | Yes | Photo path or URL |
| `twitter` | String | Yes | Twitter handle (without @) |
| `github` | String | Yes | GitHub username |
| `linkedin` | String | Yes | LinkedIn profile ID |
| `website` | String | Yes | Personal/company website URL |
| `createdAt` | DateTime | No | Creation timestamp |
| `updatedAt` | DateTime | No | Last modification timestamp |

**Relationships**:
- **Belongs to**: Event (many-to-one, cascade delete)
- **Has many**: SpeakerSession (sessions assigned to speaker)
- **Has many**: CfpSubmission (if speaker created from CFP)

**Indexes**:
- `[eventId]`: List speakers by event
- `[email]`: Check duplicates, lookup by email

**Cascading Behavior**:
- When Event deleted → Speaker deleted
- When Speaker deleted → SpeakerSessions deleted (cascade)
- When Speaker deleted → CfpSubmissions.speakerId set to null

---

### SpeakerSession (Junction Table)

**Location**: `prisma/schema.prisma`

See [Schedule Data Model](../schedule/data-model.md#speakersession-junction-table) for full details.

**Summary**:
```prisma
model SpeakerSession {
  id              String        @id @default(cuid())
  scheduleEntryId String
  scheduleEntry   ScheduleEntry @relation(...)
  
  speakerId       String
  speaker         Speaker       @relation(...)
  
  role            String?       @default("speaker")
  
  createdAt       DateTime      @default(now())
  
  @@unique([scheduleEntryId, speakerId])
}
```

---

## Constraints

### Application-Level Uniqueness

Speakers are unique by email **per event**:

```typescript
const existingSpeaker = await prisma.speaker.findFirst({
  where: {
    eventId: eventId,
    email: email,
  },
});

if (existingSpeaker) {
  throw new Error("Speaker with this email already exists for this event");
}
```

**Rationale**: Same person can speak at multiple events (separate speaker records).

### Database Constraints

- `eventId` foreign key → Event (cascade delete)
- Compound unique in SpeakerSession: `[scheduleEntryId, speakerId]`

---

## Query Patterns

### Get All Speakers for Event

```typescript
const speakers = await prisma.speaker.findMany({
  where: { eventId },
  orderBy: { name: 'asc' },
  include: {
    speakerSessions: {
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
    },
  },
});
```

### Get Speaker by ID with Full Details

```typescript
const speaker = await prisma.speaker.findUnique({
  where: { id },
  include: {
    event: {
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
      },
    },
    speakerSessions: {
      include: {
        scheduleEntry: true,
      },
      orderBy: {
        scheduleEntry: {
          startTime: 'asc',
        },
      },
    },
    cfpSubmissions: {
      select: {
        id: true,
        title: true,
        status: true,
      },
    },
  },
});
```

### Check for Duplicate Email

```typescript
const duplicate = await prisma.speaker.findFirst({
  where: {
    eventId: eventId,
    email: newEmail,
    id: { not: speakerId }, // Exclude current speaker (for updates)
  },
});
```

### Get Speakers with Session Count

```typescript
const speakers = await prisma.speaker.findMany({
  where: { eventId },
  include: {
    _count: {
      select: { speakerSessions: true },
    },
  },
  orderBy: { name: 'asc' },
});

// Access: speaker._count.speakerSessions
```

---

## CFP Integration

When CFP proposal accepted, speaker auto-created:

```typescript
const speaker = await prisma.speaker.create({
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

// Link submission to speaker
await prisma.cfpSubmission.update({
  where: { id: submission.id },
  data: { speakerId: speaker.id },
});
```

**Data Flow**: CfpSubmission → Speaker creation → Link via `speakerId`

---

## Photo Storage

### Paths

- **Uploaded**: `/public/uploads/images/speaker-{id}-{timestamp}.{ext}`
- **External URL**: Full URL from CFP submission or manual entry

### Database Storage

Stored as string, can be:
- Relative path: `/uploads/images/filename.jpg`
- Absolute URL: `https://example.com/photo.jpg`

### Display Pattern

```tsx
const photoUrl = speaker.photo?.startsWith('http')
  ? speaker.photo
  : `${baseUrl}${speaker.photo}`;

<img src={photoUrl} alt={speaker.name} />
```

---

## Social Media URL Construction

### Frontend Conversion

```typescript
const socialLinks = {
  twitter: speaker.twitter ? `https://twitter.com/${speaker.twitter}` : null,
  github: speaker.github ? `https://github.com/${speaker.github}` : null,
  linkedin: speaker.linkedin ? `https://linkedin.com/in/${speaker.linkedin}` : null,
  website: speaker.website, // Already full URL
};
```

### Storage Format

- **Twitter**: Username only (no @, no URL)
- **GitHub**: Username only
- **LinkedIn**: Profile ID only
- **Website**: Full URL

---

## Indexes & Performance

### Query Optimization

Indexes support common queries:
- Listing speakers by event: `[eventId]` index
- Email lookups: `[email]` index
- Session assignments: Handled by SpeakerSession indexes

### Include Patterns

**Minimal** (for cards):
```typescript
include: {
  _count: {
    select: { speakerSessions: true },
  },
}
```

**Standard** (for listings):
```typescript
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
```

**Full** (for profile pages):
```typescript
include: {
  event: true,
  speakerSessions: {
    include: {
      scheduleEntry: true,
    },
  },
  cfpSubmissions: true,
}
```

---

## Migration History

Key schema changes:

1. **Initial Creation**: Basic speaker model with name, bio, email
2. **Social Links**: Added Twitter, GitHub, LinkedIn, website fields
3. **Session Assignment**: Created SpeakerSession junction table
4. **CFP Integration**: Added `cfpSubmissions` relation

---

## Related Documentation

- [Speakers Backend →](./backend.md)
- [Speakers Frontend →](./frontend.md)
- [Speakers Workflows →](./workflows.md)
- [Schedule Data Model →](../schedule/data-model.md)
- [CFP Data Model →](../cfp/data-model.md)
