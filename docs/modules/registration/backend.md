# Registration Backend Documentation

## Router Location

**File**: `src/server/api/routers/registration.ts`

This router handles all registration operations including public attendee registration, organizer management, CSV exports, and email status tracking.

## Procedures

### `registration.create`

**Type**: Mutation  
**Auth**: Public (no authentication required)  
**Purpose**: Create a new registration for an event (self-service attendee registration)

**Input Schema**:
```typescript
{
  ticketTypeId: string;    // CUID of ticket type
  email: string;           // Valid email address
  name: string;            // 2-100 characters
  customData?: Record<string, any>; // Optional custom fields
}
```

**Business Logic**:

1. **Database Transaction with Row Locking**:
   - Uses `SELECT FOR UPDATE` on TicketType to prevent race conditions
   - Atomically checks availability and creates registration
   - Prevents overselling even with concurrent requests

2. **Availability Check**:
   - Queries sold count with `COUNT(r.id)` grouped by ticket type
   - Calculates available: `quantity - soldCount`
   - Returns `BAD_REQUEST` if sold out

3. **Sale Period Validation**:
   - Checks if current time is after `saleStart` (if set)
   - Checks if current time is before `saleEnd` (if set)
   - Returns `BAD_REQUEST` if outside sale window

4. **Registration Creation**:
   - Generates unique 8-character registration code (16 hex chars uppercase)
   - Stores code in `customData.registrationCode`
   - Links to `userId` if user is authenticated (optional)
   - Sets `paymentStatus: "free"` and `emailStatus: "active"`

