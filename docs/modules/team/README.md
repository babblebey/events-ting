# Team Collaboration Module

> **Feature**: Event Team Collaborators & Permissions  
> **Status**: ✅ Implemented  
> **Version**: 1.0.0  
> **Last Updated**: November 16, 2025

## Overview

The Team Collaboration module enables event organizers to invite collaborators with granular module-level permissions. This allows distributing event management responsibilities across multiple team members while maintaining control over who can access which features.

## Features

- **Invite Collaborators**: Send email invitations with specific module permissions
- **Module-Level Permissions**: Grant access to specific features (CFP, Attendees, Schedule, etc.)
- **Invitation Management**: Track pending, accepted, and declined invitations
- **Permission Updates**: Modify collaborator access in real-time
- **Access Revocation**: Remove collaborator access when needed
- **Team Visibility**: View all team members and their permissions
- **Collaborator Dashboard**: Self-service view of all events and permissions

## User Roles

### Event Owners
- Create and manage events (owner of the event)
- Invite collaborators with specific module permissions
- View all team members and their permissions
- Update collaborator permissions at any time
- Remove collaborators when needed
- Full access to all modules including SETTINGS
- Cannot be removed from their own events

### Collaborators
- Accept or decline invitations via email link
- Access only assigned modules for specific events
- View team members (read-only)
- See all their event memberships in one dashboard
- Cannot invite other collaborators
- Cannot access SETTINGS module
- Can be assigned any combination of: OVERVIEW, ATTENDEES, TICKETS, SCHEDULE, SPEAKERS, CFP, COMMUNICATIONS

### Public Users
- No access to team features
- Can only receive and respond to invitations

## Module Dependencies

**This module depends on:**
- **User/Auth Module**: For authentication and user management
- **Events Module**: Teams belong to events
- **Communications Module**: For sending invitation and notification emails

**This module is required by:**
- All event management modules (for permission enforcement)
- CFP, Attendees, Schedule, Speakers, Tickets, Communications modules all check team permissions

## Quick Links

- [Backend Documentation](./backend.md) - API router, procedures, middleware, and security
- [Frontend Documentation](./frontend.md) - Components, pages, routes, and hooks
- [Data Model](./data-model.md) - Database schema, enums, and relationships
- [Workflows](./workflows.md) - Step-by-step user flows and processes
- [Email Templates](./email-templates.md) - Email designs and delivery

## Primary Entry Points

**For Event Owners:**
1. Navigate to event dashboard: `/[eventId]`
2. Go to Settings → Team tab: `/[eventId]/settings/team`
3. Manage invitations, members, and permissions

**For Collaborators:**
1. Receive invitation email with unique link
2. Click link: `/invitations/accept?token=...`
3. Review permissions and accept/decline
4. Access event dashboard with granted modules
5. View all memberships: `/my-teams`

## Key Concepts

### Team Roles

- **OWNER**: Event creator with full access to all modules
- **COLLABORATOR**: Invited member with module-specific permissions

### Team Member Status

- **PENDING**: Invitation sent, awaiting response
- **ACTIVE**: Invitation accepted, has access
- **REMOVED**: Access revoked or invitation declined/cancelled

### Module Permissions

Permissions are **binary** - having access to a module grants full CRUD operations within it. Available modules:

| Module | Description |
|--------|-------------|
| OVERVIEW | Event dashboard and statistics |
| ATTENDEES | Registration management |
| TICKETS | Ticket types and pricing |
| SCHEDULE | Schedule builder and sessions |
| SPEAKERS | Speaker profiles and management |
| CFP | Call for Papers review |
| COMMUNICATIONS | Email campaigns |

**Note**: SETTINGS module is owner-only and cannot be assigned to collaborators.

### Invitation Lifecycle

1. **Invitation Sent**: Organizer invites with email + module permissions
2. **Token Generated**: Unique 256-bit token, expires in 7 days
3. **Email Delivered**: Collaborator receives invitation email
4. **Response**: Collaborator accepts or declines
5. **Activation**: If accepted, status changes to ACTIVE and access granted
6. **Management**: Owner can update permissions or remove access anytime

