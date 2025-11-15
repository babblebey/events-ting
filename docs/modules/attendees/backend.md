# Attendees Backend Documentation

## Overview

The Attendees module uses two backend routers:
1. **Registration Router** (`registrationRouter`) - For list, export, resend, cancel operations
2. **Attendees Router** (`attendeesRouter`) - For CSV import operations (NEW)

This document describes the procedures used for attendee management and import functionality.

## Router Locations

**Registration Router**:
- **File**: `src/server/api/routers/registration.ts`  
- **Router**: `registrationRouter`  
- **Shared With**: Registration Module
- **Purpose**: Attendee list management and basic operations

**Attendees Router** (NEW):
- **File**: `src/server/api/routers/attendees.ts`  
- **Router**: `attendeesRouter`  
- **Purpose**: CSV import operations (organizer-only features)

## Key Procedures for Attendee Management

---

## CSV Import Procedures (attendeesRouter)

### 6. `attendees.parseCSV` (Protected)

**Purpose**: Parse uploaded CSV file and return preview with smart field mapping suggestions  
**Type**: Mutation  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  eventId: string (cuid),
  fileContent: string, // Base64 encoded CSV content
  fileName: string
}
```

**Output**:
```typescript
{
  columns: string[], // CSV column headers
  preview: Array<Record<string, string>>, // First 10 rows
  totalRows: number, // Total data rows (excluding header)
  suggestedMapping: Record<string, string> // Column name -> field mapping suggestions
}
```

**Business Logic**:
1. Validates file size (10MB max) and row count (10,000 max)
2. Parses CSV using PapaParse library
3. Strips UTF-8 BOM if present
4. Extracts column headers
5. Returns first 10 rows as preview
6. Generates smart field mapping suggestions using fuzzy matching:
   - "Full Name" / "Name" / "Attendee Name" → "name"
   - "Email" / "Email Address" → "email"
   - "Ticket" / "Ticket Type" → "ticketType"
   - Etc.

**Authorization**:
- Verifies user owns the event

**Validation Rules**:
- File must be valid CSV format
- Maximum 10MB file size
- Maximum 10,000 rows (dual limits - whichever is hit first)
- At least 1 data row required
- UTF-8 encoding required

**Error Handling**:
- Malformed CSV → User-friendly error message
- File too large → "File exceeds 10MB limit"
- Too many rows → "File exceeds 10,000 row limit"
- Invalid encoding → "Please ensure file is UTF-8 encoded"

**Feature Requirements**: FR-019 (Import)

---

### 7. `attendees.validateImport` (Protected)

**Purpose**: Validate CSV data before import with two-phase duplicate detection  
**Type**: Mutation  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  eventId: string (cuid),
  fileContent: string, // Base64 encoded CSV
  fieldMapping: Record<string, string>, // CSV column -> system field
  duplicateStrategy: 'skip' | 'create'
}
```

**Output**:
```typescript
{
  validRows: number,
  invalidRows: number,
  inFileDuplicates: number, // NEW: Duplicates within CSV
  databaseDuplicates: number, // NEW: Existing in database
  errors: Array<{
    row: number, // 1-indexed row number
    field: string, // Field name with error
    value: string, // Invalid value
    error: string, // Error description
    type: 'validation' | 'duplicate_in_file' | 'duplicate_in_db'
  }>
}
```

**Two-Phase Duplicate Detection**:

**Phase 1: In-File Duplicates**
- Detects duplicate emails within the CSV file itself
- Tracks first occurrence, marks subsequent as duplicates
- Error type: `duplicate_in_file`
- Example: Email "john@example.com" appears in rows 5 and 12

**Phase 2: Database Duplicates**
- Checks each email against existing registrations for the event
- Query: `email + eventId` combination
- Error type: `duplicate_in_db`
- Only checks valid, non-in-file-duplicate rows

**Validation Rules**:
1. **Required Fields**:
   - `name` - Must be mapped and non-empty (min 2 chars, max 255)
   - `email` - Must be mapped, valid format, max 255 chars
   - `ticketType` - Must be mapped and exist in event

