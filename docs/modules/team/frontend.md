# Team Module - Frontend Documentation

## Overview

The team module frontend provides intuitive interfaces for managing team collaborators, handling invitations, and displaying permission information. The UI is built with React Server Components, shadcn/ui, and tRPC for type-safe API communication.

## Routes

### Organizer Routes (Protected)

#### `/[id]/settings/team`

Team management page for event owners.

**Purpose**: Main interface for inviting, managing, and removing team members

**Access**: Event owners only

**Features**:
- Invite new collaborators
- View active team members
- View pending invitations
- Edit member permissions
- Remove member access
- Resend/cancel invitations

**File**: `src/app/(dashboard)/[id]/settings/team/page.tsx`

**Layout**:
```
┌─────────────────────────────────────────┐
│ Team Management                         │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ [Invite Collaborator Button]        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Active Members (3)                      │
│ ┌─────────────────────────────────────┐ │
│ │ 👤 Owner (You)                      │ │
│ │    All modules                      │ │
│ ├─────────────────────────────────────┤ │
│ │ 👤 John Doe                         │ │
│ │    CFP, Speakers, Schedule          │ │
│ │    [Edit] [Remove]                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Pending Invitations (1)                 │
│ ┌─────────────────────────────────────┐ │
│ │ ✉️  jane@example.com                 │ │
│ │    Attendees, Communications        │ │
│ │    Expires in 5 days                │ │
│ │    [Resend] [Cancel]                │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

### Public Routes

#### `/invitations/accept`

Invitation acceptance page (public, no auth required initially).

**Purpose**: Allow invited users to review and accept/decline invitations

**Access**: Anyone with valid invitation link

**Query params**: `?token=abc123...`

**Features**:
- Display event details
- Show granted module permissions
- Permission explainer
- Accept/decline buttons
- Expiration warning

**File**: `src/app/invitations/accept/page.tsx`

**Flow**:
1. User clicks link in invitation email
2. Page loads with token from URL
3. If not logged in → Redirect to sign in (preserves token)
4. After login → Show invitation details
5. User accepts/declines
6. Redirect to event dashboard or confirmation

**Layout**:
```
┌─────────────────────────────────────────┐
│ You've been invited!                    │
│                                         │
│ 🎉 Tech Conference 2025                 │
│                                         │
│ John Smith has invited you to          │
│ collaborate on this event.              │
│                                         │
│ You'll have access to:                  │
│ ✓ Call for Papers                       │
│ ✓ Speakers Management                   │
│ ✓ Schedule Builder                      │
│                                         │
│ ℹ️  What does this mean? [Learn more]   │
│                                         │
│ ┌─────────────┐ ┌─────────────┐        │
│ │ Accept      │ │ Decline     │        │
│ └─────────────┘ └─────────────┘        │
│                                         │
│ Invitation expires in 5 days            │
└─────────────────────────────────────────┘
```

---

#### `/my-teams`

Collaborator dashboard showing all event memberships.

**Purpose**: Self-service view for collaborators to see their access

**Access**: Authenticated users who are team members

**Features**:
- List all events user is a team member of
- Show role and module permissions per event
- Quick navigation to each event
- Filterable by status

**File**: `src/app/my-teams/page.tsx`

**Layout**:
```
┌─────────────────────────────────────────┐
│ My Events                               │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🎯 Tech Conference 2025              │ │
│ │    Role: Collaborator               │ │
│ │    Access: CFP, Speakers, Schedule  │ │
│ │    [Go to Dashboard]                │ │
│ ├─────────────────────────────────────┤ │
│ │ 🎯 Design Summit 2025               │ │
│ │    Role: Owner                      │ │
│ │    Access: All modules              │ │
│ │    [Go to Dashboard]                │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

### Error/Info Routes

#### `/[id]/access-denied`

Shown when user tries to access a module they don't have permission for.

**File**: `src/app/(dashboard)/[id]/access-denied/page.tsx`

**Content**:
- Friendly error message
- Explanation of what happened
- Contact owner button
- Link to accessible modules

---

#### `/[id]/removed`

Shown when user's access has been revoked.

**File**: `src/app/(dashboard)/[id]/removed/page.tsx`

**Content**:
- Notification of access removal
- Explanation
- Link back to My Teams page

---

## Components

### Core Components

#### `team-member-list.tsx`

Displays list of team members with actions.

**Location**: `src/components/team/team-member-list.tsx`

**Props**:
```typescript
{
  eventId: string;
  isOwner: boolean;
}
```

**Features**:
- Displays active members and pending invitations
- Grouped by status
- Sort by name, role, date
- Filters by status
- Action buttons (edit, remove)

