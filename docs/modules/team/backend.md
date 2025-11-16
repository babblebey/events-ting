# Team Module - Backend Documentation

## Overview

The team module backend handles all server-side logic for team collaboration, including invitation management, permission enforcement, and access control. The primary implementation is in the tRPC router with dedicated middleware for authorization.

## API Router

**Location**: `src/server/api/routers/team.ts`

The team router provides procedures for managing team members and invitations. All procedures require authentication, and most require team membership verification.

### Procedures

#### Queries

##### `team.getMembers`

List all team members for an event with optional status filtering.

**Input**:
```typescript
{
  eventId: string;
  status?: TeamMemberStatus; // 'ACTIVE' | 'PENDING' | 'REMOVED'
}
```

**Output**:
```typescript
{
  members: Array<{
    id: string;
    email: string;
    role: TeamRole;
    status: TeamMemberStatus;
    modulePermissions: string[];
    invitedAt: Date;
    lastAccessedAt: Date | null;
    user?: {
      id: string;
      name: string;
      image: string | null;
    };
  }>;
  total: number;
}
```

**Authorization**: Requires active team membership (any role)

**Pagination**: Returns first 20 members (configurable)

**Example**:
```typescript
const { members } = await api.team.getMembers.query({ 
  eventId: "evt_123",
  status: "ACTIVE" 
});
```

---

##### `team.getCurrentMember`

Get the current user's team membership for an event.

**Input**:
```typescript
{
  eventId: string;
}
```

**Output**:
```typescript
{
  id: string;
  eventId: string;
  userId: string;
  email: string;
  role: TeamRole;
  status: TeamMemberStatus;
  modulePermissions: string[];
  invitedAt: Date;
  lastAccessedAt: Date | null;
  isOwner: boolean;
}
```

**Authorization**: Requires authentication

**Use case**: Check permissions before rendering UI elements

**Example**:
```typescript
const member = await api.team.getCurrentMember.query({ eventId: "evt_123" });
if (member.modulePermissions.includes("CFP")) {
  // Show CFP menu item
}
```

---

##### `team.getPendingInvitations`

List all pending invitations for an event.

**Input**:
```typescript
{
  eventId: string;
}
```

**Output**:
```typescript
{
  invitations: Array<{
    id: string;
    email: string;
    modulePermissions: string[];
    expiresAt: Date;
    sentAt: Date;
    sentBy: {
      name: string;
      email: string;
    };
  }>;
}
```

**Authorization**: Requires OWNER role

**Example**:
```typescript
const { invitations } = await api.team.getPendingInvitations.query({ 
  eventId: "evt_123" 
});
```

---

#### Mutations

##### `team.invite`

Send an invitation to a new collaborator.

**Input**:
```typescript
{
  eventId: string;
  email: string;
  modulePermissions: string[];
}
```

**Output**:
```typescript
{
  invitationId: string;
  teamMemberId: string;
  message: string;
}
```

**Authorization**: Requires OWNER role

**Validations**:
- Email must be valid format
- Email cannot be organizer's own email
- Email must not already be a team member
- modulePermissions must be valid module names
- At least one module must be selected

**Side effects**:
1. Creates `TeamMember` record with status `PENDING`
2. Creates `Invitation` record with unique token
3. Sends invitation email via Resend
4. Sets expiration to 7 days from now

**Errors**:
- `BAD_REQUEST`: Self-invitation attempt
- `BAD_REQUEST`: Email already a team member
- `BAD_REQUEST`: Invalid module permissions
- `FORBIDDEN`: User is not event owner

**Example**:
```typescript
await api.team.invite.mutate({
  eventId: "evt_123",
  email: "collaborator@example.com",
  modulePermissions: ["CFP", "SPEAKERS"],
});
```

---

##### `team.acceptInvitation`

Accept an invitation via token.

**Input**:
```typescript
{
  token: string;
}
```

**Output**:
```typescript
{
  eventId: string;
  eventName: string;
  modulePermissions: string[];
  message: string;
}
```

**Authorization**: Requires authentication

**Validations**:
- Token must exist
- Invitation must not be expired
- Invitation must be in `PENDING` status
- User email must match invitation email

**Side effects**:
1. Updates `TeamMember` status: `PENDING` → `ACTIVE`
2. Sets `userId` on `TeamMember`
3. Updates `Invitation` status: `PENDING` → `ACCEPTED`
4. Sets `respondedAt` timestamp
5. Sends acceptance notification email to organizer

