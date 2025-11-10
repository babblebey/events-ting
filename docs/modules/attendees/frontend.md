# Attendees Frontend Documentation

## Overview

The Attendees frontend is built around a single powerful component: `AttendeeTable`. This table provides comprehensive attendee management capabilities with search, filtering, and export functionality.

## Page Structure

### Attendees Page

**File**: `src/app/(dashboard)/[id]/attendees/page.tsx`  
**Route**: `/(dashboard)/[id]/attendees`  
**Type**: Server Component  
**Authentication**: Required

**Data Fetching**:
```typescript
const event = await api.event.getById({ id: eventId });
```

**Authorization**:
- Handled by `AttendeeTable` component via tRPC

**Render**:
```tsx
<div className="space-y-6">
  <div>
    <h1>Attendees</h1>
    <p>Manage registrations and export attendee data for {event.name}</p>
  </div>
  
  <AttendeeTable eventId={eventId} />
</div>
```

---

## Main Component: `AttendeeTable`

**File**: `src/components/registration/attendee-table.tsx`  
**Type**: Client Component (`"use client"`)

**Props**:
```typescript
{
  eventId: string,
  onResendConfirmation?: (registration: Registration) => void,
  onCancelRegistration?: (registration: Registration) => void
}
```

### Features

#### 1. Search Functionality

**Implementation**:
```typescript
const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 500);
```

**UI Component**:
```tsx
<TextInput
  icon={HiSearch}
  placeholder="Search by name or email..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
/>
```

**Debounce Hook**: `useDebounce(value, delay)`
- Delays API calls by 500ms
- Reduces server load
- Improves UX

#### 2. Ticket Type Filter

**UI Component**:
```tsx
<select onChange={(e) => setSelectedTicketType(e.target.value || undefined)}>
  <option value="">All Ticket Types</option>
  {ticketTypes.items.map(ticket => (
    <option key={ticket.id} value={ticket.id}>
      {ticket.name}
    </option>
  ))}
</select>
```

#### 3. CSV Export

**Button**:
```tsx
<Button color="gray" onClick={handleExport} disabled={exportMutation.isPending}>
  <HiDownload className="mr-2" />
  {exportMutation.isPending ? "Exporting..." : "Export CSV"}
</Button>
```

**Mutation**:
```typescript
const exportMutation = api.registration.export.useMutation({
  onSuccess: (data) => {
    // Create download link
    const link = document.createElement("a");
    link.href = data.url;
    link.download = data.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
});
```

#### 4. Attendee Table

**Columns**:
1. Name
2. Email
3. Ticket Type (Badge)
4. Payment Status (Badge)
5. Email Status (Badge)
6. Registered Date
7. Actions (Resend, Cancel)

**Table Structure**:
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
    {attendees.map(attendee => (
      <TableRow key={attendee.id}>
        {/* ... cells ... */}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

#### 5. Status Badges

**Email Status**:
```typescript
const getEmailStatusBadge = (status: string) => {
  switch (status) {
    case "active": return <Badge color="success">Active</Badge>;
    case "bounced": return <Badge color="failure">Bounced</Badge>;
    case "unsubscribed": return <Badge color="gray">Unsubscribed</Badge>;
    default: return <Badge color="gray">{status}</Badge>;
  }
};
```

**Payment Status**:
```typescript
const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case "free": return <Badge color="info">Free</Badge>;
    case "paid": return <Badge color="success">Paid</Badge>;
    case "pending": return <Badge color="warning">Pending</Badge>;
    case "failed": return <Badge color="failure">Failed</Badge>;
    case "refunded": return <Badge color="gray">Refunded</Badge>;
    default: return <Badge color="gray">{status}</Badge>;
  }
};
```

#### 6. Action Buttons

**Resend Confirmation**:
```tsx
<Button size="xs" color="gray" onClick={() => onResendConfirmation?.(registration)}>
  <HiMail />
</Button>
```

**Cancel Registration**:
```tsx
<Button size="xs" color="failure" onClick={() => onCancelRegistration?.(registration)}>
  <HiTrash />
</Button>
```

#### 7. Infinite Scroll

**tRPC Query**:
```typescript
const { data, fetchNextPage, hasNextPage } = api.registration.list.useInfiniteQuery(
  {
    eventId,
    limit: 50,
    search: debouncedSearch || undefined,
    ticketTypeId: selectedTicketType
  },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor
  }
);
```

**Flattened Data**:
```typescript
const allRegistrations = data?.pages.flatMap(page => page.items) ?? [];
const totalCount = data?.pages[0]?.total ?? 0;
```

---

## UI Components Used

### Flowbite React
- `Table`, `TableHead`, `TableHeadCell`, `TableBody`, `TableRow`, `TableCell`
- `Badge` - Status indicators
- `Button` - Actions
- `TextInput` - Search box

### Icons (React Icons)
- `HiSearch` - Search icon
- `HiDownload` - Export icon
- `HiMail` - Resend icon
- `HiTrash` - Cancel icon

---

## Responsive Design

### Mobile (< 768px)
- Horizontal scroll for table
- Stacked action buttons
- Reduced padding

### Tablet/Desktop (> 768px)
- Full table width
- Side-by-side filters
- Inline action buttons

---

## Loading States

1. **Initial Load**: "Loading attendees..."
2. **Empty State**: "No attendees found"
3. **Export**: Button shows "Exporting..." and is disabled
4. **Search**: Debounced, no explicit loading (smooth transition)

---

## Error Handling

- **Export Failure**: Console error logged, user notified via toast (if implemented)
- **Query Error**: Handled by tRPC, shows error message
- **No Results**: "No attendees found" message

---

## Best Practices

### Performance
1. Debounce search input (500ms)
2. Use infinite scroll for large lists
3. Flatten pages for easier rendering
4. Memoize badge functions

### UX
1. Clear placeholder text in search
2. Visual feedback on actions (loading states)
3. Immediate CSV download on export
4. Confirm before canceling registrations (recommended)

---

## Related Documentation

- [Backend Documentation](./backend.md) - Registration router procedures
- [Data Model](./data-model.md) - Registration model
- [Workflows](./workflows.md) - Management workflows
