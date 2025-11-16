# tRPC Team Router Contract

**Feature**: Team Collaboration & Permissions  
**Router**: `team`  
**Date**: November 16, 2025

---

## Overview

The `team` router provides procedures for managing event team members, invitations, and permissions. All procedures require authentication, and most require event access verification.

**Base Path**: `api.team.*`

---

## Type Definitions

### Shared Types

```typescript
// Module names (matches dashboard navigation)
const MODULE_NAMES = [
  "OVERVIEW",
  "ATTENDEES", 
  "TICKETS",
  "SCHEDULE",
  "SPEAKERS",
  "CFP",
  "COMMUNICATIONS",
] as const;

type ModuleName = typeof MODULE_NAMES[number];

// Team member role
type TeamRole = "OWNER" | "COLLABORATOR";

// Team member status
type TeamMemberStatus = "PENDING" | "ACTIVE" | "REMOVED";

// Invitation status
type InvitationStatus = 
  | "PENDING" 
  | "ACCEPTED" 
  | "DECLINED" 
  | "EXPIRED" 
  | "CANCELLED";
```

---

## Procedures

### 1. `team.getMembers`

**Type**: Query  
**Access**: Event owner or any active collaborator  
**Description**: Get all team members for an event (including pending invitations)

#### Input Schema

```typescript
{
  eventId: string;        // CUID of event
  status?: TeamMemberStatus;  // Optional filter
}
```

**Zod Schema**:
```typescript
z.object({
  eventId: z.string().cuid(),
  status: z.enum(["PENDING", "ACTIVE", "REMOVED"]).optional(),
})
```

#### Output Schema

```typescript
{
  members: Array<{
    id: string;
    email: string;
    role: TeamRole;
    status: TeamMemberStatus;
    modulePermissions: ModuleName[];
    user: {
      id: string;
      name: string | null;
      image: string | null;
    } | null;
    invitedBy: {
      id: string;
      name: string | null;
    };
    invitedAt: Date;
    lastAccessedAt: Date | null;
  }>;
}
```

#### Example

**Request**:
```typescript
const { members } = await api.team.getMembers.useQuery({
  eventId: "evt_abc123",
  status: "ACTIVE",
});
```

**Response**:
```typescript
{
  members: [
    {
      id: "tm_owner123",
      email: "alice@example.com",
      role: "OWNER",
      status: "ACTIVE",
      modulePermissions: [],
      user: {
        id: "usr_alice",
        name: "Alice Smith",
        image: "https://avatar.url/alice.jpg",
      },
      invitedBy: {
        id: "usr_alice",
        name: "Alice Smith",
      },
      invitedAt: new Date("2025-01-01"),
      lastAccessedAt: new Date("2025-11-16"),
    },
    {
      id: "tm_collab456",
      email: "bob@example.com",
      role: "COLLABORATOR",
      status: "ACTIVE",
      modulePermissions: ["CFP", "SPEAKERS"],
      user: {
        id: "usr_bob",
        name: "Bob Johnson",
        image: null,
      },
      invitedBy: {
        id: "usr_alice",
        name: "Alice Smith",
      },
      invitedAt: new Date("2025-02-15"),
      lastAccessedAt: new Date("2025-11-15"),
    },
  ]
}
```

#### Error Cases

- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User not a member of this event
- `NOT_FOUND`: Event does not exist

---

### 2. `team.getCurrentMember`

**Type**: Query  
**Access**: Any authenticated user  
**Description**: Get current user's team membership for an event (used for permission checks)

#### Input Schema

```typescript
{
  eventId: string;
}
```

**Zod Schema**:
```typescript
z.object({
  eventId: z.string().cuid(),
})
```

#### Output Schema

```typescript
{
  id: string;
  role: TeamRole;
  status: TeamMemberStatus;
  modulePermissions: ModuleName[];
} | null
```

**Returns `null`** if user is not a member of this event.

#### Example