**Errors**:
- `BAD_REQUEST`: Invalid or expired token
- `BAD_REQUEST`: Email mismatch
- `FORBIDDEN`: Already accepted by different user

**Example**:
```typescript
await api.team.acceptInvitation.mutate({
  token: "abc123def456...",
});
```

---

##### `team.declineInvitation`

Decline an invitation via token.

**Input**:
```typescript
{
  token: string;
  reason?: string;
}
```

**Output**:
```typescript
{
  message: string;
}
```

**Authorization**: Public (no auth required)

**Validations**:
- Token must exist
- Invitation must not be expired
- Invitation must be in `PENDING` status

**Side effects**:
1. Updates `TeamMember` status: `PENDING` → `REMOVED`
2. Updates `Invitation` status: `PENDING` → `DECLINED`
3. Sets `respondedAt` timestamp
4. Sends decline notification email to organizer

**Example**:
```typescript
await api.team.declineInvitation.mutate({
  token: "abc123def456...",
  reason: "Not available at this time",
});
```

---

##### `team.updatePermissions`

Update a collaborator's module permissions.

**Input**:
```typescript
{
  teamMemberId: string;
  modulePermissions: string[];
}
```

**Output**:
```typescript
{
  message: string;
  addedModules: string[];
  removedModules: string[];
}
```

**Authorization**: Requires OWNER role

**Validations**:
- teamMemberId must exist and be ACTIVE
- Cannot modify OWNER's permissions
- modulePermissions must be valid module names
- At least one module must be selected

**Side effects**:
1. Updates `TeamMember.modulePermissions`
2. Calculates added/removed modules
3. Sends permission change notification email to collaborator
4. Invalidates permission cache

**Errors**:
- `BAD_REQUEST`: Cannot modify owner
- `BAD_REQUEST`: Invalid module permissions
- `FORBIDDEN`: User is not event owner
- `NOT_FOUND`: Team member not found

**Example**:
```typescript
await api.team.updatePermissions.mutate({
  teamMemberId: "tm_abc123",
  modulePermissions: ["CFP", "SPEAKERS", "SCHEDULE"],
});
```

---

##### `team.removeMember`

Revoke a collaborator's access.

**Input**:
```typescript
{
  teamMemberId: string;
  reason?: string;
}
```

**Output**:
```typescript
{
  message: string;
}
```

**Authorization**: Requires OWNER role

**Validations**:
- teamMemberId must exist and be ACTIVE
- Cannot remove OWNER (self)
- Cannot remove user who hasn't accepted yet (use cancelInvitation)

**Side effects**:
1. Updates `TeamMember` status: `ACTIVE` → `REMOVED`
2. Sends access removal notification email to collaborator
3. Clears permission cache
4. Active sessions will be denied on next API call

**Errors**:
- `BAD_REQUEST`: Cannot remove self as owner
- `BAD_REQUEST`: Member not active (use cancelInvitation)
- `FORBIDDEN`: User is not event owner
- `NOT_FOUND`: Team member not found

**Example**:
```typescript
await api.team.removeMember.mutate({
  teamMemberId: "tm_abc123",
  reason: "Project completed",
});
```

---

##### `team.resendInvitation`

Resend an expired or pending invitation (generates new token).

**Input**:
```typescript
{
  invitationId: string;
}
```

**Output**:
```typescript
{
  newToken: string;
  expiresAt: Date;
  message: string;
}
```

**Authorization**: Requires OWNER role

**Validations**:
- invitationId must exist
- Invitation must be PENDING or EXPIRED
- Cannot resend accepted/declined invitations

**Side effects**:
1. Creates new `Invitation` record with new token
2. Updates old `Invitation` status to `CANCELLED`
3. Updates `TeamMember` expiry date
4. Sends new invitation email

**Example**:
```typescript
await api.team.resendInvitation.mutate({
  invitationId: "inv_xyz789",
});
```

---

##### `team.cancelInvitation`

Cancel a pending invitation.

**Input**:
```typescript
{
  invitationId: string;
}
```

**Output**:
```typescript
{
  message: string;
}
```

**Authorization**: Requires OWNER role

**Validations**:
- invitationId must exist
- Invitation must be PENDING
- Cannot cancel accepted invitations (use removeMember)

