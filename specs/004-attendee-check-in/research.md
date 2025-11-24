# Research: Attendee Check-In Service

**Date**: 2025-11-24  
**Feature**: 004-attendee-check-in  
**Phase**: 0 - Outline & Research

## Purpose

This document resolves all technical unknowns identified during the planning phase and establishes best practices for implementing the check-in service. Research focuses on QR code scanning patterns in Next.js, real-time UI updates, module permission implementation, and testing strategies for check-in workflows.

---

## Research Tasks

### 1. QR Code Scanning in Next.js App Router

**Question**: How to implement QR code scanning in a Next.js 15+ App Router application with proper client/server boundaries?

**Decision**: Use browser-based QR code scanning with a client component wrapping a camera access library.

**Rationale**: 
- Next.js Server Components cannot access browser APIs (camera, getUserMedia)
- Client component pattern allows progressive enhancement
- Existing `qrcode` package in dependencies is for generation only, not scanning
- Browser-native solutions avoid heavy dependencies

**Implementation Approach**:
- Use HTML5 `<video>` element with `getUserMedia` for camera access
- Process video frames with `canvas` API to extract QR code data
- Consider libraries: `html5-qrcode` (44KB gzipped) or `qr-scanner` (8KB gzipped)
- Wrap in `'use client'` component at `_components/qr-scanner.tsx`
- Handle camera permissions gracefully with error states
- Support manual ticket number input as fallback

**Alternatives Considered**:
- Native mobile app: Rejected - web-first requirement
- Server-side image processing: Rejected - requires image upload, slower UX
- Third-party hosted scanner: Rejected - privacy/data concerns

**Best Practices**:
- Request camera permission only when user activates scanner
- Show clear permission prompts and error messages
- Stop camera stream when component unmounts (cleanup)
- Provide manual input option for damaged/unreadable codes
- Test across browsers (Chrome, Safari, Firefox mobile)

---

### 2. Real-Time Status Updates Pattern

**Question**: How to update attendee list in real-time when check-in status changes, meeting <2s update requirement?

**Decision**: Use tRPC React Query's optimistic updates with automatic cache invalidation.

**Rationale**:
- tRPC + TanStack Query (React Query) already integrated in codebase
- Optimistic updates provide instant UI feedback (<100ms perceived)
- Cache invalidation ensures consistency when multiple team members check in attendees
- No WebSocket infrastructure needed for this use case

**Implementation Approach**:
```typescript
// In check-in list component
const utils = api.useUtils();
const checkInMutation = api.checkIn.checkInTicket.useMutation({
  onMutate: async (input) => {
    // Cancel outgoing refetches
    await utils.checkIn.listAttendees.cancel();
    
    // Snapshot previous value
    const previousData = utils.checkIn.listAttendees.getData();
    
    // Optimistically update
    utils.checkIn.listAttendees.setData({ eventId: input.eventId }, (old) => ({
      ...old,
      attendees: old.attendees.map(a => 
        a.ticketNumber === input.ticketNumber 
          ? { ...a, isCheckedIn: true, checkedInAt: new Date() }
          : a
      )
    }));
    
    return { previousData };
  },
  onError: (err, input, context) => {
    // Rollback on error
    utils.checkIn.listAttendees.setData({ eventId: input.eventId }, context.previousData);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    utils.checkIn.listAttendees.invalidate();
  },
});
```

**Alternatives Considered**:
- WebSockets/Server-Sent Events: Rejected - overkill for this use case, adds infrastructure complexity
- Polling: Rejected - inefficient, doesn't meet performance targets
- Local state only: Rejected - doesn't sync across team members

**Best Practices**:
- Use optimistic updates for immediate feedback
- Always invalidate cache after mutation
- Show loading spinner on button during mutation
- Display error toast if check-in fails
- Handle race conditions (same attendee checked by 2 team members simultaneously)

---

### 3. CHECKIN Module Permission Implementation

**Question**: How to add a new CHECKIN module permission following the existing team collaboration pattern?

**Decision**: Extend `MODULE_NAMES` constant in `src/lib/validators.ts` and use existing `checkModuleAccess` helper.

