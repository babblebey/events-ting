# Team Permission Checks - Implementation Guide

**Document Version**: 1.0  
**Last Updated**: November 16, 2025  
**Status**: Security Review Complete

---

## Overview

This document provides guidelines for implementing and reviewing team permission checks across all module routers in the events-ting application.

## Security Requirements

All module routers that manage event-specific data must implement the following permission checks:

### 1. Team Membership Verification

Every protected endpoint must verify that the user is an active team member:

```typescript
// Check if user is a team member
const teamMember = await ctx.db.teamMember.findFirst({
  where: {
    eventId: input.eventId,
    userId: ctx.session.user.id,
    status: "ACTIVE",
  },
});

if (!teamMember) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You do not have access to this event",
  });
}
```

### 2. Module Permission Check

After verifying membership, check if the user has permission for the specific module:

```typescript
// Check module permission (unless user is OWNER)
if (
  teamMember.role !== "OWNER" &&
  !teamMember.modulePermissions.includes("MODULE_NAME")
) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You do not have permission to access this module",
  });
}
```

**Module Names:**
- `CFP` - Call for Papers
- `ATTENDEES` - Attendee Management
- `SCHEDULE` - Schedule Management
- `SPEAKERS` - Speaker Management
- `COMMUNICATIONS` - Email Communications
- `TICKETS` - Ticket Management

### 3. Owner Bypass

Owners always have full access to all modules:

```typescript
if (teamMember.role === "OWNER") {
  // Owner has full access - skip permission check
  // ... proceed with operation
}
```

### 4. Status Verification

Always check that the team member status is ACTIVE:

```typescript
where: {
  eventId: input.eventId,
  userId: ctx.session.user.id,
  status: "ACTIVE", // Critical: must be ACTIVE
}
```

## Implementation Pattern

### Complete Example

```typescript
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const moduleRouter = createTRPCRouter({
  // GET operation - read permission
  getModuleData: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      // 1. Verify team membership
      const teamMember = await ctx.db.teamMember.findFirst({
        where: {
          eventId: input.eventId,
          userId: ctx.session.user.id,
          status: "ACTIVE",
        },
      });

      if (!teamMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this event",
        });
      }

      // 2. Check module permission (unless OWNER)
      if (
        teamMember.role !== "OWNER" &&
        !teamMember.modulePermissions.includes("MODULE_NAME")
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this module",
        });
      }

      // 3. Proceed with operation
      return await ctx.db.moduleData.findMany({
        where: { eventId: input.eventId },
      });
    }),

  // POST/PUT operation - write permission (same checks)
  updateModuleData: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        data: z.record(z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Same permission checks as above
      const teamMember = await ctx.db.teamMember.findFirst({
        where: {
          eventId: input.eventId,
          userId: ctx.session.user.id,
          status: "ACTIVE",
        },
      });

      if (!teamMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this event",
        });
      }

      if (
        teamMember.role !== "OWNER" &&
        !teamMember.modulePermissions.includes("MODULE_NAME")
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to modify this module",
        });
      }

      // Proceed with update
      // ...
    }),
});
```

## Routers Requiring Permission Checks

Based on the system architecture, the following routers require team permission checks:

### ✅ Completed

- **team.ts** - Team management (has permission checks)

### ⚠️ To Be Implemented

- **cfp.ts** - Call for Papers management
  - Module: `CFP`
  - Operations: Submit, review, approve/reject proposals

- **attendees.ts** (or registration.ts) - Attendee management
  - Module: `ATTENDEES`
  - Operations: View registrations, check-in, export data

- **schedule.ts** - Schedule management
  - Module: `SCHEDULE`
  - Operations: Add/edit/delete schedule entries

- **speaker.ts** - Speaker management
  - Module: `SPEAKERS`
  - Operations: Add/edit speakers, manage bios

- **communication.ts** - Email communications
  - Module: `COMMUNICATIONS`
  - Operations: Send emails, manage campaigns

- **ticket.ts** - Ticket management
  - Module: `TICKETS`
  - Operations: Create/edit ticket types, pricing

### ℹ️ No Permission Checks Required

- **event.ts** - Event-level operations (owned by creator)
- **user.ts** - User profile operations (user-specific)
- **post.ts** - Example/demo router

