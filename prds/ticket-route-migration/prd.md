# PRD: Ticket Route Migration to Event Context

**Status**: IMPLEMENTED ✅ - See https://github.com/babblebey/events-ting/commit/523710fc6b846ab2c5ec461d9d218e26efe79198
**Priority**: Medium  
**Created**: November 21, 2025  
**Issue**: TBD  
**Milestone**: TBD  
**Issue Type**: Refactoring / Architecture Improvement

---

## Problem Statement

### Business Need
Currently, ticket viewing and assignment routes are organized at the root level (`/tickets/[ticketId]`), which creates a disconnected user experience. Tickets are fundamentally scoped to events, but the URL structure doesn't reflect this relationship. This leads to:

1. **Lost Context**: Users viewing tickets don't see event information prominently in the navigation
2. **Inconsistent Architecture**: Other event-scoped features (CFP, registrations, schedule, speakers) are nested under `/events/[slug]/`, but tickets are not
3. **Navigation Confusion**: Users jump between `/events/[slug]` and `/tickets/[ticketId]` without clear hierarchical relationship
4. **SEO Opportunity Missed**: Event-scoped URLs provide better context for search engines and link sharing

### User Impact
**Primary Users**: 
- **Attendees**: Receiving and viewing their assigned tickets
- **Buyers**: Managing purchased tickets from registration dashboard

**Secondary Users**: 
- **Event Organizers**: Navigating attendee/ticket management interfaces

**Current Pain Points**:
- Ticket URLs (`/tickets/[ticketId]`) don't indicate which event the ticket belongs to
- Breadcrumb navigation is incomplete (no event context)
- Difficult to navigate back to event details from ticket view
- URL structure doesn't match mental model (tickets belong to events)
- Inconsistent with rest of application architecture

### Use Case Scenario
> *Alice receives an email with her conference ticket link: `/tickets/cm3abc123xyz`. She clicks the link and sees her ticket with QR code, but has to search for event details separately. If the URL was `/events/techconf-2025/tickets/cm3abc123xyz`, she would immediately know which event it's for, and the page could include prominent event navigation.*

---

## Goals & Success Criteria

### Primary Goals
1. **Align URL structure with data model**: Tickets belong to events, URLs should reflect this hierarchy
2. **Improve navigation**: Enable seamless movement between event pages and ticket pages
3. **Maintain backward compatibility**: Existing ticket links (in emails, bookmarks, QR codes) must continue to work
4. **Consistent architecture**: Follow same patterns as other event-scoped features (registrations, CFP, etc.)

### Success Metrics
- ✅ All ticket URLs follow `/events/[slug]/tickets/[ticketId]` pattern
- ✅ Zero broken links in application (email templates, component links)
- ✅ Email templates generate correct event-scoped ticket URLs
- ✅ Page load time < 2.5s (LCP) for ticket view
- ✅ Consistent code patterns across all event-scoped routes

### Out of Scope (MVP)
- ❌ Changing ticket QR code payload (still encodes ticketId, not full URL)
- ❌ Backward compatibility for old URLs (app is in development, 404s acceptable)
- ❌ Changing tRPC procedure signatures (keep `tickets.getById`, etc.)
- ❌ Migrating dashboard routes from eventId to slug (future work)
- ❌ Assignment route migration (assignment handled via modal in registrations)

---

## User Stories

### US1: View Ticket with Event Context
**As an** attendee  
**I want to** view my ticket at `/events/[slug]/tickets/[ticketId]`  
**So that** I immediately understand which event my ticket is for

**Acceptance Criteria**:
- Ticket page URL includes event slug: `/events/[slug]/tickets/[ticketId]`
- Page displays event name and details prominently
- Breadcrumb navigation: Home → Events → [Event Name] → Ticket → [Ticket Number]
- QR code, attendee info, and ticket details remain unchanged
- Page is publicly accessible (no authentication required for ticket viewing)
- Performance: Page loads in < 2.5s (LCP)

---

### US2: Access Tickets from Buyer Dashboard
**As a** buyer  
**I want to** see ticket links in my registration dashboard that include event context  
**So that** navigation is consistent and predictable

**Acceptance Criteria**:
- Registration dashboard (`/events/[slug]/registrations/[registrationId]`) already has event context
- "View Ticket Details" links point to `/events/[slug]/tickets/[ticketId]`
- Ticket assignment remains in modal within registration dashboard (no route change needed)
- All ticket view links maintain event context in URL
- No changes to assignment functionality, only ticket view URL updates

