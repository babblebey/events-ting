# Data Model: Ticket Instance and Attendee Separation

**Feature**: `003-ticket-attendee-separation`  
**Date**: November 19, 2025  
**Phase**: Phase 1 - Design & Contracts

## Overview

This document defines the data entities, relationships, and validation rules for separating ticket instances from attendee records. The model enables a clear distinction between buyers (who purchase tickets) and attendees (who actually attend events).

---

## Entity Relationship Diagram

```
┌─────────────────┐
│      Event      │
│  (Existing)     │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐        ┌─────────────────┐
│   TicketType    │        │  Registration   │◄────┐
│   (Existing)    │        │  (REFACTORED)   │     │
└────────┬────────┘        └────────┬────────┘     │
         │                          │              │
         │ 1:N                      │ 1:N          │ Buyer
         │                          │              │
         │                 ┌────────▼────────┐     │
         └─────────────────►     Ticket      │     │
                           │     (NEW)       │─────┘
                           └────────┬────────┘
                                    │
                                    │ 1:1
                                    │
                           ┌────────▼────────┐
                           │    Attendee     │
                           │     (NEW)       │
                           └─────────────────┘
                                    │
                                    │ Optional
                                    │
                           ┌────────▼────────┐
                           │      User       │
                           │   (Existing)    │
                           └─────────────────┘
```

---

## Entity Definitions

### 1. Registration (REFACTORED)

**Purpose**: Represents the buyer's purchase transaction. Previously conflated buyer and attendee data; now purely represents the purchase order.

**Changes from existing**:
- Remove attendee-specific fields (moved to Attendee model)
- Remove check-in fields (moved to Ticket model)
- Add relationship to multiple Ticket instances

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String (CUID) | Primary Key | Unique registration identifier |
| `eventId` | String (CUID) | Foreign Key → Event | Event being registered for |
| `ticketTypeId` | String (CUID) | Foreign Key → TicketType | Type of ticket purchased |
| `email` | String | Required, Email format | Buyer's email address |
| `name` | String | Required | Buyer's full name |
| `userId` | String (CUID) | Optional, Foreign Key → User | Authenticated user who purchased |
| `quantity` | Integer | Required, Default: 1, Min: 1 | Number of tickets in this purchase |
| `paymentStatus` | String | Required, Default: "free" | Payment status enum |
| `paymentIntentId` | String | Optional | Stripe/Paystack transaction ID |
| `paymentProcessor` | String | Optional | Payment provider used |
| `registeredAt` | DateTime | Required, Auto: now() | Purchase timestamp |
| `updatedAt` | DateTime | Required, Auto: now() | Last update timestamp |

#### Validation Rules

- **Email**: Must be valid email format (RFC 5322)
- **Quantity**: Must match count of related Ticket records
- **Payment Status**: Must be one of: `"free"`, `"pending"`, `"paid"`, `"failed"`, `"refunded"`
- **Payment Processor**: If paymentStatus != "free", processor must be specified

#### State Transitions

```
[New Purchase]
    ↓
  "free" (if free ticket)
    OR
  "pending" (if paid ticket)
    ↓
  "paid" (on successful payment)
    OR
  "failed" (on payment error)
    ↓
  "refunded" (on refund request)
```

#### Relationships

- **Event**: Many-to-one (registration belongs to one event)
- **TicketType**: Many-to-one (registration is for one ticket type)
- **User**: Many-to-one optional (registration may link to authenticated user)
- **Tickets**: One-to-many (registration creates multiple ticket instances)

#### Indexes

- `[eventId]` - For filtering registrations by event
- `[ticketTypeId]` - For filtering by ticket type
- `[email]` - For buyer lookup
- `[userId]` - For user's registration history
- `[eventId, ticketTypeId]` - Composite for event + ticket type queries
- `[registeredAt]` - For chronological sorting

---

### 2. Ticket (NEW)