## Testing Permission Checks

### Manual Testing Checklist

For each module router:

1. [ ] **Non-member attempt**: User not on team → should get FORBIDDEN
2. [ ] **Pending member attempt**: User with PENDING status → should get FORBIDDEN
3. [ ] **Removed member attempt**: User with REMOVED status → should get FORBIDDEN
4. [ ] **Wrong module access**: User with ATTENDEES permission tries to access CFP → should get FORBIDDEN
5. [ ] **Correct module access**: User with CFP permission accesses CFP → should succeed
6. [ ] **Owner bypass**: User with OWNER role accesses any module → should succeed
7. [ ] **Permission change**: User's permissions updated → should take effect immediately

### Automated Testing

Create integration tests:

```typescript
import { describe, it, expect } from "vitest";

describe("Module Permission Checks", () => {
  it("should deny access to non-members", async () => {
    // Test implementation
  });

  it("should deny access to members without module permission", async () => {
    // Test implementation
  });

  it("should allow access to members with module permission", async () => {
    // Test implementation
  });

  it("should always allow access to owners", async () => {
    // Test implementation
  });
});
```

## Security Best Practices

### 1. Always Check Status

Never assume a team member is active:

```typescript
// ❌ BAD - missing status check
const teamMember = await ctx.db.teamMember.findFirst({
  where: { eventId, userId },
});

// ✅ GOOD - explicit status check
const teamMember = await ctx.db.teamMember.findFirst({
  where: { eventId, userId, status: "ACTIVE" },
});
```

### 2. Owner Special Case

Always handle owners specially:

```typescript
// ✅ GOOD - owner bypass
if (teamMember.role === "OWNER") {
  // Owner has full access
}
```

### 3. Fail Securely

Default to denying access:

```typescript
// ✅ GOOD - deny by default
if (!teamMember) {
  throw new TRPCError({ code: "FORBIDDEN" });
}

if (
  teamMember.role !== "OWNER" &&
  !teamMember.modulePermissions.includes("MODULE")
) {
  throw new TRPCError({ code: "FORBIDDEN" });
}
```

### 4. Consistent Error Messages

Use consistent error messages:

```typescript
// For missing membership
throw new TRPCError({
  code: "FORBIDDEN",
  message: "You do not have access to this event",
});

// For missing module permission
throw new TRPCError({
  code: "FORBIDDEN",
  message: "You do not have permission to access this module",
});
```

## Rate Limiting

All sensitive operations have rate limiting:

- **Team invitations**: 20 per hour per user
- **Resend invitations**: 5 per hour per user
- **Permission updates**: 30 per hour per user
- **Member removals**: 20 per hour per user

See `src/lib/rate-limit.ts` for implementation details.

## Audit Logging

All team management actions are logged:

- Team invitation sent
- Team invitation accepted/declined/cancelled/resent
- Team permissions updated
- Team member removed

See `src/lib/audit.ts` for implementation details.

## Security Headers

Security headers are configured in `next.config.js`:

- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `X-XSS-Protection`
- `Referrer-Policy`
- `Permissions-Policy`
- `Content-Security-Policy` (in middleware)

## CSRF Protection

CSRF protection is implemented in `src/middleware.ts`:

- Token format validation for invitation acceptance
- Security event logging
- Additional CSP headers

## Next Steps

To complete the security implementation:

1. **Immediate**: Add permission checks to high-priority routers (CFP, ATTENDEES)
2. **Short-term**: Add permission checks to remaining routers (SCHEDULE, SPEAKERS, COMMUNICATIONS, TICKETS)
3. **Ongoing**: Run validation script (`scripts/validate-permissions.ts`) before each release
4. **Continuous**: Monitor audit logs for suspicious activity

## References

- [Team Collaboration Specification](../specs/002-team-collaborators/spec.md)
- [Data Model Documentation](../specs/002-team-collaborators/data-model.md)
- [API Contracts](../specs/002-team-collaborators/contracts/)
- [Team Router Implementation](../src/server/api/routers/team.ts)

---

**Document Status**: ✅ Complete  
**Review Date**: November 16, 2025  
**Reviewer**: GitHub Copilot (Claude Sonnet 4.5)
