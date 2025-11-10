# CFP Backend Documentation

## Overview

The CFP backend is implemented as a tRPC router (`cfpRouter`) that handles all Call for Papers management operations. It provides procedures for organizers to manage CFPs and for the public to submit proposals, with automatic email notifications and speaker profile creation.

## Router Location

**File**: `src/server/api/routers/cfp.ts`

## Procedures

### 1. `getCfpByEventId` (Protected)

**Purpose**: Fetch CFP details for organizer dashboard  
**Type**: Query  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  eventId: string (cuid)
}
```

**Output**:
```typescript
{
  id: string,
  eventId: string,
  guidelines: string,
  deadline: Date,
  status: 'open' | 'closed',
  requiredFields: Json | null,
  event: {
    id: string,
    name: string,
    slug: string
  },
  createdAt: Date,
  updatedAt: Date
} | null
```

**Authorization**:
- Verifies user is the event organizer

**Business Logic**:
1. Validates user owns the event
2. Fetches CFP with event details
3. Returns `null` if CFP doesn't exist

---

### 2. `getPublicCfp` (Public)

**Purpose**: Fetch CFP for public submission page  
**Type**: Query  
**Authentication**: Not required

**Input Schema**:
```typescript
{ eventId: string } | { eventSlug: string }
```

**Output**:
```typescript
{
  id: string,
  guidelines: string,
  deadline: Date,
  status: 'open' | 'closed',
  requiredFields: Json | null,
  eventId: string
} | null
```

**Business Logic**:
- Accepts either event ID or slug
- Returns only public-safe fields (excludes sensitive organizer info)
- Returns `null` if CFP doesn't exist

---

### 3. `open` (Protected)

**Purpose**: Create a new CFP for an event  
**Type**: Mutation  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  eventId: string (cuid),
  guidelines: string (min 10 chars),
  deadline: Date,
  requiredFields?: string[] // e.g., ['speakerBio', 'speakerPhoto']
}
```

**Output**:
```typescript
{
  id: string,
  eventId: string,
  guidelines: string,
  deadline: Date,
  requiredFields: Json | null,
  status: 'open',
  event: {
    id: string,
    name: string,
    slug: string
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Validation**:
- Deadline must be in the future
- Only one CFP allowed per event (throws CONFLICT if exists)

**Authorization**:
- Verifies user owns the event

**Feature Requirements**: FR-026

---

### 4. `close` (Protected)

**Purpose**: Close an existing CFP (stop accepting submissions)  
**Type**: Mutation  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  cfpId: string (cuid)
}
```

**Output**:
```typescript
{
  id: string,
  status: 'closed',
  // ... other CFP fields
}
```

**Authorization**:
- Verifies user owns the event associated with CFP

**Feature Requirements**: FR-028

---

### 5. `update` (Protected)

**Purpose**: Update CFP guidelines and settings  
**Type**: Mutation  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  cfpId: string (cuid),
  guidelines?: string (min 10 chars),
  deadline?: Date,
  requiredFields?: string[]
}
```

**Output**:
```typescript
{
  id: string,
  // ... updated CFP fields
}
```

**Authorization**:
- Verifies user owns the event associated with CFP

**Feature Requirements**: FR-027

---

### 6. `submitProposal` (Public)

**Purpose**: Submit a session proposal (public endpoint)  
**Type**: Mutation  
**Authentication**: Not required

**Input Schema**:
```typescript
{
  cfpId: string (cuid),
  title: string (min 5, max 200 chars),
  description: string (min 50, max 3000 chars),
  sessionFormat: 'talk' | 'workshop' | 'panel' | 'lightning',
  duration: number (15-240 minutes),
  speakerName: string (min 2, max 100 chars),
  speakerEmail: string (valid email),
  speakerBio: string (min 50, max 1000 chars),
  speakerPhoto?: string (URL),
  speakerTwitter?: string (max 50 chars),
  speakerGithub?: string (max 50 chars),
  speakerLinkedin?: string (max 100 chars),
  speakerWebsite?: string (valid URL)
}
```

**Output**:
```typescript
{
  id: string,
  eventId: string,
  cfpId: string,
  title: string,
  // ... all submission fields
  status: 'pending',
  submittedAt: Date
}
```

**Deadline Enforcement** (FR-030):
1. Checks CFP status is 'open'
2. Validates deadline hasn't passed
3. Throws BAD_REQUEST if deadline exceeded

**Side Effects**:
- Sends confirmation email to speaker via `sendEmail()` service
- Email template: `CfpSubmissionReceived`
- Email is sent asynchronously (doesn't block response)

**Feature Requirements**: FR-029, FR-030, FR-036 (submission confirmation)

---

### 7. `listSubmissions` (Protected)

**Purpose**: List all submissions for organizer review  
**Type**: Query (Infinite)  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  cfpId: string (cuid),
  status?: 'pending' | 'accepted' | 'rejected' | 'all' (default: 'all'),
  limit?: number (1-100, default: 20),
  cursor?: string (cuid)
}
```

**Output**:
```typescript
{
  submissions: Array<{
    id: string,
    eventId: string,
    cfpId: string,
    title: string,
    description: string,
    sessionFormat: string,
    duration: number,
    speakerName: string,
    speakerEmail: string,
    speakerBio: string,
    speakerPhoto?: string,
    speakerTwitter?: string,
    speakerGithub?: string,
    speakerLinkedin?: string,
    speakerWebsite?: string,
    status: string,
    reviewNotes?: string,
    reviewScore?: number,
    speakerId?: string,
    speaker?: {
      id: string,
      name: string,
      email: string
    },
    submittedAt: Date,
    reviewedAt?: Date,
    updatedAt: Date
  }>,
  nextCursor?: string
}
```

