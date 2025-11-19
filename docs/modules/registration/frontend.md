# Registration Frontend Documentation

## Overview

The Registration module has two distinct frontend experiences:

1. **Public Registration** - Self-service registration form for attendees
2. **Organizer Management** - Dashboard for managing registrations, exports, and email operations

---

## Page Structure

### Public Registration Page

**File**: `src/app/events/[slug]/page.tsx` (embedded in event page)  
**Route**: `/events/[slug]`  
**Type**: Server Component  
**Authentication**: Not required (public)

**Layout**:
```tsx
<div>
  {/* Event Details Section */}
  <EventHeader />
  
  {/* Registration CTA */}
  {isUpcoming && ticketsAvailable && (
    <Card>
      <h3>Ready to attend?</h3>
      <Link href={`/events/${slug}/register`}>
        <Button>Register Now</Button>
      </Link>
    </Card>
  )}
</div>
```

**Navigation to Registration**:
- Button links to `/events/[slug]/register` (future dedicated page)
- Currently opens modal or inline form (implementation varies)

---

### Attendees Management Page

**File**: `src/app/(dashboard)/[id]/attendees/page.tsx`  
**Route**: `/(dashboard)/[id]/attendees`  
**Type**: Server Component  
**Authentication**: Required (event organizer)

**Data Fetching**:
```typescript
const event = await api.event.getById({ id: eventId });
```

**Authorization**:
- Handled by tRPC procedure (`registration.list`)
- Page renders for authenticated users
- API returns `FORBIDDEN` if not organizer

**Layout**:
```tsx
<div className="space-y-6">
  {/* Header */}
  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-2xl font-bold">Attendees</h1>
      <p className="text-gray-600">
        Manage registrations and export attendee data for {event.name}
      </p>
    </div>
    
    {/* Future: Import Button */}
    <Link href={`/dashboard/${eventId}/attendees/import`}>
      <Button>
        <HiUpload className="mr-2" />
        Import Attendees
      </Button>
    </Link>
  </div>
  
  {/* Main Component */}
  <AttendeeTable eventId={eventId} />
</div>
```

**Breadcrumbs**:
```tsx
<Breadcrumbs
  items={[
    { label: "Dashboard", href: "/dashboard" },
    { label: event.name, href: `/dashboard/${eventId}` },
    { label: "Attendees" },
  ]}
/>
```

---

## Components

### `RegistrationForm`

**File**: `src/components/registration/registration-form.tsx`  
**Type**: Client Component (`"use client"`)  
**Purpose**: Public-facing registration form

**Props**:
```typescript
interface RegistrationFormProps {
  ticketTypeId: string;
  ticketTypeName: string;
  eventName: string;
  onSuccess?: (registrationId: string) => void;
}
```

**Features**:

#### 1. Form State Management
```typescript
const [formData, setFormData] = useState({
  ticketTypeId,
  email: "",
  name: "",
});

const [errors, setErrors] = useState<Record<string, string>>({});
const [success, setSuccess] = useState(false);
const [registrationCode, setRegistrationCode] = useState("");
```

#### 2. Client-Side Validation
```typescript
// Validate before submission
if (!formData.name) {
  setErrors({ name: "Name is required" });
  return;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(formData.email)) {
  setErrors({ email: "Please enter a valid email address" });
  return;
}
```

#### 3. tRPC Mutation
```typescript
const createMutation = api.registration.create.useMutation({
  onSuccess: (data) => {
    setSuccess(true);
    setRegistrationCode(data.registrationCode);
    if (onSuccess) {
      onSuccess(data.id);
    }
  },
  onError: (error) => {
    setErrors({ general: error.message });
  },
});
```

#### 4. Success State
After successful registration, shows:
```tsx
<div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
  <HiCheckCircle className="h-10 w-10 text-green-600" />
  
  <h2>Registration Confirmed! 🎉</h2>
  
  <p>You're all set for <strong>{eventName}</strong></p>
  
  <div className="registration-code">
    Your Registration Code:
    <p className="font-mono text-2xl">{registrationCode}</p>
  </div>
  
  <p className="text-sm text-gray-600">
    A confirmation email has been sent to <strong>{formData.email}</strong>
  </p>
</div>
```