### Permission Enforcement

**Two-layer security**:
1. **Server-side (Primary)**: tRPC middleware validates permissions on every API call
2. **Client-side (UX)**: React components hide/show UI based on permissions

**Always enforced at server level** - client checks are for user experience only.

## Related Files

### Backend
- `src/server/api/routers/team.ts` - Team tRPC router with all procedures
- `src/server/api/trpc.ts` - `teamProtectedProcedure` middleware

### Frontend - Organizer Views
- `src/app/(dashboard)/[id]/settings/team/page.tsx` - Team management page
- `src/components/team/team-member-list.tsx` - List of team members
- `src/components/team/team-member-card.tsx` - Individual member card
- `src/components/team/invite-collaborator-form.tsx` - Invitation form
- `src/components/team/edit-permissions-modal.tsx` - Edit permissions UI
- `src/components/team/remove-member-modal.tsx` - Removal confirmation

### Frontend - Collaborator Views
- `src/app/invitations/accept/page.tsx` - Invitation acceptance page
- `src/app/my-teams/page.tsx` - Collaborator dashboard
- `src/components/team/my-teams-list.tsx` - Event memberships list
- `src/components/team/permission-explainer.tsx` - Permission descriptions

### Frontend - Utility Components
- `src/components/team/module-permissions-selector.tsx` - Module checkboxes
- `src/components/team/role-badge.tsx` - Owner/Collaborator badge
- `src/components/team/status-badge.tsx` - Active/Pending/Removed badge
- `src/components/team/pending-invitations-list.tsx` - Pending invites

### Hooks
- `src/hooks/use-team-permissions.ts` - Permission checking hook
- `src/hooks/use-invitation-token.ts` - Invitation token handling

### Email Templates
- `emails/team-invitation.tsx` - Invitation email
- `emails/team-invitation-accepted.tsx` - Acceptance notification
- `emails/team-invitation-declined.tsx` - Decline notification
- `emails/team-permission-changed.tsx` - Permission update notification
- `emails/team-access-removed.tsx` - Removal notification

### Database Models
- `TeamMember` - User membership in event team
- `Invitation` - Pending invitation tracking
- `TeamRole` enum - OWNER, COLLABORATOR
- `TeamMemberStatus` enum - PENDING, ACTIVE, REMOVED
- `InvitationStatus` enum - PENDING, ACCEPTED, DECLINED, EXPIRED, CANCELLED

## Feature Requirements Coverage

This module implements the following feature requirements from the specification:

- **FR-075**: Invite team members with module-specific permissions
- **FR-076**: Accept/decline invitations via email link
- **FR-077**: View all team members and their permissions
- **FR-078**: Update collaborator permissions
- **FR-079**: Remove team members and revoke access
- **FR-080**: Permission enforcement across all modules
- **FR-081**: Secure invitation tokens (256-bit, 7-day expiry)
- **FR-082**: Email notifications for all team actions
- **FR-083**: Collaborator dashboard (My Teams page)
- **FR-084**: Prevent duplicate invitations
- **FR-085**: Owner protection (cannot remove self)

## Getting Started

### For Event Owners

**1. Create an Event** (Events Module)
   - Set up your event first
   - You're automatically the owner with full access

**2. Invite Collaborators**
   - Navigate to Settings → Team
   - Click "Invite Collaborator"
   - Enter email and select modules
   - Send invitation

**3. Manage Team**
   - View active members and pending invitations
   - Edit permissions as responsibilities change
   - Remove members when needed
   - Resend expired invitations

### For Collaborators

**1. Receive Invitation**
   - Check your email for invitation
   - Review event details and permissions

**2. Accept Invitation**
   - Click "Accept Invitation" link
   - Sign in (or create account)
   - Confirm acceptance

**3. Start Collaborating**
   - Access event dashboard
   - Use assigned modules
   - View "My Teams" for all your events

## Common Use Cases

### CFP Reviewer
```
Modules: CFP
Can: Review submissions, accept/reject proposals, add notes
Cannot: Access attendees, modify settings, invite others
```