**Internal state**:
- Selected member for editing
- Modal visibility
- Filter/sort preferences

**Example usage**:
```tsx
<TeamMemberList eventId={event.id} isOwner={isOwner} />
```

---

#### `team-member-card.tsx`

Individual member card showing details and actions.

**Location**: `src/components/team/team-member-card.tsx`

**Props**:
```typescript
{
  member: TeamMember;
  isOwner: boolean;
  onEdit?: (memberId: string) => void;
  onRemove?: (memberId: string) => void;
}
```

**Layout**:
```
┌────────────────────────────────────┐
│ 👤 John Doe                        │
│    john@example.com                │
│    [COLLABORATOR]                  │
│                                    │
│    Modules: CFP, Speakers          │
│    Joined: Nov 10, 2025            │
│    Last active: 2 hours ago        │
│                                    │
│    [Edit Permissions] [Remove]     │
└────────────────────────────────────┘
```

**Conditional rendering**:
- Edit/Remove buttons only shown if `isOwner`
- Owner's own card shows no action buttons
- Pending members show "Resend" instead of "Edit"

---

#### `invite-collaborator-form.tsx`

Form to invite new collaborators.

**Location**: `src/components/team/invite-collaborator-form.tsx`

**Props**:
```typescript
{
  eventId: string;
  onSuccess?: () => void;
}
```

**Fields**:
- Email (required, validated)
- Module permissions (multi-select checkboxes)

**Validation**:
- Email format validation
- At least one module must be selected
- Cannot be organizer's own email

**States**:
- Loading during submission
- Success message after send
- Error display

**Example**:
```tsx
<InviteCollaboratorForm 
  eventId={event.id}
  onSuccess={() => toast.success("Invitation sent!")}
/>
```

---

#### `module-permissions-selector.tsx`

Checkbox list for selecting module permissions.

**Location**: `src/components/team/module-permissions-selector.tsx`

**Props**:
```typescript
{
  value: string[];
  onChange: (permissions: string[]) => void;
  excludeModules?: string[]; // e.g., ["SETTINGS"]
}
```

**Layout**:
```
┌────────────────────────────────────┐
│ Select Modules                     │
│                                    │
│ ☑ Overview                         │
│   Event dashboard and statistics   │
│                                    │
│ ☑ Call for Papers                  │
│   Review and manage submissions    │
│                                    │
│ ☐ Attendees                        │
│   Manage registrations             │
│                                    │
│ ☑ Schedule                         │
│   Build event schedule             │
└────────────────────────────────────┘
```

**Features**:
- Visual module descriptions
- Tooltips with detailed explanations
- Select all / Deselect all
- Excludes owner-only modules (SETTINGS)

---

#### `edit-permissions-modal.tsx`

Modal dialog for updating collaborator permissions.

**Location**: `src/components/team/edit-permissions-modal.tsx`

**Props**:
```typescript
{
  teamMember: TeamMember;
  isOpen: boolean;
  onClose: () => void;
  onSave: (permissions: string[]) => void;
}
```

**Features**:
- Shows current permissions
- `ModulePermissionsSelector` for changes
- Highlights changes (added/removed)
- Confirmation on save
- Optimistic UI update

**Layout**:
```
┌────────────────────────────────────┐
│ Edit Permissions                   │
│ john@example.com                   │
│                                    │
│ [Module Permission Selector]       │
│                                    │
│ Changes:                           │
│ + Schedule (new)                   │
│ - Communications (removed)         │
│                                    │
│ [Cancel]  [Save Changes]           │
└────────────────────────────────────┘
```

---

#### `remove-member-modal.tsx`

Confirmation dialog for removing team member.

**Location**: `src/components/team/remove-member-modal.tsx`

**Props**:
```typescript
{
  teamMember: TeamMember;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}
```

**Layout**:
```
┌────────────────────────────────────┐
│ ⚠️  Remove Team Member              │
│                                    │
│ Are you sure you want to remove    │
│ john@example.com from this event?  │
│                                    │
│ They will lose access to:          │
│ • Call for Papers                  │
│ • Speakers Management              │
│                                    │
│ This action cannot be undone.      │
│                                    │
│ Optional: Reason for removal       │
│ [________________________]         │
│                                    │
│ [Cancel]  [Remove Member]          │
└────────────────────────────────────┘
```

**Safety**:
- Requires explicit confirmation
- Shows what access will be lost
- Optional reason field
- Cannot remove self (owner)

---

#### `pending-invitations-list.tsx`

List of pending invitations with management actions.

**Location**: `src/components/team/pending-invitations-list.tsx`