**Purpose**: Represents a single physical or digital ticket instance. Each ticket can be assigned to one attendee and has its own QR code and check-in status.

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String (CUID) | Primary Key | Unique ticket identifier |
| `registrationId` | String (CUID) | Foreign Key → Registration | Purchase order this ticket belongs to |
| `eventId` | String (CUID) | Foreign Key → Event | Event this ticket is for (denormalized for performance) |
| `ticketTypeId` | String (CUID) | Foreign Key → TicketType | Type of ticket (denormalized for performance) |
| `ticketNumber` | String | Required, Unique | Human-readable ticket identifier (e.g., "TKT-L8Z9K3-A7B2C5D8E9") |
| `qrCodeData` | String | Required, Unique | Data encoded in QR code (same as ticketNumber) |
| `isAssigned` | Boolean | Required, Default: false | Whether ticket has been assigned to an attendee |
| `assignedAt` | DateTime | Optional | When ticket was assigned |
| `attendeeId` | String (CUID) | Optional, Foreign Key → Attendee | Attendee this ticket is assigned to |
| `isCheckedIn` | Boolean | Required, Default: false | Whether attendee has checked in |
| `checkedInAt` | DateTime | Optional | When check-in occurred |
| `checkedInBy` | String | Optional | Staff member or device ID that performed check-in |
| `createdAt` | DateTime | Required, Auto: now() | Ticket creation timestamp |
| `updatedAt` | DateTime | Required, Auto: now() | Last update timestamp |

#### Validation Rules

- **Ticket Number**: Must be unique across all events, format: `TKT-{timestamp}-{nanoid}`
- **Assignment**: If `isAssigned = true`, `attendeeId` must be set and `assignedAt` must be set
- **Check-in**: If `isCheckedIn = true`, `checkedInAt` must be set
- **Assignment Cutoff**: Cannot assign/reassign after event's assignment cutoff time
- **Check-in Dependency**: Cannot check in if `isAssigned = false` (must assign first)

#### State Transitions

```
[Created from Registration]
    ↓
  Unassigned (isAssigned: false, attendeeId: null)
    ↓
  Assigned (isAssigned: true, attendeeId: set)
    ↓
  Checked In (isCheckedIn: true)

[Reassignment Path]
Assigned → Unassigned (delete attendee) → Assigned (new attendee)
```

#### Business Rules

1. **One Attendee Per Ticket**: Each ticket can only be assigned to one attendee at a time
2. **Assignment Cutoff**: Assignments/reassignments blocked after event's cutoff time
3. **No Check-In Without Assignment**: Must assign ticket before checking in
4. **No Duplicate Check-Ins**: Once checked in, cannot check in again (immutable)
5. **Ownership Immutability**: Ticket's `registrationId` never changes (no transfers between buyers)

#### Relationships

- **Registration**: Many-to-one (ticket belongs to one purchase order)
- **Event**: Many-to-one (ticket is for one event)
- **TicketType**: Many-to-one (ticket is of one type)
- **Attendee**: One-to-one optional (ticket may be assigned to one attendee)

#### Indexes

- `[ticketNumber]` - UNIQUE, for fast QR code lookup during check-in
- `[qrCodeData]` - UNIQUE, for QR code validation
- `[registrationId]` - For buyer's ticket list
- `[eventId]` - For event's ticket list
- `[ticketTypeId]` - For ticket type reports
- `[attendeeId]` - UNIQUE, for attendee's ticket lookup
- `[eventId, isCheckedIn]` - For check-in metrics dashboard
- `[eventId, isAssigned]` - For tracking assignment progress

---

### 3. Attendee (NEW)

**Purpose**: Represents a real person who will attend the event. Stores individual attendee information and custom registration form responses.

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String (CUID) | Primary Key | Unique attendee identifier |
| `name` | String | Required | Attendee's full name |
| `email` | String | Required, Email format | Attendee's email address |
| `customData` | JSON | Optional | Answers to event-specific registration questions |
| `emailStatus` | String | Required, Default: "active" | Email deliverability status |
| `userId` | String (CUID) | Optional, Foreign Key → User | Linked user account (if attendee has account) |
| `createdAt` | DateTime | Required, Auto: now() | Record creation timestamp |
| `updatedAt` | DateTime | Required, Auto: now() | Last update timestamp |

#### Validation Rules

- **Email**: Must be valid email format with soft warnings for suspicious patterns (common typos)
- **Email Status**: Must be one of: `"active"`, `"bounced"`, `"unsubscribed"`
- **Custom Data**: Must conform to event's custom field schema (if event has custom fields)
- **Lifecycle**: Attendee record is deleted when ticket is reassigned (privacy)

#### Custom Data Schema

