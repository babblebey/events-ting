# Team Module - Data Model

## Overview

The team module uses two primary database models: `TeamMember` for representing user memberships in event teams, and `Invitation` for tracking pending invitations. These models work together to manage the complete lifecycle of team collaboration.

## Database Schema

### TeamMember Model

Represents a user's membership in an event team, including their role, permissions, and status.

```prisma
model TeamMember {
  id                String            @id @default(cuid())
  eventId           String
  userId            String?           // Null until invitation accepted
  email             String
  role              TeamRole          @default(COLLABORATOR)
  status            TeamMemberStatus  @default(PENDING)
  modulePermissions String[]          @default([])
  invitedById       String
  invitedAt         DateTime          @default(now())
  lastAccessedAt    DateTime?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  // Relations
  event             Event             @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user              User?             @relation("TeamMemberUser", fields: [userId], references: [id], onDelete: Cascade)
  invitedBy         User              @relation("InvitedBy", fields: [invitedById], references: [id], onDelete: Restrict)
  
  // Constraints
  @@unique([eventId, email])
  @@index([eventId, status])
  @@index([eventId, userId])
  @@index([userId])
  @@index([email])
}
```

#### Field Descriptions

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | String | Unique identifier (CUID) | Primary key |
| `eventId` | String | Event this membership belongs to | Foreign key → Event |
| `userId` | String? | User ID (null until accepted) | Foreign key → User, nullable |
| `email` | String | Email address of member/invitee | Required, indexed |
| `role` | TeamRole | Member role (OWNER or COLLABORATOR) | Enum, default: COLLABORATOR |
| `status` | TeamMemberStatus | Membership status | Enum, default: PENDING |
| `modulePermissions` | String[] | Array of module names | Default: empty array |
| `invitedById` | String | User who sent the invitation | Foreign key → User |
| `invitedAt` | DateTime | When invitation was sent | Default: now() |
| `lastAccessedAt` | DateTime? | Last time user accessed event | Nullable |
| `createdAt` | DateTime | Record creation timestamp | Auto-managed |
| `updatedAt` | DateTime | Last update timestamp | Auto-managed |

#### Indexes

**Purpose**: Optimize common query patterns

```prisma
@@unique([eventId, email])        // Prevent duplicate invitations
@@index([eventId, status])        // List members by status
@@index([eventId, userId])        // Permission checks
@@index([userId])                 // User's memberships
@@index([email])                  // Lookup by email
```

**Query performance impact**:
- Permission check: O(1) with index on `[eventId, userId]`
- List active members: O(log n) with index on `[eventId, status]`
- Email duplicate detection: O(1) with unique constraint

#### Relationships

**`event` (Many-to-One)**:
- Each team member belongs to one event
- Cascade delete: Deleting event removes all team members

**`user` (Many-to-One, nullable)**:
- Links to User after invitation accepted
- Cascade delete: Deleting user removes their team memberships
- Null until invitation is accepted

**`invitedBy` (Many-to-One)**:
- Tracks who sent the invitation
- Restrict delete: Cannot delete user who invited others (maintains audit trail)

---

### Invitation Model

Tracks pending invitations with secure tokens for acceptance/decline.

```prisma
model Invitation {
  id                String            @id @default(cuid())
  eventId           String
  email             String
  token             String            @unique
  modulePermissions String[]          @default([])
  status            InvitationStatus  @default(PENDING)
  expiresAt         DateTime
  sentById          String
  sentAt            DateTime          @default(now())
  respondedAt       DateTime?
  
  // Relations
  event             Event             @relation(fields: [eventId], references: [id], onDelete: Cascade)
  sentBy            User              @relation(fields: [sentById], references: [id], onDelete: Restrict)
  
  // Constraints
  @@index([token])
  @@index([eventId, status])
  @@index([email])
}
```

