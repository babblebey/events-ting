# Registration Data Model

## Primary Model: Registration (Purchase Transaction)

```prisma
model Registration {
  id          String   @id @default(cuid())
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  ticketTypeId String
  ticketType   TicketType @relation(fields: [ticketTypeId], references: [id], onDelete: Restrict)
  
  // BUYER Information (person making the purchase)
  email       String  // Buyer's email
  name        String  // Buyer's name
  userId      String? // Optional: link to buyer's account
  user        User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  // Purchase Details
  quantity    Int @default(1)  // Number of tickets purchased
  // Purchase Details
  quantity    Int @default(1)  // Number of tickets purchased
  
  // Payment (future-ready fields)
  paymentStatus     String  @default("free") // 'free' | 'pending' | 'paid' | 'failed' | 'refunded'
  paymentIntentId   String? // Stripe/Paystack intent ID
  paymentProcessor  String? // 'stripe' | 'paystack' | null
  
  // Email Status
  emailStatus String  @default("active") // 'active' | 'bounced' | 'unsubscribed'
  
  // Custom Fields
  customData  Json?
  
  // Relations
  tickets Ticket[] // Individual ticket instances created from this purchase
  
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

### Buyer Information (NOT Attendee)

| Field | Type | Description |
|-------|------|-------------|
| `email` | String | **BUYER'S** email address (who made the purchase) |
| `name` | String | **BUYER'S** full name (who paid for tickets) |
| `userId` | String? | Optional link to buyer's User account |

**Critical Distinction**:
- These fields store **buyer information** (who purchased)
- They do NOT store attendee information (who attends)
- Attendee information is in the separate `Attendee` model
- One buyer can purchase tickets for multiple attendees

### Purchase Details

| Field | Type | Description |
|-------|------|-------------|
| `quantity` | Int | Number of tickets purchased in this transaction |

**How It Works**:
- Buyer selects quantity during purchase (e.g., 5 tickets)
- System creates 1 Registration record + 5 Ticket instances
- Each Ticket can be assigned to a different Attendee

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
  registrationCode: "AB12CD34EF56GH78",  // Deprecated: Legacy field
  addedManually: true,                   // Flag for manual additions
  firstTicketNumber: "TKT-L8Z9K3-A7B2", // Reference ticket number
  // Future: Notes, internal references
}
```

**Purchase Reference**:
- First ticket number stored for easy reference
- Used in purchase confirmation emails
- Helps buyers identify their purchase
- Legacy registration code field maintained for backward compatibility

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
- **On Delete**: `Cascade` (deleting event deletes all purchases and tickets)
- **Purpose**: Track which event the purchase is for

#### TicketType
- **Relation**: Many registrations → One ticket type
- **Foreign Key**: `ticketTypeId`
- **On Delete**: `Restrict` (cannot delete ticket type with purchases)
- **Purpose**: Track which ticket tier was purchased

**Important**: `Restrict` prevents accidental deletion of ticket types that have purchases. Must delete purchases first or reassign them.

#### User (Optional)
- **Relation**: Many registrations → One user (optional)
- **Foreign Key**: `userId` (nullable)
- **On Delete**: `SetNull` (if user deleted, purchase remains but userId becomes null)
- **Purpose**: Link purchase to authenticated user account

**Use Cases**:
- User can view their purchase history
- User profile shows purchased events
- Email pre-filling for returning users
- Not required - supports guest purchases

### Has Many: Tickets
- **Relation**: One registration → Many tickets
- **Cardinality**: 1:N (minimum 1, no maximum enforced by schema)
- **Purpose**: Each purchased ticket gets its own Ticket instance

**Example**:
```typescript
// Buyer purchases 3 tickets
const registration = await db.registration.create({
  data: {
    email: "buyer@example.com",  // Buyer email
    name: "John Buyer",           // Buyer name
    quantity: 3,
    tickets: {
      create: [
        { ticketNumber: "TKT-001", ... },  // Can assign to Attendee A
        { ticketNumber: "TKT-002", ... },  // Can assign to Attendee B
        { ticketNumber: "TKT-003", ... },  // Can assign to Attendee C
      ]
    }
  }
});
```

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

### Get All Purchases for Event
```typescript
const purchases = await db.registration.findMany({
  where: { eventId: eventId },
  include: {
    ticketType: {
      select: { id: true, name: true },
    },
    tickets: {
      select: {
        id: true,
        ticketNumber: true,
        isAssigned: true,
        attendee: {
          select: { name: true, email: true },
        },
      },
    },
  },
  orderBy: { registeredAt: 'desc' },
});
```

### Get Purchase with All Tickets
```typescript
const purchase = await db.registration.findUnique({
  where: { id: registrationId },
  include: {
    tickets: {
      include: {
        attendee: true,  // See who each ticket is assigned to
      }
    }
  }
});

// purchase.email = buyer email
// purchase.tickets[0].attendee?.email = first attendee email
// These can be different people!
```

### Count Tickets Sold by Type
```typescript
const soldCount = await db.registration.aggregate({
  where: { ticketTypeId: ticketTypeId },
  _sum: {
    quantity: true,  // Sum all quantities purchased
  },
});
// Returns total tickets sold, not number of purchases
```

### Search Purchases by Name or Email
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
// Searches buyer information only
```

### Get User's Purchase History
```typescript
const myPurchases = await db.registration.findMany({
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
    tickets: {
      select: {
        id: true,
        isAssigned: true,
        attendee: {
          select: { name: true, email: true },
        },
      },
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
Purchase creation uses database transaction with row-level locking:

```typescript
await db.$transaction(async (tx) => {
  // Lock TicketType row
  const ticketType = await tx.$queryRaw`
    SELECT ... FROM "TicketType"
    WHERE id = ${ticketTypeId}
    FOR UPDATE
  `;
  
  // Check availability atomically (quantity × count)
  if (soldCount >= quantity) {
    throw new Error("Sold out");
  }
  
  // Create purchase
  const registration = await tx.registration.create({...});
  
  // Create ticket instances
  await tx.ticket.createMany({
    data: Array.from({ length: input.quantity }).map(() => ({
      registrationId: registration.id,
      // ... ticket fields
    })),
  });
});
```

**Guarantees**:
- ✅ No overselling (atomic check + create)
- ✅ Works across multiple server instances
- ✅ Database-level consistency
- ✅ Each purchase creates correct number of tickets

### Email Uniqueness
**No unique constraint** on email - by design:

**Reasons**:
- Buyers can purchase for multiple events
- Buyers can purchase multiple ticket types for same event
- Buyers can purchase on behalf of others
- Guest purchases allowed

**Considerations**:
- Search returns all matching buyer emails
- Email status update affects all purchases with that buyer email
- Buyer email ≠ Attendee email (attendees tracked separately)
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
