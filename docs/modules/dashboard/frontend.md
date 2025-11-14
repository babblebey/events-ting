# Dashboard Frontend Documentation

## Overview

This document details the frontend implementation of the Dashboard module, including page structure, components, UI patterns, and responsive behavior.

## Page Structure

### Dashboard Page

**File**: `src/app/dashboard/page.tsx`  
**Route**: `/dashboard`  
**Type**: Server Component (with Client Component for interactivity)

```typescript
// Simplified structure
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Fetch initial events server-side
  const initialEvents = await api.event.list({
    organizerId: session.user.id,
    status: searchParams.status,
    limit: 20,
  });

  return <EventsDashboard initialEvents={initialEvents} />;
}
```

**Metadata**:
```typescript
export const metadata = {
  title: "My Events | Events Ting",
  description: "Manage all your events in one place",
};
```

## Component Hierarchy

```
DashboardPage (Server Component)
└── EventsDashboard (Client Component)
    ├── DashboardHeader
    │   ├── PageTitle
    │   └── CreateEventButton
    ├── StatusFilter
    │   └── FilterTab (x4: All, Draft, Published, Archived)
    ├── EventsGrid
    │   └── EventCard (x N)
    │       ├── EventImage
    │       ├── StatusBadge
    │       ├── EventInfo
    │       │   ├── EventTitle
    │       │   ├── EventDate
    │       │   ├── EventLocation
    │       │   └── AttendeeCount
    │       └── ActionButtons
    │           ├── ManageButton
    │           └── EditButton
    ├── EmptyState (conditional)
    │   ├── EmptyIcon
    │   ├── EmptyMessage
    │   └── EmptyAction
    └── Pagination
        ├── EventCounter
        └── LoadMoreButton
```

## Components

### 1. EventsDashboard

**File**: `src/components/dashboard/events-dashboard.tsx`  
**Type**: Client Component  
**Purpose**: Main container for dashboard functionality

**Props**:
```typescript
interface EventsDashboardProps {
  initialEvents: Event[];
}
```

**Features**:
- Manages filter state
- Handles pagination
- Renders event grid or empty state
- Integrates all child components

**State Management**:
```typescript
const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");
const [page, setPage] = useState(1);

// tRPC query with active filter
const { data, isLoading, fetchNextPage, hasNextPage } = 
  api.event.list.useInfiniteQuery(
    {
      organizerId: session.user.id,
      status: activeFilter === "all" ? undefined : activeFilter,
      limit: 20,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialData: { pages: [initialEvents], pageParams: [undefined] },
    }
  );
```

---

### 2. DashboardHeader

**File**: `src/components/dashboard/dashboard-header.tsx`  
**Type**: Client Component (for button interaction)  
**Purpose**: Page title and primary actions

**Structure**:
```tsx
<header className="mb-8">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-3xl font-bold">My Events</h1>
      <p className="text-gray-600">Manage all your events in one place</p>
    </div>
    <Button 
      href="/create-event"
      color="primary"
      size="lg"
    >
      <PlusIcon className="mr-2 h-5 w-5" />
      Create Event
    </Button>
  </div>
</header>
```

**Responsive Behavior**:
- **Desktop**: Side-by-side layout with title left, button right
- **Tablet**: Same as desktop
- **Mobile**: Stacked layout, button full-width below title

---

### 3. StatusFilter

**File**: `src/components/dashboard/status-filter.tsx`  
**Type**: Client Component  
**Purpose**: Filter tabs with count badges

**Props**:
```typescript
interface StatusFilterProps {
  activeFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  counts: {
    all: number;
    draft: number;
    published: number;
    archived: number;
  };
}
```

**Desktop Layout**:
```tsx
<div className="flex gap-2 border-b border-gray-200">
  <FilterTab 
    label="All" 
    count={counts.all} 
    active={activeFilter === "all"}
    onClick={() => onFilterChange("all")}
  />
  <FilterTab label="Draft" count={counts.draft} ... />
  <FilterTab label="Published" count={counts.published} ... />
  <FilterTab label="Archived" count={counts.archived} ... />
</div>
```

**Mobile Layout** (Stacked Buttons):
```tsx
<div className="flex flex-col gap-2">
  <Button 
    variant={activeFilter === "all" ? "solid" : "outline"}
    fullWidth
  >
    All ({counts.all})
  </Button>
  {/* Similar for Draft, Published, Archived */}
</div>
```

**Filter Tab Component**:
```tsx
function FilterTab({ label, count, active, onClick }: FilterTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 font-medium transition-colors",
        active
          ? "border-b-2 border-blue-600 text-blue-600"
          : "text-gray-600 hover:text-gray-900"
      )}
    >
      {label}
      <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs">
        {count}
      </span>
    </button>
  );
}
```

---

### 4. EventCard

**File**: `src/components/dashboard/event-card.tsx`  
**Type**: Client Component (for hover and click interactions)  
**Purpose**: Display event information with actions

**Props**:
```typescript
interface EventCardProps {
  event: Event & {
    _count: {
      registrations: number;
    };
  };
}
```

