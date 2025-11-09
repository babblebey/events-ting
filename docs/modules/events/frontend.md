# Events Frontend Documentation

## Pages

### Public Pages

#### `/events/[slug]/page.tsx`
**Purpose**: Public event details page  
**Route**: `/events/tech-conf-2025`

**Features**:
- Display event information (name, description, dates, location)
- Show organizer details
- List available ticket types
- Display registration counts
- Links to related pages (schedule, speakers, CFP)

**Data Fetching**:
```typescript
const { data: event } = api.event.getBySlug.useQuery({ slug });
```

**Access Control**: Public for published events, organizer-only for drafts

---

### Dashboard Pages

#### `/(dashboard)/page.tsx`
**Purpose**: Organizer's event dashboard listing  
**Route**: `/dashboard`

**Features**:
- List all events by the current organizer
- Filter by status (draft, published, archived)
- Quick stats for each event (registrations, tickets)
- Create new event button
- Links to manage individual events

**Data Fetching**:
```typescript
const { data } = api.event.list.useQuery({
  organizerId: session.user.id,
  limit: 20,
});
```

#### `/(dashboard)/[id]/page.tsx`
**Purpose**: Single event management dashboard  
**Route**: `/dashboard/clx123abc...`

**Features**:
- Event metrics overview
- Recent registrations list
- Quick access to all event modules:
  - Tickets
  - Registrations
  - Schedule
  - Speakers
  - CFP
  - Communications
- Edit event button
- Archive event option

**Data Fetching**:
```typescript
const { data: event } = api.event.getById.useQuery({ id });
const { data: metrics } = api.event.getMetrics.useQuery({ id });
```

#### `/(dashboard)/[id]/edit/page.tsx`
**Purpose**: Edit event details  
**Route**: `/dashboard/clx123abc.../edit`

**Features**:
- Event form with all editable fields
- Save and publish options
- Cancel button returns to dashboard

---

## Components

### EventCard

**Location**: `src/components/events/event-card.tsx`

**Purpose**: Display event summary in list views

**Props**:
```typescript
interface EventCardProps {
  event: {
    id: string;
    slug: string;
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    locationType: string;
    locationAddress: string | null;
    locationUrl: string | null;
    status: string;
    organizer: {
      name: string | null;
      image: string | null;
    };
    _count: {
      registrations: number;
      ticketTypes: number;
    };
  };
  showOrganizerActions?: boolean; // Show edit/archive buttons
}
```

**Usage**:
```tsx
<EventCard 
  event={event} 
  showOrganizerActions={isOrganizer}
/>
```

**Features**:
- Event thumbnail/image
- Name and description (truncated)
- Date range with timezone
- Location badge (in-person/virtual/hybrid)
- Registration count
- Ticket availability indicator
- Optional organizer actions (edit, archive)

---

### EventForm

**Location**: `src/components/events/event-form.tsx`

**Purpose**: Create or edit event details

**Props**:
```typescript
interface EventFormProps {
  initialData?: Event; // If editing existing event
  onSuccess?: (event: Event) => void;
  onCancel?: () => void;
}
```

**Features**:
- Form fields for all event properties:
  - Basic info (name, description, slug)
  - Location type selector (in-person/virtual/hybrid)
  - Conditional fields based on location type
  - Timezone selector with search
  - Date/time pickers (converted to event timezone)
  - Status selector (draft/published)
- Real-time validation with Zod
- Loading states during submission
- Error message display
- Auto-generated slug from event name

**Form Library**: React Hook Form with Zod validation

**Example Usage**:
```tsx
// Create mode
<EventForm 
  onSuccess={(event) => router.push(`/dashboard/${event.id}`)}
  onCancel={() => router.back()}
/>

// Edit mode
<EventForm 
  initialData={existingEvent}
  onSuccess={() => toast.success("Event updated!")}
/>
```

**Validation**:
- Uses `createEventSchema` or `updateEventSchema` from validators
- Inline field-level validation
- Form-level validation on submit

---

### EventMetrics

**Location**: `src/components/events/event-metrics.tsx`

**Purpose**: Display dashboard statistics