2. **Optional Fields**:
   - `paymentStatus` - Enum: 'free', 'pending', 'paid', 'failed', 'refunded'
   - `emailStatus` - Enum: 'active', 'bounced', 'unsubscribed'
   - Custom fields - Stored in customData JSON

3. **Email Validation**:
   - Format validation using regex
   - Case-insensitive comparison for duplicates
   - Trimmed before validation

4. **Ticket Type Validation**:
   - Must match existing ticket type name or ID
   - Case-insensitive matching
   - Ticket must belong to the event

**Authorization**:
- Verifies user owns the event

**Performance Optimization**:
- Batch database queries for ticket types
- Single query to check all database duplicates
- In-memory validation for field-level rules

**Example Output**:
```typescript
{
  validRows: 245,
  invalidRows: 2,
  inFileDuplicates: 3,
  databaseDuplicates: 5,
  errors: [
    { row: 12, field: 'email', value: 'invalid@', error: 'Invalid email format', type: 'validation' },
    { row: 15, field: 'email', value: 'john@example.com', error: 'Duplicate email in file (first at row 5)', type: 'duplicate_in_file' },
    { row: 20, field: 'email', value: 'existing@example.com', error: 'Email already registered for this event', type: 'duplicate_in_db' },
    { row: 45, field: 'ticketType', value: 'Super VIP', error: 'Ticket type not found', type: 'validation' }
  ]
}
```

**Feature Requirements**: FR-019 (Import)

---

### 8. `attendees.executeImport` (Protected)

