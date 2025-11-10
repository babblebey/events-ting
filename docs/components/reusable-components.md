# Reusable Components

## Overview

This document catalogs the custom reusable UI components built for Events-Ting. These components extend or complement Flowbite React components with project-specific functionality.

**Location**: `src/components/ui/`

---

## Component Catalog

### 1. FormField

**Purpose**: Wrapper for form inputs with labels, error messages, and help text.

**File**: `src/components/ui/form-field.tsx`

**Props**:

```typescript
interface FormFieldProps {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "number" | "url" | "textarea";
  placeholder?: string;
  required?: boolean;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  helpText?: string;
  rows?: number; // For textarea
}
```

**Usage**:

```tsx
import { FormField } from "@/components/ui/form-field";

<FormField
  label="Event Name"
  name="name"
  type="text"
  placeholder="Enter event name"
  required
  value={formData.name}
  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
  error={errors.name}
  helpText="Choose a descriptive name for your event"
/>
```

---

### 2. FormSection

**Purpose**: Group related form fields with a title and description.

**Props**:

```typescript
interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}
```

**Usage**:

```tsx
import { FormSection } from "@/components/ui/form-field";

<FormSection
  title="Event Details"
  description="Basic information about your event"
>
  <FormField label="Name" name="name" />
  <FormField label="Slug" name="slug" />
  <FormField label="Description" name="description" type="textarea" />
</FormSection>
```

---

### 3. FormError & FormSuccess

**Purpose**: Standalone error and success message components.

**Props**:

```typescript
interface FormErrorProps {
  message: string;
}

interface FormSuccessProps {
  message: string;
}
```

**Usage**:

```tsx
import { FormError, FormSuccess } from "@/components/ui/form-field";

{error && <FormError message={error} />}
{success && <FormSuccess message="Event created successfully!" />}
```

---

### 4. EmptyState

**Purpose**: Placeholder for empty lists or missing data with optional call-to-action.

**File**: `src/components/ui/empty-state.tsx`

**Props**:

```typescript
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  onAction?: () => void;
}
```

**Usage**:

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { HiPlus } from "react-icons/hi";

<EmptyState
  title="No events found"
  description="Get started by creating your first event"
  icon={HiPlus}
  actionLabel="Create Event"
  onAction={() => router.push("/dashboard/create")}
/>
```

---

### 5. Skeletons

**Purpose**: Loading placeholders for various content types.

**File**: `src/components/ui/skeletons.tsx`

**Components**:

#### Skeleton (Base)

```tsx
<Skeleton className="h-4 w-32" />
<Skeleton className="h-10 w-full" />
```

#### MetricCardSkeleton

Loading placeholder for dashboard metric cards:

```tsx
import { MetricCardSkeleton } from "@/components/ui/skeletons";

{isLoading ? (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <MetricCardSkeleton />
    <MetricCardSkeleton />
    <MetricCardSkeleton />
  </div>
) : (
  <MetricCards data={metrics} />
)}
```

#### TableSkeleton

Loading placeholder for tables:

```tsx
import { TableSkeleton } from "@/components/ui/skeletons";

{isLoading ? (
  <TableSkeleton rows={10} />
) : (
  <DataTable data={data} />
)}
```

#### CardListSkeleton

Loading placeholder for card grids:

```tsx
import { CardListSkeleton } from "@/components/ui/skeletons";

{isLoading ? (
  <CardListSkeleton items={6} />
) : (
  <EventGrid events={events} />
)}
```

#### FormSkeleton

Loading placeholder for forms:

```tsx
import { FormSkeleton } from "@/components/ui/skeletons";

{isLoading ? <FormSkeleton /> : <EventForm />}
```

#### ScheduleTimelineSkeleton

Loading placeholder for schedule timeline:

```tsx
import { ScheduleTimelineSkeleton } from "@/components/ui/skeletons";

{isLoading ? <ScheduleTimelineSkeleton /> : <ScheduleTimeline />}
```

#### SpeakerGridSkeleton

Loading placeholder for speaker grids:

```tsx
import { SpeakerGridSkeleton } from "@/components/ui/skeletons";

{isLoading ? (
  <SpeakerGridSkeleton count={6} />
) : (
  <SpeakerGrid speakers={speakers} />
)}
```

---

### 6. ToastProvider

**Purpose**: Context-based toast notification system.

**File**: `src/components/ui/toast-provider.tsx`

**Setup** (`src/app/layout.tsx`):

```tsx
import { ToastProvider } from "@/components/ui/toast-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
```

**Hook**:

```typescript
import { useToast } from "@/hooks/use-toast";