**Rationale**:
- Existing permission system in `src/server/api/permissions.ts` is well-established
- `MODULE_NAMES` array already supports: OVERVIEW, ATTENDEES, TICKETS, SCHEDULE, SPEAKERS, CFP, COMMUNICATIONS
- Pattern is type-safe via Zod schema and TypeScript const assertion
- No database schema changes needed - permissions stored as string array

**Implementation Approach**:
1. Add "CHECKIN" to `MODULE_NAMES` constant in `src/lib/validators.ts`:
   ```typescript
   export const MODULE_NAMES = [
     "OVERVIEW",
     "ATTENDEES",
     "TICKETS",
     "SCHEDULE",
     "SPEAKERS",
     "CFP",
     "COMMUNICATIONS",
     "CHECKIN",  // NEW
   ] as const;
   ```

2. Update tRPC procedures to use `checkModuleAccess`:
   ```typescript
   // In check-in router procedures
   await checkModuleAccess({
     db: ctx.db,
     eventId: input.eventId,
     userId: ctx.session.user.id,
     requiredModule: "CHECKIN",
   });
   ```

3. Add CHECKIN option to team member invitation UI (existing form in team module)

**Alternatives Considered**:
- Reuse ATTENDEES permission: Rejected - check-in is distinct operation, separation of concerns
- New permission model: Rejected - existing system works well, no need to refactor

**Best Practices**:
- Follow existing permission patterns exactly
- Document CHECKIN module in team collaboration docs
- Ensure OWNER role has access (automatic in `checkModuleAccess`)
- Test permission enforcement in integration tests

---

### 4. Testing Strategy for Check-In Flows

**Question**: What testing approach satisfies constitution's integration-first requirement for check-in workflows?

**Decision**: Prioritize integration tests using Playwright or Vitest with DOM testing utilities. Contract tests for tRPC procedures.

**Rationale**:
- Constitution mandates: integration > contract > unit
- Check-in involves full user journey (auth → permission check → UI interaction → database update)
- Integration tests validate acceptance criteria from spec.md
- Contract tests ensure tRPC API stability

**Implementation Approach**:

**Integration Tests** (Priority 1):
- Test full check-in flow: login → navigate to check-in page → search ticket → click check-in → verify status
- Framework: Playwright (if already in project) or Vitest + Testing Library
- Location: `tests/integration/check-in/`
- Coverage:
  - Manual check-in via list view (User Story 1)
  - QR code check-in (User Story 2) - can stub camera with test fixture
  - Status filtering (User Story 3)
  - Permission enforcement (unauthorized access)
  - Edge cases: duplicate check-in, invalid ticket, concurrent check-ins

**Contract Tests** (Priority 2):
- Validate tRPC procedure inputs/outputs match Zod schemas
- Test error codes for various failure scenarios
- Location: `tests/contract/check-in-api.test.ts`
- Coverage:
  - `checkIn.listAttendees` returns correct data shape
  - `checkIn.checkInTicket` validates ticket number format
  - Permission errors return FORBIDDEN code
  - Invalid ticket returns NOT_FOUND code

**Unit Tests** (Priority 3 - only if complex logic exists):
- Not needed unless QR parsing or filtering logic becomes complex
- Ticket number validation already handled by Zod schema

**Alternatives Considered**:
- Unit tests first: Rejected - constitution mandates integration priority
- E2E only: Rejected - contract tests provide faster feedback for API changes
- No tests: Rejected - constitution requires tests before code review

**Best Practices**:
- Each test validates one acceptance scenario from spec.md
- Tests must be independent (no shared state between tests)
- Use realistic test data (actual ticket numbers, event structures)
- Mock camera API for QR scanner tests
- Test mobile viewport sizes (375px) for responsive behavior

---

### 5. Offline Support Considerations

**Question**: User mentioned "we will worry about offline support later" - what groundwork should we prepare?

**Decision**: Design API with offline-first patterns in mind, but don't implement offline functionality now.

**Rationale**:
- User explicitly deferred offline support
- Early architecture decisions can make future offline support easier or harder
- Service Workers and IndexedDB would be needed for true offline

**Future-Proofing Approach**:
- Use optimistic updates (already planned) - works well with offline patterns
- Design tRPC mutations to be idempotent (safe to retry)
- Include timestamp fields in API responses for conflict resolution
- Use UUIDs for client-side ID generation (Prisma already uses CUID)

**No Action Required Now**:
- Don't install service worker libraries
- Don't implement local storage caching
- Don't build sync queue