**Props**:
```typescript
{
  eventId: string;
}
```

**Features**:
- Lists all pending invitations
- Shows expiration countdown
- Resend invitation action
- Cancel invitation action

**Layout**:
```
┌────────────────────────────────────┐
│ Pending Invitations (2)            │
│                                    │
│ ✉️  jane@example.com                │
│    Modules: Attendees              │
│    Expires in 5 days               │
│    [Resend] [Cancel]               │
│                                    │
│ ✉️  bob@example.com                 │
│    Modules: CFP, Speakers          │
│    ⚠️ Expires in 1 day              │
│    [Resend] [Cancel]               │
└────────────────────────────────────┘
```

---

### Utility Components

#### `role-badge.tsx`

Badge showing user role (OWNER/COLLABORATOR).

**Location**: `src/components/team/role-badge.tsx`

**Props**:
```typescript
{
  role: TeamRole;
  size?: "sm" | "md" | "lg";
}
```

**Variants**:
- `OWNER` → Blue badge with crown icon
- `COLLABORATOR` → Gray badge with user icon

**Example**:
```tsx
<RoleBadge role="OWNER" size="sm" />
```

---

#### `status-badge.tsx`

Badge showing member status.

**Location**: `src/components/team/status-badge.tsx`

**Props**:
```typescript
{
  status: TeamMemberStatus;
}
```

**Variants**:
- `ACTIVE` → Green badge with checkmark
- `PENDING` → Yellow badge with clock
- `REMOVED` → Red badge with X

---

#### `permission-explainer.tsx`

Educational component explaining module permissions.

**Location**: `src/components/team/permission-explainer.tsx`

**Props**:
```typescript
{
  modules: string[];
  variant?: "compact" | "detailed";
}
```

**Purpose**:
- Help users understand what permissions mean
- Show concrete examples of what they can do
- Reduce confusion and support requests

**Detailed view**:
```
┌────────────────────────────────────┐
│ Your Permissions                   │
│                                    │
│ 📋 Call for Papers                  │
│ You can:                           │
│ • View all submissions             │
│ • Accept or reject proposals       │
│ • Add review notes and scores      │
│                                    │
│ 🎤 Speakers                         │
│ You can:                           │
│ • Create speaker profiles          │
│ • Edit speaker information         │
│ • Upload photos                    │
│ • Assign speakers to sessions      │
└────────────────────────────────────┘
```

---

#### `my-teams-list.tsx`

List component for collaborator's event memberships.

**Location**: `src/components/team/my-teams-list.tsx`

**Props**:
```typescript
{
  userId: string;
}
```

**Features**:
- Fetches user's team memberships
- Displays event cards
- Shows role and permissions
- Quick navigation links
- Filter by status (active/removed)

---

## Hooks

### `useTeamPermissions`

Hook for checking user's team permissions.

**Location**: `src/hooks/use-team-permissions.ts`

**Usage**:
```typescript
const { isOwner, hasModule, loading } = useTeamPermissions(eventId);

if (isOwner) {
  // Show owner-only features
}

if (hasModule("CFP")) {
  // Show CFP menu item
}
```

**Implementation**:
```typescript
export function useTeamPermissions(eventId: string) {
  const { data, isLoading } = api.team.getCurrentMember.useQuery({ 
    eventId 
  });

  return {
    isOwner: data?.role === "OWNER",
    isCollaborator: data?.role === "COLLABORATOR",
    modulePermissions: data?.modulePermissions ?? [],
    hasModule: (module: string) => 
      data?.role === "OWNER" || 
      data?.modulePermissions?.includes(module),
    loading: isLoading,
  };
}
```

---

### `useInvitationToken`

Hook for handling invitation token from URL.

**Location**: `src/hooks/use-invitation-token.ts`

**Usage**:
```typescript
const { token, isValidating, error } = useInvitationToken();

if (error) {
  return <ExpiredInvitation />;
}
```

**Features**:
- Extracts token from URL query params
- Validates token format
- Checks expiration
- Handles missing/invalid tokens

---

## State Management

### tRPC Query Caching

The frontend uses tRPC's built-in caching for team data:

```typescript
// Cached automatically
const { data: members } = api.team.getMembers.useQuery({ eventId });

// Manual invalidation after mutations
const { mutate } = api.team.invite.useMutation({
  onSuccess: () => {
    utils.team.getMembers.invalidate({ eventId });
    utils.team.getPendingInvitations.invalidate({ eventId });
  },
});
```

### Optimistic Updates

All team mutations use optimistic UI updates:

```typescript
const { mutate: updatePermissions } = api.team.updatePermissions.useMutation({
  onMutate: async (newData) => {
    await utils.team.getMembers.cancel({ eventId });
    const previous = utils.team.getMembers.getData({ eventId });
    
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
    utils.team.getMembers.setData({ eventId }, context.previous);
    toast.error("Failed to update permissions");
  },
  onSuccess: () => {
    toast.success("Permissions updated!");
  },
});
```

---

## UI Patterns

### Permission-Based Rendering

**Pattern**: Conditionally render UI based on permissions

```tsx
function EventDashboard({ eventId }) {
  const { hasModule, isOwner } = useTeamPermissions(eventId);

  return (
    <nav>
      <NavItem href={`/${eventId}`}>Dashboard</NavItem>
      
      {hasModule("CFP") && (
        <NavItem href={`/${eventId}/cfp`}>Call for Papers</NavItem>
      )}
      
      {hasModule("ATTENDEES") && (
        <NavItem href={`/${eventId}/attendees`}>Attendees</NavItem>
      )}
      
      {isOwner && (
        <NavItem href={`/${eventId}/settings`}>Settings</NavItem>
      )}
    </nav>
  );
}
```

---

### Loading States

**Pattern**: Show skeleton loaders during data fetching

```tsx
function TeamMemberList({ eventId }) {
  const { data, isLoading } = api.team.getMembers.useQuery({ eventId });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.members.map((member) => (
        <TeamMemberCard key={member.id} member={member} />
      ))}
    </div>
  );
}
```

---

### Error Boundaries

**Pattern**: Graceful error handling with fallbacks

```tsx
function TeamManagementPage({ params }) {
  return (
    <ErrorBoundary 
      fallback={<TeamErrorFallback />}
      onError={(error) => logError("Team page error", error)}
    >
      <Suspense fallback={<TeamLoadingSkeleton />}>
        <TeamMemberList eventId={params.id} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

## Forms & Validation

### Invite Form Schema

**Validation** with Zod:

```typescript
const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  modulePermissions: z
    .array(z.string())
    .min(1, "Select at least one module")
    .refine(
      (permissions) => !permissions.includes("SETTINGS"),
      "SETTINGS cannot be assigned to collaborators"
    ),
});
```

**Form handling** with react-hook-form:

```tsx
function InviteCollaboratorForm({ eventId, onSuccess }) {
  const form = useForm({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      modulePermissions: [],
    },
  });

  const { mutate, isLoading } = api.team.invite.useMutation({
    onSuccess: () => {
      form.reset();
      onSuccess?.();
      toast.success("Invitation sent!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: FormData) => {
    mutate({ eventId, ...data });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField name="email" />
        <FormField name="modulePermissions" />
        <Button type="submit" disabled={isLoading}>
          Send Invitation
        </Button>
      </form>
    </Form>
  );
}
```

---

## Accessibility

### Keyboard Navigation

All interactive elements are keyboard accessible:
- Tab through forms
- Enter to submit
- Escape to close modals
- Arrow keys for list navigation

### Screen Reader Support

**ARIA labels**:
```tsx
<button 
  aria-label={`Remove ${member.email} from team`}
  onClick={() => handleRemove(member.id)}
>
  <TrashIcon />
</button>
```

**Live regions** for dynamic updates:
```tsx
<div aria-live="polite" aria-atomic="true">
  {isUpdating && "Updating permissions..."}
  {updateSuccess && "Permissions updated successfully"}
</div>
```

---

## Responsive Design

### Mobile Adaptations

**Team member cards** stack on mobile:
```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {members.map(member => (
    <TeamMemberCard key={member.id} member={member} />
  ))}
</div>
```

**Actions** move to dropdown on small screens:
```tsx
<div className="hidden md:flex gap-2">
  <Button>Edit</Button>
  <Button>Remove</Button>
</div>
<div className="md:hidden">
  <DropdownMenu>
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuItem>Remove</DropdownMenuItem>
  </DropdownMenu>
</div>
```

---

## Performance Optimizations

### Code Splitting

Team components are lazy-loaded:
```tsx
const TeamMemberList = lazy(() => import("@/components/team/team-member-list"));
const InviteModal = lazy(() => import("@/components/team/invite-modal"));
```

### Memoization

Expensive computations are memoized:
```tsx
const sortedMembers = useMemo(() => {
  return members.sort((a, b) => 
    a.email.localeCompare(b.email)
  );
}, [members]);
```

---

## Related Documentation

- [Backend Documentation](./backend.md)
- [Data Model](./data-model.md)
- [Workflows](./workflows.md)
- [Email Templates](./email-templates.md)

---

**Last Updated**: November 16, 2025
