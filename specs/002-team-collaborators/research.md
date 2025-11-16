# Research: Event Team Collaborators & Permissions

**Feature**: Team collaboration with granular module permissions  
**Date**: November 16, 2025  
**Status**: Complete

---

## Research Questions & Findings

### 1. Routing Pattern for Settings Submenu

**Question**: How to implement a settings submenu with "General" and "Team" options in Next.js App Router?

**Decision**: Use nested layouts with `layout.tsx` at settings level

**Rationale**:
- Next.js App Router best practice: layouts provide persistent navigation
- Existing pattern: Dashboard already uses layout for sidebar navigation
- User requirement: "Add team/collaboration as sub-menu in sidebar to Settings"
- SEO friendly: `/[id]/settings/general` and `/[id]/settings/team` routes

**Alternatives considered**:
1. **Client-side tabs** - Rejected: Not URL-based, breaks back button, no deep linking
2. **Query parameters** (`?tab=team`) - Rejected: Against Next.js conventions, harder to manage
3. **Nested layouts** - **Selected**: Standard Next.js pattern, persistent UI, proper routing

**Implementation approach**:
```tsx
// src/app/(dashboard)/[id]/settings/layout.tsx
// - Renders horizontal tabs/submenu
// - Active state based on current pathname
// - Wraps {children} for nested routes

// Routes:
// /[id]/settings -> redirect to /[id]/settings/general
// /[id]/settings/general -> General settings page
// /[id]/settings/team -> Team management page
```

**References**:
- Next.js App Router documentation: Layouts and Templates
- Existing implementation: `src/app/(dashboard)/[id]/layout.tsx` (sidebar pattern)
- Flowbite React Tabs component documentation

---

### 2. Database Schema for Team Collaboration

**Question**: How to model team members, permissions, and invitations in Prisma?

**Decision**: Three-model approach - `TeamMember`, `Invitation`, `ModulePermission` (enum)

**Rationale**:
- **TeamMember**: Central model linking User → Event with role (owner/collaborator) and status lifecycle
- **Invitation**: Separate model for pending invitations with token, expiry, and status tracking
- **ModulePermission**: Enum field on TeamMember for efficient permission checks (array of module strings)
- Follows Prisma best practices: Clear relationships, indexed queries, cascade rules

**Data Model**:
```prisma
enum TeamRole {
  OWNER
  COLLABORATOR
}

enum TeamMemberStatus {
  PENDING      // Invitation sent
  ACTIVE       // Accepted and active
  REMOVED      // Access revoked
}

enum InvitationStatus {
  PENDING      // Awaiting response
  ACCEPTED     // Invitation accepted
  DECLINED     // User declined
  EXPIRED      // Past 7-day deadline
  CANCELLED    // Organizer cancelled
}

model TeamMember {
  id              String            @id @default(cuid())
  eventId         String
  event           Event             @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  userId          String?           // Null until invitation accepted
  user            User?             @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  email           String            // Always present (for invitations)
  role            TeamRole          @default(COLLABORATOR)
  status          TeamMemberStatus  @default(PENDING)
  
  // Permissions: Array of module names ["CFP", "ATTENDEES", "SCHEDULE"]
  modulePermissions String[]        @default([])
  
  // Audit fields
  invitedById     String
  invitedBy       User              @relation("TeamMemberInviter", fields: [invitedById], references: [id], onDelete: Restrict)
  invitedAt       DateTime          @default(now())
  lastAccessedAt  DateTime?
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  @@unique([eventId, email])        // One membership per email per event
  @@index([eventId])
  @@index([userId])
  @@index([email])
  @@index([status])
  @@index([eventId, status])
}

model Invitation {
  id              String            @id @default(cuid())
  eventId         String
  event           Event             @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  email           String
  token           String            @unique  // For acceptance link
  modulePermissions String[]        @default([])
  
  status          InvitationStatus  @default(PENDING)
  expiresAt       DateTime          // 7 days from creation
  
  sentById        String
  sentBy          User              @relation(fields: [sentById], references: [id], onDelete: Restrict)
  sentAt          DateTime          @default(now())
  
  respondedAt     DateTime?
  
  @@index([token])
  @@index([eventId])
  @@index([email])
  @@index([status, expiresAt])
}
```

**Alternatives considered**:
1. **Single permissions table** (many-to-many) - Rejected: Overly complex for binary permissions, slower queries
2. **JSON field for permissions** - Rejected: Harder to query, no type safety
3. **String array enum** - **Selected**: Efficient, queryable, maintains type safety via Zod validation

**Migration strategy**:
- Event model: Add `_count` for team members (virtual field)
- User model: Add relations for `teamMembers`, `invitationsSent`
- Create migration: `pnpm prisma migrate dev --name add_team_collaboration`

---

### 3. Invitation Token Security