function MyComponent() {
  const { showToast } = useToast();

  const handleClick = () => {
    showToast("Operation successful", "success");
    showToast("An error occurred", "error");
    showToast("Please review this", "warning");
    showToast("New message received", "info");
  };

  return <Button onClick={handleClick}>Show Toast</Button>;
}
```

**Toast Types**:
- `success` - Green checkmark icon
- `error` - Red X icon
- `warning` - Yellow warning icon
- `info` - Blue info icon

---

### 7. AppSidebar

**Purpose**: Dashboard sidebar navigation with collapsible menu.

**File**: `src/components/app-sidebar.tsx`

**Components**:
- `AppSidebar` - Main sidebar
- `AppSidebarToggle` - Toggle button for mobile
- `AppSidebarInset` - Content wrapper

**Props**:

```typescript
interface AppSidebarProps {
  menuItems: AppSidebarMenuItem[];
  footerItems?: AppSidebarMenuItem[];
  defaultOpen?: boolean;
}

interface AppSidebarMenuItem {
  label: string;
  href: string;
  icon: string; // Icon name from react-icons
  badge?: number | string;
  active?: boolean;
}
```

**Usage**:

```tsx
import { AppSidebar, AppSidebarToggle, AppSidebarInset } from "@/components/app-sidebar";

const menuItems = [
  { label: "Dashboard", href: `/dashboard/${eventId}`, icon: "HiHome", active: true },
  { label: "Tickets", href: `/dashboard/${eventId}/tickets`, icon: "HiTicket" },
  { label: "Registrations", href: `/dashboard/${eventId}/registrations`, icon: "HiUsers", badge: 42 },
];

<div className="flex">
  <AppSidebar menuItems={menuItems} defaultOpen={false} />
  <AppSidebarInset>
    <AppSidebarToggle />
    {/* Page content */}
  </AppSidebarInset>
</div>
```

---

### 8. ThemeProvider

**Purpose**: Custom Flowbite theme configuration wrapper.

**File**: `src/components/providers/theme-provider.tsx`

**Setup** (`src/app/layout.tsx`):

```tsx
import { ThemeProvider } from "@/components/providers/theme-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Custom Theme**:

```typescript
import { createTheme, ThemeProvider as FlowbiteThemeProvider } from "flowbite-react";

const customTheme = createTheme({
  badge: {
    root: {
      base: "w-fit" // Badges fit content width
    }
  },
  // Add more customizations
});
```

---

## Module-Specific Components

### Events

**Location**: `src/components/events/`

- **EventForm** - Create/edit event form
- **EventCard** - Event card display
- **EventMetrics** - Dashboard metrics
- **ArchiveModal** - Archive confirmation modal

---

### Tickets

**Location**: `src/components/tickets/`

- **TicketTypeForm** - Create/edit ticket type form
- **TicketTypeCard** - Ticket type card with availability

---

### Registration

**Location**: `src/components/registration/`

- **RegistrationForm** - Public registration form
- **AttendeeTable** - Attendee list with filtering

---

### Schedule

**Location**: `src/components/schedule/`

- **ScheduleTimeline** - Visual timeline display
- **ScheduleEntryForm** - Create/edit schedule entry
- **ScheduleCard** - Schedule entry card

---

### Speakers

**Location**: `src/components/speakers/`

- **SpeakerForm** - Create/edit speaker form
- **SpeakerCard** - Speaker card display
- **SpeakerProfile** - Full speaker profile

---

### CFP

**Location**: `src/components/cfp/`

- **CfpForm** - Open/edit CFP settings
- **CfpSubmissionForm** - Public submission form
- **SubmissionCard** - Submission card for review
- **ReviewPanel** - Organizer review interface

---

### Communications

**Location**: `src/components/communications/`

- **CampaignEditor** - Email campaign editor
- **CampaignCard** - Campaign card display
- **RecipientSelector** - Recipient filtering UI

---

## Custom Hooks

### useToast

**Purpose**: Show toast notifications.

**File**: `src/hooks/use-toast.ts`

```typescript
import { useToast } from "@/hooks/use-toast";

const { showToast } = useToast();
showToast("Message", "success");
```

---

### useDebounce

**Purpose**: Debounce rapidly changing values (e.g., search input).

**File**: `src/hooks/use-debounce.ts`

```typescript
import { useDebounce } from "@/hooks/use-debounce";

const [searchQuery, setSearchQuery] = useState("");
const debouncedSearch = useDebounce(searchQuery, 300); // 300ms delay

const { data } = api.search.useQuery({ query: debouncedSearch });
```

