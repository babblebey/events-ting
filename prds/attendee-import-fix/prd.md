# PRD: Fix Attendee CSV Import to Create Ticket and Attendee Records

**Status**: IMPLEMENTED ✅ 
**Priority**: P0 (Critical Bug)  
**Created**: 2025-11-21  
**Owner**: Backend Team  
**Related Spec**: [003-ticket-attendee-separation](../../specs/003-ticket-attendee-separation/)

---

## Problem Statement

### Current Behavior
When organizers import attendees via CSV (`attendees.executeImport`), the system creates **Registration** records but does **not** create the associated **Ticket** and **Attendee** records required by the new data model (Spec 003). This results in:

- ✅ Import returns success response
- ❌ No attendees appear in the attendee list
- ❌ No tickets are created for imported attendees
- ❌ No QR codes generated for check-in
- ❌ Imported data is not usable for event operations

### Root Cause
The `executeImport` procedure in `src/server/api/routers/attendees.ts` (lines 1640-1665) creates only `Registration` records:

```typescript
// Current (INCORRECT) implementation
await ctx.db.registration.create({
  data: {
    eventId: input.eventId,
    ticketTypeId,
    email: row.email!,
    name: row.name!,
    paymentStatus: row.paymentStatus ?? "free",
    emailStatus: row.emailStatus ?? "active",  // ❌ Registration doesn't have emailStatus
    customData,                                 // ❌ Registration doesn't have customData
    registeredAt,
  },
});
```

This violates the data model architecture where:
- **Registration** = Buyer/purchase record (has `quantity` field)
- **Ticket** = Individual ticket instance (has `ticketNumber`, `qrCodeData`)
- **Attendee** = Person attending (has `name`, `email`, `customData`, `emailStatus`)

### Expected Behavior
Each imported CSV row should create:

1. **Registration** record (buyer = imported attendee)
2. **Ticket** record with unique ticket number and QR code
3. **Attendee** record with attendee details
4. **Assignment** linking the ticket to the attendee
5. Optional confirmation email with ticket details

This aligns with the existing registration flow in `registration.ts` (lines 184-213) and ticket assignment flow in `tickets.ts` (lines 424-700).

---

## Success Criteria

### Functional Requirements

**FR-001**: Each imported CSV row MUST create a Registration, Ticket, and Attendee record  
**FR-002**: Each ticket MUST have a unique `ticketNumber` in format `EVT-{YEAR}-{RANDOM8}`  
**FR-003**: Each ticket MUST have `qrCodeData` populated (equal to `ticketNumber`)  
**FR-004**: Each attendee MUST be linked to their ticket via `attendeeId` field  
**FR-005**: Ticket MUST be marked as `isAssigned: true` and `assignedAt` timestamp set  
**FR-006**: Attendee `customData` MUST include imported custom fields and `registrationCode`  
**FR-007**: Attendee `emailStatus` MUST be set from CSV or default to `'active'`  
**FR-008**: System MUST maintain partial commit strategy (valid rows succeed despite individual failures)  
**FR-009**: Import MUST complete within database transaction for each row (atomicity)  
**FR-010**: Optional confirmation emails MUST include ticket details and QR code

### Non-Functional Requirements

**NFR-001**: Import performance MUST support 1000 rows in under 2 minutes  
**NFR-002**: Database transaction overhead MUST not cause significant slowdown  
**NFR-003**: Error messages MUST clearly identify which records failed and why  
**NFR-004**: Import MUST be idempotent (re-running same CSV skips duplicates based on strategy)

### Acceptance Criteria

✅ Importing a 10-row CSV creates 10 Registrations, 10 Tickets, 10 Attendees  
✅ All tickets have unique ticket numbers  
✅ All tickets are assigned to attendees (isAssigned = true)  
✅ Attendees appear in attendee list immediately after import  
✅ Attendee list shows correct ticket type, email status, custom data  
✅ Each ticket has scannable QR code for check-in  
✅ Confirmation emails include ticket number and QR code (if enabled)  
✅ Individual row failures don't affect other rows (partial commit works)  
✅ Import summary shows accurate success/failure counts  
✅ Re-importing same data respects duplicate strategy (skip or create)

---

## Technical Design

### Data Flow