#### 5. Form Fields
```tsx
<FormSection title="Your Information">
  <FormField
    label="Full Name"
    name="name"
    required
    value={formData.name}
    onChange={(e) => handleChange("name", e.target.value)}
    error={errors.name}
    placeholder="John Doe"
    autoComplete="name"
  />
  
  <FormField
    label="Email Address"
    name="email"
    type="email"
    required
    value={formData.email}
    onChange={(e) => handleChange("email", e.target.value)}
    error={errors.email}
    placeholder="john@example.com"
    helpText="You'll receive confirmation at this email"
    autoComplete="email"
  />
</FormSection>
```

#### 6. Consent Notice
```tsx
<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
  <p className="text-sm text-blue-800">
    ℹ️ By registering, you agree to receive event-related communications.
  </p>
</div>
```

**Usage Example**:
```tsx
<RegistrationForm
  ticketTypeId={ticket.id}
  ticketTypeName={ticket.name}
  eventName={event.name}
  onSuccess={(id) => {
    console.log("Registration successful:", id);
    router.push(`/events/${event.slug}`);
  }}
/>
```

**Error Handling**:
- Field-level validation errors
- API error messages displayed at top
- Disabled submit button during mutation

---

### `AttendeeTable`

**File**: `src/components/registration/attendee-table.tsx`  
**Type**: Client Component (`"use client"`)  
**Purpose**: Organizer dashboard for managing attendees

**Props**:
```typescript
interface AttendeeTableProps {
  eventId: string;
  onResendConfirmation?: (registrationId: string) => void;
  onCancelRegistration?: (registrationId: string) => void;
}
```

**Features**:

#### 1. Search & Filter
```typescript
const [search, setSearch] = useState("");
const [selectedTicketType, setSelectedTicketType] = useState<string>();

// Debounce search to reduce API calls
const debouncedSearch = useDebounce(search, 500);
```

**Search UI**:
```tsx
<TextInput
  icon={HiSearch}
  placeholder="Search by name or email..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="flex-1"
/>
```

**Filter UI**:
```tsx
<select
  value={selectedTicketType ?? ""}
  onChange={(e) => setSelectedTicketType(e.target.value || undefined)}
>
  <option value="">All Ticket Types</option>
  {ticketTypes.items.map((ticket) => (
    <option key={ticket.id} value={ticket.id}>
      {ticket.name}
    </option>
  ))}
</select>
```

#### 2. Infinite Scroll Pagination
```typescript
const { data, isLoading, fetchNextPage, hasNextPage } =
  api.registration.list.useInfiniteQuery(
    {
      eventId,
      limit: 50,
      search: debouncedSearch || undefined,
      ticketTypeId: selectedTicketType,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

// Flatten paginated results
const allRegistrations = data?.pages.flatMap((page) => page.items) ?? [];
const totalCount = data?.pages[0]?.total ?? 0;
```

**Load More Button**:
```tsx
{hasNextPage && (
  <Button
    color="gray"
    onClick={() => fetchNextPage()}
    disabled={isLoading}
  >
    Load More
  </Button>
)}
```

#### 3. CSV Export
```typescript
const exportMutation = api.registration.export.useMutation({
  onSuccess: (data) => {
    // Trigger browser download
    const link = document.createElement("a");
    link.href = data.url;
    link.download = data.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
});

const handleExport = () => {
  exportMutation.mutate({ eventId });
};
```

**Export Button**:
```tsx
<Button color="gray" onClick={handleExport} disabled={exportMutation.isPending}>
  <HiDownload className="mr-2 h-5 w-5" />
  {exportMutation.isPending ? "Exporting..." : "Export CSV"}
</Button>
```

#### 4. Status Badges

**Payment Status**:
```typescript
const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case "free":
      return <Badge color="info">Free</Badge>;
    case "paid":
      return <Badge color="success">Paid</Badge>;
    case "pending":
      return <Badge color="warning">Pending</Badge>;
    case "failed":
      return <Badge color="failure">Failed</Badge>;
    case "refunded":
      return <Badge color="gray">Refunded</Badge>;
    default:
      return <Badge color="gray">{status}</Badge>;
  }
};
```

**Email Status**:
```typescript
const getEmailStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return <Badge color="success">Active</Badge>;
    case "bounced":
      return <Badge color="failure">Bounced</Badge>;
    case "unsubscribed":
      return <Badge color="gray">Unsubscribed</Badge>;
    default:
      return <Badge color="gray">{status}</Badge>;
  }
};
```

#### 5. Action Buttons