**Pagination**:
- Cursor-based pagination
- Returns `limit + 1` items to determine if more exist
- Ordered by: status ASC (pending first), submittedAt DESC (newest first)

**Authorization**:
- Verifies user owns the event associated with CFP

**Feature Requirements**: FR-031

---

### 8. `reviewSubmission` (Protected)

**Purpose**: Add review notes and score to a submission  
**Type**: Mutation  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  submissionId: string (cuid),
  reviewNotes?: string (max 2000 chars),
  reviewScore?: number (1-5)
}
```

**Output**:
```typescript
{
  id: string,
  reviewNotes?: string,
  reviewScore?: number,
  reviewedAt: Date,
  // ... other submission fields
}
```

**Business Logic**:
- Updates reviewNotes and/or reviewScore
- Sets reviewedAt timestamp
- Does not change submission status (still pending)

**Authorization**:
- Verifies user owns the event associated with submission

**Feature Requirements**: FR-032

---

### 9. `acceptProposal` (Protected)

**Purpose**: Accept a proposal and create speaker profile  
**Type**: Mutation  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  submissionId: string (cuid),
  reviewNotes?: string (max 2000 chars)
}
```

**Output**:
```typescript
{
  id: string,
  status: 'accepted',
  reviewedAt: Date,
  speakerId: string,
  // ... other submission fields
}
```

**Business Logic**:
1. Validates submission is in 'pending' status
2. Checks if speaker with same email already exists for this event
3. **Auto-creates Speaker profile** if not exists:
   - Uses submission speaker info
   - Links speaker to submission
4. Updates submission status to 'accepted'
5. Sets reviewedAt timestamp

**Side Effects**:
- **Creates Speaker profile** (FR-034)
- Sends acceptance email via `sendEmail()` service
- Email template: `CfpAccepted`
- Includes session details and next steps

**Authorization**:
- Verifies user owns the event associated with submission

**Feature Requirements**: FR-033, FR-034, FR-036 (acceptance email)

**Transaction Safety**:
- Uses Prisma transaction to ensure atomicity
- Speaker creation and submission update happen together

---

### 10. `rejectProposal` (Protected)

**Purpose**: Reject a proposal with optional feedback  
**Type**: Mutation  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  submissionId: string (cuid),
  reviewNotes?: string (max 2000 chars)
}
```

**Output**:
```typescript
{
  id: string,
  status: 'rejected',
  reviewedAt: Date,
  reviewNotes?: string,
  // ... other submission fields
}
```

**Business Logic**:
1. Validates submission is in 'pending' status
2. Updates submission status to 'rejected'
3. Stores optional review notes (included in rejection email)
4. Sets reviewedAt timestamp

**Side Effects**:
- Sends rejection email via `sendEmail()` service
- Email template: `CfpRejected`
- Includes optional feedback from reviewNotes

**Authorization**:
- Verifies user owns the event associated with submission

**Feature Requirements**: FR-035, FR-036 (rejection email)

---

## Validation Schemas

All input validation uses Zod schemas defined in the router file:

```typescript
// CFP Management
openCfpSchema
closeCfpSchema
updateCfpSchema
getCfpByEventIdSchema
getPublicCfpSchema

// Submission Management
submitProposalSchema
listSubmissionsSchema
reviewSubmissionSchema
acceptProposalSchema
rejectProposalSchema
```

## Error Handling

**Common Errors**:
- `NOT_FOUND`: CFP, event, or submission not found
- `FORBIDDEN`: User doesn't own the event
- `CONFLICT`: CFP already exists for event
- `BAD_REQUEST`: Deadline passed, invalid input, or submission already reviewed

**Error Response Format**:
```typescript
{
  code: 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'BAD_REQUEST',
  message: string
}
```

## Email Integration

Uses `sendEmail()` service from `@/server/services/email`:

**Templates Used**:
1. `CfpSubmissionReceived` - Confirmation on submission
2. `CfpAccepted` - Acceptance notification
3. `CfpRejected` - Rejection notification with feedback

**Email Metadata**:
- Tags: `type: cfp-*`, `eventId: {id}`
- Used for tracking and organization

## Best Practices

### For Organizers
1. **Set Clear Guidelines**: Provide detailed submission requirements
2. **Reasonable Deadlines**: Allow speakers adequate preparation time
3. **Timely Reviews**: Review submissions promptly
4. **Constructive Feedback**: Include helpful notes in rejections
5. **Score Consistently**: Use 1-5 scale uniformly across submissions

### For Developers
1. **Deadline Enforcement**: Always check CFP status and deadline before accepting submissions
2. **Transaction Safety**: Use transactions when creating speakers from proposals
3. **Email Errors**: Log email errors but don't fail the main operation
4. **Authorization**: Always verify organizer ownership before mutations
5. **Pagination**: Use cursor-based pagination for large submission lists

## Database Queries

**Indexes Used**:
- `CallForPapers.eventId` - Fast CFP lookup by event
- `CallForPapers.status + deadline` - Query open/closed CFPs
- `CfpSubmission.cfpId` - Fast submission lookup
- `CfpSubmission.status` - Filter by review status
- `CfpSubmission.cfpId + status` - Combined filtering
- `CfpSubmission.speakerEmail` - Check for existing speakers

**Optimization Tips**:
- Use `select` to fetch only needed fields for public endpoints
- Leverage cursor pagination for large submission lists
- Consider caching CFP guidelines on public pages

## Related Documentation

- [Frontend Documentation](./frontend.md) - UI components and pages
- [Data Model](./data-model.md) - Database schema details
- [Workflows](./workflows.md) - End-to-end user flows
- [Email Templates](./email-templates.md) - Email notification details