**Request**:
```typescript
const member = await api.team.getCurrentMember.useQuery({
  eventId: "evt_abc123",
});
```

**Response** (member exists):
```typescript
{
  id: "tm_collab456",
  role: "COLLABORATOR",
  status: "ACTIVE",
  modulePermissions: ["CFP", "SPEAKERS", "SCHEDULE"],
}
```

**Response** (not a member):
```typescript
null
```

#### Error Cases

- `UNAUTHORIZED`: User not authenticated

---

### 3. `team.invite`

**Type**: Mutation  
**Access**: Event owner only  
**Description**: Invite a new collaborator to the event

#### Input Schema

```typescript
{
  eventId: string;
  email: string;           // Email address of invitee
  modulePermissions: ModuleName[];  // At least 1 required
}
```

**Zod Schema**:
```typescript
z.object({
  eventId: z.string().cuid(),
  email: z.string().email(),
  modulePermissions: z.array(
    z.enum(MODULE_NAMES)
  ).min(1, "Select at least one module"),
})
```

#### Output Schema

```typescript
{
  invitation: {
    id: string;
    email: string;
    token: string;
    modulePermissions: ModuleName[];
    status: "PENDING";
    expiresAt: Date;
    sentAt: Date;
  };
  teamMember: {
    id: string;
    email: string;
    role: "COLLABORATOR";
    status: "PENDING";
    modulePermissions: ModuleName[];
  };
}
```

#### Example

**Request**:
```typescript
const { invitation, teamMember } = await api.team.invite.mutate({
  eventId: "evt_abc123",
  email: "newmember@example.com",
  modulePermissions: ["CFP", "ATTENDEES"],
});
```

**Response**:
```typescript
{
  invitation: {
    id: "inv_xyz789",
    email: "newmember@example.com",
    token: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v",
    modulePermissions: ["CFP", "ATTENDEES"],
    status: "PENDING",
    expiresAt: new Date("2025-11-23T12:00:00Z"),
    sentAt: new Date("2025-11-16T12:00:00Z"),
  },
  teamMember: {
    id: "tm_new123",
    email: "newmember@example.com",
    role: "COLLABORATOR",
    status: "PENDING",
    modulePermissions: ["CFP", "ATTENDEES"],
  }
}
```

#### Side Effects

1. Creates `Invitation` record with unique token
2. Creates `TeamMember` record with status `PENDING`
3. Sends invitation email to specified address
4. Invalidates `team.getMembers` query cache

#### Error Cases

- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User is not the event owner
- `BAD_REQUEST`: Email already has active membership
- `BAD_REQUEST`: Email has pending invitation
- `BAD_REQUEST`: Self-invitation attempt (email matches current user)
- `NOT_FOUND`: Event does not exist

---

### 4. `team.resendInvitation`

**Type**: Mutation  
**Access**: Event owner only  
**Description**: Resend invitation to pending or expired invitation

#### Input Schema

```typescript
{
  invitationId: string;
}
```

**Zod Schema**:
```typescript
z.object({
  invitationId: z.string().cuid(),
})
```

#### Output Schema

```typescript
{
  invitation: {
    id: string;
    email: string;
    token: string;          // NEW token generated
    status: "PENDING";
    expiresAt: Date;        // NEW expiry date (7 days from now)
    sentAt: Date;           // Updated to now
  };
}
```

#### Example

**Request**:
```typescript
const { invitation } = await api.team.resendInvitation.mutate({
  invitationId: "inv_expired",
});
```

**Response**:
```typescript
{
  invitation: {
    id: "inv_expired",
    email: "delayed@example.com",
    token: "new_token_b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8",
    status: "PENDING",
    expiresAt: new Date("2025-11-23T14:30:00Z"),
    sentAt: new Date("2025-11-16T14:30:00Z"),
  }
}
```

#### Side Effects

1. Generates new token
2. Resets expiry date (7 days from now)
3. Updates status to `PENDING` if was `EXPIRED`
4. Sends new invitation email
5. Invalidates query caches