---

### US3: Navigate to Tickets from Attendee Management
**As an** organizer  
**I want to** click ticket links in attendee management that maintain event context  
**So that** I can easily navigate back to event management

**Acceptance Criteria**:
- Attendee list items link to `/events/[slug]/tickets/[ticketId]`
- Attendee detail page links to `/events/[slug]/tickets/[ticketId]`
- Organizer dashboard (`/(dashboard)/[id]/...`) uses eventId in URL but ticket links use event slug
- When viewing tickets from organizer context, users are redirected to public event-scoped routes
- Breadcrumb navigation includes event context in ticket view

---

## Technical Design

### Architecture Overview

#### Current Route Structure
```
src/app/
├── tickets/
│   └── [ticketId]/
│       ├── page.tsx           # Ticket view (public)
│       └── assign/
│           └── page.tsx       # Ticket assignment (protected)
```

#### New Route Structure
```
src/app/
├── events/
│   └── [slug]/
│       ├── tickets/
│       │   └── [ticketId]/
│       │       └── page.tsx        # Ticket view (public)
├── tickets/                        # ← TO BE DELETED
│   └── [ticketId]/
│       ├── page.tsx           # Delete after migration
│       └── assign/
│           └── page.tsx       # Delete after migration (assignment via modal in registrations)
```

---

### Data Flow

#### Current Flow (Before Migration)
```
1. User clicks: /tickets/cm3abc123
2. Page fetches: tickets.getById({ ticketId: "cm3abc123" })
3. Returns: Ticket + Event + Attendee + Registration
4. Renders: Ticket page with event details
```

#### New Flow (After Migration)
```
1. User clicks: /events/techconf-2025/tickets/cm3abc123
2. Page extracts: slug = "techconf-2025", ticketId = "cm3abc123"
3. Page fetches: tickets.getById({ ticketId: "cm3abc123" })
   - Returns: Ticket + Event (with slug) + Attendee + Registration
4. Validates: ticket.event.slug === params.slug (ensure URL matches ticket's event)
5. Renders: Ticket page with event context from ticket.event
```

**Note**: The existing `tickets.getById` already includes event data with slug, so no additional queries or procedures needed.

---

### Component Updates

#### Files Requiring URL Updates

| File | Current Link | New Link | Context Available |
|------|-------------|----------|-------------------|
| `src/components/attendees/attendee-list.tsx` | `/tickets/${ticket.id}` | `/events/${eventSlug}/tickets/${ticket.id}` | Has event context |
| `src/app/(dashboard)/[id]/attendees/[attendeeId]/page.tsx` | `/tickets/${ticket.id}` | `/events/${eventSlug}/tickets/${ticket.id}` | Needs slug lookup from eventId |
| `src/app/events/[slug]/registrations/[registrationId]/page.tsx` | `/tickets/${ticketId}` | `/events/${event.slug}/tickets/${ticketId}` | Has event slug in scope |
| Email templates (`ticket-assigned.tsx`, `ticket-reassigned.tsx`) | Receives `ticketUrl` prop | Server-side generation updated | URL generated in tRPC router |

#### URL Generation in tRPC Router

**Location**: `src/server/api/routers/tickets.ts` (Line ~666)

**Current Code**:
```typescript
const ticketUrl = `${baseUrl}/tickets/${result.updatedTicket.id}`;
```

**Updated Code**:
```typescript
const ticketUrl = `${baseUrl}/events/${ticket.event.slug}/tickets/${result.updatedTicket.id}`;
```

**Required Change**: Include `event.slug` in ticket query for assignment mutation.

---

### Email Template Updates

#### Templates Affected
1. **`emails/ticket-assigned.tsx`**: Receives `ticketUrl` prop
2. **`emails/ticket-reassigned.tsx`**: Receives `ticketUrl` prop

**Change**: No template changes needed (URLs are generated server-side and passed as props).

**Migration Strategy**: New assignments automatically use new URLs. Old emails with old URLs redirect via redirect pages.

---

### Database Schema Changes
**None required** - This is purely a routing/URL structure change. No data model changes needed.

---

### Route Architecture Clarification

#### Dashboard vs Public Routes
The application uses two route patterns:

1. **Organizer Dashboard Routes**: `/(dashboard)/[id]/...`
   - Uses `[id]` parameter (eventId, not slug)
   - Authenticated routes for event management
   - Examples: `/(dashboard)/[id]/attendees/`, `/(dashboard)/[id]/settings/`