**Row Actions**:
```tsx
<TableCell>
  <div className="flex gap-2">
    {/* Resend Confirmation */}
    {onResendConfirmation && (
      <Button
        size="xs"
        color="gray"
        onClick={() => onResendConfirmation(registration.id)}
        title="Resend confirmation email"
      >
        <HiMail className="h-4 w-4" />
      </Button>
    )}
    
    {/* Cancel Registration */}
    {onCancelRegistration && (
      <Button
        size="xs"
        color="failure"
        onClick={() => onCancelRegistration(registration.id)}
        title="Cancel registration"
      >
        <HiTrash className="h-4 w-4" />
      </Button>
    )}
  </div>
</TableCell>
```

#### 6. Table Structure
```tsx
<Table hoverable>
  <TableHead>
    <TableRow>
      <TableHeadCell>Name</TableHeadCell>
      <TableHeadCell>Email</TableHeadCell>
      <TableHeadCell>Ticket Type</TableHeadCell>
      <TableHeadCell>Payment</TableHeadCell>
      <TableHeadCell>Email Status</TableHeadCell>
      <TableHeadCell>Registered</TableHeadCell>
      <TableHeadCell>Actions</TableHeadCell>
    </TableRow>
  </TableHead>
  
  <TableBody>
    {allRegistrations.map((registration) => (
      <TableRow key={registration.id}>
        <TableCell className="font-medium">{registration.name}</TableCell>
        <TableCell>{registration.email}</TableCell>
        <TableCell>
          <Badge color="purple">{registration.ticketType.name}</Badge>
        </TableCell>
        <TableCell>{getPaymentStatusBadge(registration.paymentStatus)}</TableCell>
        <TableCell>{getEmailStatusBadge(registration.emailStatus)}</TableCell>
        <TableCell>
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(registration.registeredAt))}
        </TableCell>
        <TableCell>{/* Action buttons */}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

#### 7. Results Count
```tsx
<div className="text-sm text-gray-600">
  Showing {allRegistrations.length} of {totalCount} attendees
</div>
```

#### 8. Empty States
```tsx
{allRegistrations.length === 0 && (
  <TableRow>
    <TableCell colSpan={7} className="text-center text-gray-500">
      No attendees found
    </TableCell>
  </TableRow>
)}
```

**Usage Example**:
```tsx
<AttendeeTable
  eventId={eventId}
  onResendConfirmation={(id) => {
    // Handle resend
    resendMutation.mutate({ id });
  }}
  onCancelRegistration={(id) => {
    // Show confirmation dialog
    setSelectedRegistration(id);
    setShowCancelModal(true);
  }}
/>
```

---

## State Management

### Form State (RegistrationForm)
```typescript
// Local state for form
const [formData, setFormData] = useState({
  ticketTypeId,
  email: "",
  name: "",
});

// Validation errors
const [errors, setErrors] = useState<Record<string, string>>({});

// Success state
const [success, setSuccess] = useState(false);
const [registrationCode, setRegistrationCode] = useState("");
```

### Table State (AttendeeTable)
```typescript
// Filters
const [search, setSearch] = useState("");
const [selectedTicketType, setSelectedTicketType] = useState<string>();

// Debounced search
const debouncedSearch = useDebounce(search, 500);