**Question**: How to generate secure, unique invitation tokens?

**Decision**: Use crypto.randomBytes(32) + hash verification

**Rationale**:
- **Security**: 32-byte random tokens provide 256 bits of entropy (collision resistant)
- **URL-safe**: Base64 URL encoding for clean links
- **Expiry**: Database-enforced via `expiresAt` field
- **Single-use**: Token invalidated after acceptance/decline via status change

**Implementation**:
```typescript
import { randomBytes } from "crypto";

function generateInvitationToken(): string {
  return randomBytes(32)
    .toString("base64url")  // URL-safe base64
    .slice(0, 43);          // Consistent length
}

// Acceptance URL: /invitations/accept?token=...
```

**Alternatives considered**:
1. **JWT tokens** - Rejected: Overkill for simple token, requires secret management
2. **UUID** - Rejected: Less entropy (128 bits), not cryptographically secure
3. **crypto.randomBytes** - **Selected**: Standard Node.js crypto, battle-tested

**Token lifecycle**:
```
1. Generate token on invitation creation
2. Send email with acceptance link
3. Verify token exists and not expired on click
4. Mark token as ACCEPTED, create TeamMember
5. Subsequent clicks: redirect to "already accepted" page
```

---

### 4. Permission Enforcement Pattern

**Question**: How to enforce module permissions across the application?

**Decision**: tRPC middleware + helper functions

**Rationale**:
- **Centralized**: Middleware checks permissions before procedure execution
- **Type-safe**: TypeScript ensures module names match enum
- **Reusable**: Helper functions for React components and API routes
- **Performance**: Single database query with indexed lookup

**Implementation approach**:
```typescript
// src/server/api/trpc.ts - Add middleware
export const teamProtectedProcedure = protectedProcedure.use(
  async ({ ctx, next, rawInput }) => {
    const { eventId, requiredModule } = rawInput as { 
      eventId: string; 
      requiredModule: ModuleName; 
    };
    
    // Check if user is owner or has module permission
    const member = await ctx.db.teamMember.findUnique({
      where: { 
        eventId_userId: { eventId, userId: ctx.session.user.id } 
      },
    });
    
    if (!member || member.status !== "ACTIVE") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    
    if (member.role !== "OWNER" && 
        !member.modulePermissions.includes(requiredModule)) {
      throw new TRPCError({ 
        code: "FORBIDDEN",
        message: `You don't have access to ${requiredModule}` 
      });
    }
    
    return next({ ctx: { ...ctx, teamMember: member } });
  }
);

// Usage in router
export const cfpRouter = createTRPCRouter({
  getSubmissions: teamProtectedProcedure
    .input(z.object({ 
      eventId: z.string(),
      requiredModule: z.literal("CFP"),
    }))
    .query(async ({ ctx, input }) => {
      // Permission already verified by middleware
      return ctx.db.cfpSubmission.findMany({
        where: { eventId: input.eventId },
      });
    }),
});
```

**Client-side helper**:
```typescript
// src/lib/permissions.ts
export function useTeamPermissions(eventId: string) {
  const { data: member } = api.team.getCurrentMember.useQuery({ eventId });
  
  const hasPermission = (module: ModuleName) => {
    if (!member || member.status !== "ACTIVE") return false;
    if (member.role === "OWNER") return true;
    return member.modulePermissions.includes(module);
  };
  
  const isOwner = member?.role === "OWNER";
  
  return { hasPermission, isOwner, member };
}
```

**Alternatives considered**:
1. **Component-level checks** - Rejected: Easy to forget, inconsistent
2. **HOC wrapper** - Rejected: Not idiomatic in Next.js App Router
3. **tRPC middleware** - **Selected**: Enforces at API boundary, impossible to bypass

---

### 5. Email Service Integration

**Question**: How to send team collaboration emails using existing Resend setup?

**Decision**: Extend existing email utility with new templates

**Rationale**:
- Project already uses Resend for transactional emails
- React Email templates provide type-safe, previewable emails
- Existing pattern: `emails/` directory with `.tsx` templates

**New email templates needed**:
1. `team-invitation.tsx` - Invitation with acceptance link
2. `team-invitation-accepted.tsx` - Notify organizer of acceptance
3. `team-invitation-declined.tsx` - Notify organizer of decline
4. `team-permission-changed.tsx` - Notify collaborator of permission update
5. `team-access-removed.tsx` - Notify collaborator of removal

**Email sending utility**:
```typescript
// src/lib/email.ts - Extend existing utility
import { Resend } from "resend";
import { TeamInvitationEmail } from "@/emails/team-invitation";
import { render } from "@react-email/render";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTeamInvitation({
  to,
  eventName,
  organizerName,
  acceptUrl,
  expiresAt,
  modules,
}: TeamInvitationData) {
  const html = render(
    TeamInvitationEmail({
      eventName,
      organizerName,
      acceptUrl,
      expiresAt,
      modules,
    })
  );
  
  await resend.emails.send({
    from: "Events-Ting <notifications@events-ting.com>",
    to,
    subject: `Invitation to collaborate on ${eventName}`,
    html,
  });
}
```

**Template structure** (example):
```tsx
// emails/team-invitation.tsx
import {
  Html, Head, Body, Container, Heading, Text, Button, Section
} from "@react-email/components";