5. **Email Confirmation (Async)**:
   - Sends confirmation email asynchronously (doesn't block response)
   - Uses `RegistrationConfirmation` React Email template
   - Includes registration code, event details, and event URL
   - Logs errors but doesn't fail registration if email fails

**Authorization**: Public endpoint - no auth required

**Example Usage**:
```typescript
const registration = await api.registration.create.useMutation({
  ticketTypeId: "clx123...",
  email: "john@example.com",
  name: "John Doe",
});
```

**Output**:
```typescript
{
  id: string;
  event: {
    name: string;
    slug: string;
    startDate: Date;
  };
  ticketType: {
    name: string;
  };
  registrationCode: string;
  message: "Registration successful! Confirmation email sent.";
}
```

**Error Responses**:
- `NOT_FOUND`: Ticket type or event not found
- `BAD_REQUEST`: Ticket sold out / Sale period invalid
- Email errors: Logged but don't block registration

**Concurrency Control**:
```typescript
// Row-level lock prevents race conditions
const ticketTypeRows = await tx.$queryRaw`
  SELECT ... FROM "TicketType" tt
  LEFT JOIN "Registration" r ON r."ticketTypeId" = tt.id
  WHERE tt.id = ${input.ticketTypeId}
  GROUP BY ...
  FOR UPDATE OF tt
`;
```

---

### `registration.list`

**Type**: Query  
**Auth**: Protected (requires event organizer)  
**Purpose**: List all registrations for an event with search and filtering

**Input Schema**:
```typescript
{
  eventId: string;           // CUID
  limit?: number;            // 1-100, default: 20
  cursor?: string;           // For pagination
  search?: string;           // Search by name or email
  ticketTypeId?: string;     // Filter by ticket type
}
```

**Business Logic**:

1. **Authorization Check**:
   - Verifies user is the event organizer
   - Returns `FORBIDDEN` if not authorized

2. **Search Functionality**:
   - Searches in both `name` and `email` fields (case-insensitive)
   - Uses Prisma's `contains` with `mode: "insensitive"`

3. **Filtering**:
   - Optional filter by `ticketTypeId`
   - Combines search and filter conditions

4. **Pagination**:
   - Cursor-based pagination using registration ID
   - Orders by `registeredAt` descending (newest first)
   - Returns `nextCursor` if more results available

5. **Response**:
   - Includes ticket type info (id, name)
   - Returns total count for pagination UI
   - Maps to clean response format

**Authorization**: Must be event organizer

**Example Usage**:
```typescript
const { data } = api.registration.list.useInfiniteQuery({
  eventId: "clx123...",
  limit: 50,
  search: "john",
  ticketTypeId: "clx456...",
});
```

**Output**:
```typescript
{
  items: Array<{
    id: string;
    email: string;
    name: string;
    ticketType: { id: string; name: string };
    paymentStatus: string;
    emailStatus: string;
    registeredAt: Date;
  }>;
  nextCursor?: string;
  total: number;
}
```

**Error Responses**:
- `NOT_FOUND`: Event not found
- `FORBIDDEN`: User is not event organizer

---

### `registration.getById`

**Type**: Query  
**Auth**: Protected (requires event organizer)  
**Purpose**: Get detailed information for a single registration

**Input Schema**:
```typescript
{
  id: string; // CUID
}
```

**Business Logic**:

1. **Data Fetching**:
   - Fetches registration with event and ticket type relations
   - Includes organizer ID for authorization check

2. **Authorization**:
   - Verifies user is the event organizer
   - Returns `FORBIDDEN` if not authorized

3. **Response Enhancement**:
   - Extracts `registrationCode` from `customData` JSON field
   - Includes ticket type details (name, price)
   - Includes payment and email status

**Authorization**: Must be event organizer

**Example Usage**:
```typescript
const { data } = api.registration.getById.useQuery({
  id: "clx123..."
});
```

**Output**:
```typescript
{
  id: string;
  email: string;
  name: string;
  ticketType: { name: string; price: Decimal };
  paymentStatus: string;
  paymentIntentId: string | null;
  emailStatus: string;
  customData: Record<string, unknown> | null;
  registrationCode: string;
  registeredAt: Date;
}
```

**Error Responses**:
- `NOT_FOUND`: Registration not found
- `FORBIDDEN`: User is not event organizer

---

### `registration.addManually`

**Type**: Mutation  
**Auth**: Protected (requires event organizer)  
**Purpose**: Manually add an attendee (bypasses availability checks)

**Input Schema**:
```typescript
{
  eventId: string;
  ticketTypeId: string;
  email: string;
  name: string;           // 2-100 characters
  sendConfirmation?: boolean; // Default: true
}
```

**Business Logic**:

1. **Authorization Check**:
   - Verifies user is event organizer
   - Returns `FORBIDDEN` if not authorized

2. **Ticket Type Validation**:
   - Verifies ticket type exists
   - Returns `NOT_FOUND` if ticket type invalid

3. **Registration Creation (Organizer Override)**:
   - **Bypasses availability check** (organizer privilege)
   - **Bypasses sale period restrictions**
   - Generates registration code
   - Sets `customData.addedManually: true` flag
   - Sets `paymentStatus: "free"` and `emailStatus: "active"`

4. **Optional Email Confirmation**:
   - Sends confirmation email if `sendConfirmation: true`
   - Uses same template as public registration
   - Logs errors but doesn't fail operation

**Use Cases**:
- VIP registrations
- Complimentary tickets
- Staff/volunteer registrations
- Manual corrections

**Authorization**: Must be event organizer

**Example Usage**:
```typescript
await api.registration.addManually.mutate({
  eventId: "clx123...",
  ticketTypeId: "clx456...",
  email: "vip@example.com",
  name: "VIP Guest",
  sendConfirmation: true,
});
```

**Output**:
```typescript
{
  id: string;
  email: string;
  name: string;
  ticketType: { name: string };
  paymentStatus: string;
  emailStatus: string;
  customData: {
    registrationCode: string;
    addedManually: true;
  };
  registeredAt: Date;
}
```

**Error Responses**:
- `NOT_FOUND`: Event or ticket type not found
- `FORBIDDEN`: User is not event organizer

---

### `registration.cancel`

**Type**: Mutation  
**Auth**: Protected (requires event organizer)  
**Purpose**: Cancel a registration (hard delete - frees up ticket)

**Input Schema**:
```typescript
{
  id: string;
  reason?: string;           // Optional cancellation reason
  sendNotification?: boolean; // Default: true
}
```

**Business Logic**:

1. **Authorization Check**:
   - Fetches registration with event details
   - Verifies user is event organizer
   - Returns `FORBIDDEN` if not authorized

2. **Hard Delete**:
   - **Permanently deletes registration** from database
   - **Frees up ticket** (decrements sold count)
   - Cannot be undone

3. **Optional Notification Email**:
   - Sends cancellation email if `sendNotification: true`
   - Includes cancellation reason if provided
   - Uses basic HTML template (TODO: Create dedicated template)
   - Logs errors but doesn't fail operation

**Important Notes**:
- This is a **hard delete**, not soft delete
- Ticket becomes available again for purchase
- Data cannot be recovered after deletion

**Authorization**: Must be event organizer

**Example Usage**:
```typescript
await api.registration.cancel.mutate({
  id: "clx123...",
  reason: "Duplicate registration",
  sendNotification: true,
});
```

**Output**:
```typescript
{
  success: true;
  message: "Registration cancelled successfully";
}
```

**Error Responses**:
- `NOT_FOUND`: Registration not found
- `FORBIDDEN`: User is not event organizer

---

### `registration.export`

**Type**: Mutation  
**Auth**: Protected (requires event organizer)  
**Purpose**: Export registrations to CSV format

**Input Schema**:
```typescript
{
  eventId: string;
  format?: 'csv' | 'json'; // Default: 'csv' (JSON not implemented)
}
```

**Business Logic**:

1. **Authorization Check**:
   - Verifies user is event organizer
   - Returns `FORBIDDEN` if not authorized

2. **Data Fetching**:
   - Fetches ALL registrations for the event (no pagination)
   - Includes ticket type name
   - Orders by `registeredAt` descending

3. **CSV Generation**:
   - Creates CSV with headers: Name, Email, Ticket Type, Registration Date, Payment Status
   - Escapes special characters (commas, quotes)
   - Wraps fields containing commas/quotes in double quotes
   - Replaces internal quotes with double-quotes (`""`)

4. **Data URI Response**:
   - Converts CSV to data URI for immediate download
   - Generates filename: `{event-slug}-attendees-{date}.csv`
   - Sets expiration: 5 minutes (for security)

**CSV Format**:
```csv
Name,Email,Ticket Type,Registration Date,Payment Status
John Doe,john@example.com,General Admission,2025-01-15T10:30:00Z,free
Jane Smith,jane@example.com,VIP Pass,2025-01-16T14:20:00Z,free
```

**Authorization**: Must be event organizer

**Example Usage**:
```typescript
const exportMutation = api.registration.export.useMutation({
  onSuccess: (data) => {
    const link = document.createElement('a');
    link.href = data.url;
    link.download = data.filename;
    link.click();
  },
});

exportMutation.mutate({ eventId: "clx123..." });
```

**Output**:
```typescript
{
  url: string;           // data:text/csv;charset=utf-8,...
  filename: string;      // "tech-conf-2025-attendees-2025-11-18.csv"
  expiresAt: Date;       // 5 minutes from now
}
```

**Error Responses**:
- `NOT_FOUND`: Event not found
- `FORBIDDEN`: User is not event organizer

**Security Considerations**:
- No server-side file storage (data URI only)
- Short expiration window (5 minutes)
- Authorization required
- Contains PII (personal data) - handle carefully

**See Also**: [Exports Documentation](./exports.md)

---

### `registration.resendConfirmation`

**Type**: Mutation  
**Auth**: Protected (requires event organizer)  
**Purpose**: Resend confirmation email to an attendee

**Input Schema**:
```typescript
{
  id: string; // CUID
}
```

**Business Logic**:

1. **Authorization Check**:
   - Fetches registration with event and ticket type details
   - Verifies user is event organizer
   - Returns `FORBIDDEN` if not authorized

2. **Email Sending**:
   - Extracts registration code from `customData`
   - Uses `RegistrationConfirmation` React Email template
   - Includes all event details and registration code
   - Throws error if email sending fails

**Use Cases**:
- Attendee didn't receive original email
- Email went to spam folder
- Attendee lost confirmation email
- Attendee needs registration code reminder

**Authorization**: Must be event organizer

**Example Usage**:
```typescript
await api.registration.resendConfirmation.mutate({
  id: "clx123..."
});
```

**Output**:
```typescript
{
  success: true;
  message: "Confirmation email resent to john@example.com";
}
```

**Error Responses**:
- `NOT_FOUND`: Registration not found
- `FORBIDDEN`: User is not event organizer
- Email errors: Thrown as exceptions

---

### `registration.updateEmailStatus`

**Type**: Mutation  
**Auth**: Public (called by webhook)  
**Purpose**: Update email status when webhook receives bounce/unsubscribe events

**Input Schema**:
```typescript
{
  email: string;
  status: 'active' | 'bounced' | 'unsubscribed';
}
```

**Business Logic**:

1. **Bulk Update**:
   - Updates ALL registrations with matching email
   - Uses `updateMany` for efficiency
   - Returns count of updated records

2. **Email Status Values**:
   - **active**: Can receive emails (default)
   - **bounced**: Email delivery failed (hard bounce)
   - **unsubscribed**: User opted out of communications

3. **Webhook Integration**:
   - Called by email service provider webhook (Resend, SendGrid, etc.)
   - No authentication (consider adding webhook signature verification)
   - Updates status across all events for this email

**Authorization**: Public endpoint (webhook)

**Example Usage**:
```typescript
// Called by email service webhook
await api.registration.updateEmailStatus.mutate({
  email: "bounced@example.com",
  status: "bounced",
});
```

**Output**:
```typescript
{
  updated: number; // Count of registrations updated
}
```

**Security Considerations**:
- ⚠️ Public endpoint - consider adding webhook signature verification
- Update affects all registrations with this email across all events
- No rollback mechanism

**Future Improvements**:
- Add webhook signature verification (HMAC)
- Add rate limiting
- Add audit logging
- Consider event-specific email status

---

## Validation

All input validation is handled by Zod schemas from `src/lib/validators.ts`:

**Schemas Used**:
- `createRegistrationSchema`: Public registration
- `listRegistrationsSchema`: Registration listing with pagination
- `exportRegistrationsSchema`: CSV export
- Various inline schemas for other procedures

**Common Validations**:
- **CUID format**: All IDs must be valid CUIDs
- **Email format**: Standard email validation
- **Name length**: 2-100 characters
- **Enum values**: Payment status, email status, export format

---

## Error Handling

Common error patterns:

### Authorization Errors
```typescript
if (event.organizerId !== ctx.session.user.id) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You do not have permission...",
  });
}
```

### Not Found Errors
```typescript
if (!registration) {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Registration not found",
  });
}
```

### Business Logic Errors
```typescript
if (available <= 0) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "This ticket type is sold out...",
  });
}
```

### Email Errors (Non-blocking)
```typescript
sendEmail(...)
  .catch((error) => {
    console.error("[Registration] Failed to send email", error);
    // Don't throw - registration is already created
  });
```

---

## Concurrency & Race Conditions

### Problem
Multiple users registering for the last ticket simultaneously could cause overselling.

### Solution: Row-Level Locking
```typescript
// Lock the TicketType row during transaction
const ticketTypeRows = await tx.$queryRaw`
  SELECT ... FROM "TicketType" tt
  LEFT JOIN "Registration" r ON r."ticketTypeId" = tt.id
  WHERE tt.id = ${input.ticketTypeId}
  GROUP BY ...
  FOR UPDATE OF tt  -- ← This locks the row
`;
```

**How it works**:
1. Transaction starts
2. `FOR UPDATE` locks the TicketType row
3. Other transactions wait until lock is released
4. Availability check and registration creation are atomic
5. Transaction commits, lock releases

**Benefits**:
- ✅ Prevents overselling
- ✅ Database-level guarantee
- ✅ Works across multiple server instances
- ✅ No race conditions

---

## Related Files

### Backend
- **Router**: `src/server/api/routers/registration.ts`
- **Validators**: `src/lib/validators.ts`
- **Email Service**: `src/server/services/email.ts`

### Frontend
- **Registration Form**: `src/components/registration/registration-form.tsx`
- **Attendee Table**: `src/components/registration/attendee-table.tsx`
- **Attendees Page**: `src/app/(dashboard)/[id]/attendees/page.tsx`

### Email Templates
- **Confirmation**: `emails/registration-confirmation.tsx`
- **Cancellation**: (TODO: Create template)

### Database
- **Schema**: `prisma/schema.prisma` (Registration model)
- **Migrations**: `prisma/migrations/`

---

## Integration Points

### Tickets Module
- Registration checks ticket availability
- Uses ticket sale periods for validation
- Locked queries prevent overselling

### Events Module
- All registrations belong to an event
- Event organizer has access to registrations
- Event details included in confirmation emails

### Communications Module
- Sends confirmation emails via `sendEmail` service
- Tracks email status (bounced, unsubscribed)
- Email campaigns target registered attendees

### Attendees Module
- Attendees module provides alternative view of registrations
- Shares same data model and backend router
- Different frontend components for different use cases

---

## Performance Considerations

### Database Indexes
- `@@index([eventId])`: Fast lookups by event
- `@@index([ticketTypeId])`: Fast availability checks
- `@@index([email])`: Email status updates
- `@@index([userId])`: User's registrations

### Query Optimization
- Use `include` to fetch relations in single query
- Cursor-based pagination for large datasets
- Debounced search to reduce API calls
- Aggregate counts with `COUNT()`

### Caching
- Consider caching ticket availability (with invalidation on registration)
- Cache event details for confirmation emails
- No caching on registration list (real-time data)

---

## Future Enhancements

### Payment Integration
- Stripe/Paystack payment processing
- Payment status tracking
- Refund handling

### Advanced Features
- QR code generation for check-in
- Ticket transfer between attendees
- Waitlist management
- Discount codes/coupons

### Email Improvements
- Dedicated cancellation email template
- Event reminder emails
- Post-event follow-up

### Security
- Webhook signature verification for `updateEmailStatus`
- Rate limiting on public endpoints
- CAPTCHA on registration form