The `customData` field stores responses to event-specific questions:

```typescript
// Example schema
interface CustomFieldResponses {
  [fieldId: string]: string | boolean | string[];
}

// Example data
{
  "dietary": "Vegan",
  "tshirt": "M",
  "accessibility": "Wheelchair access needed",
  "sessionPreferences": ["Web Development", "AI/ML"]
}
```

**Validation**:
- Field IDs must match event's custom field definitions
- Required fields must have non-empty values
- Select/radio values must be from defined options
- Checkbox values must be array of strings

#### State Transitions

```
[Created on Ticket Assignment]
    ↓
  Active (emailStatus: "active")
    ↓
  [Email bounces] → Bounced (emailStatus: "bounced")
    OR
  [User unsubscribes] → Unsubscribed (emailStatus: "unsubscribed")

[Deleted on Ticket Reassignment]
Active → [DELETED]
```

#### Business Rules

1. **Email Uniqueness**: Same email can be used for multiple attendees (different tickets)
2. **Privacy on Reassignment**: When ticket reassigned, original attendee data is permanently deleted
3. **Custom Data Required**: If event has required custom fields, attendee cannot be created without responses
4. **Email Communication**: Only attendees with `emailStatus = "active"` receive event communications

#### Relationships

- **Ticket**: One-to-one (attendee has exactly one ticket)
- **User**: Many-to-one optional (attendee may link to user account)

#### Indexes

- `[email]` - For duplicate detection and lookup
- `[userId]` - For user's attendee records
- `[emailStatus]` - For filtering email-eligible attendees

---

### 4. Event (UPDATED)

**Purpose**: Existing Event model with additions to support assignment cutoff configuration.

#### New Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `assignmentCutoffType` | String | Required, Default: "event_start" | Cutoff time preset |
| `assignmentCutoffTime` | DateTime | Optional | Custom cutoff time (if type = "custom") |
| `maxTicketsPerPurchase` | Integer | Required, Default: 10, Min: 1 | Maximum tickets in one transaction |

#### Validation Rules

- **Assignment Cutoff Type**: Must be one of: `"event_start"`, `"1h_before"`, `"24h_before"`, `"custom"`
- **Assignment Cutoff Time**: Required if `assignmentCutoffType = "custom"`, otherwise ignored
- **Max Tickets**: Must be between 1 and 1000 (system hard limit)

#### New Relationships

- **Tickets**: One-to-many (event has many ticket instances)

---

## Database Schema Changes

### Prisma Schema Updates

```prisma
// Updated Registration model
model Registration {
  id          String   @id @default(cuid())
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  ticketTypeId String
  ticketType   TicketType @relation(fields: [ticketTypeId], references: [id], onDelete: Restrict)
  
  // Buyer Info (person who made the purchase)
  email       String
  name        String
  userId      String?
  user        User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  // Quantity of tickets purchased
  quantity    Int     @default(1)
  
  // Payment
  paymentStatus     String  @default("free")
  paymentIntentId   String?
  paymentProcessor  String?
  
  // Relations
  tickets Ticket[] // NEW: Individual tickets created from this purchase
  
  registeredAt DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@index([eventId])
  @@index([ticketTypeId])
  @@index([email])
  @@index([userId])
  @@index([eventId, ticketTypeId])
  @@index([registeredAt])
}

// NEW: Ticket model
model Ticket {
  id              String   @id @default(cuid())
  
  // Link to purchase order (buyer)
  registrationId  String
  registration    Registration @relation(fields: [registrationId], references: [id], onDelete: Cascade)
  
  // Link to event and ticket type (denormalized)
  eventId         String
  event           Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  ticketTypeId    String
  ticketType      TicketType @relation(fields: [ticketTypeId], references: [id], onDelete: Restrict)
  
  // Unique ticket identifier (for QR code)
  ticketNumber    String   @unique
  qrCodeData      String   @unique
  
  // Assignment status
  isAssigned      Boolean  @default(false)
  assignedAt      DateTime?
  
  // Link to actual attendee
  attendeeId      String?  @unique
  attendee        Attendee? @relation(fields: [attendeeId], references: [id], onDelete: SetNull)
  
  // Check-in tracking
  isCheckedIn     Boolean  @default(false)
  checkedInAt     DateTime?
  checkedInBy     String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([registrationId])
  @@index([eventId])
  @@index([ticketTypeId])
  @@index([attendeeId])
  @@index([eventId, isCheckedIn])
  @@index([eventId, isAssigned])
  @@index([ticketNumber])
}

// NEW: Attendee model
model Attendee {
  id          String   @id @default(cuid())
  
  // Personal information
  name        String
  email       String
  
  // Custom registration form responses
  customData  Json?
  
  // Email delivery status
  emailStatus String  @default("active")
  
  // Link to ticket (one-to-one)
  ticket Ticket?
  
  // Optional link to user account
  userId      String?
  user        User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([email])
  @@index([userId])
  @@index([emailStatus])
}

// Updated Event model
model Event {
  // ... existing fields ...
  
  // NEW: Assignment cutoff configuration
  assignmentCutoffType String   @default("event_start")
  assignmentCutoffTime DateTime?
  maxTicketsPerPurchase Int     @default(10)
  
  // NEW: Relations
  tickets Ticket[]
  
  // ... existing relations ...
}

// Updated TicketType model
model TicketType {
  // ... existing fields ...
  
  // NEW: Relations
  tickets Ticket[]
  
  // ... existing relations ...
}
```

