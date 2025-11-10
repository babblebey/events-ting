# Tickets Backend Documentation

## Router Location

**File**: `src/server/api/routers/ticket.ts`

Handles ticket type management and availability queries.

## Procedures

### `ticket.create`

**Type**: Mutation  
**Auth**: Protected (requires event ownership)  
**Purpose**: Create a new ticket type for an event

**Input Schema**:
```typescript
{
  eventId: string;          // CUID
  name: string;            // 3-100 characters
  description: string;     // Max 2000 characters
  price: number;           // Must be 0 (MVP restriction)
  currency: string;        // 3-letter code, default: "USD"
  quantity: number;        // Positive integer
  saleStart?: Date;        // Optional start date
  saleEnd?: Date;          // Optional end date
}
```

**Business Logic**:
- Verifies user is event organizer
- Enforces MVP restriction: `price` must be `0`
- Validates sale period: `saleStart` < `saleEnd`
- Creates ticket type record

**Authorization**: Must own the event

**Example Usage**:
```typescript
const ticket = await api.ticket.create.mutate({
  eventId: "clx123abc...",
  name: "General Admission",
  description: "Standard entry ticket",
  price: 0,
  quantity: 100,
  saleStart: new Date("2025-01-01"),
  saleEnd: new Date("2025-06-01"),
});
```

**Error Responses**:
- `NOT_FOUND`: Event doesn't exist
- `FORBIDDEN`: User is not event organizer
- `BAD_REQUEST`: Price is not 0, or sale dates invalid

---

### `ticket.list`

**Type**: Query  
**Auth**: Public  
**Purpose**: List ticket types for an event

**Input Schema**:
```typescript
{
  eventId: string;
  includeUnavailable?: boolean; // Default: false
}
```

**Output**:
```typescript
{
  items: Array<{
    id: string;
    name: string;
    description: string;
    price: Decimal;
    currency: string;
    quantity: number;
    soldCount: number;
    available: number;          // quantity - soldCount
    isAvailable: boolean;       // Considers sale period + quantity
    saleStart: Date | null;
    saleEnd: Date | null;
  }>;
}
```

**Business Logic**:
- Calculates `soldCount` from registrations
- Determines `isAvailable` based on:
  - Sale period (current date within window)
  - Quantity (available > 0)
- By default, filters out unavailable tickets (for public registration pages)
- Organizers can set `includeUnavailable: true` to see all tickets

**Example Usage**:
```typescript
// Public registration page (only available tickets)
const { data } = api.ticket.list.useQuery({
  eventId: eventId,
});

// Organizer view (all tickets)
const { data } = api.ticket.list.useQuery({
  eventId: eventId,
  includeUnavailable: true,
});
```

---

### `ticket.getById`

**Type**: Query  
**Auth**: Protected (requires event ownership)  
**Purpose**: Get detailed ticket statistics

**Input Schema**:
```typescript
{
  id: string; // Ticket type ID
}
```

**Output**: Extended ticket details plus:
```typescript
{
  // ... all ticket fields
  stats: {
    sold: number;
    available: number;
    revenue: number;                    // price * soldCount
    registrationsByDay: Array<{
      date: string;                     // ISO date
      count: number;
    }>;
  };
}
```

**Business Logic**:
- Returns last 30 days of registration data grouped by day
- Calculates revenue (0 for MVP free tickets)
- Only accessible to event organizer

**Authorization**: Must be event organizer

---

### `ticket.update`

**Type**: Mutation  
**Auth**: Protected (requires event ownership)  
**Purpose**: Update ticket type details

**Input Schema**:
```typescript
{
  id: string;
  name?: string;
  description?: string;
  price?: number;
  quantity?: number;
  saleStart?: Date;
  saleEnd?: Date;
}
```

**Business Rules**:
1. Cannot decrease `quantity` below `soldCount`
2. Cannot change `price` after tickets are sold
3. Must be event organizer
4. Sale dates must be logical (`saleStart` < `saleEnd`)

**Example Usage**:
```typescript
// Extend sale period
await api.ticket.update.mutate({
  id: ticketId,
  saleEnd: new Date("2025-07-01"),
});

// Increase quantity
await api.ticket.update.mutate({
  id: ticketId,
  quantity: 200, // Can increase if current is 100
});
```

**Error Responses**:
- `BAD_REQUEST`: Quantity below sold count, or price changed after sales
- `FORBIDDEN`: User is not organizer

---

### `ticket.delete`

**Type**: Mutation  
**Auth**: Protected (requires event ownership)  
**Purpose**: Delete ticket type

**Input Schema**:
```typescript
{
  id: string;
}
```

**Business Logic**:
- Cannot delete if any registrations exist
- Suggest ending sale period instead

**Authorization**: Must be event organizer

**Example Usage**:
```typescript
await api.ticket.delete.mutate({ id: ticketId });
```

**Error Responses**:
- `CONFLICT`: Ticket has registrations (cannot delete)
- `FORBIDDEN`: User is not organizer

**Alternative**: Instead of deleting, set `saleEnd` to past date to hide from public.

---

### `ticket.getStats`

**Type**: Query  
**Auth**: Public  
**Purpose**: Get real-time availability for a ticket type

**Input Schema**:
```typescript
{
  id: string;
}
```

**Output**:
```typescript
{
  sold: number;
  available: number;
  isAvailable: boolean;
}
```

**Use Case**: Display "X tickets remaining" on registration page

**Example Usage**:
```typescript
const { data: stats } = api.ticket.getStats.useQuery(
  { id: ticketId },
  { refetchInterval: 10000 } // Refresh every 10 seconds
);

// Display: {stats.available} tickets remaining
```

---

## Validation

Schemas from `src/lib/validators.ts`:
- `createTicketTypeSchema`
- `updateTicketTypeSchema`

### MVP Price Validation
```typescript
if (input.price !== 0) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Only free tickets are supported in MVP. Price must be 0.",
  });
}
```

---

## Concurrency Handling

### Race Condition Prevention

When creating registrations, the system uses database-level locking:

```typescript
// SELECT FOR UPDATE prevents overselling
const ticketTypeRows = await tx.$queryRaw`
  SELECT 
    tt.id, tt.quantity,
    COUNT(r.id)::bigint as "soldCount"
  FROM "TicketType" tt
  LEFT JOIN "Registration" r ON r."ticketTypeId" = tt.id
  WHERE tt.id = ${ticketTypeId}
  GROUP BY tt.id
  FOR UPDATE OF tt
`;
```

This ensures atomicity when multiple users register simultaneously.

---

## Error Handling

Common error patterns:

### Quantity Validation
```typescript
if (data.quantity !== undefined && data.quantity < soldCount) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: `Cannot decrease quantity below sold count (${soldCount})`,
  });
}
```

### Price Change After Sales
```typescript
if (data.price !== undefined && soldCount > 0 && data.price !== ticketType.price.toNumber()) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Cannot change price after tickets have been sold",
  });
}
```

### Sale Period Validation
```typescript
if (data.saleStart && data.saleEnd && data.saleStart >= data.saleEnd) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Sale start must be before sale end",
  });
}
```

---

## Related Files

- **Router**: `src/server/api/routers/ticket.ts`
- **Validators**: `src/lib/validators.ts`
- **Database**: `prisma/schema.prisma` (TicketType model)