2. **Public Event Routes**: `/events/[slug]/...`
   - Uses `[slug]` parameter (human-readable event identifier)
   - Public/semi-public routes for attendees and buyers
   - Examples: `/events/[slug]/register`, `/events/[slug]/schedule`

**Ticket Route Strategy**:
- Tickets use **public route pattern**: `/events/[slug]/tickets/[ticketId]`
- When organizers click ticket links from dashboard (`/(dashboard)/[id]/attendees/`), they navigate to public route
- This maintains consistency with other attendee-facing features
- Future work will migrate dashboard routes to use slug, but that's out of scope for this PRD

**Event Slug Lookup in Dashboard Context**:
```typescript
// In /(dashboard)/[id]/attendees/[attendeeId]/page.tsx
const ticket = attendee.ticket;
const ticketUrl = `/events/${ticket.event.slug}/tickets/${ticket.id}`;
```

---

### Security & Authorization

#### Current Authorization (Unchanged)
- **Ticket View** (`tickets.getById`): Public procedure (anyone with ticketId)
- **Ticket Assignment** (`tickets.assign`): Protected procedure
  - Buyer: `registration.userId === session.user.id`
  - Organizer: `checkModuleAccess(TICKETS)` on event

#### New Validation
**Event-Ticket Relationship Validation**:
```typescript
// In ticket page component
const ticket = await api.tickets.getById({ ticketId });

if (ticket.event.slug !== params.slug) {
  notFound(); // 404 - ticket doesn't belong to this event
}
```

**Rationale**: Prevents users from viewing tickets at wrong event URLs (e.g., `/events/wrong-event/tickets/[ticketId]`).

---

## Implementation Plan

### Phase 1: Create New Ticket View Route
**Estimated Effort**: 1-2 hours

**Tasks**:
1. Create directory structure: `src/app/events/[slug]/tickets/[ticketId]/`
2. Create new `page.tsx` for ticket view
3. Update params extraction to include both `slug` and `ticketId`
4. Add event-ticket relationship validation (verify `ticket.event.slug === params.slug`)
5. Update breadcrumb components to include event context
6. Test new route locally

**Acceptance**: New ticket view URL loads correctly and validates event-ticket relationship.

---

### Phase 2: Update URL Generation in Backend
**Estimated Effort**: 1-2 hours

**Tasks**:
1. Update `tickets.assign` mutation in `src/server/api/routers/tickets.ts`
2. Include `event.slug` in ticket query
3. Update `ticketUrl` generation to use new format
4. Update `tickets.unassign` mutation similarly (if it sends emails)
5. Test email generation with new URLs

**Acceptance**: Newly assigned tickets receive emails with `/events/[slug]/tickets/[ticketId]` URLs.

---

### Phase 3: Update Component Links
**Estimated Effort**: 1-2 hours

**Tasks**:
1. Update `src/components/attendees/attendee-list.tsx` ticket link
2. Update `src/app/(dashboard)/[id]/attendees/[attendeeId]/page.tsx` ticket link (needs `ticket.event.slug`)
3. Update `src/app/events/[slug]/registrations/[registrationId]/page.tsx` handleViewQR function
4. Search codebase for remaining `/tickets/${` patterns
5. Update any client-side navigation calls (`router.push`)
6. Verify all ticket links across the application

**Acceptance**: All ticket view links use new event-scoped URL format.

---

### Phase 4: Delete Old Routes
**Estimated Effort**: 15 minutes

**Tasks**:
1. Delete `src/app/tickets/[ticketId]/page.tsx`
2. Delete `src/app/tickets/[ticketId]/assign/page.tsx`
3. Delete `src/app/tickets/` directory entirely
4. Verify no broken imports or references

**Acceptance**: Old ticket routes no longer exist in codebase.

---

### Phase 5: Testing & Validation
**Estimated Effort**: 1-2 hours

**Tasks**:
1. **Functional Testing**:
   - Test new ticket view URL: `/events/[slug]/tickets/[ticketId]`
   - Test event-ticket relationship validation (correct event only)
   - Test ticket view from various contexts (email, dashboard, attendee list)
2. **Integration Testing**:
   - Send test assignment email with new ticket URL format
   - Click ticket links from buyer registration dashboard
   - Navigate from organizer attendee management
   - Verify breadcrumb navigation includes event context