**Purpose**: Execute validated CSV import with partial commit strategy  
**Type**: Mutation  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  eventId: string (cuid),
  fileContent: string, // Base64 encoded CSV
  fieldMapping: Record<string, string>,
  duplicateStrategy: 'skip' | 'create',
  sendConfirmationEmails: boolean // Default: false
}
```

**Output**:
```typescript
{
  successCount: number,
  failureCount: number,
  skippedCount: number, // Duplicates skipped
  errors: Array<{
    row: number,
    field: string,
    value: string,
    error: string
  }>,
  status: 'completed' | 'partial' | 'failed',
  message: string
}
```

**Partial Commit Strategy**:

Unlike traditional all-or-nothing transactions, this import uses **partial commit**:
1. Process rows one by one
2. Commit successful rows immediately
3. Continue processing after individual failures
4. Return summary of successes and failures

**Benefits**:
- Organizers get valid data immediately
- Failed rows can be fixed and re-imported separately
- Better UX for large imports with minor issues
- No need to fix all errors before getting any results

**Business Logic**:

1. **Parse and Re-validate**:
   - Parse CSV again (validation may have been done earlier)
   - Skip invalid rows
   - Apply duplicate strategy

2. **Process Each Row**:
   ```typescript
   for (const row of validRows) {
     try {
       // Generate unique registration code
       const registrationCode = generateRegistrationCode()
       
       // Map custom fields
       const customData = {
         registrationCode,
         ...unmappedFields
       }
       
       // Create registration
       await db.registration.create({
         data: {
           eventId,
           email: row.email,
           name: row.name,
           ticketTypeId: row.ticketTypeId,
           paymentStatus: row.paymentStatus || 'free',
           emailStatus: row.emailStatus || 'active',
           customData
         }
       })
       
       // Send confirmation email if enabled
       if (sendConfirmationEmails) {
         await sendEmail({
           to: row.email,
           template: RegistrationConfirmation,
           data: { registrationCode, eventName, ... }
         })
       }
       
       successCount++
     } catch (error) {
       failureCount++
       errors.push({ row, error: error.message })
       // Continue processing next row
     }
   }
   ```

3. **Generate Registration Codes**:
   - Unique 9-character alphanumeric code
   - Stored in `customData.registrationCode`
   - Used for check-in and confirmations

4. **Handle Custom Fields**:
   - Unmapped CSV columns stored in `customData`
   - Column names used as-is (no `custom_` prefix in JSON)
   - Example: CSV column "Company" → `customData.company`

5. **Send Confirmation Emails** (Optional):
   - Only if `sendConfirmationEmails: true`
   - Sent asynchronously (failures logged, not blocking)
   - Uses same template as regular registration

**Duplicate Handling**:
- **Skip** (default): Skip duplicate rows, count as `skippedCount`
- **Create**: Create duplicate registrations (with warning)

**Authorization**:
- Verifies user owns the event

**Performance Considerations**:
- Large imports (>1000 rows) may take 30-60 seconds
- MVP: Synchronous processing with indeterminate progress
- Future: Background job with real-time updates via WebSocket

**Error Recovery**:
- Individual row failures don't affect other rows
- Database constraints prevent duplicate IDs
- Email send failures logged but don't fail import

**Example Output**:
```typescript
{
  successCount: 245,
  failureCount: 2,
  skippedCount: 3,
  errors: [
    { row: 12, field: 'email', value: 'invalid@', error: 'Invalid email format' },
    { row: 45, field: 'ticketType', value: 'Unknown', error: 'Ticket type not found' }
  ],
  status: 'partial',
  message: '245 attendees imported successfully, 2 failed, 3 duplicates skipped'
}
```

**Feature Requirements**: FR-019 (Import)

---

## CSV Parsing Details

**Library**: PapaParse (v5.4.1)

**Configuration**:
```typescript
Papa.parse(csvContent, {
  header: true, // First row as column names
  skipEmptyLines: true,
  transformHeader: (header) => header.trim(), // Remove whitespace
  transform: (value) => value.trim(), // Trim all values
})
```

**File Size Limits** (Dual):
- **10MB maximum file size** - Prevents memory issues
- **10,000 rows maximum** - Prevents performance issues
- Whichever limit is hit first applies

**Encoding**:
- UTF-8 required
- BOM (Byte Order Mark) automatically stripped
- Excel CSV exports supported

---

## Registration Code Generation

**Format**: 9-character alphanumeric (uppercase)  
**Example**: `ABC123DEF`  
**Charset**: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (ambiguous chars removed)

**Generation Function**:
```typescript
function generateRegistrationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 9; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
```

**Uniqueness**: Random generation with low collision probability (34^9 combinations)

---

## Import Error Handling Patterns

**CSV Parsing Errors**:
```typescript
try {
  const parsed = Papa.parse(csvContent)
  if (parsed.errors.length > 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `CSV parsing error: ${parsed.errors[0].message}`
    })
  }
} catch (error) {
  // Return user-friendly error
}
```

**Validation Errors**:
- Row-level errors collected and returned
- Non-blocking - valid rows still imported
- Detailed error messages with row numbers

**Database Errors**:
- Connection failures → Retry with exponential backoff
- Constraint violations → Caught and reported per row
- Partial commit continues on individual failures

---

## Performance Considerations

### Large Import Optimization (>1000 rows)

**Current (MVP)**:
- Synchronous processing
- Indeterminate progress spinner
- Display results upon completion

**Future Enhancement**:
- Background job processing
- Real-time progress updates via WebSocket/SSE
- Resume on failure

### Batch Processing

**Current**: Row-by-row processing with individual commits

**Future Optimization**:
```typescript
// Batch inserts in groups of 100
const batches = chunk(validRows, 100)
for (const batch of batches) {
  await db.registration.createMany({ data: batch })
}
```

### Database Connection Pooling

- Use Prisma connection pooling
- Limit concurrent writes
- Monitor connection pool size

---

## Key Procedures for Attendee Management (registrationRouter)

### 1. `list` (Protected)

**Purpose**: List all attendees with filtering and search  
**Type**: Query (Infinite)  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  eventId: string (cuid),
  search?: string, // Search by name or email
  ticketTypeId?: string, // Filter by specific ticket type
  limit?: number (1-100, default: 20),
  cursor?: string (cuid) // For pagination
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
      name: string
    },
    paymentStatus: string,
    emailStatus: string,
    registeredAt: Date
  }>,
  nextCursor?: string,
  total: number // Total count for pagination
}
```

