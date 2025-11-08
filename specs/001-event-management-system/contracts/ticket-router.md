# tRPC Router Contract: Ticket

**File**: `src/server/api/routers/ticket.ts`  
**Responsibility**: Ticket type management, availability queries

---

## Procedures

### `ticket.create`

**Type**: Mutation (Protected)  
**Purpose**: Create ticket type for event (FR-008)  
**Authorization**: Event organizer only

**Input Schema**:
```typescript
{
  eventId: string,
  name: string (3-100 chars),
  description: string (max 1000 chars),
  price: number, // MVP: must be 0 for free tickets
  currency: string, // default: "USD"
  quantity: number (min: 1, max: 100000),
  saleStart?: Date, // nullable: no restriction
  saleEnd?: Date, // nullable: no restriction
}
```

**Output**:
```typescript
{
  id: string,
  eventId: string,
  name: string,
  price: Decimal,
  quantity: number,
  // ... full ticket type object
  createdAt: Date,
}
```

**Business Rules**:
- MVP: `price` must be 0 (free tickets only, FR-009)
- If `saleEnd` provided, must be before event start date
- `saleStart` must be before `saleEnd` if both provided

---

### `ticket.list`

**Type**: Query (Public)  
**Purpose**: List ticket types for event registration page (FR-010)  
**Authorization**: Public

**Input Schema**:
```typescript
{
  eventId: string,
  includeUnavailable?: boolean, // default: false
}
```

**Output**:
```typescript
{
  items: Array<{
    id: string,
    name: string,
    description: string,
    price: Decimal,
    currency: string,
    quantity: number,
    soldCount: number,
    available: number, // quantity - soldCount
    isAvailable: boolean, // checks quantity, sale period
    saleStart?: Date,
    saleEnd?: Date,
  }>,
}
```

**Business Rules**:
- `isAvailable = true` if: `available > 0` AND within sale period (or no period set)
- `soldCount` calculated efficiently via database aggregation

---

### `ticket.getById`

**Type**: Query (Protected)  
**Purpose**: Get ticket type details for organizer dashboard  
**Authorization**: Event organizer only

**Input Schema**:
```typescript
{
  id: string,
}
```

**Output**:
```typescript
{
  id: string,
  eventId: string,
  name: string,
  // ... full ticket type object
  stats: {
    sold: number,
    available: number,
    revenue: Decimal, // future: price * sold
    registrationsByDay: Array<{
      date: string,
      count: number,
    }>,
  },
}
```

---

### `ticket.update`

**Type**: Mutation (Protected)  
**Purpose**: Update ticket type details  
**Authorization**: Event organizer only

**Input Schema**:
```typescript
{
  id: string,
  name?: string,
  description?: string,
  quantity?: number, // can increase, but not decrease below soldCount
  saleStart?: Date,
  saleEnd?: Date,
}
```

**Output**:
```typescript
{
  // Updated ticket type object
}
```

**Business Rules**:
- Cannot decrease `quantity` below current `soldCount` (prevent overselling)
- Cannot change `price` after tickets sold (data integrity)

**Error Cases**:
- `BAD_REQUEST`: Attempting to decrease quantity below sold count

---

### `ticket.delete`

**Type**: Mutation (Protected)  
**Purpose**: Delete ticket type (restricted if registrations exist)  
**Authorization**: Event organizer only

**Input Schema**:
```typescript
{
  id: string,
}
```

**Output**:
```typescript
{
  success: boolean,
  message: string,
}
```

**Business Rules**:
- Cannot delete if registrations exist (foreign key constraint)
- Suggests archiving/deactivating instead (set `saleEnd` to past date)

**Error Cases**:
- `CONFLICT`: Registrations exist for this ticket type

---

### `ticket.getStats`

**Type**: Query (Public)  
**Purpose**: Real-time ticket availability for registration page (sold-out detection)  
**Authorization**: Public

**Input Schema**:
```typescript
{
  id: string,
}
```

**Output**:
```typescript
{
  sold: number,
  available: number,
  isAvailable: boolean,
}
```

**Performance**: Lightweight query, cached for 10 seconds via React Query

---

## Error Codes

| Code | Scenario | HTTP Status |
|------|----------|-------------|
| `UNAUTHORIZED` | User not authenticated (protected routes) | 401 |
| `FORBIDDEN` | User not event organizer | 403 |
| `NOT_FOUND` | Ticket type does not exist | 404 |
| `BAD_REQUEST` | Invalid input or business rule violation | 400 |
| `CONFLICT` | Cannot delete ticket type with registrations | 409 |

---

## Implementation Notes

- `soldCount` calculated via: `await ctx.db.registration.count({ where: { ticketTypeId } })`
- Optimize with database index on `Registration.ticketTypeId`
- Consider caching ticket stats for public queries (React Query `staleTime: 10000`)