#### Field Descriptions

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | String | Unique identifier (CUID) | Primary key |
| `eventId` | String | Event for this invitation | Foreign key → Event |
| `email` | String | Email address of invitee | Required, indexed |
| `token` | String | Unique acceptance token | Unique, indexed |
| `modulePermissions` | String[] | Granted module permissions | Default: empty array |
| `status` | InvitationStatus | Invitation state | Enum, default: PENDING |
| `expiresAt` | DateTime | Expiration timestamp (7 days) | Required |
| `sentById` | String | User who sent invitation | Foreign key → User |
| `sentAt` | DateTime | When invitation was sent | Default: now() |
| `respondedAt` | DateTime? | When user accepted/declined | Nullable |

#### Indexes

```prisma
@@index([token])                  // Fast token lookup for acceptance
@@index([eventId, status])        // List pending invitations
@@index([email])                  // Lookup by email
```

#### Relationships

**`event` (Many-to-One)**:
- Each invitation belongs to one event
- Cascade delete: Deleting event removes all invitations

**`sentBy` (Many-to-One)**:
- Tracks who sent the invitation
- Restrict delete: Cannot delete user who sent invitations

---

## Enums

### TeamRole

Defines user roles within an event team.

```prisma
enum TeamRole {
  OWNER         // Event creator, full access
  COLLABORATOR  // Invited member, module-specific access
}
```

**Values**:
- `OWNER`: Event creator with full access to all modules including SETTINGS
- `COLLABORATOR`: Invited team member with access limited to assigned modules

**Usage**:
```typescript
if (member.role === "OWNER") {
  // Grant full access
} else {
  // Check modulePermissions
}
```

---

### TeamMemberStatus

Tracks the lifecycle status of a team membership.

```prisma
enum TeamMemberStatus {
  PENDING   // Invitation sent, not yet accepted
  ACTIVE    // Invitation accepted, member has access
  REMOVED   // Access revoked or invitation cancelled
}
```

**Status Transitions**:
```
PENDING → ACTIVE     (acceptInvitation)
PENDING → REMOVED    (cancelInvitation, declineInvitation)
ACTIVE  → REMOVED    (removeMember)
```

**Query patterns**:
```typescript
// List active members only
const activeMembers = await db.teamMember.findMany({
  where: { eventId, status: "ACTIVE" }
});

// List pending invitations
const pending = await db.teamMember.findMany({
  where: { eventId, status: "PENDING" }
});
```

---

### InvitationStatus

Tracks the state of invitation lifecycle.

```prisma
enum InvitationStatus {
  PENDING    // Sent, awaiting response
  ACCEPTED   // User accepted invitation
  DECLINED   // User declined invitation
  EXPIRED    // Past expiration date (optional cleanup)
  CANCELLED  // Organizer cancelled before acceptance
}
```

**Status Transitions**:
```
PENDING → ACCEPTED    (acceptInvitation)
PENDING → DECLINED    (declineInvitation)
PENDING → CANCELLED   (cancelInvitation)
PENDING → EXPIRED     (background cleanup, optional)
```

**Usage**:
```typescript
// Check if invitation is still valid
const invitation = await db.invitation.findUnique({
  where: { token }
});

if (invitation.status !== "PENDING") {
  throw new Error("Invitation is no longer valid");
}

if (invitation.expiresAt < new Date()) {
  throw new Error("Invitation has expired");
}
```

---

## Module Permissions

### Valid Module Names

Module permissions are stored as an array of strings. Valid values:

```typescript
type ModuleName = 
  | "OVERVIEW"         // Event dashboard
  | "ATTENDEES"        // Registration management
  | "TICKETS"          // Ticket types
  | "SCHEDULE"         // Schedule builder
  | "SPEAKERS"         // Speaker profiles
  | "CFP"              // Call for Papers
  | "COMMUNICATIONS"   // Email campaigns
  // SETTINGS is owner-only, never in modulePermissions
```

### Permission Checking

**Binary permissions**: Having a module grants full CRUD access within it.

```typescript
function hasModuleAccess(
  member: TeamMember, 
  requiredModule: ModuleName
): boolean {
  if (member.role === "OWNER") {
    return true; // Owners have access to all modules
  }
  
  return member.modulePermissions.includes(requiredModule);
}
```

### Database Storage

Permissions are stored as a JSON array:

```sql
-- Example: User has CFP and Speakers access
modulePermissions: ["CFP", "SPEAKERS"]

-- Example: Empty array for new invitations
modulePermissions: []
```

**PostgreSQL advantages**:
- Native array type support
- Efficient querying with `@>` operator
- Index support for array containment

**Query examples**:
```typescript
// Find all members with CFP access
const cfpMembers = await db.teamMember.findMany({
  where: {
    eventId,
    status: "ACTIVE",
    modulePermissions: { has: "CFP" },
  },
});

// Find members with multiple specific permissions
const members = await db.teamMember.findMany({
  where: {
    eventId,
    modulePermissions: { hasEvery: ["CFP", "SPEAKERS"] },
  },
});
```

---

## Data Lifecycle

### Invitation Flow

**1. Invitation Creation**:
```typescript
// Create TeamMember record
const teamMember = await db.teamMember.create({
  data: {
    eventId,
    email,
    userId: null, // Not yet known
    role: "COLLABORATOR",
    status: "PENDING",
    modulePermissions,
    invitedById: currentUserId,
  },
});

// Create Invitation record
const invitation = await db.invitation.create({
  data: {
    eventId,
    email,
    token: generateToken(),
    modulePermissions,
    status: "PENDING",
    expiresAt: addDays(new Date(), 7),
    sentById: currentUserId,
  },
});
```

**2. Invitation Acceptance**:
```typescript
// Update both records atomically
await db.$transaction([
  db.teamMember.update({
    where: { id: teamMemberId },
    data: {
      userId: currentUserId,
      status: "ACTIVE",
    },
  }),
  db.invitation.update({
    where: { token },
    data: {
      status: "ACCEPTED",
      respondedAt: new Date(),
    },
  }),
]);
```

**3. Invitation Decline**:
```typescript
await db.$transaction([
  db.teamMember.update({
    where: { id: teamMemberId },
    data: { status: "REMOVED" },
  }),
  db.invitation.update({
    where: { token },
    data: {
      status: "DECLINED",
      respondedAt: new Date(),
    },
  }),
]);
```

---

### Permission Updates

**Update collaborator permissions**:
```typescript
await db.teamMember.update({
  where: { id: teamMemberId },
  data: {
    modulePermissions: newPermissions,
    updatedAt: new Date(), // Auto-managed by Prisma
  },
});
```

---

### Access Revocation

**Remove team member**:
```typescript
await db.teamMember.update({
  where: { id: teamMemberId },
  data: {
    status: "REMOVED",
    updatedAt: new Date(),
  },
});
```

**Note**: We use soft delete (status change) instead of hard delete to:
- Maintain audit trail
- Preserve invitation history
- Allow re-invitation with same email

---

## Data Integrity

### Constraints

**Unique constraint on email per event**:
```prisma
@@unique([eventId, email])
```

**Purpose**: Prevent duplicate invitations to the same email for one event

**Error handling**:
```typescript
try {
  await db.teamMember.create({ data });
} catch (error) {
  if (error.code === "P2002") {
    throw new Error("This email is already invited to this event");
  }
  throw error;
}
```

---

### Referential Integrity

**Cascade deletes**:
- Deleting an `Event` → Deletes all `TeamMember` and `Invitation` records
- Deleting a `User` → Deletes their team memberships (as member)

**Restrict deletes**:
- Deleting a `User` → Blocked if they invited others (maintains audit trail)

```prisma
// This prevents deletion
invitedBy User @relation("InvitedBy", fields: [invitedById], references: [id], onDelete: Restrict)
```

**Workaround** for deleting users who invited others:
1. First reassign invitations to another user, or
2. Mark the user as "deactivated" instead of deleting

---

## Query Patterns

### Common Queries

#### Get user's team membership for permission check:
```typescript
const member = await db.teamMember.findFirst({
  where: {
    eventId,
    userId: currentUserId,
    status: "ACTIVE",
  },
});

if (!member) {
  throw new Error("Not a team member");
}

if (!member.modulePermissions.includes("CFP")) {
  throw new Error("No access to CFP module");
}
```

