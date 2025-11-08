# tRPC Router Contract: Registration

**File**: `src/server/api/routers/registration.ts`  
**Responsibility**: Attendee registration, attendee management, exports

---

## Procedures

### `registration.create`

**Type**: Mutation (Public)  
**Purpose**: Register attendee for event (FR-011, FR-012, FR-013)  
**Authorization**: Public (unauthenticated or authenticated)

**Input Schema**:
```typescript
{
  ticketTypeId: string,
  email: string (email format),
  name: string (2-100 chars),
  customData?: Record<string, any>, // Organizer-defined custom fields
}
```

**Output**:
```typescript
{
  id: string,
  event: {
    name: string,
    slug: string,
    startDate: Date,
  },
  ticketType: {
    name: string,
  },
  registrationCode: string, // Unique code for attendee (QR code generation)
  message: string, // "Registration successful! Confirmation email sent."
}
```

**Business Logic**:
1. **Check ticket availability** (transaction with row lock, Research Section 6):
   ```sql
   SELECT * FROM TicketType WHERE id = ? FOR UPDATE
   ```
2. **Verify sold count < quantity**
3. **Create registration record**
4. **Send confirmation email** via Resend (FR-013)
5. **Return success response**

**Business Rules**:
- Must check availability within transaction to prevent race conditions (NFR-006)
- Generate unique `registrationCode` for attendee check-in (UUID or short code)
- If authenticated user, link `userId` to registration
- Email confirmation sent asynchronously (don't block response)

**Error Cases**:
- `BAD_REQUEST`: Ticket sold out, sale period invalid, invalid input
- `NOT_FOUND`: Ticket type does not exist

---

### `registration.list`

**Type**: Query (Protected)  
**Purpose**: List attendees for event organizer (FR-016)  
**Authorization**: Event organizer only

**Input Schema**:
```typescript
{
  eventId: string,
  filters?: {
    ticketTypeId?: string,
    search?: string, // Search name or email
    registeredAfter?: Date,
    registeredBefore?: Date,
  },
  orderBy?: 'name' | 'email' | 'registeredAt',
  order?: 'asc' | 'desc',
  limit?: number, // default: 50, max: 200
  cursor?: string,
}
```

**Output**:
```typescript
{
  items: Array<{
    id: string,
    email: string,
    name: string,
    ticketType: {
      id: string,
      name: string,
    },
    paymentStatus: string,
    emailStatus: string,
    registeredAt: Date,
  }>,
  nextCursor?: string,
  total: number,
}
```

---

### `registration.getById`

**Type**: Query (Protected)  
**Purpose**: Get single registration details  
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
  email: string,
  name: string,
  ticketType: { name: string, price: Decimal },
  paymentStatus: string,
  paymentIntentId?: string,
  emailStatus: string,
  customData?: Record<string, any>,
  registrationCode: string,
  registeredAt: Date,
}
```

---

### `registration.addManually`

**Type**: Mutation (Protected)  
**Purpose**: Organizer manually adds attendee (FR-017)  
**Authorization**: Event organizer only

**Input Schema**:
```typescript
{
  eventId: string,
  ticketTypeId: string,
  email: string,
  name: string,
  sendConfirmation?: boolean, // default: true
}
```

**Output**:
```typescript
{
  // Registration object
}
```

**Business Rules**:
- Bypasses availability check (organizer override)
- Optionally sends confirmation email

---

### `registration.cancel`

**Type**: Mutation (Protected)  
**Purpose**: Cancel/delete registration (FR-017)  
**Authorization**: Event organizer only

**Input Schema**:
```typescript
{
  id: string,
  reason?: string, // Optional cancellation reason
  sendNotification?: boolean, // default: true
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
- Hard delete registration (reduces sold count, frees up ticket)
- Optionally sends cancellation email to attendee
- Logs cancellation reason for audit

---

### `registration.export`

**Type**: Query (Protected)  
**Purpose**: Export attendee list (FR-018)  
**Authorization**: Event organizer only

**Input Schema**:
```typescript
{
  eventId: string,
  format: 'csv' | 'xlsx',
  filters?: {
    ticketTypeId?: string,
  },
}
```

**Output**:
```typescript
{
  url: string, // Pre-signed URL or data URI for download
  filename: string, // e.g., "nextjs-conf-2025-attendees.csv"
  expiresAt: Date, // URL expiration (if cloud storage)
}
```

**Business Rules**:
- Generate CSV/Excel file with columns: Name, Email, Ticket Type, Registration Date, Payment Status
- Respect data privacy: only export necessary fields
- For large exports (>5000 registrations), use background job + email delivery

---

### `registration.resendConfirmation`

**Type**: Mutation (Protected)  
**Purpose**: Resend confirmation email to attendee  
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
  message: string, // "Confirmation email resent to attendee@example.com"
}
```

---

### `registration.updateEmailStatus`

**Type**: Mutation (Internal/Webhook)  
**Purpose**: Update email status from Resend webhook (FR-049)  
**Authorization**: Webhook signature verification

**Input Schema**:
```typescript
{
  email: string,
  status: 'active' | 'bounced' | 'unsubscribed',
}
```

**Output**:
```typescript
{
  updated: number, // Count of registrations updated
}
```

**Business Rules**:
- Called by Resend webhook handler
- Updates all registrations with matching email

---

## Error Codes

| Code | Scenario | HTTP Status |
|------|----------|-------------|
| `UNAUTHORIZED` | User not authenticated (protected routes) | 401 |
| `FORBIDDEN` | User not event organizer | 403 |
| `NOT_FOUND` | Registration/ticket not found | 404 |
| `BAD_REQUEST` | Ticket sold out, invalid input | 400 |

---

## Implementation Notes

- Use database transaction with `SELECT FOR UPDATE` for `create` to prevent race conditions
- Email sending should be async (don't block mutation response)
- Export generation: Use streaming for large datasets to avoid memory issues
- Consider rate limiting on `create` to prevent spam registrations
