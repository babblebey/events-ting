# tRPC Attendees Router Contract

**Feature**: `003-ticket-attendee-separation`  
**Router**: `src/server/api/routers/attendees.ts`  
**Purpose**: Attendee information management and email communication

## Procedures

### 1. `attendees.list`

**Type**: Query  
**Auth**: Protected (event organizer)  
**Description**: List all attendees for an event

#### Input Schema

```typescript
import { z } from 'zod';

const ListAttendeesInput = z.object({
  eventId: z.string(),
  
  // Filters
  emailStatus: z.enum(['active', 'bounced', 'unsubscribed']).optional(),
  search: z.string().optional(), // Search by name or email
  
  // Pagination
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
```

#### Output Schema

```typescript
const AttendeeOutput = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailStatus: z.enum(['active', 'bounced', 'unsubscribed']),
  customData: z.record(z.any()).nullable(),
  
  // Related ticket info
  ticket: z.object({
    id: z.string(),
    ticketNumber: z.string(),
    isCheckedIn: z.boolean(),
    checkedInAt: z.date().nullable(),
    ticketType: z.object({
      id: z.string(),
      name: z.string(),
    }),
  }),
  
  createdAt: z.date(),
  updatedAt: z.date(),
});

const ListAttendeesOutput = z.object({
  attendees: z.array(AttendeeOutput),
  nextCursor: z.string().nullable(),
  total: z.number(), // Total count for pagination UI
});
```

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User not authorized to view this event's attendees
- `NOT_FOUND` - Event ID does not exist

---

### 2. `attendees.getById`

**Type**: Query  
**Auth**: Public (attendee can view own record)  
**Description**: Get attendee details by ID

#### Input Schema

```typescript
const GetAttendeeByIdInput = z.object({
  attendeeId: z.string(),
});
```

#### Output Schema

```typescript
const GetAttendeeByIdOutput = AttendeeOutput; // Same as list output
```

#### Error Codes

- `NOT_FOUND` - Attendee ID does not exist
- `FORBIDDEN` - User not authorized to view this attendee

---

### 3. `attendees.update`

**Type**: Mutation  
**Auth**: Protected (attendee themselves or event organizer)  
**Description**: Update attendee information

#### Input Schema

```typescript
const UpdateAttendeeInput = z.object({
  attendeeId: z.string(),
  
  // Updatable fields
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  customData: z.record(z.any()).optional(),
});
```

#### Output Schema

```typescript
const UpdateAttendeeOutput = z.object({
  attendee: AttendeeOutput,
});
```

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User not authorized to update this attendee
- `NOT_FOUND` - Attendee ID does not exist
- `BAD_REQUEST` - Custom data validation failed

#### Business Logic

1. Verify user is attendee or event organizer
2. Validate custom data against event's field schema
3. Update attendee record
4. If email changed, send confirmation email to new address
5. Return updated attendee

---

### 4. `attendees.exportList`

**Type**: Query  
**Auth**: Protected (event organizer)  
**Description**: Export attendee list as CSV for event logistics

#### Input Schema

```typescript
const ExportAttendeesInput = z.object({
  eventId: z.string(),
  
  // Filters (same as list)
  emailStatus: z.enum(['active', 'bounced', 'unsubscribed']).optional(),
  
  // Export options
  includeCustomFields: z.boolean().default(true),
  includeCheckInStatus: z.boolean().default(true),
});
```

#### Output Schema

```typescript
const ExportAttendeesOutput = z.object({
  csv: z.string(), // CSV content as string
  filename: z.string(), // Suggested filename (e.g., "attendees-event-name-2025-11-19.csv")
  rowCount: z.number(),
});
```

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User not authorized to export this event's attendees
- `NOT_FOUND` - Event ID does not exist

#### Business Logic

1. Verify user is event organizer
2. Fetch all attendees for event (no pagination)
3. Build CSV with columns:
   - Name, Email, Ticket Number, Ticket Type, Check-In Status, Check-In Time
   - Custom field columns (if includeCustomFields = true)
4. Return CSV string with suggested filename

---

### 5. `attendees.getCustomFieldResponses`

**Type**: Query  
**Auth**: Protected (event organizer)  
**Description**: Get aggregated custom field responses for event planning

#### Input Schema