**Implementation**:

```typescript
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

---

## Component Patterns

### 1. **Composition Over Props**

```tsx
// ✅ GOOD: Composable API
<Card>
  <CardHeader>
    <h2>Title</h2>
  </CardHeader>
  <CardBody>
    Content
  </CardBody>
</Card>

// ❌ BAD: Too many props
<Card title="Title" body="Content" showHeader showFooter />
```

---

### 2. **Named Exports**

```tsx
// ✅ GOOD: Named exports
export function EventCard() {}
export function EventForm() {}

// ❌ BAD: Default exports
export default EventCard;
```

---

### 3. **TypeScript Interfaces**

```tsx
// ✅ GOOD: Explicit prop types
interface EventCardProps {
  event: Event;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function EventCard({ event, onEdit, onDelete }: EventCardProps) {}
```

---

### 4. **Client vs Server Components**

```tsx
// Server Component (default)
// src/app/events/[slug]/page.tsx
import { api } from "@/trpc/server";

export default async function EventPage({ params }: { params: { slug: string } }) {
  const event = await api.event.getBySlug({ slug: params.slug });
  return <EventDetails event={event} />;
}

// Client Component (interactive)
// src/components/events/event-form.tsx
"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

export function EventForm() {
  const [name, setName] = useState("");
  const createEvent = api.event.create.useMutation();
  // ...
}
```

---

### 5. **Error Boundaries**

```tsx
// Wrap components that may throw errors
import { ErrorBoundary } from "@/components/error-boundary";

<ErrorBoundary fallback={<ErrorPage />}>
  <EventList />
</ErrorBoundary>
```

---

## Accessibility

### ARIA Labels

```tsx
// Icon buttons need labels
<button aria-label="Close">
  <HiX className="h-5 w-5" />
</button>

// Screen reader only text
<span className="sr-only">Close</span>
```

---

### Keyboard Navigation

```tsx
// Make interactive elements keyboard accessible
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      handleClick();
    }
  }}
  onClick={handleClick}
>
  Clickable
</div>
```

---

### Focus Management

```tsx
// Focus first input on mount
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  inputRef.current?.focus();
}, []);

<TextInput ref={inputRef} />
```

---

## Testing

### Component Testing (Future)

```typescript
import { render, screen } from "@testing-library/react";
import { EventCard } from "@/components/events/event-card";

describe("EventCard", () => {
  it("renders event name", () => {
    render(<EventCard event={mockEvent} />);
    expect(screen.getByText("Tech Conference")).toBeInTheDocument();
  });

  it("shows edit button for owner", () => {
    render(<EventCard event={mockEvent} isOwner />);
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
  });
});
```

---

## Best Practices

### 1. **Keep Components Small**

Aim for < 200 lines per component. Split into smaller components if larger.

---

### 2. **Use Descriptive Names**

```tsx
// ✅ GOOD
<RegistrationForm />
<AttendeeTable />

// ❌ BAD
<Form />
<Table />
```

---

### 3. **Colocate Styles**

Use Tailwind classes in JSX instead of separate CSS files.

---

### 4. **Document Complex Components**

Add JSDoc comments for complex components:

```tsx
/**
 * ScheduleTimeline Component
 * 
 * Displays schedule entries in a visual timeline with tracks.
 * Supports filtering by date and track, and detecting time overlaps.
 * 
 * @param eventId - Event ID to fetch schedule for
 * @param selectedDate - Date to display (YYYY-MM-DD format)
 */
export function ScheduleTimeline({ eventId, selectedDate }: ScheduleTimelineProps) {
  // ...
}
```

---

### 5. **Export Barrel Files**

Group related exports:

```typescript
// src/components/ui/index.ts
export * from "./form-field";
export * from "./empty-state";
export * from "./skeletons";
export * from "./toast-provider";
```

---

## Related Documentation

- **[UI System](./ui-system.md)** - Design system overview
- **[Forms](./forms.md)** - Form patterns
- **[Tables](./tables.md)** - Table patterns
- **[Module Docs](../modules/)** - Feature-specific components
- **[React Docs](https://react.dev)** - Official React documentation
- **[Flowbite React](https://flowbite-react.com)** - Component library

---

## Resources

- **React Patterns**: https://reactpatterns.com
- **Component-Driven Development**: https://www.componentdriven.org
- **Storybook** (for component docs): https://storybook.js.org
- **React Testing Library**: https://testing-library.com/react
