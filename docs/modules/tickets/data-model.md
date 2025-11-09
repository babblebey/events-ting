# Tickets Data Model

## Primary Model: TicketType

```prisma
model TicketType {
  id          String   @id @default(cuid())
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  name        String
  description String   @db.Text
  
  // Pricing (MVP: must be 0.00 for free tickets)
  price       Decimal  @default(0.00) @db.Decimal(10, 2)
  currency    String   @default("USD")
  
  // Availability
  quantity    Int // Total available
  saleStart   DateTime? // Nullable: no restriction if null
  saleEnd     DateTime? // Nullable: no restriction if null
  
  // Relations
  registrations Registration[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([eventId])
  @@index([eventId, saleStart, saleEnd]) // For filtering active tickets
}
```

---

## Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (CUID) | Primary key |
| `eventId` | String | Foreign key to Event |
| `name` | String | Ticket type name (e.g., "General Admission") |
| `description` | Text | What's included with this ticket |
| `price` | Decimal(10,2) | Price in currency units (MVP: must be 0.00) |
| `currency` | String | 3-letter currency code (default: "USD") |
| `quantity` | Int | Total tickets available |
| `saleStart` | DateTime? | Optional sale start date |
| `saleEnd` | DateTime? | Optional sale end date |
| `createdAt` | DateTime | When ticket type was created |
| `updatedAt` | DateTime | Last modification |

---

## Relationships

### Belongs To

#### Event
- **Relation**: Many tickets → One event
- **Foreign Key**: `eventId`
- **On Delete**: `Cascade` (deleting event deletes all tickets)

### Has Many

#### Registration
- **Relation**: One ticket type → Many registrations
- **Foreign Key**: `ticketTypeId` in Registration
- **On Delete**: `Restrict` (cannot delete ticket with registrations)

---

## Indexes

```prisma
@@index([eventId])                           // List tickets by event
@@index([eventId, saleStart, saleEnd])      // Filter active tickets
```

### Query Optimization

**Get tickets on sale now**:
```sql
-- Uses compound index
WHERE eventId = 'event123'
  AND (saleStart IS NULL OR saleStart <= NOW())
  AND (saleEnd IS NULL OR saleEnd >= NOW())
```

---

## Calculated Fields

These are computed at query time, not stored:

### soldCount
```typescript
const soldCount = await db.registration.count({
  where: { ticketTypeId: ticketId },
});
```

### available
```typescript
const available = ticket.quantity - soldCount;
```

### isAvailable
```typescript
const now = new Date();
const saleStarted = !ticket.saleStart || ticket.saleStart <= now;
const saleNotEnded = !ticket.saleEnd || ticket.saleEnd >= now;
const hasAvailability = available > 0;

const isAvailable = saleStarted && saleNotEnded && hasAvailability;
```

---

## Constraints

### Database Constraints
- `price`: Must be >= 0
- `quantity`: Must be > 0
- `eventId`: Must reference existing Event

### Application Constraints
- `price`: Must be 0 (MVP restriction)
- `quantity`: Cannot be decreased below sold count
- `saleStart` < `saleEnd` (if both provided)
- Cannot change price after tickets sold
- Cannot delete if registrations exist

---

## Default Values

- `price`: 0.00
- `currency`: "USD"
- `createdAt`: Current timestamp
- `updatedAt`: Current timestamp

---

## Cascade Behavior

**When Event is deleted**:
- ✅ All ticket types are deleted (CASCADE)
- ✅ Related registrations are also deleted

**When TicketType is deleted**:
- ❌ Cannot delete if registrations exist (RESTRICT)

---

## Common Queries

### Get Available Tickets for Event
```typescript
const now = new Date();

const tickets = await db.ticketType.findMany({
  where: {
    eventId: eventId,
    OR: [
      { saleStart: null, saleEnd: null },
      { saleStart: { lte: now }, saleEnd: { gte: now } },
      { saleStart: { lte: now }, saleEnd: null },
      { saleStart: null, saleEnd: { gte: now } },
    ],
  },
  include: {
    _count: {
      select: { registrations: true },
    },
  },
});
```

### Get Ticket with Statistics
```typescript
const ticket = await db.ticketType.findUnique({
  where: { id: ticketId },
  include: {
    event: {
      select: { organizerId: true },
    },
    _count: {
      select: { registrations: true },
    },
  },
});

const soldCount = ticket._count.registrations;
const available = ticket.quantity - soldCount;
```

---

## Migration History

- `20251108035708_add_event_management_system` - Initial TicketType model

---

## Related Models

- **Event**: Parent event
- **Registration**: Tickets sold