// Pagination state managed by tRPC useInfiniteQuery
```

---

## Data Fetching

### Public Registration (No Auth)
```typescript
// No data fetching needed - ticketTypeId passed as prop
const createMutation = api.registration.create.useMutation({
  onSuccess: (data) => {
    // Handle success
  },
});
```

### Organizer Dashboard (Auth Required)
```typescript
// Infinite query with filters
const { data, fetchNextPage, hasNextPage } =
  api.registration.list.useInfiniteQuery(
    {
      eventId,
      limit: 50,
      search: debouncedSearch || undefined,
      ticketTypeId: selectedTicketType,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

// Ticket types for filter dropdown
const { data: ticketTypes } = api.ticket.list.useQuery({
  eventId,
  includeUnavailable: true,
});
```

---

## User Experience Patterns

### Loading States

**Form Submission**:
```tsx
<Button type="submit" disabled={createMutation.isPending}>
  {createMutation.isPending ? "Registering..." : "Complete Registration"}
</Button>
```

**Table Loading**:
```tsx
{isLoading ? (
  <TableRow>
    <TableCell colSpan={7}>Loading attendees...</TableCell>
  </TableRow>
) : (
  // Render data
)}
```

**Export Loading**:
```tsx
<Button disabled={exportMutation.isPending}>
  {exportMutation.isPending ? "Exporting..." : "Export CSV"}
</Button>
```

### Error Handling

**Field Errors**:
```tsx
<FormField
  error={errors.name}
  // ... other props
/>
```

**General Errors**:
```tsx
{errors.general && <FormError message={errors.general} />}
```

**Toast Notifications**:
```typescript
onError: (error) => {
  toast.error(error.message);
}
```

### Success Feedback

**Registration Success**:
- Shows success screen with registration code
- Hides form
- Displays confirmation message

**Export Success**:
- Automatically triggers download
- No modal/popup needed
- Toast notification (optional)

---

## Responsive Design

### Mobile Considerations

**Table Overflow**:
```tsx
<div className="overflow-x-auto">
  <Table>...</Table>
</div>
```

**Filter Layout**:
```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
  {/* Search */}
  <TextInput className="flex-1" />
  
  {/* Filter */}
  <select className="..." />
</div>
```

**Button Groups**:
```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
  <Button>Import</Button>
  <Button>Export</Button>
</div>
```

---

## Performance Optimizations

### Debounced Search
```typescript
import { useDebounce } from "@/hooks/use-debounce";

const debouncedSearch = useDebounce(search, 500);
```

**Benefits**:
- Reduces API calls during typing
- 500ms delay after user stops typing
- Improves server load

### Infinite Scroll
```typescript
// Only fetch 50 records at a time
limit: 50

// Fetch next page on demand
fetchNextPage()
```

**Benefits**:
- Fast initial load
- Loads more data as needed
- Better than "Load All" button

### Memoization (Future)
```typescript
const filteredRegistrations = useMemo(() => {
  return allRegistrations.filter(/* client-side filter */);
}, [allRegistrations, filters]);
```

---

## Accessibility

### Form Accessibility
```tsx
<label htmlFor="name" className="...">
  Full Name
</label>
<input
  id="name"
  name="name"
  type="text"
  autoComplete="name"
  required
  aria-describedby={errors.name ? "name-error" : undefined}
/>
{errors.name && (
  <p id="name-error" className="text-red-600" role="alert">
    {errors.name}
  </p>
)}
```

### Button Labels
```tsx
<Button title="Resend confirmation email" aria-label="Resend confirmation">
  <HiMail />
</Button>
```

### Table Headers
```tsx
<TableHead>
  <TableRow>
    <TableHeadCell scope="col">Name</TableHeadCell>
    {/* ... */}
  </TableRow>
</TableHead>
```

---

## Integration with Other Modules

### Events Module
```typescript
// Event details passed from parent
<RegistrationForm
  eventName={event.name}
  // ...
/>
```

### Tickets Module
```typescript
// Ticket selection before registration
<TicketSelector
  tickets={event.ticketTypes}
  onSelect={(ticketId) => {
    setSelectedTicket(ticketId);
    setShowRegistrationForm(true);
  }}
/>
```

### Communications Module
```typescript
// Resend confirmation email
api.registration.resendConfirmation.useMutation({
  onSuccess: () => {
    toast.success("Confirmation email resent");
  },
});
```

---

## Related Files

### Components
- `src/components/registration/registration-form.tsx` - Public registration
- `src/components/registration/attendee-table.tsx` - Organizer management
- `src/components/ui/form-field.tsx` - Reusable form fields
- `src/components/ui/empty-state.tsx` - Empty states

### Pages
- `src/app/events/[slug]/page.tsx` - Public event page
- `src/app/(dashboard)/[id]/attendees/page.tsx` - Attendees dashboard

### Hooks
- `src/hooks/use-debounce.ts` - Search debouncing

### Types
- `src/lib/validators.ts` - Validation schemas

---

## Future Enhancements

### RegistrationForm
- [ ] Multi-step form for complex registrations
- [ ] Custom fields from event configuration
- [ ] Payment integration (Stripe)
- [ ] Social login pre-fill
- [ ] CAPTCHA for bot prevention

### AttendeeTable
- [ ] Bulk actions (select multiple, bulk email)
- [ ] Advanced filters (date range, payment status)
- [ ] Column customization (show/hide columns)
- [ ] Inline editing
- [ ] Check-in functionality
- [ ] QR code scanner integration

### General
- [ ] Real-time updates (WebSocket)
- [ ] Offline support (PWA)
- [ ] Print badges
- [ ] Email template preview
