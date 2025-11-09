# Tickets Workflows

## Workflow 1: Create Ticket Types

**Actors**: Event Organizer  
**Trigger**: Need to define ticket options for an event

### Steps

**1. Navigate to Tickets Tab**
- **Route**: `/dashboard/{eventId}/tickets`
- **API**: `ticket.list` query (returns empty array initially)

**2. Click "Add Ticket Type"**
- **UI**: TicketTypeForm modal opens
- **Mode**: Create new

**3. Fill Out Ticket Details**
- **Name**: e.g., "General Admission", "VIP Pass", "Early Bird"
- **Description**: What's included
- **Price**: 0 (MVP restriction, field disabled)
- **Quantity**: Total available tickets
- **Sale Start**: Optional start date
- **Sale End**: Optional end date

**4. Submit Form**
- **API**: `ticket.create` mutation
- **Validation**:
  - Verify event ownership
  - Enforce price = 0
  - Validate sale period
- **Database**: Create TicketType record

**5. Success**
- **Toast**: "Ticket type created successfully"
- **UI**: New ticket appears in list
- **Query**: Invalidate and refetch ticket list

### Success Criteria
- ✅ Ticket type created
- ✅ Visible in organizer's ticket list
- ✅ Will appear on public registration page (if currently on sale)

### Example Ticket Types
```typescript
// Early Bird (limited time)
{
  name: "Early Bird Special",
  description: "Limited time discount",
  price: 0,
  quantity: 50,
  saleStart: new Date("2025-01-01"),
  saleEnd: new Date("2025-01-31"),
}

// General Admission (always available)
{
  name: "General Admission",
  description: "Standard entry",
  price: 0,
  quantity: 200,
  saleStart: null,
  saleEnd: null, // No restrictions
}

// VIP (starts later)
{
  name: "VIP Pass",
  description: "Premium experience",
  price: 0,
  quantity: 25,
  saleStart: new Date("2025-02-01"),
  saleEnd: null,
}
```

---

## Workflow 2: Update Ticket Type

**Actors**: Event Organizer  
**Trigger**: Need to modify ticket details

### Steps

**1. View Existing Tickets**
- **Route**: `/dashboard/{eventId}/tickets`
- **API**: `ticket.list` with `includeUnavailable: true`

**2. Click Edit on Ticket Card**
- **UI**: TicketTypeForm modal with `initialData`
- **Pre-filled**: All current values

**3. Modify Allowed Fields**
- **Can always change**:
  - Name
  - Description
  - Sale start/end dates
  - Quantity (increase only if tickets sold)
- **Cannot change**:
  - Price (if any tickets sold)
  - Quantity (cannot decrease below sold count)

**4. Submit Update**
- **API**: `ticket.update` mutation
- **Validation**:
  - Enforce business rules
  - Check sold count constraints
- **Database**: Update TicketType record

**5. Reflect Changes**
- **Toast**: "Ticket updated"
- **UI**: Updated values shown immediately

### Success Criteria
- ✅ Ticket updated with new values
- ✅ Business rules enforced
- ✅ Active registrations not affected

### Common Updates

**Extend Sale Period**:
```typescript
await api.ticket.update.mutate({
  id: ticketId,
  saleEnd: new Date("2025-07-01"), // Extended deadline
});
```

**Increase Quantity**:
```typescript
await api.ticket.update.mutate({
  id: ticketId,
  quantity: 300, // Increased from 200
});
```

### Error Cases

**Cannot decrease quantity**:
```
Error: Cannot decrease quantity below sold count (150)
Current quantity: 200
Sold: 150
Attempted new quantity: 100 ❌
```

**Cannot change price after sales**:
```
Error: Cannot change price after tickets have been sold
Sold: 50 tickets
Attempted price change: 0 → 10 ❌
```

---

## Workflow 3: Monitor Ticket Sales

**Actors**: Event Organizer  
**Trigger**: Want to track ticket sales progress

### Steps

**1. View Ticket Statistics**
- **Route**: `/dashboard/{eventId}/tickets`
- **API**: `ticket.list` for overview
- **API**: `ticket.getById` for detailed stats

**2. View Metrics**
- **Display**:
  - Total tickets: 200
  - Sold: 150
  - Available: 50
  - Percentage sold: 75%
  - Revenue: $0 (free tickets)
  - Sales by day (last 30 days)