```
CSV Row → Validation → Transaction {
  1. Create Registration (buyer)
  2. Create Ticket (with ticketNumber, qrCodeData)
  3. Create Attendee (with name, email, customData, emailStatus)
  4. Update Ticket (link attendeeId, set isAssigned, assignedAt)
} → Send Email (optional) → Success/Failure Result
```

### Database Schema Changes

**No schema changes required.** All necessary fields exist in current schema:

- `Registration.quantity` - Set to 1 for each import
- `Ticket.ticketNumber` - Unique identifier
- `Ticket.qrCodeData` - QR code payload
- `Ticket.isAssigned` - Assignment status
- `Ticket.assignedAt` - Assignment timestamp
- `Ticket.attendeeId` - Link to attendee
- `Attendee.name`, `email` - Required fields
- `Attendee.customData` - Custom fields + registrationCode
- `Attendee.emailStatus` - Email deliverability status

### Implementation Pattern

Follow existing patterns in codebase:

**Pattern 1: Registration Creation with Tickets** (`registration.ts:184-213`)
```typescript
const result = await ctx.db.$transaction(async (tx) => {
  const registration = await tx.registration.create({ ... });
  
  const tickets = [];
  for (let i = 0; i < quantity; i++) {
    const ticketNumber = generateTicketNumber();
    const ticket = await tx.ticket.create({
      data: {
        registrationId: registration.id,
        eventId: event.id,
        ticketTypeId: input.ticketTypeId,
        ticketNumber,
        qrCodeData: ticketNumber,
        isAssigned: false,
      },
    });
    tickets.push(ticket);
  }
  return { registration, tickets };
});
```

**Pattern 2: Ticket Assignment** (`tickets.ts:590-650`)
```typescript
const result = await ctx.db.$transaction(async (tx) => {
  // Create attendee
  const newAttendee = await tx.attendee.create({
    data: {
      name: attendeeData.name,
      email: attendeeData.email.toLowerCase(),
      customData: attendeeData.customData,
      emailStatus: "active",
      userId,
    },
  });

  // Update ticket with assignment
  const updatedTicket = await tx.ticket.update({
    where: { id: ticketId },
    data: {
      attendeeId: newAttendee.id,
      isAssigned: true,
      assignedAt: new Date(),
    },
    include: { attendee: true, ... },
  });

  return { updatedTicket, newAttendee };
});
```

### Proposed Implementation

**Location**: `src/server/api/routers/attendees.ts`  
**Procedure**: `executeImport` mutation  
**Lines to modify**: 1640-1728

**Key Changes**:

1. **Replace simple `registration.create()` with transaction pattern**
   - Use `ctx.db.$transaction()` for atomicity
   - Create Registration, Ticket, Attendee, and Assignment in sequence

2. **Generate unique ticket number**
   - Use existing `generateTicketNumber()` helper
   - Format: `EVT-{YEAR}-{RANDOM8}`

3. **Set registration quantity to 1**
   - Each import row = 1 ticket purchase
   - Buyer name/email = Attendee name/email

4. **Move `emailStatus` from Registration to Attendee**
   - Remove from Registration creation
   - Add to Attendee creation

5. **Move `customData` from Registration to Attendee**
   - Remove from Registration creation
   - Add to Attendee creation (include registrationCode)

6. **Update confirmation email logic**
   - Include ticket number instead of registration code
   - Generate QR code for email attachment
   - Use ticket assignment email pattern

### Error Handling