**Attendee-Specific Usage**:
- **Search**: Debounced search by name or email (500ms)
- **Filter**: Ticket type dropdown for organizing by access level
- **Pagination**: Infinite scroll with cursor-based pagination
- **Sorting**: Always ordered by `registeredAt DESC` (newest first)

**Authorization**:
- Verifies user owns the event

**Query Pattern**:
```typescript
const { data } = api.registration.list.useInfiniteQuery({
  eventId,
  limit: 50,
  search: debouncedSearch || undefined,
  ticketTypeId: selectedTicketType
}, {
  getNextPageParam: (lastPage) => lastPage.nextCursor
});
```

**Indexes Used**:
- `Registration.eventId` - Fast event lookup
- `Registration.eventId + ticketTypeId` - Filtered queries
- `Registration.registeredAt` - Sorting
- `Registration.email` - Search optimization (with contains)

**Feature Requirements**: FR-016

---

### 2. `export` (Protected)

**Purpose**: Export attendee list to CSV format  
**Type**: Query  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  eventId: string (cuid),
  format: 'csv' | 'json' (default: 'csv')
}
```

**Output**:
```typescript
{
  url: string, // Data URI or download URL
  filename: string, // e.g., "tech-conf-2025-attendees-2025-11-10.csv"
  expiresAt?: Date // Future: if using pre-signed cloud URLs
}
```

**CSV Format**:
```csv
Name,Email,Ticket Type,Registration Date,Payment Status
John Doe,john@example.com,General Admission,2025-01-15T10:30:00Z,free
Jane Smith,jane@example.com,VIP Pass,2025-01-16T14:20:00Z,free
```

**Columns Exported**:
1. Name
2. Email
3. Ticket Type (name)
4. Registration Date (ISO format)
5. Payment Status

**Business Logic**:
1. Fetches all registrations for event (no pagination)
2. Generates CSV using custom `generateCSV()` function
3. Returns as data URI for immediate download
4. Filename format: `{event-slug}-attendees-{YYYY-MM-DD}.csv`

**Authorization**:
- Verifies user owns the event

**Data Privacy**:
- Contains PII (names, emails)
- Organizers responsible for secure handling
- Consider GDPR/data protection compliance

**Usage Pattern**:
```typescript
const exportMutation = api.registration.export.useMutation({
  onSuccess: (data) => {
    // Trigger browser download
    const link = document.createElement("a");
    link.href = data.url;
    link.download = data.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
});

exportMutation.mutate({
  eventId,
  format: "csv"
});
```

**Feature Requirements**: FR-018

---

### 3. `resendConfirmation` (Protected)

**Purpose**: Re-send confirmation email to attendee  
**Type**: Mutation  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  id: string (cuid) // Registration ID
}
```

**Output**:
```typescript
{
  success: boolean,
  message: string // "Confirmation email resent to attendee@example.com"
}
```

**Business Logic**:
1. Fetches registration with event and ticket details
2. Retrieves registration code from `customData` JSON field
3. Sends confirmation email using `sendEmail()` service
4. Email template: `RegistrationConfirmation`

**Authorization**:
- Verifies user owns the event associated with registration

**Email Template Data**:
```typescript
{
  attendeeName: registration.name,
  eventName: registration.event.name,
  eventDate: registration.event.startDate,
  ticketType: registration.ticketType.name,
  registrationCode: string,
  eventUrl: string
}
```

**Use Cases**:
- Attendee didn't receive original email
- Email bounced initially but now fixed
- Attendee lost confirmation email

**Error Handling**:
- Email send errors logged but mutation succeeds
- Returns success=false if email fails

---

### 4. `cancel` (Protected)

**Purpose**: Cancel a registration and free up ticket inventory  
**Type**: Mutation  
**Authentication**: Required (organizer only)

**Input Schema**:
```typescript
{
  id: string (cuid) // Registration ID
}
```

**Output**:
```typescript
{
  success: boolean,
  message: string // "Registration cancelled successfully"
}
```

**Business Logic**:
1. Deletes registration record
2. Frees up ticket inventory (one ticket added back)
3. Uses transaction to ensure atomicity

**Authorization**:
- Verifies user owns the event associated with registration

**Transaction Flow**:
```typescript
await db.$transaction(async (tx) => {
  // Delete registration
  await tx.registration.delete({ where: { id } });
  
  // Note: Ticket inventory update would be here in future
  // Currently tickets don't track current availability
});
```

**Side Effects**:
- Registration permanently deleted
- Cannot be undone
- No email sent to attendee (organizer should notify manually if needed)

**Use Cases**:
- Attendee requested cancellation
- Duplicate registration
- Test registration cleanup

---

### 5. `updateEmailStatus` (Public - Webhook)

**Purpose**: Update email delivery status from Resend webhook  
**Type**: Mutation  
**Authentication**: Webhook signature verification (not implemented in current version)

**Input Schema**:
```typescript
{
  email: string,
  status: 'active' | 'bounced' | 'unsubscribed'
}
```

**Output**:
```typescript
{
  updated: number // Count of registrations updated
}
```

**Business Logic**:
- Updates ALL registrations with matching email address
- Sets `emailStatus` field
- Used for tracking email deliverability

**Email Status Values**:
- `active` - Email is deliverable
- `bounced` - Email address bounced
- `unsubscribed` - User opted out of emails

**Webhook Integration**:
```typescript
// Called by Resend webhook
POST /api/webhooks/email-status
{
  email: "attendee@example.com",
  status: "bounced"
}
```

**Future Enhancement**:
- Add webhook signature verification
- Add event-specific filtering
- Track bounce reasons

---

## Query Optimization

### Indexes

The following indexes support attendee management queries:

```prisma
model Registration {
  // ...
  @@index([eventId])
  @@index([ticketTypeId])
  @@index([email])
  @@index([eventId, ticketTypeId])
  @@index([eventId, emailStatus])
  @@index([registeredAt])
}
```

**Usage**:
- `[eventId]` - Base event filtering
- `[eventId, ticketTypeId]` - Ticket type filtering
- `[email]` - Search by email (with LIKE)
- `[eventId, emailStatus]` - Active recipients for campaigns
- `[registeredAt]` - Sorting by date

### Pagination Strategy

**Cursor-Based Pagination**:
```typescript
{
  where: { eventId },
  take: limit + 1, // Fetch one extra to determine if more exist
  cursor: cursor ? { id: cursor } : undefined,
  skip: cursor ? 1 : 0, // Skip cursor item itself
  orderBy: { registeredAt: 'desc' }
}
```

**Benefits**:
- Consistent results even with new registrations
- Efficient for large datasets
- No offset-based issues

---

## Business Rules

### Search Behavior

**Case-Insensitive Search**:
```typescript
{
  OR: [
    { name: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } }
  ]
}
```

**Debouncing**:
- 500ms delay on frontend
- Reduces API calls
- Improves UX

### Email Status Management

**Status Precedence**:
1. `bounced` - Permanent delivery failure
2. `unsubscribed` - User opt-out
3. `active` - Deliverable (default)

**Campaign Filtering**:
- Only send to `emailStatus: 'active'`
- Exclude bounced and unsubscribed

---

## Error Handling

**Common Errors**:
- `NOT_FOUND`: Registration not found
- `FORBIDDEN`: User doesn't own event
- `BAD_REQUEST`: Invalid input data

**Error Response Format**:
```typescript
{
  code: 'FORBIDDEN',
  message: 'You do not have permission to view registrations for this event'
}
```

---

## Performance Considerations

### Large Event Optimization

**For Events with >1000 Attendees**:
1. Use pagination (don't load all at once)
2. Consider server-side export generation
3. Cache ticket type filter options
4. Implement background export jobs for very large datasets

### Search Performance

**Optimization Tips**:
- Use database indexes for contains queries
- Consider full-text search for very large events
- Limit search to active filters (ticketTypeId)

---

## Related Documentation

- [Registration Module Backend](../registration/backend.md) - Full router documentation
- [Frontend Documentation](./frontend.md) - AttendeeTable component
- [Data Model](./data-model.md) - Registration model schema
- [Workflows](./workflows.md) - Management workflows
