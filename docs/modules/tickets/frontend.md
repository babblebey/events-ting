# Tickets Frontend Documentation

## Pages

### Dashboard Pages

#### `/(dashboard)/[id]/tickets/page.tsx`
**Purpose**: Manage ticket types for an event  
**Route**: `/dashboard/{eventId}/tickets`

**Features**:
- List all ticket types for the event
- Show availability status for each ticket
- Create new ticket type button
- Edit/Delete actions for each ticket
- Real-time sold count

**Data Fetching**:
```typescript
const { data } = api.ticket.list.useQuery({
  eventId: eventId,
  includeUnavailable: true, // Show all tickets
});
```

---

## Components

### TicketTypeCard

**Location**: `src/components/tickets/ticket-type-card.tsx`

**Purpose**: Display ticket type information

**Props**:
```typescript
interface TicketTypeCardProps {
  ticket: {
    id: string;
    name: string;
    description: string;
    price: Decimal;
    currency: string;
    quantity: number;
    soldCount: number;
    available: number;
    isAvailable: boolean;
    saleStart: Date | null;
    saleEnd: Date | null;
  };
  showActions?: boolean; // Show edit/delete buttons
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}
```

**Features**:
- Ticket name and description
- Price display (with currency)
- Availability indicator:
  - Progress bar showing sold/available
  - "X of Y tickets sold"
- Sale period badges:
  - "On Sale" (green)
  - "Sale Not Started" (yellow)
  - "Sale Ended" (red)
  - "Sold Out" (gray)
- Optional edit/delete actions

**Usage**:
```tsx
<TicketTypeCard
  ticket={ticketType}
  showActions={isOrganizer}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

**Visual Elements**:
```tsx
// Availability progress bar
<div className="w-full bg-gray-200 rounded-full h-2">
  <div
    className="bg-blue-600 h-2 rounded-full"
    style={{ width: `${(ticket.soldCount / ticket.quantity) * 100}%` }}
  />
</div>

// Status badge
{ticket.isAvailable ? (
  <Badge color="success">On Sale</Badge>
) : ticket.soldCount >= ticket.quantity ? (
  <Badge color="failure">Sold Out</Badge>
) : (
  <Badge color="warning">Not Available</Badge>
)}
```

---

### TicketTypeForm

**Location**: `src/components/tickets/ticket-type-form.tsx`

**Purpose**: Create or edit ticket types

**Props**:
```typescript
interface TicketTypeFormProps {
  eventId: string;
  initialData?: TicketType; // If editing
  onSuccess?: (ticket: TicketType) => void;
  onCancel?: () => void;
}
```

**Form Fields**:
```tsx
<form onSubmit={handleSubmit}>
  {/* Basic Info */}
  <TextInput
    label="Ticket Name"
    name="name"
    placeholder="e.g., General Admission, VIP, Early Bird"
    required
  />
  
  <Textarea
    label="Description"
    name="description"
    rows={3}
    placeholder="What's included with this ticket..."
  />
  
  {/* Pricing (MVP: Disabled, always 0) */}
  <TextInput
    label="Price"
    type="number"
    value={0}
    disabled
    helperText="Payment processing coming soon. Tickets are free for now."
  />
  
  {/* Quantity */}
  <TextInput
    label="Total Available"
    name="quantity"
    type="number"
    min={initialData?.soldCount ?? 1}
    required
  />
  
  {/* Sale Period */}
  <Datepicker
    label="Sale Start (Optional)"
    name="saleStart"
    helperText="Leave empty to start immediately"
  />
  
  <Datepicker
    label="Sale End (Optional)"
    name="saleEnd"
    helperText="Leave empty for no end date"
  />
  
  {/* Actions */}
  <div className="flex gap-2">
    <Button type="submit" disabled={isSubmitting}>
      {initialData ? 'Update Ticket' : 'Create Ticket'}
    </Button>
    <Button color="light" onClick={onCancel}>
      Cancel
    </Button>
  </div>
</form>
```

**Validation**:
- Uses `createTicketTypeSchema` or `updateTicketTypeSchema`
- Enforces price = 0 (MVP)
- Prevents quantity below sold count when editing
- Validates sale date logic

**Example Usage**:
```tsx
// Create mode
<TicketTypeForm
  eventId={eventId}
  onSuccess={(ticket) => {
    toast.success("Ticket created!");
    router.refresh();
  }}