**Side effects**:
1. Updates `TeamMember` status: `PENDING` → `REMOVED`
2. Updates `Invitation` status: `PENDING` → `CANCELLED`
3. No email sent

**Example**:
```typescript
await api.team.cancelInvitation.mutate({
  invitationId: "inv_xyz789",
});
```

---

## Middleware

### `teamProtectedProcedure`

Custom tRPC middleware that enforces team membership and module permissions.

**Location**: `src/server/api/trpc.ts`

**Implementation**:
```typescript
export const teamProtectedProcedure = protectedProcedure.use(
  async ({ ctx, next, rawInput }) => {
    const { eventId, requiredModule } = rawInput as { 
      eventId: string; 
      requiredModule?: ModuleName; 
    };
    
    // Check team membership
    const member = await ctx.db.teamMember.findFirst({
      where: { 
        eventId,
        userId: ctx.session.user.id,
        status: "ACTIVE",
      },
    });
    
    if (!member) {
      throw new TRPCError({ 
        code: "FORBIDDEN",
        message: "You are not a member of this event team",
      });
    }
    
    // Check module permission (skip for owners)
    if (requiredModule && member.role !== "OWNER") {
      if (!member.modulePermissions.includes(requiredModule)) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: `You don't have access to ${requiredModule}`,
        });
      }
    }
    
    return next({ 
      ctx: { 
        ...ctx, 
        teamMember: member,
        isOwner: member.role === "OWNER",
      } 
    });
  }
);
```

**Usage in other routers**:
```typescript
// Example: CFP router
export const cfpRouter = createTRPCRouter({
  getSubmissions: teamProtectedProcedure
    .input(z.object({ 
      eventId: z.string(),
      requiredModule: z.literal("CFP"),
    }))
    .query(async ({ ctx, input }) => {
      // ctx.teamMember is available here
      // User is guaranteed to have CFP access
      return ctx.db.cfpSubmission.findMany({
        where: { eventId: input.eventId },
      });
    }),
});
```

**Performance**: 
- Single database query per request
- Results cached in middleware context
- Indexed query on `[eventId, userId, status]`

---

## Security

### Permission Enforcement Strategy

**Two-layer approach**:
1. **Server-side (Primary)**: Middleware validates on every API call
2. **Client-side (UX)**: React components hide/show based on permissions

**Never rely on client-side checks for security** - always enforce server-side.

### Invitation Token Security

**Token Generation**:
```typescript
import crypto from "crypto";

function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
```

**Security properties**:
- **Entropy**: 256 bits (2^256 possible values)
- **Format**: URL-safe Base64 (43 characters)
- **Collision resistance**: Astronomically unlikely to collide
- **Single-use**: Invalidated after acceptance/decline
- **Time-limited**: 7-day expiration enforced in database

**Why not hashed?**:
- Tokens are not passwords (not user-memorized)
- Single-use and short-lived
- No need for bcrypt/argon2 overhead
- Database lookup requires plaintext anyway

### Owner Protection

**Database constraints**:
```prisma
model User {
  id String @id
  invitedTeamMembers TeamMember[] @relation("InvitedBy")
  // Prevents deleting users who have invited others
  @@onDelete: Restrict
}
```

**API validation**:
- Owner cannot remove themselves (must transfer ownership first)
- Owner cannot modify their own permissions
- Only one owner per event (enforced in UI and DB)

### Rate Limiting

**Recommended limits** (not implemented yet):
- Invite: 10 invitations per event per hour
- Accept/Decline: 5 attempts per token
- Resend: 3 resends per invitation per day

---

## Performance Considerations

### Database Indexes

**Critical indexes**:
```prisma
model TeamMember {
  @@index([eventId, status])    // List members by status
  @@index([eventId, userId])    // Permission checks
  @@index([email])              // Duplicate detection
}

model Invitation {
  @@index([token])              // Token lookup (unique)
  @@index([eventId, status])    // List pending invitations
}
```

**Query performance targets**:
- Permission check: <100ms
- List members: <500ms for 50 members
- Invitation acceptance: <1s

### Caching Strategy

**tRPC query caching**:
```typescript
// Automatically cached by tRPC
const { data } = api.team.getMembers.useQuery({ 
  eventId: "evt_123" 
});