**Documentation Note**: Add comment in quickstart.md about future offline support path.

---

### 6. QR Code Data Format

**Question**: What data format should QR codes contain for tickets?

**Decision**: Use the existing `qrCodeData` field from Ticket model, which stores the ticket number or a signed token.

**Rationale**:
- Ticket model already has `qrCodeData` field (String, unique)
- Current ticket generation likely populates this field
- Simple format: just the ticket number (e.g., "EVT-2025-ABC123")
- Advanced format (if needed): JWT with ticket ID, event ID, expiry

**Implementation Approach**:
1. Check existing ticket generation code to see current QR format
2. If QR code contains ticket number → parse and validate
3. If QR code contains JWT → verify signature and extract ticket number
4. Pass ticket number to check-in mutation

**Validation**:
- Ensure QR code belongs to current event (prevent cross-event check-in)
- Validate ticket number format matches Prisma unique constraint
- Check ticket hasn't been cancelled/refunded

**Best Practices**:
- Log QR scan attempts for security auditing
- Rate limit QR scan endpoint to prevent abuse
- Handle malformed QR codes gracefully (show error, allow manual input)

---

### 7. Performance Optimization for Large Events

**Question**: How to meet performance goals (100 attendees/hour/team member, <2s list render) for events with 1000+ attendees?

**Decision**: Use pagination, database indexing, and React virtualization for large lists.

**Rationale**:
- Events can have 1000+ attendees → loading all at once is slow
- Database indexes on `eventId`, `isCheckedIn`, `ticketNumber` already exist in schema
- Pagination reduces initial load time and database query size

**Implementation Approach**:

**Database Layer**:
- Use existing Prisma indexes (already defined in schema):
  - `@@index([eventId, isCheckedIn])` for filtering
  - `@@index([ticketNumber])` for search
- Add pagination to query:
  ```typescript
  const attendees = await ctx.db.ticket.findMany({
    where: { eventId, isCheckedIn: filter },
    take: 50,  // Page size
    skip: page * 50,
    orderBy: { createdAt: 'desc' },
  });
  ```

**UI Layer**:
- Initial load: 50 attendees per page
- Search: Filter on backend, not client-side array filtering
- For 1000+ attendees: Consider `react-virtual` or `@tanstack/react-virtual` (3KB)
- Show total count: "Showing 1-50 of 834 attendees"

**Search Optimization**:
- Debounce search input (300ms) to reduce queries
- Use backend filtering via tRPC procedure
- Add loading skeleton during search

**Alternatives Considered**:
- Load all attendees: Rejected - doesn't scale to large events
- Client-side filtering: Rejected - slow for 1000+ items, requires loading all data
- Infinite scroll: Considered - good UX but pagination is simpler MVP

**Best Practices**:
- Monitor query performance with Prisma's query logging
- Add database indexes if queries are slow (already exist)
- Use `<Suspense>` boundaries for streaming initial data
- Cache attendee list query with 30s stale time

---

## Summary of Decisions

| Research Area | Decision | Key Outcome |
|---------------|----------|-------------|
| QR Scanning | Browser-based client component with camera API | Use `qr-scanner` library (8KB), fallback to manual input |
| Real-Time Updates | tRPC optimistic updates + cache invalidation | <100ms perceived update, automatic sync across team members |
| CHECKIN Permission | Extend existing `MODULE_NAMES` array | Add "CHECKIN" to validators.ts, use `checkModuleAccess` helper |
| Testing Strategy | Integration tests (Playwright/Vitest) > Contract tests | Focus on user journeys, validate acceptance scenarios |
| Offline Support | Design for future, don't implement now | Use optimistic updates, idempotent mutations |
| QR Data Format | Use existing `qrCodeData` field from Ticket model | Parse ticket number, validate against event |
| Performance | Pagination (50/page) + database indexes | Support 1000+ attendees, <2s render time |

---

## Next Steps (Phase 1)

With research complete, proceed to Phase 1:
1. **data-model.md**: Document Ticket model usage, check-in state transitions
2. **contracts/**: Define tRPC procedure schemas for check-in operations
3. **quickstart.md**: Document how to use check-in feature, including QR code testing
4. **Update agent context**: Add CHECKIN module to project conventions

All unknowns are now resolved. Ready for design phase.