#### Error Cases

- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User is not the event owner
- `BAD_REQUEST`: Invitation already accepted/declined/cancelled
- `NOT_FOUND`: Invitation does not exist

---

### 5. `team.cancelInvitation`

**Type**: Mutation  
**Access**: Event owner only  
**Description**: Cancel a pending invitation

#### Input Schema

```typescript
{
  invitationId: string;
}
```

**Zod Schema**:
```typescript
z.object({
  invitationId: z.string().cuid(),
})
```

#### Output Schema

```typescript
{
  success: true;
}
```

#### Example

**Request**:
```typescript
await api.team.cancelInvitation.mutate({
  invitationId: "inv_xyz789",
});
```

**Response**:
```typescript
{ success: true }
```

#### Side Effects

1. Updates invitation status to `CANCELLED`
2. Removes corresponding `TeamMember` record (status `PENDING`)
3. Invalidates query caches

#### Error Cases

- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User is not the event owner
- `BAD_REQUEST`: Invitation already accepted/declined
- `NOT_FOUND`: Invitation does not exist

---

### 6. `team.acceptInvitation`

**Type**: Mutation  
**Access**: Public (uses token for authentication)  
**Description**: Accept an invitation using the token from email link

#### Input Schema

```typescript
{
  token: string;
}
```

**Zod Schema**:
```typescript
z.object({
  token: z.string().length(43),  // Base64url length
})
```

#### Output Schema

```typescript
{
  event: {
    id: string;
    name: string;
    slug: string;
  };
  teamMember: {
    id: string;
    role: "COLLABORATOR";
    status: "ACTIVE";
    modulePermissions: ModuleName[];
  };
}
```

#### Example

**Request**:
```typescript
const { event, teamMember } = await api.team.acceptInvitation.mutate({
  token: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v",
});
```

**Response**:
```typescript
{
  event: {
    id: "evt_abc123",
    name: "Tech Conference 2025",
    slug: "tech-conf-2025",
  },
  teamMember: {
    id: "tm_new123",
    role: "COLLABORATOR",
    status: "ACTIVE",
    modulePermissions: ["CFP", "ATTENDEES"],
  }
}
```

#### Side Effects

1. Updates invitation status to `ACCEPTED`
2. Sets `respondedAt` timestamp
3. Updates `TeamMember` status to `ACTIVE`
4. Links `TeamMember.userId` to current authenticated user
5. Sends acceptance notification email to organizer
6. Invalidates query caches

#### Error Cases

- `UNAUTHORIZED`: User not authenticated
- `NOT_FOUND`: Token does not exist
- `BAD_REQUEST`: Invitation already accepted/declined/cancelled
- `BAD_REQUEST`: Invitation expired
- `BAD_REQUEST`: User already has active membership (edge case: invited to two different emails)

---

### 7. `team.declineInvitation`

**Type**: Mutation  
**Access**: Public (uses token for authentication)  
**Description**: Decline an invitation

#### Input Schema

```typescript
{
  token: string;
}
```

**Zod Schema**:
```typescript
z.object({
  token: z.string().length(43),
})
```

#### Output Schema

```typescript
{
  success: true;
}
```

#### Example

**Request**:
```typescript
await api.team.declineInvitation.mutate({
  token: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v",
});
```

**Response**:
```typescript
{ success: true }
```

#### Side Effects

1. Updates invitation status to `DECLINED`
2. Sets `respondedAt` timestamp
3. Removes corresponding `TeamMember` record
4. Sends decline notification email to organizer
5. Invalidates query caches

#### Error Cases

- `NOT_FOUND`: Token does not exist
- `BAD_REQUEST`: Invitation already accepted/declined/cancelled
- `BAD_REQUEST`: Invitation expired

---

### 8. `team.updatePermissions`

**Type**: Mutation  
**Access**: Event owner only  
**Description**: Update a collaborator's module permissions