### Migration Strategy

1. **Create new models**: Add Ticket and Attendee models to schema
2. **Update existing models**: Add new fields to Event, new relations to Registration/TicketType
3. **Deploy schema changes**: Run `prisma migrate dev`
4. **Feature flag**: Deploy code with `FEATURE_TICKET_SEPARATION` flag disabled
5. **Data migration**: Run script to convert existing registrations to tickets/attendees
6. **Enable feature**: Toggle flag to use new models
7. **Deprecate old model**: Mark LegacyRegistration for future removal

---

## Data Integrity Constraints

### Database-Level Constraints

1. **Unique Constraints**:
   - `Ticket.ticketNumber` (unique)
   - `Ticket.qrCodeData` (unique)
   - `Ticket.attendeeId` (unique) - one attendee per ticket

2. **Foreign Key Constraints**:
   - `Ticket.registrationId` → `Registration.id` (CASCADE delete)
   - `Ticket.eventId` → `Event.id` (CASCADE delete)
   - `Ticket.ticketTypeId` → `TicketType.id` (RESTRICT delete)
   - `Ticket.attendeeId` → `Attendee.id` (SET NULL delete)
   - `Attendee.userId` → `User.id` (SET NULL delete)

3. **Cascade Behaviors**:
   - Delete Registration → Delete all related Tickets
   - Delete Event → Delete all related Tickets
   - Delete Ticket → Keep Attendee record (for historical data)
   - Delete Attendee → Set Ticket.attendeeId to NULL (allows reassignment)

### Application-Level Constraints

1. **Quantity Validation**:
   - `Registration.quantity` must equal count of related Tickets
   - Enforced on Registration creation and Ticket deletion

2. **Assignment Validation**:
   - Cannot assign ticket after event's assignment cutoff time
   - Cannot reassign checked-in ticket

3. **Check-In Validation**:
   - Cannot check in unassigned ticket
   - Cannot check in same ticket twice

4. **Optimistic Locking**:
   - Use `Ticket.updatedAt` for concurrent assignment detection
   - Throw conflict error if ticket modified since client loaded it

---

## Query Patterns

### Common Queries

**1. Get buyer's tickets with assignment status**
```typescript
const tickets = await db.ticket.findMany({
  where: { registrationId: "cm3..." },
  include: {
    attendee: true,
    ticketType: true,
  },
  orderBy: { createdAt: 'asc' },
});
```

**2. Get event check-in metrics**
```typescript
const metrics = await db.ticket.groupBy({
  by: ['isCheckedIn'],
  where: { eventId: "cm3..." },
  _count: true,
});
// Result: { isCheckedIn: true, _count: 42 }, { isCheckedIn: false, _count: 58 }
```

**3. Get unassigned tickets for event**
```typescript
const unassigned = await db.ticket.findMany({
  where: {
    eventId: "cm3...",
    isAssigned: false,
  },
  include: { registration: true },
});
```

**4. Check in ticket by QR code**
```typescript
const ticket = await db.ticket.update({
  where: { ticketNumber: "TKT-L8Z9K3-A7B2C5D8E9" },
  data: {
    isCheckedIn: true,
    checkedInAt: new Date(),
    checkedInBy: staffId,
  },
  include: { attendee: true },
});
```