**3. View Sales Chart**
- **UI**: Line chart showing registrations over time
- **Data**: `registrationsByDay` from `ticket.getById`

**4. Respond to Sales Trends**
- **Low sales**: Consider extending sale period
- **High demand**: Consider increasing quantity
- **Sold out**: Create new ticket type if needed

### Success Criteria
- ✅ Real-time visibility into sales
- ✅ Historical trend data
- ✅ Actionable insights

---

## Workflow 4: Handle Sold Out Tickets

**Actors**: Event Organizer  
**Trigger**: Ticket type reaches maximum quantity

### Steps

**1. Ticket Sells Out**
- **Automatic**: When `soldCount === quantity`
- **Status**: `isAvailable` becomes `false`
- **UI**: Badge changes to "Sold Out"

**2. Public View**
- **Effect**: Ticket no longer shown on registration page
- **Message**: "This ticket type is sold out"

**3. Organizer Options**

**Option A: Increase Quantity**
```typescript
await api.ticket.update.mutate({
  id: ticketId,
  quantity: ticket.quantity + 50, // Add more tickets
});
```

**Option B: Create New Ticket Type**
```typescript
await api.ticket.create.mutate({
  eventId: eventId,
  name: "General Admission - Round 2",
  quantity: 100,
  // ... other fields
});
```

**Option C: Do Nothing**
- Ticket remains sold out
- Consider waitlist (future feature)

### Success Criteria
- ✅ No overselling (quantity enforced)
- ✅ Clear communication to attendees
- ✅ Flexible response options for organizers

---

## Workflow 5: Delete Ticket Type

**Actors**: Event Organizer  
**Trigger**: Want to remove a ticket type

### Steps

**1. Attempt Deletion**
- **Action**: Click "Delete" on ticket card
- **UI**: Confirmation modal appears

**2. Check for Registrations**
- **Query**: Check if `_count.registrations > 0`

**3A. No Registrations - Allow Delete**
- **API**: `ticket.delete` mutation
- **Database**: Remove TicketType record
- **Success**: "Ticket deleted"

**3B. Has Registrations - Block Delete**
- **Error**: `CONFLICT` error
- **Message**: "Cannot delete ticket type with 15 registrations"
- **Alternative**: "Consider ending the sale period instead"

**4. Alternative: End Sale**
```typescript
await api.ticket.update.mutate({
  id: ticketId,
  saleEnd: new Date(), // End sale immediately
});
```

### Success Criteria
- ✅ Can delete unused ticket types
- ✅ Cannot delete tickets with registrations
- ✅ Alternative solution provided

---

## Workflow 6: Public Ticket Selection

**Actors**: Public User (Attendee)  
**Trigger**: Registering for an event

### Steps

**1. View Event Page**
- **Route**: `/events/{slug}`
- **API**: `event.getBySlug` (includes available tickets)

**2. See Available Tickets**
- **API**: `ticket.list` with `includeUnavailable: false`
- **Display**: Only tickets currently on sale

**3. View Ticket Details**
- **Show for each ticket**:
  - Name and description
  - Price (free in MVP)
  - Availability: "X tickets remaining"
  - Sale period (if limited)

**4. Select Ticket**
- **Action**: Click "Register" button
- **Navigate**: To registration form
- **Pre-select**: Chosen ticket type

**5. Complete Registration**
- **Module**: Registration Module
- **See**: [Registration Workflows](../registration/workflows.md)

### Success Criteria
- ✅ Only available tickets shown
- ✅ Real-time availability displayed
- ✅ Smooth flow to registration

---

## Integration Points

**This workflow integrates with:**
- **Events Module**: Tickets belong to events
- **Registration Module**: Ticket selection during registration
- **Communications Module**: Notify about ticket availability

---

## Common Pitfalls

### Overselling Prevention
**Problem**: Multiple users registering simultaneously  
**Solution**: Database-level locking in registration transaction

### Sale Period Confusion
**Problem**: Timezone handling for sale dates  
**Solution**: Store in UTC, display in event timezone

### Quantity Management
**Problem**: Trying to decrease quantity below sold count  
**Solution**: Frontend validation + backend enforcement

### Price Changes
**Problem**: Changing price after tickets sold  
**Solution**: Block price changes if `soldCount > 0`