/>

// Edit mode
<TicketTypeForm
  eventId={eventId}
  initialData={existingTicket}
  onSuccess={() => toast.success("Ticket updated!")}
/>
```

**Business Rule Enforcement**:
```tsx
// Disable quantity decrease if tickets sold
<TextInput
  label="Quantity"
  type="number"
  min={ticket.soldCount} // Cannot go below sold count
  value={quantity}
  helperText={
    ticket.soldCount > 0
      ? `Cannot decrease below ${ticket.soldCount} (already sold)`
      : undefined
  }
/>

// Disable price change if tickets sold
{ticket.soldCount > 0 && (
  <Alert color="warning">
    Cannot change price after tickets have been sold
  </Alert>
)}
```

---

## Form Patterns

### Create Ticket Flow

1. Organizer clicks "Add Ticket Type"
2. TicketTypeForm modal opens
3. Fill out form fields
4. Submit creates ticket:
   ```typescript
   const createTicket = api.ticket.create.useMutation({
     onSuccess: () => {
       toast.success("Ticket type created!");
       queryClient.invalidateQueries(['ticket', 'list']);
     },
     onError: (error) => {
       toast.error(error.message);
     },
   });
   ```

### Edit Ticket Flow

1. Click "Edit" on ticket card
2. TicketTypeForm opens with `initialData`
3. Modify allowed fields
4. Submit updates ticket:
   ```typescript
   const updateTicket = api.ticket.update.useMutation({
     onSuccess: () => {
       toast.success("Ticket updated!");
       queryClient.invalidateQueries(['ticket', 'list']);
     },
   });
   ```

### Delete Ticket Flow

1. Click "Delete" on ticket card
2. Confirmation modal appears
3. If no registrations exist, allow deletion:
   ```typescript
   const deleteTicket = api.ticket.delete.useMutation({
     onSuccess: () => {
       toast.success("Ticket deleted");
     },
     onError: (error) => {
       if (error.data?.code === 'CONFLICT') {
         toast.error("Cannot delete ticket with registrations");
       }
     },
   });
   ```

---

## Real-Time Availability

### Public Registration Page

Display live ticket availability:

```tsx
const { data: tickets } = api.ticket.list.useQuery(
  { eventId },
  { refetchInterval: 10000 } // Refresh every 10 seconds
);

return (
  <div>
    {tickets?.items.map((ticket) => (
      <div key={ticket.id}>
        <h3>{ticket.name}</h3>
        <p>{ticket.description}</p>
        
        {ticket.isAvailable ? (
          <>
            <p className="text-green-600">
              {ticket.available} tickets remaining
            </p>
            <Button onClick={() => selectTicket(ticket.id)}>
              Register
            </Button>
          </>
        ) : (
          <Badge color="failure">Not Available</Badge>
        )}
      </div>
    ))}
  </div>
);
```

---

## Styling

**UI Library**: Flowbite React + Tailwind CSS

**Components Used**:
- `Card` - Ticket type cards
- `Button` - Actions
- `TextInput` - Form inputs
- `Textarea` - Description field
- `Badge` - Status indicators
- `Progress` - Sold/available visualization
- `Alert` - Warnings (e.g., cannot change price)

**Color Coding**:
- Green: On sale, available
- Red: Sold out, sale ended
- Yellow: Sale not started
- Gray: Unavailable

---

## Error Handling

### Form Validation Errors
```tsx
{errors.quantity && (
  <p className="text-sm text-red-600">
    {errors.quantity.message}
  </p>
)}
```

### API Errors
```tsx
const createTicket = api.ticket.create.useMutation({
  onError: (error) => {
    if (error.message.includes("Only free tickets")) {
      toast.error("MVP supports free tickets only");
    } else {
      toast.error("Failed to create ticket");
    }
  },
});
```

---

## Related Files

- **Components**: `src/components/tickets/*.tsx`
- **Pages**: `src/app/(dashboard)/[id]/tickets/page.tsx`
- **Hooks**: `src/hooks/use-toast.ts`