// Cache invalidation on mutations
api.team.invite.useMutation({
  onSuccess: () => {
    utils.team.getMembers.invalidate();
    utils.team.getPendingInvitations.invalidate();
  },
});
```

**Cache TTL**: 30 seconds (default tRPC)

**Invalidation triggers**:
- `invite` → Invalidates `getMembers`, `getPendingInvitations`
- `acceptInvitation` → Invalidates `getMembers`, `getCurrentMember`
- `updatePermissions` → Invalidates `getMembers`, `getCurrentMember`
- `removeMember` → Invalidates `getMembers`

### Optimistic Updates

All mutations use optimistic UI updates for instant feedback:

```typescript
const { mutate } = api.team.updatePermissions.useMutation({
  onMutate: async (newData) => {
    await utils.team.getMembers.cancel();
    const previous = utils.team.getMembers.getData();
    
    // Update cache optimistically
    utils.team.getMembers.setData({ eventId }, (old) => ({
      ...old,
      members: old.members.map((m) =>
        m.id === newData.teamMemberId
          ? { ...m, modulePermissions: newData.modulePermissions }
          : m
      ),
    }));
    
    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    utils.team.getMembers.setData({ eventId }, context.previous);
  },
});
```

---

## Error Handling

### Error Codes

| Code | Scenario | HTTP Status |
|------|----------|-------------|
| `UNAUTHORIZED` | Not logged in | 401 |
| `FORBIDDEN` | Not team member or insufficient permissions | 403 |
| `NOT_FOUND` | Team member or invitation not found | 404 |
| `BAD_REQUEST` | Invalid input or business rule violation | 400 |
| `INTERNAL_SERVER_ERROR` | Unexpected error | 500 |

### Common Error Messages

**`FORBIDDEN` errors**:
- "You are not a member of this event team"
- "You don't have access to [MODULE]"
- "Only event owners can invite collaborators"

**`BAD_REQUEST` errors**:
- "Cannot invite yourself"
- "This email is already a team member"
- "Invitation has expired"
- "Cannot remove yourself as owner"
- "Invalid module permissions"

### Error Handling Example

```typescript
try {
  await api.team.invite.mutate({ eventId, email, modulePermissions });
  toast.success("Invitation sent!");
} catch (error) {
  if (error.data?.code === "BAD_REQUEST") {
    toast.error(error.message);
  } else if (error.data?.code === "FORBIDDEN") {
    toast.error("You don't have permission to invite collaborators");
  } else {
    toast.error("Failed to send invitation. Please try again.");
  }
}
```

---

## Testing

### Unit Tests

**Location**: `tests/unit/team-router.test.ts`

Key test cases:
- Input validation (Zod schemas)
- Permission checks (middleware)
- Token generation uniqueness
- Expiration date calculation

### Integration Tests

**Location**: `tests/integration/team-collaboration.test.ts`

Test scenarios:
- Complete invitation flow (invite → accept → access)
- Permission enforcement across modules
- Permission updates and revocation
- Invitation decline flow
- Edge cases (duplicate, self-invite, expired)

**Example test**:
```typescript
describe("Team invitation flow", () => {
  it("should allow collaborator to access CFP after accepting invitation", async () => {
    // Setup
    const owner = await createTestUser();
    const event = await createTestEvent(owner.id);
    
    // Invite
    const { invitationId } = await caller.team.invite({
      eventId: event.id,
      email: "collaborator@example.com",
      modulePermissions: ["CFP"],
    });
    
    // Get token
    const invitation = await db.invitation.findUnique({
      where: { id: invitationId },
    });
    
    // Accept
    const collaborator = await createTestUser({ 
      email: "collaborator@example.com" 
    });
    await caller.team.acceptInvitation({ token: invitation.token });
    
    // Verify access
    const submissions = await caller.cfp.getSubmissions({
      eventId: event.id,
      requiredModule: "CFP",
    });
    
    expect(submissions).toBeDefined();
  });
});
```

### Contract Tests

**Location**: `tests/contract/team-router.test.ts`

Validates:
- Input/output schemas match documentation
- Error codes are correct
- Middleware is applied correctly

---

## Related Documentation

- [Frontend Documentation](./frontend.md)
- [Data Model](./data-model.md)
- [Workflows](./workflows.md)
- [Email Templates](./email-templates.md)
- [API Contracts](../../../specs/002-team-collaborators/contracts/team-router.md)

---

**Last Updated**: November 16, 2025