**Structure**:
```tsx
<Card className="overflow-hidden hover:shadow-lg transition-shadow">
  {/* Event Image */}
  <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
    {event.imageUrl ? (
      <Image src={event.imageUrl} alt={event.name} fill />
    ) : (
      <div className="flex items-center justify-center h-full">
        <CalendarIcon className="h-16 w-16 text-white opacity-50" />
      </div>
    )}
    
    {/* Status Badge (overlay) */}
    <StatusBadge status={event.status} className="absolute top-2 right-2" />
  </div>

  {/* Event Info */}
  <CardBody>
    <h3 className="text-xl font-bold mb-3">{event.name}</h3>
    
    {/* Date */}
    <div className="flex items-center text-gray-600 mb-2">
      <CalendarIcon className="h-4 w-4 mr-2" />
      <span>{formatDateRange(event.startDate, event.endDate, event.timezone)}</span>
    </div>
    
    {/* Location */}
    <div className="flex items-center text-gray-600 mb-2">
      <LocationIcon className="h-4 w-4 mr-2" />
      <span>{formatLocation(event)}</span>
    </div>
    
    {/* Attendees */}
    <div className="flex items-center text-gray-600 mb-4">
      <UsersIcon className="h-4 w-4 mr-2" />
      <span>{event._count.registrations} attendees</span>
    </div>
    
    {/* Actions */}
    <div className="flex gap-2">
      <Button 
        href={`/${event.id}`}
        color="primary"
        className="flex-1"
      >
        Manage
      </Button>
      <Button 
        href={`/${event.id}/settings`}
        color="gray"
        outline
      >
        Edit
      </Button>
    </div>
  </CardBody>
</Card>
```

**Status Badge**:
```tsx
function StatusBadge({ status }: { status: EventStatus }) {
  const config = {
    draft: {
      color: "bg-yellow-100 text-yellow-800",
      icon: AlertCircleIcon,
      label: "Draft",
    },
    published: {
      color: "bg-green-100 text-green-800",
      icon: CheckCircleIcon,
      label: "Published",
    },
    archived: {
      color: "bg-gray-100 text-gray-800",
      icon: ArchiveIcon,
      label: "Archived",
    },
  };

  const { color, icon: Icon, label } = config[status];

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", color)}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </span>
  );
}
```

**Helper Functions**:
```typescript
function formatDateRange(start: Date, end: Date, timezone: string): string {
  const format = "MMM d, yyyy";
  const startStr = formatInTimeZone(start, timezone, format);
  const endStr = formatInTimeZone(end, timezone, format);
  
  if (startStr === endStr) {
    return startStr;
  }
  
  return `${startStr} - ${endStr}`;
}

function formatLocation(event: Event): string {
  switch (event.locationType) {
    case "virtual":
      return "Virtual Event";
    case "in-person":
      return event.locationAddress || "In-person";
    case "hybrid":
      return "Hybrid (Virtual + In-person)";
  }
}
```

---

### 5. EmptyState

**File**: `src/components/dashboard/empty-state.tsx`  
**Type**: Client Component  
**Purpose**: Display helpful messages when no events match criteria

**Props**:
```typescript
interface EmptyStateProps {
  variant: "no-events" | "no-matches";
  activeFilter?: StatusFilter;
  onClearFilter?: () => void;
}
```

**No Events Variant**:
```tsx
<div className="flex flex-col items-center justify-center py-16 px-4">
  <CalendarIcon className="h-24 w-24 text-gray-300 mb-6" />
  <h2 className="text-2xl font-bold text-gray-900 mb-2">
    Create Your First Event
  </h2>
  <p className="text-gray-600 mb-6 text-center max-w-md">
    Start managing amazing events with Events Ting. 
    It takes just a few minutes to get started.
  </p>
  <Button href="/create-event" color="primary" size="lg">
    <PlusIcon className="mr-2 h-5 w-5" />
    Create Your First Event
  </Button>
</div>
```

**No Matches Variant**:
```tsx
<div className="flex flex-col items-center justify-center py-16 px-4">
  <SearchIcon className="h-24 w-24 text-gray-300 mb-6" />
  <h2 className="text-2xl font-bold text-gray-900 mb-2">
    No {activeFilter} Events Found
  </h2>
  <p className="text-gray-600 mb-6 text-center max-w-md">
    {getEmptyMessage(activeFilter)}
  </p>
  <Button onClick={onClearFilter} color="gray" outline>
    View All Events
  </Button>
</div>
```

**Empty Messages**:
```typescript
function getEmptyMessage(filter: StatusFilter): string {
  switch (filter) {
    case "draft":
      return "You don't have any draft events. All your events are published!";
    case "published":
      return "You don't have any published events. Create and publish your first event.";
    case "archived":
      return "You don't have any archived events.";
    default:
      return "No events found.";
  }
}
```

---

### 6. Pagination

**File**: Part of `events-dashboard.tsx`  
**Type**: Integrated into EventsDashboard  
**Purpose**: Load more events and show count

