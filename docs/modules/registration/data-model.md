# Registration Data Model

## Primary Model: Registration

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
}
```

---

## Field Descriptions

### Identity Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (CUID) | Primary key, auto-generated |
| `eventId` | String (CUID) | Foreign key to Event |
| `ticketTypeId` | String (CUID) | Foreign key to TicketType |

### Attendee Information

| Field | Type | Description |
|-------|------|-------------|
| `email` | String | Attendee's email address (required) |
| `name` | String | Attendee's full name (required) |
| `userId` | String? | Optional link to User account if authenticated |

**Important Notes**:
- Email and name are **always required**, even for authenticated users
- `userId` is **optional** - allows both authenticated and guest registrations
- Multiple registrations can share the same email (different events/tickets)
- No unique constraint on email (allows multiple registrations)

### Payment Fields (Future-Ready)

| Field | Type | Description |
|-------|------|-------------|
| `paymentStatus` | String | Payment state (default: "free") |
| `paymentIntentId` | String? | Payment provider's intent/transaction ID |
| `paymentProcessor` | String? | Payment provider used ("stripe" or "paystack") |

**Payment Status Values**:
- **free**: Free ticket (MVP default)
- **pending**: Payment initiated but not completed
- **paid**: Payment completed successfully
- **failed**: Payment attempt failed
- **refunded**: Payment was refunded

**MVP Limitation**: All registrations currently use `paymentStatus: "free"` since all tickets are free in MVP.

### Email Status

| Field | Type | Description |
|-------|------|-------------|
| `emailStatus` | String | Email deliverability status (default: "active") |

**Email Status Values**:
- **active**: Can receive emails (default)
- **bounced**: Email delivery failed (hard bounce)
- **unsubscribed**: User opted out of communications

**Use Cases**:
- Prevents sending emails to invalid addresses
- Respects unsubscribe preferences
- Updated by email service webhooks

### Custom Data (JSON)

| Field | Type | Description |
|-------|------|-------------|
| `customData` | Json? | Flexible storage for additional data |

**Common Data Stored**:
```typescript
{
  registrationCode: "AB12CD34EF56GH78",  // Unique 16-char code
  addedManually: true,                   // Flag for manual additions
  // Future: Custom form fields, dietary restrictions, etc.
}
```

**Registration Code**:
- Generated on registration creation
- 16 uppercase hex characters (8 random bytes)
- Stored in `customData.registrationCode`
- Used for check-in (future feature)
- Included in confirmation emails

### Audit Fields

| Field | Type | Description |
|-------|------|-------------|
| `registeredAt` | DateTime | When registration was created (default: now) |
| `updatedAt` | DateTime | Last modification timestamp |

---

## Relationships

### Belongs To

#### Event
- **Relation**: Many registrations → One event
- **Foreign Key**: `eventId`
- **On Delete**: `Cascade` (deleting event deletes all registrations)
- **Purpose**: Track which event the attendee registered for

#### TicketType
- **Relation**: Many registrations → One ticket type
- **Foreign Key**: `ticketTypeId`
- **On Delete**: `Restrict` (cannot delete ticket type with registrations)
- **Purpose**: Track which ticket tier the attendee selected

**Important**: `Restrict` prevents accidental deletion of ticket types that have registrations. Must delete registrations first or reassign them.

#### User (Optional)
- **Relation**: Many registrations → One user (optional)
- **Foreign Key**: `userId` (nullable)
- **On Delete**: `SetNull` (if user deleted, registration remains but userId becomes null)
- **Purpose**: Link registration to authenticated user account

**Use Cases**:
- User can view their registrations
- User profile shows attended events
- Email pre-filling for returning users
- Not required - supports guest registrations

---

## Indexes

Performance indexes for common queries:

```prisma
@@index([eventId])        // List registrations by event
@@index([ticketTypeId])   // Count sold tickets by type
@@index([email])          // Email status updates, search
@@index([userId])         // User's registration history
```

### Query Optimization

**List registrations for an event**:
```sql
-- Uses index: [eventId]
SELECT * FROM "Registration"
WHERE "eventId" = 'clx123'
ORDER BY "registeredAt" DESC
```

**Count tickets sold**:
```sql
-- Uses index: [ticketTypeId]
SELECT COUNT(*) FROM "Registration"
WHERE "ticketTypeId" = 'clx456'
```

**Search by email**:
```sql
-- Uses index: [email]
SELECT * FROM "Registration"
WHERE "email" LIKE '%john%'
```

**User's registrations**:
```sql
-- Uses index: [userId]
SELECT * FROM "Registration"
WHERE "userId" = 'clx789'
ORDER BY "registeredAt" DESC
```

---

## Constraints

### Foreign Key Constraints

**Event Relationship**:
- `FOREIGN KEY (eventId) REFERENCES Event(id) ON DELETE CASCADE`
- Cascading delete: When event is deleted, all registrations are deleted

**TicketType Relationship**:
- `FOREIGN KEY (ticketTypeId) REFERENCES TicketType(id) ON DELETE RESTRICT`
- Restricted delete: Cannot delete ticket type if registrations exist

**User Relationship**:
- `FOREIGN KEY (userId) REFERENCES User(id) ON DELETE SET NULL`
- Set null: If user deleted, registrations remain but userId becomes null

### Application-Level Constraints

**No Unique Constraints**:
- Email can appear multiple times (different events/tickets)
- User can register for same event multiple times (different ticket types)

**Validation (Application Level)**:
- Name: 2-100 characters
- Email: Valid email format
- Payment status: Must be one of defined enum values
- Email status: Must be one of defined enum values

### Default Values

| Field | Default |
|-------|---------|
| `id` | `cuid()` |
| `paymentStatus` | `"free"` |
| `emailStatus` | `"active"` |
| `registeredAt` | `now()` |
| `updatedAt` | `now()` |

---

## Cascade Behavior

### When Event is Deleted (CASCADE)
- ✅ All registrations for that event are **automatically deleted**
- ✅ Frees up ticket availability (no orphaned records)
- ⚠️ Data loss - consider soft delete instead

### When TicketType is Deleted (RESTRICT)
- ❌ **Cannot delete** if registrations exist
- ✅ Prevents orphaned registrations
- ✅ Organizer must cancel registrations first

### When User is Deleted (SET NULL)
- ✅ Registrations remain in database
- ✅ `userId` becomes `null`
- ✅ Email and name preserved for event records
- ✅ No cascade deletion

---

## Common Queries

### Get All Registrations for Event
```typescript
const registrations = await db.registration.findMany({
  where: { eventId: eventId },
  include: {
    ticketType: {
      select: { id: true, name: true },
    },
  },
  orderBy: { registeredAt: 'desc' },
});
```

### Count Tickets Sold by Type
```typescript
const soldCount = await db.registration.count({
  where: { ticketTypeId: ticketTypeId },
});
```

### Search Registrations by Name or Email
```typescript
const results = await db.registration.findMany({
  where: {
    eventId: eventId,
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ],
  },
});
```

### Get User's Registration History
```typescript
const myRegistrations = await db.registration.findMany({
  where: { userId: userId },
  include: {
    event: {
      select: {
        id: true,
        name: true,
        slug: true,
        startDate: true,
      },
    },
    ticketType: {
      select: { name: true },
    },
  },
  orderBy: { registeredAt: 'desc' },
});
```

### Update Email Status (Webhook)
```typescript
const result = await db.registration.updateMany({
  where: { email: email },
  data: { emailStatus: status },
});
// Returns: { count: number }
```

### Get Registration with Full Details
```typescript
const registration = await db.registration.findUnique({
  where: { id: registrationId },
  include: {
    event: {
      select: {
        id: true,
        name: true,
        slug: true,
        startDate: true,
        organizerId: true,
      },
    },
    ticketType: {
      select: {
        name: true,
        price: true,
      },
    },
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  },
});
```

---

## Data Integrity

### Ticket Availability
Registration creation uses database transaction with row-level locking:

```typescript
await db.$transaction(async (tx) => {
  // Lock TicketType row
  const ticketType = await tx.$queryRaw`
    SELECT ... FROM "TicketType"
    WHERE id = ${ticketTypeId}
    FOR UPDATE
  `;
  
  // Check availability atomically
  if (soldCount >= quantity) {
    throw new Error("Sold out");
  }
  
  // Create registration
  await tx.registration.create({...});
});
```

**Guarantees**:
- ✅ No overselling (atomic check + create)
- ✅ Works across multiple server instances
- ✅ Database-level consistency

### Email Uniqueness
**No unique constraint** on email - by design:

**Reasons**:
- Users can register for multiple events
- Users can buy multiple ticket types for same event
- Users can register for someone else
- Guest registrations allowed

**Considerations**:
- Search returns all matching emails
- Email status update affects all registrations with that email
- No email verification required (future enhancement)

---

## JSON Field Usage

### Custom Data Structure
```typescript
interface CustomData {
  registrationCode: string;      // Always present
  addedManually?: boolean;       // Flag for manual additions
  // Future fields:
  dietaryRestrictions?: string;
  tshirtSize?: string;
  customQuestion1?: string;
}
```

### Querying JSON Fields
```typescript
// Extract registration code
const code = (registration.customData as CustomData)?.registrationCode ?? "";