**Row-level failures** (continue processing):
- Database constraint violations
- Ticket number collision (retry with new number)
- Email send failures (log but don't fail import)

**Critical failures** (abort entire import):
- Database connection loss
- Event not found
- Permission check failure

### Duplicate Submission Prevention

**Idempotency Key Protection**:
- Frontend generates unique key on component mount: `import-{timestamp}-{random}`
- Key sent with every import request
- Backend caches results for 5 minutes keyed by idempotency key
- Duplicate requests within 5 minutes return cached result (no database writes)
- Cache automatically cleaned up after expiry

**Frontend Protection**:
- `hasStarted` state flag prevents useEffect re-execution
- Import button shows "Starting Import..." and disables during transition
- Mutation state prevents re-submission while pending
- Proper useEffect dependencies prevent accidental re-renders

**Use Cases Protected**:
- User double-clicks "Import" button → Second click ignored (button disabled)
- Component re-mounts due to navigation → useEffect won't re-run (hasStarted flag)
- User refreshes browser during import → New idempotency key, treated as new import
- Backend receives duplicate request (race condition) → Cached result returned

### Backward Compatibility

**Impact**: None. This is a bug fix, not a breaking change.

**Existing data**: No migration needed. Fix only affects new imports.

**API contract**: No changes to input/output schemas.

---

## Implementation Plan

### Phase 1: Core Fix (2 hours) - ✅ DONE 

**Task 1.1**: Update `executeImport` transaction logic
- Replace `registration.create()` with full transaction
- Create Registration → Ticket → Attendee → Assignment
- Test with 10-row CSV

**Task 1.2**: Fix field mappings
- Move `emailStatus` to Attendee
- Move `customData` to Attendee
- Ensure `registrationCode` in customData

**Task 1.3**: Add ticket number generation
- Import `generateTicketNumber()` helper
- Use for both ticket and registration reference

### Phase 2: Email Integration (1 hour) - ✅ DONE 

**Task 2.1**: Update confirmation email
- Replace registration code with ticket number
- Generate QR code for email
- Use `TicketAssigned` email template pattern

**Task 2.2**: Test email delivery
- Verify email contains ticket details
- Check QR code is scannable
- Ensure event details are correct

### Phase 3: Manual Testing & Validation (1 hour)

**Task 3.1**: Test import functionality
- Import 10-row CSV, verify all created correctly
- Test partial commit with mixed valid/invalid rows
- Verify duplicate detection works correctly

**Task 3.2**: Verify attendee list integration
- Import 100-row CSV, verify all created
- Check attendee list shows all imported attendees
- Verify tickets are scannable at check-in

**Task 3.3**: Performance validation
- Import 1000-row CSV, measure time
- Ensure < 2 minutes completion
- Monitor database connection pool usage

### Phase 4: Documentation (30 minutes)

**Task 4.1**: Update backend documentation
- Document new transaction flow
- Add sequence diagram
- Update code comments

**Task 4.2**: Update workflows documentation
- Clarify what records are created
- Add troubleshooting section

---

## Testing Strategy

### Manual Testing Checklist

- [ ] Import 10-row CSV with valid data
- [ ] Verify all 10 attendees appear in attendee list
- [ ] Check each ticket has unique ticket number
- [ ] Scan QR code for one ticket (should work)
- [ ] Import same CSV again with "skip" strategy (should skip all)
- [ ] Import CSV with 5 valid + 5 invalid rows (should import 5)
- [ ] Enable confirmation emails, verify recipients receive tickets
- [ ] Check confirmation email includes QR code image
- [ ] Import 1000-row CSV, measure time (should be < 2 min)
- [ ] Verify imported attendees can be filtered by ticket type
- [ ] Export attendees to CSV, verify imported data present

---

## Risks & Mitigations

### Risk 1: Performance Degradation
**Impact**: High  
**Probability**: Medium  
**Description**: Creating 3 records per row instead of 1 may slow down imports  
**Mitigation**: 
- Use database transactions efficiently
- Batch email sending separately
- Add progress indicator for large imports
- Consider background job processing for >500 rows (future)

### Risk 2: Transaction Deadlocks
**Impact**: Medium  
**Probability**: Low  
**Description**: Concurrent imports may cause database deadlocks  
**Mitigation**:
- Use row-level locking only
- Minimize transaction scope
- Add retry logic with exponential backoff
- Document concurrent import limitations

### Risk 3: Duplicate Ticket Numbers
**Impact**: High  
**Probability**: Very Low  
**Description**: Random ticket number generation may create duplicates  
**Mitigation**:
- Unique constraint on `ticketNumber` (already exists)
- Retry ticket number generation on collision
- Log all collisions for monitoring

### Risk 4: Email Send Failures
**Impact**: Low  
**Probability**: Medium  
**Description**: Email service may fail or rate limit  
**Mitigation**:
- Email sending is async and non-blocking
- Failures logged but don't fail import
- Organizers can resend from attendee list
- Future: Queue emails for retry

---

## Metrics & Monitoring

### Success Metrics

**Import Success Rate**: Target 95%+ of valid rows imported  
**Import Speed**: Target <1 second per row  
**Data Integrity**: 100% of imports create all 3 records  
**Email Delivery**: 90%+ confirmation emails delivered  

### Monitoring

**Database Queries**:
- Track transaction duration
- Monitor connection pool usage
- Alert on deadlocks

**Import Operations**:
- Log import start/complete times
- Track row counts (success/failure/skipped)
- Alert on >10% failure rate

**Error Tracking**:
- Log all row-level failures with details
- Track email send failures
- Monitor ticket number collisions

---

## Open Questions

1. **Q**: Should we update existing imports that are in broken state?  
   **A**: No, this fix is forward-looking only. Organizers can re-import if needed.

2. **Q**: Should we add a "dry run" mode to preview import?  
   **A**: Nice to have, but not required for this bug fix. Add to backlog.

3. **Q**: Should we validate ticket availability before import?  
   **A**: Yes, add warning if import exceeds available tickets, but don't block (organizer privilege).

4. **Q**: Should we support updating existing attendees via import?  
   **A**: No, out of scope. Import creates new records only. Update feature is future work.

---

## Dependencies

**Code Dependencies**:
- `generateTicketNumber()` helper (already exists in `registration.ts`)
- `sendEmail()` service (already exists)
- Email templates: `TicketAssigned` or create new `ImportedTicketAssigned` template

**External Dependencies**:
- Database: PostgreSQL with transaction support (already configured)
- Email: Resend API (already configured)

**Team Dependencies**:
- Backend: Implementation and manual testing
- DevOps: Monitor production imports after deploy

---

## Rollout Plan

### Phase 1: Development (Day 1)
- Implement fix in feature branch
- Manual testing in local environment with test CSVs

### Phase 2: Staging (Day 2)
- Deploy to staging environment
- Import test CSVs of varying sizes (10, 100, 1000 rows)
- Verify attendee list, tickets, check-in flow

### Phase 3: Production (Day 3)
- Deploy during low-traffic window
- Monitor first 5 imports closely
- Have rollback plan ready (revert commit)

### Rollback Plan
If critical issues detected:
1. Revert deployment immediately
2. Investigate root cause
3. Fix in new branch
4. Re-test in staging before re-deploy

---

## Appendix

### A. Example CSV Import Flow

**Input CSV**:
```csv
name,email,ticketType,company,dietary
John Doe,john@example.com,General Admission,Acme Corp,Vegetarian
Jane Smith,jane@example.com,VIP Pass,Tech Co,None
```

**Field Mapping**:
- name → name
- email → email
- ticketType → ticketType
- company → custom field
- dietary → custom field

**Database Records Created** (per row):

**Registration**:
```json
{
  "id": "clx123...",
  "eventId": "clx456...",
  "ticketTypeId": "clx789...",
  "email": "john@example.com",
  "name": "John Doe",
  "quantity": 1,
  "paymentStatus": "free",
  "registeredAt": "2025-11-21T10:30:00Z"
}
```

**Ticket**:
```json
{
  "id": "clx111...",
  "registrationId": "clx123...",
  "eventId": "clx456...",
  "ticketTypeId": "clx789...",
  "ticketNumber": "EVT-2025-ABC12345",
  "qrCodeData": "EVT-2025-ABC12345",
  "isAssigned": true,
  "assignedAt": "2025-11-21T10:30:00Z",
  "attendeeId": "clx222...",
  "isCheckedIn": false
}
```

**Attendee**:
```json
{
  "id": "clx222...",
  "name": "John Doe",
  "email": "john@example.com",
  "emailStatus": "active",
  "customData": {
    "registrationCode": "EVT-2025-ABC12345",
    "company": "Acme Corp",
    "dietary": "Vegetarian"
  }
}
```

### B. Error Message Examples

**Row-level errors** (import continues):
```
Row 12: Invalid email format "invalid@"
Row 15: Duplicate email in file (first at row 5)
Row 20: Email already registered for this event
Row 45: Ticket type "Super VIP" not found
```

**Critical errors** (import aborts):
```
Database connection failed. Please try again.
Event not found or you don't have permission to import attendees.
File exceeds 10MB or 10,000 row limit.
```

### C. Related Documentation

- [Spec 003: Ticket/Attendee Separation](../../specs/003-ticket-attendee-separation/spec.md)
- [Attendees Module Backend](../../docs/modules/attendees/backend.md)
- [Attendees Module Workflows](../../docs/modules/attendees/workflows.md)
- [Registration Router](../../src/server/api/routers/registration.ts)
- [Tickets Router](../../src/server/api/routers/tickets.ts)

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-21  
**Next Review**: After implementation complete