**Props**:
```typescript
interface EventMetricsProps {
  eventId: string;
}
```

**Data Fetching**:
```typescript
const { data: metrics } = api.event.getMetrics.useQuery({ eventId });
```

**Displays**:
- Total registrations (with trend)
- Total ticket types
- Total schedule entries
- Total speakers
- Total email campaigns
- Recent registrations list (last 5)

**Usage**:
```tsx
<EventMetrics eventId={event.id} />
```

---

### ArchiveModal

**Location**: `src/components/events/archive-modal.tsx`

**Purpose**: Confirm event archival

**Props**:
```typescript
interface ArchiveModalProps {
  eventId: string;
  eventName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
```

**Features**:
- Warning message about archival
- Explanation that data is preserved
- Confirm/Cancel buttons
- Calls `event.archive` mutation

**Example Usage**:
```tsx
<ArchiveModal
  eventId={event.id}
  eventName={event.name}
  isOpen={showArchiveModal}
  onClose={() => setShowArchiveModal(false)}
  onSuccess={() => {
    toast.success("Event archived");
    router.push("/dashboard");
  }}
/>
```

---

## Form Patterns

### Event Creation Flow

1. User clicks "Create Event" on dashboard
2. Navigates to `/dashboard/new`
3. Fills out EventForm:
   ```tsx
   const createEvent = api.event.create.useMutation({
     onSuccess: (event) => {
       toast.success("Event created!");
       router.push(`/dashboard/${event.id}`);
     },
     onError: (error) => {
       toast.error(error.message);
     },
   });
   ```
4. On success, redirected to event dashboard

### Event Publishing Flow

1. Organizer edits draft event
2. Changes status to "published"
3. Event becomes visible on public listings
4. Public users can now view and register

### Timezone Handling

All dates are stored in UTC but displayed in the event's timezone:

```typescript
import { formatInTimeZone } from 'date-fns-tz';

// Display start date in event timezone
const displayDate = formatInTimeZone(
  event.startDate,
  event.timezone,
  'PPp' // "Apr 29, 2023, 9:00 AM"
);
```

### Location Type Conditional Fields

```tsx
<Select value={locationType} onChange={setLocationType}>
  <option value="in-person">In-Person</option>
  <option value="virtual">Virtual</option>
  <option value="hybrid">Hybrid</option>
</Select>

{(locationType === 'in-person' || locationType === 'hybrid') && (
  <TextInput 
    label="Address" 
    name="locationAddress"
    required 
  />
)}

{(locationType === 'virtual' || locationType === 'hybrid') && (
  <TextInput 
    label="Event URL" 
    name="locationUrl"
    type="url"
    required 
  />
)}
```

---

## Styling

**UI Library**: Flowbite React + Tailwind CSS

**Components Used**:
- `Card` - Event cards
- `Button` - Actions
- `TextInput` - Form fields
- `Select` - Dropdowns
- `Textarea` - Description field
- `Datepicker` - Date selection
- `Badge` - Status indicators
- `Modal` - Archive confirmation

**Color Scheme**:
- Draft events: Yellow badge
- Published events: Green badge
- Archived events: Gray badge

---

## Error Handling

### Display Patterns

**Form Errors**:
```tsx
{formState.errors.name && (
  <p className="text-sm text-red-600">
    {formState.errors.name.message}
  </p>
)}
```

**Mutation Errors**:
```tsx
const createEvent = api.event.create.useMutation({
  onError: (error) => {
    if (error.data?.code === 'CONFLICT') {
      toast.error('This slug is already taken');
    } else {
      toast.error('Failed to create event');
    }
  },
});
```

**Loading States**:
```tsx
{isLoading ? (
  <Spinner />
) : (
  <EventCard event={event} />
)}
```

---

## Related Files

- **Pages**: `src/app/events/[slug]/page.tsx`, `src/app/(dashboard)/[id]/page.tsx`
- **Components**: `src/components/events/*.tsx`
- **Hooks**: `src/hooks/use-debounce.ts` (for slug generation)
- **Utilities**: `src/lib/utils/date.ts` (timezone helpers)
