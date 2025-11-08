# tRPC Router Contracts Summary

**File**: `contracts/README.md`  
**Purpose**: Index of all tRPC router contracts for the event management system

---

## Router Organization

All tRPC routers are organized by domain and combined in `src/server/api/root.ts`:

```typescript
export const appRouter = createTRPCRouter({
  event: eventRouter,
  ticket: ticketRouter,
  registration: registrationRouter,
  schedule: scheduleRouter,
  cfp: cfpRouter,
  speaker: speakerRouter,
  communication: communicationRouter,
  user: userRouter,
});
```

---

## Router Contracts

### 1. Event Router (`event.ts`)
**Responsibility**: Event CRUD, dashboard metrics, archival  
**Procedures**: `create`, `list`, `getBySlug`, `getById`, `update`, `archive`, `restore`, `delete`  
**FR Coverage**: FR-001 through FR-007, FR-058 through FR-060

[Full Contract →](./event-router.md)

---

### 2. Ticket Router (`ticket.ts`)
**Responsibility**: Ticket type management, availability queries  
**Procedures**: `create`, `list`, `getById`, `update`, `delete`, `getStats`  
**FR Coverage**: FR-008, FR-009, FR-010, FR-014, FR-015

[Full Contract →](./ticket-router.md)

---

### 3. Registration Router (`registration.ts`)
**Responsibility**: Attendee registration, management, exports  
**Procedures**: `create`, `list`, `getById`, `addManually`, `cancel`, `export`, `resendConfirmation`, `updateEmailStatus`  
**FR Coverage**: FR-011 through FR-018, FR-049

[Full Contract →](./registration-router.md)

---

### 4. Schedule Router (`schedule.ts`)
**Responsibility**: Schedule entry CRUD, overlap detection, timeline views  
**Procedures**: `create`, `list`, `getById`, `update`, `delete`, `reorder`, `checkOverlap`, `getByDate`  
**FR Coverage**: FR-019 through FR-025

**Key Procedures**:
- `create`: Create schedule entry with timezone conversion, speaker assignment
- `checkOverlap`: Detect overlapping entries in same location (warning only, FR-021)
- `update`: Optimistic concurrency control via `updatedAt` versioning (Research Section 5)
- `getByDate`: Retrieve schedule for specific day, grouped by track

---

### 5. CFP Router (`cfp.ts`)
**Responsibility**: Call for Papers management, submission review  
**Procedures**: `open`, `close`, `update`, `submitProposal`, `listSubmissions`, `reviewSubmission`, `acceptProposal`, `rejectProposal`  
**FR Coverage**: FR-026 through FR-035

**Key Procedures**:
- `open`: Create CFP with deadline, guidelines, required fields
- `submitProposal`: Public submission with deadline enforcement (Research Section 7)
- `reviewSubmission`: Add review score/notes (FR-032)
- `acceptProposal`: Auto-create speaker profile, send acceptance email (FR-033, FR-034)

---

### 6. Speaker Router (`speaker.ts`)
**Responsibility**: Speaker profile management, session assignment  
**Procedures**: `create`, `list`, `getById`, `update`, `delete`, `assignToSession`, `unassignFromSession`, `getByEvent`  
**FR Coverage**: FR-036 through FR-042

**Key Procedures**:
- `create`: Manual speaker profile creation with photo upload
- `assignToSession`: Link speaker to schedule entry via `SpeakerSession` junction table
- `getByEvent`: Public speaker directory for event page (FR-039)

---

### 7. Communication Router (`communication.ts`)
**Responsibility**: Email campaign management, bulk sending  
**Procedures**: `createCampaign`, `listCampaigns`, `getCampaign`, `updateCampaign`, `sendCampaign`, `scheduleCampaign`, `getCampaignStats`  
**FR Coverage**: FR-043 through FR-050, FR-056, FR-057

**Key Procedures**:
- `createCampaign`: Draft email with recipient selection (FR-044)
- `sendCampaign`: Batch send via Resend with retry logic (FR-045, FR-056)
- `scheduleCampaign`: Schedule for future sending (FR-047)
- `getCampaignStats`: Delivery, bounce, open, click stats (FR-048)

---

### 8. User Router (`user.ts`)
**Responsibility**: User profile management (supplement to NextAuth.js)  
**Procedures**: `getProfile`, `updateProfile`, `changePassword`, `deleteAccount`  
**FR Coverage**: FR-051 through FR-055 (authentication handled by NextAuth.js, this router provides profile operations)

---

## Common Patterns

### Authorization Middleware

```typescript
// Protected procedure (authenticated users)
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({ ctx: { session: { ...ctx.session, user: ctx.session.user } } });
  });

// Organizer-only procedure (custom)
const organizerProcedure = protectedProcedure
  .input(z.object({ eventId: z.string() }))
  .use(async ({ ctx, input, next }) => {
    const event = await ctx.db.event.findUnique({
      where: { id: input.eventId },
      select: { organizerId: true },
    });
    
    if (!event || event.organizerId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    
    return next();
  });
```

### Error Handling

All routers use consistent tRPC error codes:
- `UNAUTHORIZED` (401): User not authenticated
- `FORBIDDEN` (403): User lacks permission
- `NOT_FOUND` (404): Resource does not exist
- `BAD_REQUEST` (400): Validation failure or business rule violation
- `CONFLICT` (409): State conflict (e.g., slug already exists, ticket sold out)
- `INTERNAL_SERVER_ERROR` (500): Unexpected error

### Input Validation

All inputs validated with Zod schemas (defined in `src/lib/validators.ts`):
- Reusable schemas for common types (email, CUID, date ranges)
- Custom refinements for business rules (e.g., `endDate` after `startDate`)
- Error messages include field paths for frontend display

### Pagination

Cursor-based pagination for large datasets:
```typescript
input: z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
}),

// Query with cursor
const items = await ctx.db.model.findMany({
  take: input.limit + 1,
  cursor: input.cursor ? { id: input.cursor } : undefined,
  orderBy: { createdAt: 'desc' },
});

const nextCursor = items.length > input.limit ? items[input.limit].id : undefined;
return {
  items: items.slice(0, input.limit),
  nextCursor,
};
```

---

## Testing Strategy

### Contract Tests
Validate tRPC procedure contracts match this specification:
- Input schemas accept valid data, reject invalid data
- Output schemas match documented structure
- Error codes returned as specified
- Authorization rules enforced

### Integration Tests
Test end-to-end user journeys (see `tests/integration/`):
- Event creation → ticket setup → registration → confirmation email
- CFP submission → review → acceptance → speaker creation
- Schedule creation → speaker assignment → overlap warning

---

## Next Steps

- **Phase 1 Continued**: Generate `quickstart.md` for developer onboarding
- **Phase 2**: Task decomposition mapping user stories to specific procedure implementations