#### Input Schema

```typescript
{
  teamMemberId: string;
  modulePermissions: ModuleName[];  // New full list (replaces existing)
}
```

**Zod Schema**:
```typescript
z.object({
  teamMemberId: z.string().cuid(),
  modulePermissions: z.array(
    z.enum(MODULE_NAMES)
  ).min(1, "Select at least one module"),
})
```

#### Output Schema

```typescript
{
  teamMember: {
    id: string;
    email: string;
    role: "COLLABORATOR";
    status: "ACTIVE";
    modulePermissions: ModuleName[];
    updatedAt: Date;
  };
}
```

#### Example

**Request**:
```typescript
const { teamMember } = await api.team.updatePermissions.mutate({
  teamMemberId: "tm_collab456",
  modulePermissions: ["CFP", "SPEAKERS", "SCHEDULE", "COMMUNICATIONS"],
});
```

**Response**:
```typescript
{
  teamMember: {
    id: "tm_collab456",
    email: "bob@example.com",
    role: "COLLABORATOR",
    status: "ACTIVE",
    modulePermissions: ["CFP", "SPEAKERS", "SCHEDULE", "COMMUNICATIONS"],
    updatedAt: new Date("2025-11-16T15:00:00Z"),
  }
}
```

#### Side Effects

1. Updates `TeamMember.modulePermissions` (full replacement)
2. Updates `TeamMember.updatedAt` timestamp
3. Sends permission change notification email to collaborator
4. Invalidates query caches

#### Error Cases

- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User is not the event owner
- `BAD_REQUEST`: Cannot modify owner's permissions
- `BAD_REQUEST`: TeamMember is not active
- `NOT_FOUND`: TeamMember does not exist

---

### 9. `team.removeMember`

**Type**: Mutation  
**Access**: Event owner only  
**Description**: Revoke a collaborator's access to the event

#### Input Schema

```typescript
{
  teamMemberId: string;
}
```

**Zod Schema**:
```typescript
z.object({
  teamMemberId: z.string().cuid(),
})
```

#### Output Schema

```typescript
{
  success: true;
}
```

#### Example

**Request**:
```typescript
await api.team.removeMember.mutate({
  teamMemberId: "tm_collab456",
});
```

**Response**:
```typescript
{ success: true }
```

#### Side Effects

1. Updates `TeamMember.status` to `REMOVED`
2. Updates `TeamMember.updatedAt` timestamp
3. Sends access removal notification email to collaborator
4. Invalidates query caches

#### Error Cases

- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User is not the event owner
- `BAD_REQUEST`: Cannot remove owner (self-removal)
- `BAD_REQUEST`: TeamMember already removed
- `NOT_FOUND`: TeamMember does not exist

---

### 10. `team.getPendingInvitations`

**Type**: Query  
**Access**: Event owner only  
**Description**: Get all pending invitations for an event

#### Input Schema

```typescript
{
  eventId: string;
}
```

**Zod Schema**:
```typescript
z.object({
  eventId: z.string().cuid(),
})
```

#### Output Schema

```typescript
{
  invitations: Array<{
    id: string;
    email: string;
    modulePermissions: ModuleName[];
    status: InvitationStatus;
    expiresAt: Date;
    sentAt: Date;
    sentBy: {
      id: string;
      name: string | null;
    };
  }>;
}
```

#### Example

**Request**:
```typescript
const { invitations } = await api.team.getPendingInvitations.useQuery({
  eventId: "evt_abc123",
});
```

**Response**:
```typescript
{
  invitations: [
    {
      id: "inv_pending1",
      email: "newuser@example.com",
      modulePermissions: ["CFP"],
      status: "PENDING",
      expiresAt: new Date("2025-11-20"),
      sentAt: new Date("2025-11-13"),
      sentBy: {
        id: "usr_alice",
        name: "Alice Smith",
      },
    },
    {
      id: "inv_expired1",
      email: "olduser@example.com",
      modulePermissions: ["ATTENDEES"],
      status: "EXPIRED",
      expiresAt: new Date("2025-11-10"),
      sentAt: new Date("2025-11-03"),
      sentBy: {
        id: "usr_alice",
        name: "Alice Smith",
      },
    },
  ]
}
```