```typescript
const GetCustomFieldResponsesInput = z.object({
  eventId: z.string(),
  fieldId: z.string(), // Which custom field to aggregate
});
```

#### Output Schema

```typescript
const GetCustomFieldResponsesOutput = z.object({
  fieldId: z.string(),
  fieldLabel: z.string(),
  fieldType: z.string(), // 'text' | 'select' | 'checkbox' | etc.
  
  // Aggregated responses
  responses: z.array(z.object({
    value: z.string(), // The response value
    count: z.number(), // How many attendees selected this
  })),
  
  totalResponses: z.number(),
});
```

#### Example Output

```json
{
  "fieldId": "dietary",
  "fieldLabel": "Dietary Restrictions",
  "fieldType": "select",
  "responses": [
    { "value": "None", "count": 42 },
    { "value": "Vegetarian", "count": 15 },
    { "value": "Vegan", "count": 8 },
    { "value": "Gluten-Free", "count": 5 }
  ],
  "totalResponses": 70
}
```

#### Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User not authorized to view this event's data
- `NOT_FOUND` - Event or field ID does not exist

---

### 6. `attendees.updateEmailStatus`

**Type**: Mutation  
**Auth**: System/Internal (webhook from Resend)  
**Description**: Update email delivery status (bounced/unsubscribed)

#### Input Schema

```typescript
const UpdateEmailStatusInput = z.object({
  email: z.string().email(),
  eventId: z.string(),
  status: z.enum(['active', 'bounced', 'unsubscribed']),
  reason: z.string().optional(), // Bounce/unsubscribe reason
});
```

#### Output Schema

```typescript
const UpdateEmailStatusOutput = z.object({
  updated: z.number(), // Number of attendees updated (can be multiple if same email used)
  attendeeIds: z.array(z.string()),
});
```

#### Error Codes

- `UNAUTHORIZED` - Invalid webhook signature
- `NOT_FOUND` - No attendees found with this email for event

#### Business Logic

1. Verify webhook signature (Resend webhook secret)
2. Find all attendees with matching email for this event
3. Update emailStatus field
4. Return count of updated records

---

## Error Handling

Same error handling strategy as tickets router - use tRPC error codes with descriptive messages.

---

## Rate Limiting

**Export endpoint**:
- Limit: 5 requests per minute per user
- Prevents abuse of CSV export

**Update endpoints**:
- Limit: 30 requests per minute per user
- Standard rate for mutations

---

## Caching Strategy

**Attendee list**:
- Cache: No caching (data changes frequently)
- Always fetch fresh from database

**Custom field aggregations**:
- Cache: Redis, TTL 5 minutes
- Invalidate on: Attendee update

---

## Testing Contracts

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { ListAttendeesInput } from './attendees';

describe('ListAttendeesInput schema', () => {
  it('should validate correct input', () => {
    const input = { eventId: 'cm3abc123', limit: 10 };
    expect(() => ListAttendeesInput.parse(input)).not.toThrow();
  });

  it('should reject invalid email status', () => {
    const input = { eventId: 'cm3abc123', emailStatus: 'invalid' };
    expect(() => ListAttendeesInput.parse(input)).toThrow();
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createCaller } from '@/server/api/routers/attendees';
import { createMockContext } from '@/tests/helpers';

describe('attendees.list', () => {
  it('should list attendees for event organizer', async () => {
    const ctx = createMockContext({ userId: 'organizer123' });
    const caller = createCaller(ctx);
    
    const result = await caller.list({ eventId: 'event123' });
    
    expect(result.attendees).toHaveLength(10);
    expect(result.total).toBe(50);
  });
  
  it('should filter by email status', async () => {
    const ctx = createMockContext({ userId: 'organizer123' });
    const caller = createCaller(ctx);
    
    const result = await caller.list({
      eventId: 'event123',
      emailStatus: 'active',
    });
    
    expect(result.attendees.every(a => a.emailStatus === 'active')).toBe(true);
  });
});
```

---

## Summary

This contract defines 6 tRPC procedures for attendee management:
1. **list** - Browse attendees with filters
2. **getById** - Lookup specific attendee
3. **update** - Update attendee information
4. **exportList** - Export as CSV
5. **getCustomFieldResponses** - Aggregate custom field data
6. **updateEmailStatus** - Handle email delivery webhooks

All procedures use Zod for validation and follow tRPC error handling conventions.