3. **Performance Testing**:
   - Measure page load times for ticket view
   - Check for N+1 queries in ticket data fetching
4. **Cross-browser Testing**:
   - Chrome, Firefox, Safari, Edge
   - Mobile browsers (iOS Safari, Chrome Android)

**Acceptance**: All tests pass, ticket URLs work from all contexts, emails contain correct links.

---

### Phase 6: Documentation Updates
**Estimated Effort**: 1 hour

**Tasks**:
1. Update Tickets Module README (`docs/modules/tickets/README.md`)
   - Update "Related Files" section with new route path
   - Update ticket view URL examples
   - Update breadcrumb examples with event context
2. Update Tickets Backend Documentation (`docs/modules/tickets/backend.md`)
   - Update `ticketUrl` generation example in Email Integration section
   - Update any hardcoded route examples
3. Update Tickets Workflows Documentation (`docs/modules/tickets/workflows.md`)
   - Update route paths in workflow examples
   - Update attendee ticket view URLs
4. Update File Structure Documentation (`docs/architecture/file-structure.md`)
   - Add new `/events/[slug]/tickets/` route to structure
   - Remove old `/tickets/` route from structure
5. Update Registration Module README (`docs/modules/registration/README.md`)
   - Update ticket link references in integration points
6. Update Attendees Module README (`docs/modules/attendees/README.md`)
   - Update ticket URL references in related modules section
7. Add migration notes to CHANGELOG
   - Document URL structure change
   - Note that old `/tickets/` routes have been removed

**Acceptance**: All documentation references new URL structure, no stale route paths remain.

---

## Rollout Strategy

### Pre-Deployment Checklist
- [ ] All tests pass (unit, integration, E2E)
- [ ] Code review completed and approved
- [ ] Documentation updated
- [ ] Performance benchmarks validated
- [ ] Staging environment testing completed
- [ ] Database migrations applied (if any - N/A for this PR)

### Deployment Steps
1. **Deploy to Staging**: Test all scenarios in staging environment
2. **Monitor Redirects**: Verify old URLs redirect correctly in staging
3. **Deploy to Production**: Standard deployment process
4. **Monitor Errors**: Watch for 404s or redirect issues in production logs
5. **User Communication**: No user communication needed (transparent change)