// Check if manually added
const isManual = (registration.customData as CustomData)?.addedManually === true;
```

### Prisma JSON Filtering (PostgreSQL)
```typescript
// Find manually added registrations
const manualRegistrations = await db.registration.findMany({
  where: {
    customData: {
      path: ['addedManually'],
      equals: true,
    },
  },
});
```

---

## Migration History

Relevant migrations for the Registration model:

- `20251108035708_add_event_management_system` - Initial Registration model
- `20251108184514_add_indexes_for_sorting_and_filtering` - Performance indexes

---

## Related Models

### Event
**Module**: [Events Module](../events/)  
**Relationship**: Parent (one-to-many)  
**Usage**: Every registration belongs to an event

### TicketType
**Module**: [Tickets Module](../tickets/)  
**Relationship**: Parent (one-to-many)  
**Usage**: Registration selects a specific ticket type

### User
**Module**: Authentication System  
**Relationship**: Optional parent (one-to-many)  
**Usage**: Links registration to user account (optional)

---

## Data Privacy & GDPR

### Personal Data Stored
- ✅ Email address (required)
- ✅ Full name (required)
- ✅ Custom data (optional, may include PII)

### Data Subject Rights

**Right to Access**:
- Users can view their registrations via `/dashboard`
- Email search available to organizers

**Right to Erasure**:
- Cancellation deletes registration (hard delete)
- User deletion sets `userId` to null but preserves attendance records

**Right to Rectification**:
- Organizers can manually update registration details
- (TODO: Add update procedure)

**Data Retention**:
- No automatic deletion
- Preserved for event history and analytics
- Organizers responsible for data retention policies

### Consent
- Registration implies consent for event communications
- Email status tracks unsubscribe preferences
- (TODO: Add explicit consent checkbox)

---

## Performance Considerations

### Index Strategy
All indexes support common query patterns:
- Event listings: `[eventId]`
- Availability checks: `[ticketTypeId]`
- Search: `[email]`
- User history: `[userId]`

### Query Optimization
- Use `include` for related data (single query)
- Cursor-based pagination for large result sets
- Aggregate functions for counts (avoid fetching all records)

### Scaling Considerations
- Partition by event year (large events)
- Archive old registrations to separate table
- Consider read replicas for reporting

---

## Future Enhancements

### Model Extensions

**Additional Fields**:
```prisma
// Future additions
checkedIn       Boolean?  // Check-in status
checkedInAt     DateTime? // Check-in timestamp
qrCode          String?   // Generated QR code
waitlistPosition Int?     // For waitlist feature
```

**Relationships**:
- Ticket transfers (new model)
- Check-in logs (new model)
- Waitlist (new model)

### Audit Trail
Consider adding audit log for:
- Registration creation
- Cancellation (who, when, why)
- Email status changes
- Manual modifications

### Soft Delete
Instead of hard delete:
```prisma
deletedAt  DateTime?
deletedBy  String?   // userId who cancelled
deleteReason String? // Cancellation reason
```

---

## Security Considerations

### Data Access
- ✅ Only event organizers can view registrations
- ✅ Users can view their own registrations
- ❌ No public access to registration list

### SQL Injection
- ✅ Prisma parameterized queries prevent injection
- ✅ Raw queries use proper parameter binding

### Rate Limiting
- ⚠️ Public registration endpoint needs rate limiting
- ⚠️ Consider CAPTCHA for bot prevention

### Email Validation
- ✅ Format validation on input
- ⚠️ No email verification (future enhancement)
- ⚠️ Webhook endpoint needs signature verification
