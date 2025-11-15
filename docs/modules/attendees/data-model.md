# Attendees Data Model

## Overview

The Attendees module uses the `Registration` model from the Registration module. There is no separate "Attendee" model - attendees are simply registrations viewed from an organizer management perspective.

## Primary Model: Registration

**File**: `prisma/schema.prisma`

```prisma
model Registration {
  id          String   @id @default(cuid())
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  ticketTypeId String
  ticketType   TicketType @relation(fields: [ticketTypeId], references: [id], onDelete: Restrict)
  
  // Attendee Info
  email       String
  name        String
  userId      String? // Optional: link to authenticated user
  user        User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  // Payment (future-ready fields)
  paymentStatus     String  @default("free") // 'free' | 'pending' | 'paid' | 'failed' | 'refunded'
  paymentIntentId   String? // Stripe/Paystack intent ID
  paymentProcessor  String? // 'stripe' | 'paystack' | null
  
  // Email Status
  emailStatus String  @default("active") // 'active' | 'bounced' | 'unsubscribed'
  
  // Custom Fields
  customData  Json?
  
  registeredAt DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@index([eventId])
  @@index([ticketTypeId])
  @@index([email])
  @@index([userId])
  @@index([eventId, ticketTypeId])
  @@index([eventId, emailStatus])
  @@index([registeredAt])
}
```

## Field Descriptions

| Field | Type | Description | Attendee Context |
|-------|------|-------------|------------------|
| `id` | String | Unique identifier (CUID) | Registration ID |
| `eventId` | String | Foreign key to Event | Event attendee belongs to |
| `ticketTypeId` | String | Foreign key to TicketType | Attendee's ticket type/access level |
| `email` | String | Attendee email (required) | Contact email, search field |
| `name` | String | Attendee full name (required) | Display name, search field |
| `userId` | String? | Optional link to User account | For authenticated registrations |
| `paymentStatus` | String | Payment state (default: 'free') | Currently all free, future: paid events |
| `emailStatus` | String | Email deliverability (default: 'active') | Track bounces/unsubscribes |
| `customData` | Json? | Additional registration data | Includes registrationCode |
| `registeredAt` | DateTime | Registration timestamp | Sort by date, display in list |

## Email Status Values

| Status | Description | Display | Actions |
|--------|-------------|---------|---------|
| `active` | Email is deliverable | Green badge | Can send emails |
| `bounced` | Email hard bounced | Red badge | Do not send emails |
| `unsubscribed` | User opted out | Gray badge | Do not send emails |

**Updated By**: Resend webhooks via `updateEmailStatus` procedure

## Payment Status Values

| Status | Description | Display | Current Use |
|--------|-------------|---------|-------------|
| `free` | Free ticket | Blue badge | All registrations (MVP) |
| `pending` | Payment pending | Yellow badge | Future: paid events |
| `paid` | Payment completed | Green badge | Future: paid events |
| `failed` | Payment failed | Red badge | Future: paid events |
| `refunded` | Payment refunded | Gray badge | Future: refunds |

## Relationships

### Event ← Registration (One-to-Many)

```prisma
model Event {
  // ...
  registrations Registration[]
  // ...
}
```

Each event can have multiple attendees (registrations).

### TicketType ← Registration (One-to-Many)

```prisma
model TicketType {
  // ...
  registrations Registration[]
  // ...
}
```

Each ticket type can be assigned to multiple attendees.

### User ← Registration (One-to-Many, Optional)

```prisma
model User {
  // ...
  registrations Registration[]
  // ...
}
```

Optional link for authenticated users who register.

## Indexes for Attendee Management

### Primary Indexes

- `[eventId]` - List all attendees for an event
- `[eventId, ticketTypeId]` - Filter by ticket type
- `[eventId, emailStatus]` - Filter by email status (for campaigns)

### Search Indexes

- `[email]` - Search by email (contains query)
- `[registeredAt]` - Sort by registration date

## Query Patterns

### List Attendees with Filters

