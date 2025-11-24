# PRD: CFP Data Fetching Gap - Missing getCfp Procedure

**Status**: 🔴 Blocking  
**Priority**: High  
**Created**: November 8, 2025  
**Related Tasks**: T058 (CFP Router), T067 (CFP Management Page), T068 (Public CFP Page)  
**Issue Type**: Missing Implementation - Not in Original Tasks

---

## Problem Statement

### What's Broken
Both the CFP management dashboard (`/dashboard/[id]/cfp`) and the public CFP submission page (`/events/[slug]/cfp`) are unable to fetch and display CFP data, resulting in:

1. **Dashboard Issue**: CFP management page shows "No Call for Papers Yet" even when a CFP exists for the event
2. **Public Page Issue**: Public CFP submission page cannot display the CFP form, guidelines, deadline, or required fields

### Root Cause
The CFP tRPC router (T058) was implemented with these procedures:
- ✅ `open` - Create CFP
- ✅ `close` - Close CFP
- ✅ `update` - Update CFP
- ✅ `submitProposal` - Submit proposal
- ✅ `listSubmissions` - List submissions (organizer only)
- ✅ `reviewSubmission` - Review submission
- ✅ `acceptProposal` - Accept proposal
- ✅ `rejectProposal` - Reject proposal

**Missing**:
- ❌ `getCfp` / `getByEventId` - Fetch CFP by event ID (needed by both dashboard and public pages)
- ❌ `getPublicCfp` - Public endpoint to fetch CFP details without authentication

### Why This Was Missed
**Task T058** in `specs/001-event-management-system/tasks.md` explicitly lists the procedures to implement, and `getCfp` was not included in the original specification. This appears to be an oversight in the task decomposition phase.

---

## Current Workarounds (Implemented)

### Dashboard Page
```typescript
// src/app/(dashboard)/[id]/cfp/page.tsx
// Currently tries to fetch submissions which fails if no CFP exists
const allSubmissions = await api.cfp.listSubmissions({ 
  cfpId: id, // This fails if no CFP exists
  status: "all",
  limit: 100
}).catch(() => null);
```

### Public Page
```typescript
// src/app/events/[slug]/cfp/cfp-public-content.tsx
// Currently shows placeholder message
if (!cfpId) {
  return <div>CFP information is currently being prepared...</div>
}
```

---

## Proposed Solution

### 1. Add Missing tRPC Procedures

#### A. Protected Procedure: `getCfpByEventId`
**Purpose**: Fetch CFP for organizer dashboard  
**Authentication**: Protected (organizer only)  
**Input**: `{ eventId: string }`  
**Output**: `CallForPapers | null`

```typescript
getCfpByEventId: protectedProcedure
  .input(z.object({ eventId: z.string().cuid() }))
  .query(async ({ ctx, input }) => {
    // Verify organizer permission
    const event = await ctx.db.event.findUnique({
      where: { id: input.eventId },
      select: { organizerId: true },
    });
    
    if (!event || event.organizerId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    
    // Fetch CFP
    return await ctx.db.callForPapers.findUnique({
      where: { eventId: input.eventId },
      include: {
        event: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  });
```

#### B. Public Procedure: `getPublicCfp`
**Purpose**: Fetch CFP for public submission page  
**Authentication**: Public (no auth required)  
**Input**: `{ eventId: string }` or `{ eventSlug: string }`  
**Output**: Public CFP data (excludes sensitive organizer info)

```typescript
getPublicCfp: publicProcedure
  .input(z.union([
    z.object({ eventId: z.string().cuid() }),
    z.object({ eventSlug: z.string() }),
  ]))
  .query(async ({ ctx, input }) => {
    // Get event
    const event = "eventId" in input
      ? await ctx.db.event.findUnique({ where: { id: input.eventId } })
      : await ctx.db.event.findUnique({ where: { slug: input.eventSlug } });
    
    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
    }
    
    // Fetch CFP
    const cfp = await ctx.db.callForPapers.findUnique({
      where: { eventId: event.id },
      select: {
        id: true,
        guidelines: true,
        deadline: true,
        status: true,
        requiredFields: true,
        eventId: true,
      },
    });
    
    return cfp;
  });
```

### 2. Update Dashboard Page

```typescript
// src/app/(dashboard)/[id]/cfp/page.tsx
const cfp = await api.cfp.getCfpByEventId({ eventId: id });

const submissions = cfp 
  ? await api.cfp.listSubmissions({ cfpId: cfp.id, status: "all" })
  : { submissions: [], nextCursor: undefined };
```

### 3. Update Public Page

```typescript
// src/app/events/[slug]/cfp/page.tsx
const cfp = await api.cfp.getPublicCfp({ eventSlug: slug });

return (
  <CfpPublicContent 
    cfp={cfp}
    eventId={event.id}
    eventName={event.name}
  />
);
```

---

## Impact Assessment

### User Impact
- **Severity**: High - Core CFP functionality is non-functional
- **Affected Users**: Event organizers and potential speakers
- **Workaround**: None - feature is completely broken without this

