# Schedule Frontend Documentation

## Pages

### Dashboard Page (Organizer)

**Location**: `src/app/(dashboard)/[id]/schedule/page.tsx`

Server-side rendered page for organizers to manage event schedule.

**Features**:
- Fetches initial entries and tracks
- Passes data to client ScheduleManager component
- Requires authentication and organizer permission

**Route**: `/{eventId}/schedule`

---

### Public Schedule Page

**Location**: `src/app/events/[slug]/schedule/page.tsx`

Public-facing schedule display for attendees.

**Features**:
- Displays published event schedule
- Shows timeline with track filtering
- No edit capabilities
- Optimized for mobile viewing

**Route**: `/events/{slug}/schedule`

---

## Components

### ScheduleManager

**Location**: `src/app/(dashboard)/[id]/schedule/schedule-manager.tsx`

**Purpose**: Client component orchestrating schedule management

**Props**:
```typescript
{
  eventId: string,
  eventTimezone: string,
  initialEntries: ScheduleEntry[],
  initialTracks: Track[],
}
```

**State**:
- Modal visibility (add, edit, delete)
- Selected entry for editing
- Optimistic updates

**Features**:
- Add schedule entry button
- Opens modal with ScheduleEntryForm
- Displays ScheduleTimeline with edit actions
- Delete confirmation modal
- Real-time updates via tRPC mutations

**Usage**:
```tsx
<ScheduleManager
  eventId={event.id}
  eventTimezone={event.timezone}
  initialEntries={scheduleEntries}
  initialTracks={tracks}
/>
```

---

### ScheduleTimeline

**Location**: `src/components/schedule/schedule-timeline.tsx`

**Purpose**: Chronological display of schedule entries

**Props**:
```typescript
{
  entries: ScheduleEntry[],
  timezone: string,
  tracks?: Track[],
  onEdit?: (entryId: string) => void,
  onDelete?: (entryId: string) => void,
  showActions?: boolean,  // Show edit/delete buttons
}
```

**Features**:
- Groups entries by date
- Displays start/end times in event timezone
- Shows speakers with avatars
- Track color coding
- Session type badges
- Location display
- Optional edit/delete actions (organizer view)

**Layout**:
- Mobile: Single column, cards stacked
- Desktop: Timeline with time markers

**Usage**:
```tsx
{/* Organizer view */}
<ScheduleTimeline
  entries={entries}
  timezone="America/Los_Angeles"
  tracks={tracks}
  onEdit={handleEdit}
  onDelete={handleDelete}
  showActions={true}
/>

{/* Public view */}
<ScheduleTimeline
  entries={entries}
  timezone="America/Los_Angeles"
  showActions={false}
/>
```

---

### ScheduleEntryForm

**Location**: `src/components/schedule/schedule-entry-form.tsx`

**Purpose**: Form for creating and editing schedule entries

**Props**:
```typescript
{
  eventId: string,
  eventTimezone: string,
  initialData?: Partial<ScheduleEntry>,
  onSuccess?: () => void,
  onCancel?: () => void,
}
```

**Form Fields**:
- **Title** (text input, required)
- **Description** (textarea, required)
- **Date** (date picker, required)
- **Start Time** (time picker, required)
- **End Time** (time picker, required)
- **Location** (text input, optional)
- **Track** (text input with color picker, optional)
- **Session Type** (select: keynote, talk, workshop, break, networking)
- **Speakers** (multi-select from event speakers)

**Validation**:
- Title: 1-200 characters
- Description: 10-5000 characters
- End time must be after start time
- Date must be valid ISO format

**Overlap Detection**:
- Calls `schedule.checkOverlap` on time/location change
- Shows warning alert if conflicts exist
- Non-blocking (allows submission)

**Features**:
- Auto-fills from `initialData` for editing
- Debounced overlap check
- Time picker with 15-minute intervals
- Track color preview
- Speaker multi-select with search

