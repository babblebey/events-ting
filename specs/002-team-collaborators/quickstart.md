# Team Collaborators - Quick Start Guide

## Overview

This guide helps you quickly understand and implement the Team Collaborators feature, which allows event organizers to invite team members to help manage events.

## Key Concepts

### Roles & Permissions

- **Owner**: Full control (creator of the event)
- **Admin**: Full management except deletion
- **Editor**: Manage content (speakers, schedule, etc.)
- **Viewer**: Read-only access

### Core Workflows

1. **Invite a collaborator** → Send email → Accept invite → Access granted
2. **Manage permissions** → Change role → Updated access
3. **Remove collaborator** → Revoke access → Email notification

## Quick Implementation Guide

### 1. Database Setup

The schema includes:
- `EventCollaborator` - Links users to events with roles
- `CollaboratorInvitation` - Manages pending invites

Already defined in `prisma/schema.prisma`.

### 2. API Endpoints (tRPC)

Located in: `src/server/api/routers/collaborators.ts`

```typescript
// Key procedures:
- invite: Send invitation
- accept: Accept invitation
- list: Get collaborators for event
- updateRole: Change collaborator role
- remove: Remove collaborator
- listInvitations: Get pending invites
- cancelInvitation: Cancel pending invite
```

### 3. Frontend Components

**Settings Page**: `src/app/(dashboard)/events/[id]/settings/team/page.tsx`

Key components to create:
- `CollaboratorsList` - Display current team members
- `InviteCollaboratorDialog` - Form to invite new members
- `PendingInvitationsList` - Show pending invites
- `CollaboratorRoleBadge` - Display role badges

### 4. Navigation Setup

Add to settings submenu in `src/app/(dashboard)/events/[id]/settings/layout.tsx`:

```typescript
const settingsNav = [
  { name: "General", href: `/events/${eventId}/settings` },
  { name: "Team", href: `/events/${eventId}/settings/team` }
];
```

## Step-by-Step Implementation

### Step 1: Run Database Migration

```bash
pnpm prisma migrate dev --name add-team-collaborators
```

### Step 2: Create tRPC Router

Create `src/server/api/routers/collaborators.ts` implementing all endpoints from `contracts/api.yaml`.

### Step 3: Create UI Components

1. Create `src/components/collaborators/` directory
2. Implement reusable components (list, dialog, badges)
3. Follow existing patterns from `src/components/attendees/` or `src/components/speakers/`

### Step 4: Create Settings Pages

1. Update `src/app/(dashboard)/events/[id]/settings/layout.tsx` with submenu
2. Create `src/app/(dashboard)/events/[id]/settings/page.tsx` (General settings)
3. Create `src/app/(dashboard)/events/[id]/settings/team/page.tsx` (Team management)

### Step 5: Add Email Templates

Create in `emails/` directory:
- `collaborator-invitation.tsx`
- `collaborator-role-changed.tsx`
- `collaborator-removed.tsx`

### Step 6: Implement Middleware

Add permission checks in `src/server/api/middleware/permissions.ts` to verify:
- User has required role for action
- Event exists and user has access

## Testing Checklist

- [ ] Owner can invite collaborators
- [ ] Invited user receives email with accept link
- [ ] Collaborator can accept invitation
- [ ] Role-based access control works correctly
- [ ] Owner/Admin can change collaborator roles
- [ ] Owner/Admin can remove collaborators
- [ ] Removed collaborator loses access immediately
- [ ] Owner can cancel pending invitations
- [ ] UI shows correct permissions per role

## Common Patterns

### Permission Check

```typescript
const canManageTeam = ["OWNER", "ADMIN"].includes(userRole);
```

### tRPC Procedure with Auth

```typescript
.mutation(async ({ ctx, input }) => {
  // Check user has permission
  const event = await ctx.db.event.findUnique({
    where: { id: input.eventId },
    include: { collaborators: true }
  });
  
  // Verify user is owner/admin
  const userRole = event.collaborators.find(
    c => c.userId === ctx.session.user.id
  )?.role;
  
  if (!["OWNER", "ADMIN"].includes(userRole)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  
  // Perform action
})
```

### Data Fetching Pattern

```typescript
const { data: collaborators } = api.collaborators.list.useQuery({
  eventId: params.id
});
```

## File Locations Reference

```
src/
  server/api/routers/
    collaborators.ts          # API endpoints
  app/(dashboard)/events/[id]/
    settings/
      layout.tsx              # Settings navigation
      page.tsx                # General settings
      team/
        page.tsx              # Team management
  components/collaborators/
    CollaboratorsList.tsx     # List component
    InviteDialog.tsx          # Invite form
    RoleBadge.tsx             # Role display
emails/
  collaborator-invitation.tsx  # Email templates
prisma/
  schema.prisma               # Database schema
```

## Next Steps

1. Review existing patterns in `docs/modules/` for similar features
2. Check `docs/architecture/authentication.md` for auth patterns
3. Review `docs/components/forms.md` for form patterns
4. Test thoroughly with different roles
5. Update documentation in `docs/modules/collaboration/`

## Support

- See `spec.md` for detailed requirements
- Check `research.md` for design decisions
- Review `data-model.md` for database structure
- Refer to `contracts/` for API specifications