**Structure**:
```tsx
<div className="mt-8 flex items-center justify-between">
  {/* Event Counter */}
  <p className="text-sm text-gray-600">
    Showing {displayedCount} of {totalCount} events
  </p>
  
  {/* Load More Button */}
  {hasNextPage && (
    <Button
      onClick={() => fetchNextPage()}
      disabled={isFetchingNextPage}
      color="gray"
      outline
    >
      {isFetchingNextPage ? (
        <>
          <Spinner size="sm" className="mr-2" />
          Loading...
        </>
      ) : (
        "Load More"
      )}
    </Button>
  )}
</div>
```

---

## Responsive Behavior

### Breakpoints

```css
/* Mobile First Approach */
/* Base (Mobile): 0-639px */
/* Tablet: 640px-1023px (sm, md) */
/* Desktop: 1024px+ (lg, xl, 2xl) */
```

### Layout Changes

**Events Grid**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {events.map(event => <EventCard key={event.id} event={event} />)}
</div>
```
- **Mobile**: 1 column (stacked cards)
- **Tablet**: 2 columns
- **Desktop**: 3 columns

**Status Filter**:
```tsx
{/* Desktop: Horizontal tabs */}
<div className="hidden sm:flex gap-2 border-b">
  <FilterTab ... />
</div>

{/* Mobile: Stacked buttons */}
<div className="sm:hidden flex flex-col gap-2">
  <Button fullWidth ... />
</div>
```

**Dashboard Header**:
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <div>
    <h1>My Events</h1>
    <p>Manage all your events</p>
  </div>
  <Button fullWidth className="sm:w-auto">Create Event</Button>
</div>
```

---

## Loading States

### Skeleton UI

```tsx
function EventCardSkeleton() {
  return (
    <Card>
      <div className="h-48 bg-gray-200 animate-pulse" />
      <CardBody>
        <div className="h-6 bg-gray-200 rounded animate-pulse mb-3" />
        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="flex gap-2">
          <div className="h-10 bg-gray-200 rounded animate-pulse flex-1" />
          <div className="h-10 bg-gray-200 rounded animate-pulse w-20" />
        </div>
      </CardBody>
    </Card>
  );
}
```

**Usage**:
```tsx
{isLoading ? (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <EventCardSkeleton key={i} />
    ))}
  </div>
) : (
  <EventsGrid events={events} />
)}
```

---

## Error States

### Error Boundary

```tsx
function ErrorState({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <AlertCircleIcon className="h-16 w-16 text-red-500 mb-4" />
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <Button onClick={reset} color="primary">
        Try Again
      </Button>
    </div>
  );
}
```

---

## Accessibility

### Keyboard Navigation

```tsx
<button
  role="tab"
  aria-selected={active}
  tabIndex={active ? 0 : -1}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      onClick();
    }
  }}
>
  {label}
</button>
```

### Screen Reader Support

```tsx
<div role="tablist" aria-label="Event status filters">
  <button role="tab" aria-selected={true}>All Events</button>
</div>

<div role="tabpanel" aria-labelledby="all-events-tab">
  {/* Event cards */}
</div>
```

### Focus Management

```tsx
// Focus "Create Event" button on empty state
const createButtonRef = useRef<HTMLButtonElement>(null);

useEffect(() => {
  if (isEmpty) {
    createButtonRef.current?.focus();
  }
}, [isEmpty]);
```

---

## Performance Optimizations

### Memoization

```tsx
const eventCards = useMemo(() => {
  return events.map(event => (
    <EventCard key={event.id} event={event} />
  ));
}, [events]);
```

### Image Optimization

```tsx
<Image
  src={event.imageUrl}
  alt={event.name}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority={index < 3} // Prioritize above-the-fold images
/>
```

### Lazy Loading

```tsx
const Pagination = lazy(() => import("./pagination"));

<Suspense fallback={<LoadingSpinner />}>
  <Pagination ... />
</Suspense>
```

---

## Styling Conventions

### Tailwind CSS Classes

```tsx
// Consistent spacing
const spacing = {
  section: "mb-8",
  card: "p-6",
  grid: "gap-6",
};

// Color palette
const colors = {
  primary: "bg-blue-600 hover:bg-blue-700",
  secondary: "bg-gray-600 hover:bg-gray-700",
  success: "bg-green-600 hover:bg-green-700",
  warning: "bg-yellow-600 hover:bg-yellow-700",
  danger: "bg-red-600 hover:bg-red-700",
};
```

### Component Composition

```tsx
// Use cn() helper for conditional classes
import { cn } from "~/lib/utils";

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  size === "large" && "large-classes"
)} />
```

---

## Related Documentation

- [Dashboard README](./README.md) - Module overview
- [Dashboard Workflows](./workflows.md) - User flows
- [UI System](../../components/ui-system.md) - Design system
- [File Structure](../../architecture/file-structure.md) - Project organization

---

**Last Updated**: November 11, 2025  
**Maintained by**: @babblebey