**Usage**:
```tsx
{/* Create mode */}
<ScheduleEntryForm
  eventId={eventId}
  eventTimezone="America/Los_Angeles"
  onSuccess={() => {
    closeModal();
    refetch();
  }}
  onCancel={() => closeModal()}
/>

{/* Edit mode */}
<ScheduleEntryForm
  eventId={eventId}
  eventTimezone="America/Los_Angeles"
  initialData={{
    id: entry.id,
    updatedAt: entry.updatedAt,
    title: entry.title,
    // ... other fields
  }}
  onSuccess={() => {
    closeModal();
    refetch();
  }}
/>
```

**Error Handling**:
- Displays validation errors inline
- Shows conflict warning for optimistic concurrency
- Prompts user to refresh if entry was modified

---

### ScheduleCard

**Location**: `src/components/schedule/schedule-card.tsx`

**Purpose**: Individual session card display

**Props**:
```typescript
{
  entry: ScheduleEntry,
  timezone: string,
  onEdit?: () => void,
  onDelete?: () => void,
  showActions?: boolean,
}
```

**Display Elements**:
- Time range with timezone indicator
- Session title (heading)
- Track badge with color
- Session type badge
- Location (if specified)
- Speaker list with photos
- Description (expandable)
- Edit/Delete buttons (if organizer)

**Responsive Design**:
- Mobile: Full-width cards
- Tablet: 2-column grid
- Desktop: 3-column grid

---

## Forms & Inputs

### Time Picker

Custom time input component:
- 15-minute increment dropdown
- 24-hour format
- Validates end time > start time
- Displays in event timezone

### Date Picker

Native HTML5 date input:
- Calendar popup on supported browsers
- ISO format (YYYY-MM-DD)
- Min date: today (prevent past dates)

### Track Selector

Text input with color picker:
- Autocomplete from existing tracks
- Color preview swatch
- Default colors provided
- Creates new track if name doesn't exist

### Speaker Multi-Select

Dropdown with checkbox list:
- Fetches speakers from `api.speaker.list`
- Search/filter capability
- Shows speaker photo and name
- Multiple selection

---

## Styling & UI Patterns

### Track Colors

Visual indicators for multi-track events:
```tsx
<div className="border-l-4" style={{ borderColor: track.color }}>
  {/* Session content */}
</div>
```

### Session Type Badges

Color-coded badges:
- Keynote: Blue
- Talk: Purple
- Workshop: Green
- Break: Gray
- Networking: Yellow

### Speaker Avatars

Circular images with fallback initials:
```tsx
{speaker.photo ? (
  <img src={speaker.photo} alt={speaker.name} />
) : (
  <div className="avatar-fallback">{speaker.name[0]}</div>
)}
```

### Overlap Warning

Alert component when conflicts detected:
```tsx
<Alert color="warning" icon={HiExclamation}>
  <span className="font-medium">Scheduling Conflict:</span>
  This session overlaps with 2 other sessions in the same location.
</Alert>
```

---

## State Management

### Form State

Using React Hook Form:
```tsx
const { register, handleSubmit, formState: { errors } } = useForm({
  defaultValues: initialData,
});
```

### Query Invalidation

After mutations, invalidate queries:
```tsx
const utils = api.useUtils();

const createMutation = api.schedule.create.useMutation({
  onSuccess: () => {
    utils.schedule.list.invalidate();
    utils.schedule.getTracks.invalidate();
  },
});
```

### Optimistic Updates

For better UX, show changes immediately:
```tsx
const deleteMutation = api.schedule.delete.useMutation({
  onMutate: async (variables) => {
    await utils.schedule.list.cancel();
    const previousData = utils.schedule.list.getData();
    
    utils.schedule.list.setData(
      { eventId },
      (old) => old?.filter((entry) => entry.id !== variables.id)
    );
    
    return { previousData };
  },
  onError: (err, variables, context) => {
    utils.schedule.list.setData({ eventId }, context.previousData);
  },
});
```

---

## Accessibility

- Semantic HTML (headings, lists, buttons)
- ARIA labels for icon buttons
- Keyboard navigation support
- Focus management in modals
- Screen reader announcements for updates

---

## Related Documentation

- [Schedule Backend →](./backend.md)
- [Schedule Data Model →](./data-model.md)
- [Schedule Workflows →](./workflows.md)