interface TeamInvitationEmailProps {
  eventName: string;
  organizerName: string;
  acceptUrl: string;
  expiresAt: Date;
  modules: string[];
}

export function TeamInvitationEmail({
  eventName,
  organizerName,
  acceptUrl,
  expiresAt,
  modules,
}: TeamInvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif" }}>
        <Container>
          <Heading>You're invited to collaborate on {eventName}</Heading>
          <Text>{organizerName} has invited you to help manage their event.</Text>
          
          <Section>
            <Text><strong>Your Access:</strong></Text>
            <ul>
              {modules.map((module) => (
                <li key={module}>{module}</li>
              ))}
            </ul>
          </Section>
          
          <Button href={acceptUrl}>Accept Invitation</Button>
          
          <Text style={{ color: "#666", fontSize: "12px" }}>
            This invitation expires on {expiresAt.toLocaleDateString()}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

**Alternatives considered**:
1. **Plain text emails** - Rejected: Poor UX, no branding
2. **HTML templates** - Rejected: Hard to maintain, no type safety
3. **React Email** - **Selected**: Matches existing pattern, previewable, type-safe

---

### 6. Permission Change During Active Session

**Question**: How to handle permission revocation when user is actively editing data?

**Decision**: Optimistic UI with server-side validation + grace period

**Rationale**:
- **Grace period** (30s): Allows in-progress save operations to complete
- **Server validation**: Every mutation checks permissions at execution time
- **Real-time notification**: WebSocket/polling for instant feedback (future enhancement)
- **Current approach**: Client-side check on mount + server-side check on mutation

**Implementation strategy**:
```typescript
// Phase 1: Server-side validation (MVP)
// - Check permissions at mutation time
// - Return 403 if revoked
// - Client shows error toast

// Phase 2: Grace period tracking (future)
// - Store lastPermissionChange timestamp
// - Allow mutations within 30s grace period
// - Show warning banner during grace period

// Phase 3: Real-time updates (future)
// - WebSocket connection for permission changes
// - Instant UI update when revoked
// - Smooth redirect to allowed modules
```

**MVP approach** (Phase 1):
```typescript
// Every protected mutation
const mutation = api.cfp.accept.useMutation({
  onError: (error) => {
    if (error.data?.code === "FORBIDDEN") {
      toast.error("Your permissions were changed. Redirecting...");
      router.push(`/${eventId}`);
    }
  },
});
```

**Future enhancement** (Phase 2):
```typescript
// Add to TeamMember model
lastPermissionChangeAt DateTime?

// Middleware checks grace period
const gracePeriod = 30 * 1000; // 30 seconds
const timeSinceChange = Date.now() - member.lastPermissionChangeAt.getTime();

if (timeSinceChange < gracePeriod) {
  // Allow mutation but show warning
  return next({ ctx: { ...ctx, teamMember: member, inGracePeriod: true } });
}
```

**Alternatives considered**:
1. **Immediate revocation** - Rejected: Poor UX, data loss risk
2. **Polling for changes** - Rejected: Inefficient, 403 error is sufficient signal
3. **Grace period + server validation** - **Selected**: Balances UX and security

---

### 7. Module Permission Options

**Question**: Which modules should be available for permission assignment?

**Decision**: All feature modules from dashboard navigation (8 modules)

**Rationale**:
- Match existing dashboard structure for consistency
- Collaborators understand what they're getting access to
- Granular control: organizer can assign single module or all modules

**Module list** (from `src/app/(dashboard)/[id]/layout.tsx`):
1. **OVERVIEW** - Event dashboard home
2. **ATTENDEES** - Registration list, attendee management
3. **TICKETS** - Ticket type management
4. **SCHEDULE** - Schedule builder, session management
5. **SPEAKERS** - Speaker profiles
6. **CFP** - Call for Papers submissions and review
7. **COMMUNICATIONS** - Email campaigns
8. **SETTINGS** - Event settings (owner-only, not assignable)

**Permission matrix**:
| Module | View | Create | Edit | Delete | Notes |
|--------|------|--------|------|--------|-------|
| OVERVIEW | ✅ | — | — | — | Read-only dashboard |
| ATTENDEES | ✅ | ✅ | ✅ | ✅ | Full CRUD |
| TICKETS | ✅ | ✅ | ✅ | ✅ | Full CRUD |
| SCHEDULE | ✅ | ✅ | ✅ | ✅ | Full CRUD |
| SPEAKERS | ✅ | ✅ | ✅ | ✅ | Full CRUD |
| CFP | ✅ | — | ✅ | — | Review submissions, no delete |
| COMMUNICATIONS | ✅ | ✅ | — | ✅ | Send campaigns, no edit sent |
| SETTINGS | ❌ | — | — | — | Owner-only |

**Module permissions are binary**: Having access = full CRUD within that module

**Alternatives considered**:
1. **Action-level permissions** (view/edit/delete per module) - Rejected: Too complex for MVP
2. **Role-based presets** (Editor, Reviewer, Marketer) - Rejected: Less flexible
3. **Module-level permissions** - **Selected**: Simple, clear, meets requirements

---

### 8. Testing Strategy

**Question**: What testing approach ensures invitation flow and permission enforcement work correctly?

**Decision**: Integration tests for user stories + contract tests for tRPC

**Rationale**:
- **Integration tests**: Verify complete workflows (invitation → acceptance → permission check)
- **Contract tests**: Ensure tRPC procedures match expected inputs/outputs
- **Follows constitution**: "Integration > Contract > Unit"

**Test structure**:
```typescript
// tests/integration/team-collaboration.test.ts

describe("Team Collaboration", () => {
  describe("User Story 1: Invite Collaborator", () => {
    it("sends invitation with selected modules", async () => {
      // 1. Organizer creates event
      // 2. Organizer invites collaborator with [CFP, ATTENDEES]
      // 3. Verify invitation created
      // 4. Verify email sent
      // 5. Collaborator accepts invitation
      // 6. Verify TeamMember created with status ACTIVE
      // 7. Collaborator accesses CFP module (allowed)
      // 8. Collaborator tries to access Schedule (forbidden)
    });
    
    it("prevents duplicate invitations to same email", async () => {
      // Test edge case: invitation to existing collaborator
    });
  });
  
  describe("User Story 3: Modify Permissions", () => {
    it("updates collaborator permissions immediately", async () => {
      // 1. Organizer adds SCHEDULE to existing collaborator
      // 2. Verify permission updated in database
      // 3. Collaborator can now access Schedule
    });
    
    it("handles permission revocation during active session", async () => {
      // 1. Collaborator is viewing CFP submissions
      // 2. Organizer removes CFP permission
      // 3. Collaborator tries to accept submission
      // 4. Verify 403 error returned
      // 5. Verify collaborator redirected
    });
  });
});

// tests/contract/team-router.test.ts

describe("Team Router", () => {
  it("team.invite validates input schema", async () => {
    // Ensure Zod schema rejects invalid inputs
  });
  
  it("team.getMembers returns correct shape", async () => {
    // Verify return type matches expected interface
  });
});
```

**Coverage targets**:
- User Story 1: 100% (core feature)
- User Story 2-4: 80% (essential flows)
- Edge cases: All documented edge cases tested

**Alternatives considered**:
1. **Unit tests only** - Rejected: Doesn't verify integration between components
2. **E2E tests with Playwright** - Rejected: Too slow for CI, overkill for API feature
3. **Integration + Contract tests** - **Selected**: Balances coverage and speed

---

## Technology Decisions Summary

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Routing** | Nested layouts with `/settings/general` and `/settings/team` | Standard Next.js pattern, persistent nav, deep linking |
| **Database** | TeamMember + Invitation models with string array for permissions | Efficient queries, clear relationships, Prisma conventions |
| **Security** | crypto.randomBytes(32) tokens + expiry validation | Cryptographically secure, URL-safe, single-use enforcement |
| **Permissions** | tRPC middleware + client-side helpers | Enforced at API boundary, centralized, type-safe |
| **Email** | Resend with React Email templates | Matches existing pattern, type-safe, previewable |
| **Grace Period** | Server-side validation with planned grace period enhancement | MVP: 403 errors, Future: 30s grace with warning |
| **Modules** | 7 assignable modules matching dashboard structure | Consistent with existing UI, granular control |
| **Testing** | Integration tests for user stories + contract tests for tRPC | Constitution-compliant, verifies end-to-end flows |

---

## Open Questions / Future Enhancements

1. **Real-time permission updates**: Consider WebSocket/Server-Sent Events for instant notification
2. **Activity logging**: Track which collaborator performed what actions (audit trail)
3. **Bulk invitations**: CSV upload for inviting multiple collaborators at once
4. **Role presets**: "CFP Reviewer", "Marketing Manager" templates for common permission sets
5. **Ownership transfer UI**: Design flow for transferring event ownership to collaborator
6. **Permission inheritance**: Consider if future sub-modules should inherit parent module permissions

---

**Research Status**: ✅ Complete  
**Next Phase**: Phase 1 - Data Model & Contracts