### Technical Debt
- **Code Duplication**: Current workarounds create technical debt
- **Testing**: Cannot properly test CFP workflow end-to-end
- **Documentation**: Gaps between documented procedures and implemented procedures

---

## Implementation Checklist

### Phase 1: Add Missing Procedures (Estimated: 1-2 hours)
- [ ] Add `getCfpByEventId` protected procedure to CFP router
- [ ] Add `getPublicCfp` public procedure to CFP router
- [ ] Add input/output Zod schemas for both procedures
- [ ] Add authorization checks (organizer verification for protected procedure)
- [ ] Update CFP router exports

### Phase 2: Update Dashboard Page (Estimated: 30 minutes)
- [ ] Replace workaround in `src/app/(dashboard)/[id]/cfp/page.tsx`
- [ ] Use `getCfpByEventId` to fetch CFP data
- [ ] Update `CfpManager` component props to receive CFP directly
- [ ] Remove try/catch workaround for submissions fetching

### Phase 3: Update Public Page (Estimated: 1 hour)
- [ ] Update `src/app/events/[slug]/cfp/page.tsx` to fetch CFP data
- [ ] Pass CFP data to `CfpPublicContent` component
- [ ] Update `CfpPublicContent` to display actual CFP data:
  - Guidelines
  - Deadline
  - Required fields
  - CFP status (open/closed)
- [ ] Show `CfpSubmissionForm` with proper CFP ID and required fields
- [ ] Handle closed/expired CFP state gracefully

### Phase 4: Testing (Estimated: 1 hour)
- [ ] Test dashboard: Create CFP → Verify it appears immediately
- [ ] Test public page: Open CFP → Verify form is displayed with correct fields
- [ ] Test authorization: Non-organizer cannot access `getCfpByEventId`
- [ ] Test edge cases:
  - Event without CFP
  - Closed CFP
  - Expired CFP deadline

---

## Success Criteria

### Functional Requirements
1. ✅ CFP management dashboard shows existing CFP immediately after creation
2. ✅ Public CFP page displays submission form when CFP is open
3. ✅ Public CFP page shows closed message when CFP is closed
4. ✅ Guidelines, deadline, and required fields are visible on public page
5. ✅ Non-organizers cannot access organizer-only CFP endpoints

### Technical Requirements
1. ✅ Type-safe tRPC procedures with Zod validation
2. ✅ Proper error handling (NOT_FOUND, FORBIDDEN)
3. ✅ No TypeScript errors or ESLint warnings
4. ✅ Server Components fetch data on server-side
5. ✅ Client Components use tRPC React hooks for interactivity

---

## Related Documentation

### Original Task Definition
**Task T058** (CFP Router Creation):
```markdown
- [X] T058 [P] [US4] Create cfp tRPC router in `src/server/api/routers/cfp.ts` 
  with procedures: open, close, update, submitProposal, listSubmissions, 
  reviewSubmission, acceptProposal, rejectProposal
```

**Missing from T058**: `getCfp`, `getCfpByEventId`, `getPublicCfp`

### Files to Modify
1. `src/server/api/routers/cfp.ts` - Add procedures
2. `src/app/(dashboard)/[id]/cfp/page.tsx` - Use getCfpByEventId
3. `src/app/events/[slug]/cfp/page.tsx` - Use getPublicCfp
4. `src/app/events/[slug]/cfp/cfp-public-content.tsx` - Display CFP data

### Related Features
- Event Management (US1) - Event must exist
- Speaker Management (US5) - Speakers created from accepted CFP submissions
- Schedule Management (US3) - Sessions may come from CFP proposals

---

## Risk Assessment

### Low Risk
- ✅ Well-defined problem scope
- ✅ Clear solution path
- ✅ No database schema changes required
- ✅ Doesn't break existing functionality

### Potential Risks
- ⚠️ **Caching**: Ensure CFP data is properly revalidated after creation/update
- ⚠️ **Race Conditions**: CFP might be created while public page is loading
- ⚠️ **Authorization**: Must verify organizer permissions correctly

---

## Notes

### Why This Matters
This is a **critical bug** that completely blocks CFP functionality. Without the ability to fetch CFP data:
- Organizers cannot manage submissions (dashboard shows nothing)
- Speakers cannot submit proposals (form never appears)
- The entire CFP user story (US4) is non-functional in production

### Lessons Learned
When creating tRPC routers, always consider:
1. **CRUD operations**: Create, Read, Update, Delete
2. **List vs Get**: `list` for multiple records, `get` for single record
3. **Public vs Protected**: Separate procedures for public and authenticated access
4. **Event-based lookups**: Many features need `getByEventId` style procedures

### Future Prevention
Add checklist item to task decomposition process:
> ✅ For each entity router, verify CRUD operations are complete:
> - Create/Update procedures ✓
> - Get by ID procedure ✓
> - Get by parent ID (e.g., getByEventId) ✓
> - List with pagination ✓
> - Delete/Archive procedure ✓

---

## Estimated Total Effort

**Development**: 3-4 hours  
**Testing**: 1 hour  
**Total**: 4-5 hours

**Confidence**: High - Straightforward implementation following existing patterns