#### List all active team members:
```typescript
const members = await db.teamMember.findMany({
  where: {
    eventId,
    status: "ACTIVE",
  },
  include: {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    },
  },
  orderBy: {
    role: "asc", // OWNERs first
  },
});
```

#### List pending invitations:
```typescript
const invitations = await db.invitation.findMany({
  where: {
    eventId,
    status: "PENDING",
  },
  include: {
    sentBy: {
      select: { name: true, email: true },
    },
  },
  orderBy: {
    sentAt: "desc",
  },
});
```

#### Find invitation by token:
```typescript
const invitation = await db.invitation.findUnique({
  where: { token },
  include: {
    event: {
      select: {
        id: true,
        name: true,
        slug: true,
      },
    },
  },
});
```

#### Get all events user is a member of:
```typescript
const memberships = await db.teamMember.findMany({
  where: {
    userId: currentUserId,
    status: "ACTIVE",
  },
  include: {
    event: {
      select: {
        id: true,
        name: true,
        slug: true,
        startDate: true,
      },
    },
  },
  orderBy: {
    event: { startDate: "asc" },
  },
});
```

---

## Data Migration

### Initial Setup

**Create tables**:
```bash
npx prisma migrate dev --name add_team_collaboration
```

**Seed owner records** for existing events:
```typescript
// Migration script
const events = await db.event.findMany();

for (const event of events) {
  await db.teamMember.create({
    data: {
      eventId: event.id,
      userId: event.createdById,
      email: event.createdBy.email,
      role: "OWNER",
      status: "ACTIVE",
      modulePermissions: [], // Owners don't need explicit permissions
      invitedById: event.createdById, // Self-invited
      invitedAt: event.createdAt,
    },
  });
}
```

---

## Performance Considerations

### Index Strategy

**Most critical indexes**:
1. `[eventId, userId]` - Permission checks (every protected API call)
2. `[token]` - Invitation acceptance (unique lookup)
3. `[eventId, status]` - List members/invitations (common query)

**Performance targets**:
- Permission check: <100ms (indexed query)
- List members: <500ms for 50 members
- Token lookup: <50ms (unique index)

---

### Query Optimization

**Use select to limit fields**:
```typescript
// Bad: Fetches all user fields
const members = await db.teamMember.findMany({
  where: { eventId },
  include: { user: true },
});

// Good: Only fetch needed fields
const members = await db.teamMember.findMany({
  where: { eventId },
  include: {
    user: {
      select: { id: true, name: true, email: true },
    },
  },
});
```

**Paginate large result sets**:
```typescript
const members = await db.teamMember.findMany({
  where: { eventId, status: "ACTIVE" },
  take: 20,
  skip: page * 20,
  orderBy: { invitedAt: "desc" },
});
```

---

## Data Cleanup

### Optional: Expired Invitations

**Background job** (cron) to mark expired invitations:

```typescript
// Run daily
async function cleanupExpiredInvitations() {
  await db.invitation.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: new Date() },
    },
    data: {
      status: "EXPIRED",
    },
  });
}
```

**Note**: This is optional. Expiration is checked at acceptance time, so cleanup is purely for data hygiene.

---

## Testing

### Seed Data

**Test data structure**:
```typescript
// tests/fixtures/team-data.ts
export const teamMemberFixtures = {
  owner: {
    email: "owner@example.com",
    role: "OWNER",
    status: "ACTIVE",
    modulePermissions: [],
  },
  collaborator: {
    email: "collaborator@example.com",
    role: "COLLABORATOR",
    status: "ACTIVE",
    modulePermissions: ["CFP", "SPEAKERS"],
  },
  pending: {
    email: "pending@example.com",
    role: "COLLABORATOR",
    status: "PENDING",
    modulePermissions: ["ATTENDEES"],
  },
};
```

---

## Related Documentation

- [Backend Documentation](./backend.md)
- [Frontend Documentation](./frontend.md)
- [Workflows](./workflows.md)
- [Feature Specification](../../../specs/002-team-collaborators/spec.md)

---

**Last Updated**: November 16, 2025