### Rollback Plan
If critical issues are discovered:
1. **Revert deployment** to previous version
2. **Redirect pages remain** in old location (they're backward compatible)
3. **New URLs temporarily 404** until fix is deployed
4. **No data loss** (no database changes involved)

**Recovery Time Objective (RTO)**: < 15 minutes (standard deployment rollback)

---

## Risks & Mitigation

### Risk 1: Missed URL References
**Probability**: Medium  
**Impact**: Medium  
**Mitigation**: 
- Comprehensive codebase search for `/tickets/${` pattern
- Test all user journeys (attendee, buyer, organizer)
- Manual verification of ticket links in all contexts
- QA review before deployment

---

### Risk 2: Email Template URL Generation
**Probability**: Low  
**Impact**: High  
**Mitigation**:
- Test email sending in development environment
- Verify ticketUrl prop includes event slug
- Send test emails and click through links
- Monitor first few production emails after deployment

---

### Risk 3: Dashboard Context Missing Event Slug
**Probability**: Low  
**Impact**: Medium  
**Mitigation**:
- Ensure ticket objects from dashboard queries include `event.slug`
- Test ticket links from organizer dashboard context
- Verify data includes necessary fields for URL generation

---

### Risk 4: Performance Issues
**Probability**: Low  
**Impact**: Low  
**Mitigation**:
- Existing `tickets.getById` already includes event data
- No additional queries needed for slug
- Monitor page load times in production

---

## Success Criteria & Metrics

### Immediate Success Metrics (Week 1)
- ✅ All ticket view links use new event-scoped URL format
- ✅ Email templates generate correct ticket URLs
- ✅ Page load time < 2.5s LCP (p75) for ticket view
- ✅ Zero broken links in production
- ✅ Event-ticket relationship validation working correctly

### Long-term Success Metrics (Month 1)
- ✅ 30% reduction in back-button usage from ticket pages (improved navigation)
- ✅ Increased time-on-page for ticket views (better context encourages exploration)
- ✅ Consistent URL structure across all event-scoped features
- ✅ Positive developer feedback on architecture consistency

---

## Dependencies

### External Dependencies
- None (self-contained routing change)

### Internal Dependencies
- Next.js 14+ routing system (App Router)
- tRPC router structure (existing)
- Prisma schema (no changes needed)
- Email templates (minimal changes)

### Team Dependencies
- **Frontend Team**: Implement component URL updates
- **Backend Team**: Update tRPC URL generation
- **QA Team**: Comprehensive testing across all user flows
- **DevOps Team**: Standard deployment process

---

## Open Questions & Decisions Needed

### Q1: Should we update QR code payload to include event slug?
**Current**: QR codes encode `{ ticketId, eventId, ticketNumber }`  
**Proposed**: Add `eventSlug` field  

**Decision**: ❌ **No, keep current payload**  
**Rationale**: 
- QR codes are immutable once printed
- Backward compatibility critical
- TicketId alone is sufficient for lookup
- Adding slug provides no functional benefit for check-in

---

### Q2: Should we create combined tRPC procedure `tickets.getByIdWithEvent`?
**Current**: Two separate calls (`events.getBySlug` + `tickets.getById`)  
**Proposed**: Single procedure that returns both

**Decision**: ⏸️ **Defer to future optimization**  
**Rationale**:
- Current approach works with existing procedures
- Performance impact is minimal (parallel queries)
- Can optimize later if metrics show need
- Keeps MVP scope focused

---

### Q3: Should we maintain backward compatibility with old URLs?
**Options**:
- **A**: Implement redirects from `/tickets/[ticketId]` to new URLs
- **B**: Delete old routes, accept 404s (app is in development)

**Decision**: ✅ **Option B: No redirects**  
**Rationale**:
- Application is still in development phase
- No production users with historical emails or bookmarks
- Simpler implementation and maintenance
- Can add redirects later if needed
- Reduces scope and timeline for MVP

---

## Timeline

| Phase | Duration | Start Date | End Date |
|-------|----------|------------|----------|
| Planning & PRD | 1 day | Nov 21, 2025 | Nov 23, 2025 |
| Phase 1: New Route | 0.5 day | Nov 23, 2025 | Nov 23, 2025 |
| Phase 2: Backend URLs | 0.5 day | Nov 23, 2025 | Nov 23, 2025 |
| Phase 3: Component Updates | 0.5 day | Nov 24, 2025 | Nov 24, 2025 |
| Phase 4: Delete Old Routes | 0.25 day | Nov 24, 2025 | Nov 24, 2025 |
| Phase 5: Testing | 0.5 day | Nov 24, 2025 | Nov 24, 2025 |
| Phase 6: Documentation | 0.5 day | Nov 25, 2025 | Nov 25, 2025 |
| **Total** | **2.75 days** | **Nov 21** | **Nov 25** |

**Deployment Target**: November 25, 2025 (Monday evening) or November 26, 2025

---

## Appendix

### A. URL Comparison Table

| Context | Old URL | New URL |
|---------|---------|---------|------|
| Ticket View | `/tickets/cm3abc123` | `/events/techconf-2025/tickets/cm3abc123` |
| Ticket Assignment | `/tickets/cm3abc123/assign` | (deleted - handled via modal in registrations) |
| Buyer Dashboard | `/events/techconf-2025/registrations/cm3reg456` | (unchanged) |
| Email Link (Assignment) | `/tickets/cm3abc123` | `/events/techconf-2025/tickets/cm3abc123` |
| Organizer Dashboard Link | `/tickets/cm3abc123` | `/events/techconf-2025/tickets/cm3abc123` |

---

### B. Code Search Patterns

Use these patterns to find all URL references:

```bash
# Find ticket URL patterns
grep -r "\/tickets\/\${" src/
grep -r "/tickets/" src/ | grep -v "node_modules"
grep -r "tickets.getById" src/

# Find component imports
grep -r "TicketCard" src/
grep -r "QRCodeDisplay" src/

# Find email template references
grep -r "ticketUrl" emails/
```

---

### C. Related Documentation

- [Tickets Module README](../../docs/modules/tickets/README.md)
- [Events Module README](../../docs/modules/events/README.md)
- [File Structure Documentation](../../docs/architecture/file-structure.md)
- [tRPC Routers Documentation](../../docs/api/routers.md)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)

---

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| Nov 21, 2025 | GitHub Copilot | Initial PRD creation |

---

**Document Status**: ✅ Ready for Review  
**Next Steps**: 
1. Review with team
2. Create GitHub issue and link to this PRD
3. Begin implementation after approval