```typescript
const attendees = await db.registration.findMany({
  where: {
    eventId,
    ticketTypeId: selectedTicketType, // Optional filter
    OR: search ? [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ] : undefined
  },
  include: {
    ticketType: {
      select: { id: true, name: true }
    }
  },
  orderBy: { registeredAt: 'desc' },
  take: limit + 1,
  cursor: cursor ? { id: cursor } : undefined,
  skip: cursor ? 1 : 0
});
```

### Export All Attendees

```typescript
const registrations = await db.registration.findMany({
  where: { eventId },
  include: {
    ticketType: { select: { name: true } }
  },
  orderBy: { registeredAt: 'desc' }
});
```

### Get Active Email Recipients

```typescript
const activeAttendees = await db.registration.findMany({
  where: {
    eventId,
    emailStatus: 'active'
  },
  select: {
    email: true,
    name: true
  }
});
```

## Custom Data Format

The `customData` JSON field stores additional registration information including registration codes and custom import fields:

### Standard Structure
```json
{
  "registrationCode": "ABC123DEF",
  "additionalFields": {
    "company": "Tech Corp",
    "dietaryRestrictions": "Vegetarian"
  }
}
```

### CSV Import Mapping

When importing attendees via CSV, unmapped columns are automatically stored in `customData`:

**Example CSV**:
```csv
name,email,ticketType,company,role,dietary
John Doe,john@example.com,General Admission,Acme Corp,Developer,Vegetarian
```

**Field Mapping**:
- `name` → Registration.name
- `email` → Registration.email
- `ticketType` → Registration.ticketTypeId (resolved by name)
- `company` → customData.company (unmapped)
- `role` → customData.role (unmapped)
- `dietary` → customData.dietary (unmapped)

**Resulting customData**:
```json
{
  "registrationCode": "ABC123DEF",
  "company": "Acme Corp",
  "role": "Developer",
  "dietary": "Vegetarian"
}
```

**Important Notes**:
- Column names stored as-is (no `custom_` prefix in JSON)
- All unmapped columns become custom fields
- Custom field names are case-sensitive
- Nested JSON structures not supported in CSV import (flat key-value only)

### Validation Constraints for Imported Data

**CSV Import Validation Rules**:

| Field | Import Validation | Notes |
|-------|------------------|-------|
| `name` | Required, 2-255 chars | Must be mapped |
| `email` | Required, valid format, max 255 chars | Must be mapped, format validated |
| `ticketType` | Required, must exist in event | Matched by name (case-insensitive) |
| `paymentStatus` | Optional, enum validation | Must be: 'free', 'pending', 'paid', 'failed', 'refunded' |
| `emailStatus` | Optional, enum validation | Must be: 'active', 'bounced', 'unsubscribed' |
| Custom fields | No validation | Stored as-is in customData JSON |

**Registration Code Generation**: 
- Format: 9-character alphanumeric (e.g., ABC123DEF)
- Auto-generated for all imported attendees
- Unique per registration
- Used for check-in and confirmation emails

**Note**: No schema changes required - CSV import uses existing Registration model structure.

**Registration Code**: Unique code for check-in and confirmation emails.

## Data Privacy

**PII Fields**:
- `email` - Personal email address
- `name` - Full name
- `customData` - May contain sensitive data

**Best Practices**:
- Only export when necessary
- Store exports securely
- Comply with GDPR/data protection laws
- Provide opt-out mechanisms (unsubscribe)
- Delete data after event if not needed for records

## Performance Considerations

### Large Events (>5000 Attendees)

1. **Pagination**: Always use cursor-based pagination
2. **Indexes**: Ensure all query filters use indexed fields
3. **Select Optimization**: Only select needed fields in exports
4. **Background Jobs**: Consider background processing for large exports

### Search Performance

- **Database**: Use indexed fields for contains queries
- **Frontend**: Debounce search input (500ms)
- **Optimization**: Consider full-text search for very large events

## Related Documentation

- [Backend Documentation](./backend.md) - Query procedures
- [Registration Module Data Model](../registration/data-model.md) - Complete model documentation
- [Frontend Documentation](./frontend.md) - UI components
- [Architecture: Data Model](../../architecture/data-model.md) - Full schema