#### Error Cases

- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User is not the event owner
- `NOT_FOUND`: Event does not exist

---

## Permission Middleware

### `teamProtectedProcedure`

Custom middleware for module-level permission checking.

```typescript
export const teamProtectedProcedure = protectedProcedure.use(
  async ({ ctx, next, rawInput }) => {
    const { eventId, requiredModule } = rawInput as { 
      eventId: string; 
      requiredModule?: ModuleName; 
    };
    
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
        message: "You are not a member of this event",
      });
    }
    
    // Check module permission if required
    if (requiredModule) {
      if (member.role !== "OWNER" && 
          !member.modulePermissions.includes(requiredModule)) {
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

**Usage**:
```typescript
export const cfpRouter = createTRPCRouter({
  getSubmissions: teamProtectedProcedure
    .input(z.object({ 
      eventId: z.string(),
      requiredModule: z.literal("CFP"),
    }))
    .query(async ({ ctx, input }) => {
      // Permission verified by middleware
      // ctx.teamMember is available
      // ctx.isOwner is available
    }),
});
```

---

## Error Handling

### Standard Error Codes

| Code | HTTP Status | Usage |
|------|-------------|-------|
| `UNAUTHORIZED` | 401 | User not authenticated |
| `FORBIDDEN` | 403 | User lacks required permission |
| `BAD_REQUEST` | 400 | Invalid input or business logic violation |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Resource already exists (duplicate) |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

### Error Response Format

```typescript
{
  error: {
    code: "FORBIDDEN";
    message: "You don't have access to CFP";
    data?: {
      code: "FORBIDDEN";
      httpStatus: 403;
      path: "team.invite";
      zodError?: ZodError;  // If validation error
    };
  };
}
```

---

## Rate Limiting (Future)

**Recommended limits**:
- `team.invite`: 20 invitations per hour per user
- `team.resendInvitation`: 5 resends per hour per invitation
- `team.updatePermissions`: 50 updates per hour per event

---

## Caching Strategy

### Query Cache Keys

```typescript
// team.getMembers
["team", "getMembers", { eventId, status }]

// team.getCurrentMember
["team", "getCurrentMember", { eventId }]

// team.getPendingInvitations
["team", "getPendingInvitations", { eventId }]
```

### Invalidation Rules

**On `team.invite`**:
- Invalidate `team.getMembers` for event
- Invalidate `team.getPendingInvitations` for event

**On `team.acceptInvitation`**:
- Invalidate `team.getMembers` for event
- Invalidate `team.getCurrentMember` for event
- Invalidate `team.getPendingInvitations` for event

**On `team.updatePermissions`**:
- Invalidate `team.getMembers` for event
- Invalidate `team.getCurrentMember` for affected user

**On `team.removeMember`**:
- Invalidate `team.getMembers` for event
- Invalidate `team.getCurrentMember` for affected user

---

## Testing Checklist

### Integration Tests

- [ ] Invite collaborator → accept → verify access
- [ ] Invite collaborator → decline → verify no access
- [ ] Update permissions → verify immediate effect
- [ ] Remove member → verify access revoked
- [ ] Owner-only procedures reject non-owners
- [ ] Module permissions enforced correctly
- [ ] Expired invitations cannot be accepted
- [ ] Duplicate invitation prevented
- [ ] Self-invitation prevented

### Contract Tests

- [ ] All procedures validate input schemas
- [ ] All procedures return correct output shapes
- [ ] Error codes match specifications
- [ ] Zod validation errors formatted correctly

---

**Status**: ✅ Contract Specification Complete  
**Next**: Implementation (Phase 2)