### Marketing Team
```
Modules: COMMUNICATIONS, ATTENDEES
Can: Create email campaigns, view attendee list, export data
Cannot: Modify event details, manage CFP, access settings
```

### Schedule Coordinator
```
Modules: SCHEDULE, SPEAKERS
Can: Build schedule, manage sessions, create speaker profiles
Cannot: Access registrations, view financials, change settings
```

### Full Event Manager
```
Modules: OVERVIEW, ATTENDEES, TICKETS, SCHEDULE, SPEAKERS, CFP, COMMUNICATIONS
Can: Manage all operational aspects of the event
Cannot: Access SETTINGS (owner-only)
```

## Security Considerations

### Invitation Security
- **Token entropy**: 256 bits (crypto-secure random)
- **Format**: Base64 URL-safe
- **Expiration**: 7 days, enforced in database
- **Single-use**: Invalidated after acceptance/decline
- **No hashing**: Not passwords, short-lived, single-use

### Permission Enforcement
- **Primary layer**: Server-side tRPC middleware
- **Secondary layer**: Client-side UI hiding (UX only)
- **Validation**: Every API call checks permissions
- **Performance**: <100ms permission check (indexed query)

### Owner Protection
- Cannot remove themselves (must transfer ownership first - future)
- Cannot modify their own permissions
- Database constraint prevents deletion if they invited others

### Data Integrity
- Unique constraint: One invitation per email per event
- Cascade delete: Removing event deletes all memberships
- Restrict delete: Cannot delete users who invited others
- Soft delete: Status change instead of record deletion (audit trail)

## Performance Targets

- **Permission check**: <100ms
- **Invitation send**: <2s
- **List members**: <500ms for 50 members
- **Email delivery**: <30s
- **Cache TTL**: 30 seconds
- **Token lookup**: <50ms (unique index)

## Troubleshooting

### "You don't have access to this module"
**Cause**: Your permissions don't include the module  
**Solution**: Contact event owner to update your permissions

### "Invitation has expired"
**Cause**: Link is older than 7 days  
**Solution**: Ask event owner to resend invitation (generates new link)

### "Cannot invite email"
**Causes**:
1. Email already a team member → Edit their permissions instead
2. Pending invitation exists → Cancel and resend
3. Email is your own → Cannot invite yourself

### Permission changes not taking effect
**Cause**: Browser cache or stale session  
**Solution**: Hard refresh (Ctrl+F5) or log out and back in

## Future Enhancements

**Planned for v1.1**:
- [ ] Ownership transfer
- [ ] Bulk invitations (CSV upload)
- [ ] Role templates (preset permission combinations)
- [ ] Activity log (audit trail)
- [ ] Grace period for permission revocation (30s to save)
- [ ] Real-time updates via WebSocket
- [ ] Time-limited access (set expiration dates)

**Under Consideration**:
- [ ] Sub-permissions (view-only, edit-only within modules)
- [ ] Custom roles beyond OWNER/COLLABORATOR
- [ ] Permission requests (collaborators request additional access)
- [ ] 2FA requirement for team management

## Support & Resources

**Documentation**:
- [Feature Specification](../../../specs/002-team-collaborators/spec.md) - Original feature spec
- [Implementation Tasks](../../../specs/002-team-collaborators/tasks.md) - Development tasks
- [API Contracts](../../../specs/002-team-collaborators/contracts/team-router.md) - API documentation
- [User Guide](../../guides/team-collaboration.md) - End-user guide

**Getting Help**:
1. Check the troubleshooting section above
2. Review the [Workflows documentation](./workflows.md)
3. Search [GitHub Issues](https://github.com/babblebey/events-ting/issues)
4. Create new issue with label `module: team`

**Testing**:
- Integration tests: `tests/integration/team-collaboration.test.ts`
- Contract tests: `tests/contract/team-router.test.ts`
- Manual test checklist: See [Workflows documentation](./workflows.md#testing-workflows)

---

**Module Status**: ✅ Production Ready  
**Last Updated**: November 16, 2025  
**Maintained By**: Core Team