**5. Get attendees for email campaign**
```typescript
const attendees = await db.attendee.findMany({
  where: {
    emailStatus: 'active',
    ticket: {
      eventId: "cm3...",
      isAssigned: true,
    },
  },
  select: {
    email: true,
    name: true,
    customData: true,
  },
});
```

---

## Data Privacy & GDPR Compliance

### Personal Data Handling

**Buyer Data (Registration)**:
- Stored indefinitely for payment/tax records
- Email used for order confirmations and refund notifications
- Can be anonymized on request (replace with "Deleted User")

**Attendee Data (Attendee)**:
- Deleted on ticket reassignment (privacy by design)
- Can be exported on request (GDPR right to data portability)
- Can be deleted on request (GDPR right to erasure)

**Data Retention**:
- Active attendee data: Until event ends + 30 days
- Historical check-in data: Anonymized after 1 year
- Buyer purchase records: 7 years (legal requirement)

### Consent Model

**Two-layer consent**:
1. Buyer confirms they have permission to share attendee information (checkbox on assignment form)
2. Attendee accepts terms when first accessing ticket (via email link)

**Tracking**:
```typescript
// Registration model addition (future)
model Registration {
  // ... existing fields ...
  buyerConsentGiven Boolean @default(false)
  buyerConsentAt    DateTime?
}

// Attendee model addition (future)
model Attendee {
  // ... existing fields ...
  termsAccepted  Boolean   @default(false)
  termsAcceptedAt DateTime?
}
```

---

## Performance Considerations

### Indexing Strategy

**High-cardinality indexes** (unique lookups):
- `Ticket.ticketNumber` - Used for QR code scanning (most frequent query)
- `Ticket.qrCodeData` - Backup for QR validation

**Composite indexes** (filtered queries):
- `[eventId, isCheckedIn]` - Check-in dashboard metrics
- `[eventId, isAssigned]` - Assignment progress tracking
- `[eventId, ticketTypeId]` - Ticket type reports

**Denormalized fields**:
- `Ticket.eventId` and `Ticket.ticketTypeId` - Avoid joins in hot paths
- Trade-off: Slight data duplication for faster queries

### Caching Strategy (Future)

**Ticket lookup cache** (Redis):
- Cache key: `ticket:{ticketNumber}`
- TTL: 1 hour
- Invalidate on: Assignment, reassignment, check-in

**Check-in metrics cache**:
- Cache key: `event:{eventId}:checkin:metrics`
- TTL: 30 seconds (real-time requirement)
- Invalidate on: Any check-in

---

## Testing Scenarios

### Data Integrity Tests

1. **Cascade Deletion**:
   - Delete Registration → Verify all Tickets deleted
   - Delete Event → Verify all Tickets deleted
   - Delete Ticket → Verify Attendee NOT deleted

2. **Quantity Consistency**:
   - Create Registration with quantity 3 → Verify 3 Tickets created
   - Delete 1 Ticket → Verify Registration.quantity unchanged (or decremented)

3. **Assignment State**:
   - Assign ticket → Verify `isAssigned = true`, `attendeeId` set, `assignedAt` set
   - Reassign ticket → Verify old Attendee deleted, new Attendee created

### Validation Tests

1. **Assignment Cutoff**:
   - Attempt assignment after cutoff → Expect error
   - Attempt assignment before cutoff → Expect success

2. **Check-In Rules**:
   - Check in unassigned ticket → Expect error
   - Check in assigned ticket → Expect success
   - Check in same ticket twice → Expect error

3. **Optimistic Locking**:
   - Load ticket, modify in parallel, save → Expect conflict error
   - Reload and retry → Expect success

---

## Summary

This data model provides a clear separation between:
- **Buyers** (Registration) - Who purchased tickets
- **Tickets** (Ticket) - Individual ticket instances with QR codes
- **Attendees** (Attendee) - Real people attending the event

**Key Benefits**:
1. Individual ticket tracking (one QR code per person)
2. Flexible assignment/reassignment workflow
3. Accurate check-in metrics (per attendee, not per buyer)
4. Attendee-specific communications
5. Privacy-conscious design (delete on reassignment)
6. GDPR-compliant data handling
