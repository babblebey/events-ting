# PRD: QR Code Storage Optimization

**Status**: IMPLEMENTED ✅   
**Priority**: Medium  
**Created**: November 21, 2025  
**Issue**: TBD  
**Milestone**: TBD  
**Issue Type**: Performance / Architecture Improvement

---

## Problem Statement

### Business Need
Currently, QR codes for tickets are generated on-the-fly whenever they need to be displayed or sent via email. The `qrCodeData` field in the Ticket model stores the ticket number as a string (e.g., `"TKT-L8Z9K3-A7B2C5D8E9"`), which is then used to generate QR code images in PNG data URL format (`data:image/png;base64,...`) when needed. This approach creates several performance and user experience issues:

1. **API Overhead**: Every ticket view requires a separate tRPC call to `tickets.generateQRCode` to create the QR image
2. **Email Delays**: Ticket assignment emails must generate QR codes synchronously before sending, adding 100-300ms delay per email
3. **Batch Processing Bottlenecks**: CSV import with bulk ticket assignments requires sequential QR generation with artificial delays (500ms per email) to avoid overwhelming the server
4. **Redundant Computation**: The same ticket's QR code is regenerated multiple times (email, web view, mobile view, PDF download)
5. **Client-Side Dependencies**: Frontend components must wait for async QR generation, increasing Time to Interactive (TTI)

### User Impact
**Primary Users**: 
- **Attendees**: Viewing tickets and accessing QR codes for event check-in
- **Buyers**: Managing assigned tickets and viewing QR codes in dashboard
- **Event Organizers**: Bulk importing attendees with ticket assignments

**Current Pain Points**:
- Slow ticket page loads when QR codes generate on demand (300-500ms delay)
- Email delivery delays during bulk ticket assignments (noticeable for 50+ tickets)
- Potential server overload during high-volume registration periods
- Inconsistent QR code availability (client-side generation failures)
- Poor offline support (can't cache pre-generated QR codes)

### Use Case Scenario
> *TechConf organizer imports 500 attendees via CSV. Each attendee receives a ticket assignment email with a QR code. Currently, the system must:*
> 1. Generate QR code for each ticket (100-150ms each)
> 2. Wait between emails to avoid rate limits (500ms delay)
> 3. Total time: ~8-10 minutes for 500 tickets
> 
> *With pre-generated QR codes stored in the database, emails send immediately using the stored data URL, reducing total time to ~2-3 minutes.*

---

## Goals & Success Criteria

### Primary Goals
1. **Eliminate on-the-fly QR generation**: Store pre-generated PNG data URLs in `qrCodeData` field during ticket creation
2. **Improve email performance**: Use stored QR codes directly in email templates without generation overhead
3. **Simplify frontend implementation**: Components read QR codes directly from ticket data without API calls
4. **Maintain backward compatibility**: Migrate existing tickets without breaking functionality
5. **Reduce server load**: Eliminate redundant QR code generation across ticket lifecycle

### Success Metrics
- ✅ Ticket creation includes QR code generation (< 200ms overhead per ticket)
- ✅ Email sending time reduced by 100-300ms per email (no QR generation)
- ✅ Bulk import processing time reduced by 40-60% (500 tickets: from ~10min to ~4min)
- ✅ Ticket page load time reduced by 300-500ms (no separate QR API call)
- ✅ 100% of tickets have pre-generated QR codes in database
- ✅ Zero on-the-fly QR generation calls in production after migration
- ✅ Consistent QR code format: 400px PNG data URLs

### Out of Scope (MVP)
- ❌ SVG format storage (PNG data URLs only for consistency)
- ❌ Multiple size storage (single 400px size for all use cases)
- ❌ QR code regeneration endpoint (not needed unless format changes)
- ❌ Dynamic QR code customization (colors, logos, error correction)
- ❌ QR code analytics (scan tracking, location data)

---

## User Stories

### US1: Fast Ticket Creation with Pre-Generated QR Codes
**As a** buyer or organizer  
**I want** tickets to be created with QR codes already generated  
**So that** tickets are immediately ready for viewing and emailing

**Acceptance Criteria**:
- When registration is completed, each ticket includes a pre-generated QR code data URL in `qrCodeData`
- QR code generation adds < 200ms to total ticket creation time
- QR code format: PNG data URL at 400px width with error correction level H
- QR code encodes the ticket number (unchanged from current implementation)
- Ticket creation transaction includes QR code generation (atomic operation)
- Failed QR code generation causes ticket creation to fail (data integrity)

---

### US2: Instant Email Delivery with Stored QR Codes
**As an** attendee  
**I want** to receive my ticket assignment email immediately  
**So that** I can quickly confirm my registration and save my ticket

**Acceptance Criteria**:
- Ticket assignment emails use `ticket.qrCodeData` directly (no generation call)
- Email sending time reduced by 100-300ms per email
- QR code in email is identical to web view (same data URL)
- Email template receives pre-generated QR code from ticket record
- No blocking async calls for QR generation during email sending
- Email reliability improved (no QR generation failures)

---

### US3: Fast Ticket Page Loading
**As an** attendee  
**I want** ticket pages to load instantly with QR codes visible  
**So that** I can quickly access my ticket at event check-in

**Acceptance Criteria**:
- Ticket page loads QR code from `ticket.qrCodeData` field directly
- No separate API call to `tickets.generateQRCode` required
- Page load time (LCP) reduced by 300-500ms
- QR code displays immediately with page content (no loading state)
- Offline support: QR code available when page is cached
- Mobile performance: Instant QR display on slower connections

---

### US4: Efficient Bulk Ticket Import
**As an** organizer  
**I want** bulk attendee imports to complete quickly  
**So that** I can send tickets to hundreds of attendees without long waits

**Acceptance Criteria**:
- CSV import generates QR codes during ticket creation (not during email sending)
- Email sending loops no longer include QR generation overhead
- Bulk import processing time reduced by 40-60% for 100+ tickets
- No rate-limiting delays needed for QR generation
- Progress indicators reflect actual work (not artificial delays)
- System can handle 500+ ticket imports without performance degradation

---

### US5: Seamless Migration of Existing Tickets
**As a** system administrator  
**I want** existing tickets to be migrated with pre-generated QR codes  
**So that** old and new tickets behave identically

**Acceptance Criteria**:
- Migration script backfills QR codes for all existing tickets
- Migration identifies tickets with ticket number format in `qrCodeData` (starts with "TKT-")
- Migration generates 400px PNG data URLs for all existing tickets
- Migration is idempotent (can be run multiple times safely)
- Migration tracks progress and reports completion percentage
- Zero downtime during migration (tickets remain accessible)
- Old email links continue working (QR codes regenerated if missing)

---

## Technical Design

### Architecture Overview

#### Current QR Code Flow
```
Ticket Creation:
├─ Generate ticket number: "TKT-L8Z9K3-A7B2C5D8E9"
├─ Store in qrCodeData: "TKT-L8Z9K3-A7B2C5D8E9"
└─ Ticket saved to database

Ticket Display (Web):
├─ Fetch ticket: api.tickets.getById({ ticketId })
├─ Call: api.tickets.generateQRCode({ ticketId, format: 'dataUrl', size: 400 })
│  ├─ Read qrCodeData: "TKT-L8Z9K3-A7B2C5D8E9"
│  ├─ Generate PNG: generateTicketQRCode(qrCodeData, { width: 400 })
│  └─ Return: "data:image/png;base64,iVBORw0KGgo..."
└─ Render QR code image

Ticket Email:
├─ Fetch ticket details
├─ Generate QR: await generateTicketQRCode(ticket.qrCodeData, { width: 400 })
│  └─ Block email sending for 100-300ms
├─ Send email with generated QR data URL
└─ Email delivered
```

#### New QR Code Flow (Optimized)
```
Ticket Creation:
├─ Generate ticket number: "TKT-L8Z9K3-A7B2C5D8E9"
├─ Generate QR data URL: generateTicketQRCode("TKT-L8Z9K3-A7B2C5D8E9", { width: 400 })
│  └─ Returns: "data:image/png;base64,iVBORw0KGgo..."
├─ Store in qrCodeData: "data:image/png;base64,iVBORw0KGgo..."
└─ Ticket saved to database

Ticket Display (Web):
├─ Fetch ticket: api.tickets.getById({ ticketId })
│  └─ Returns: { ..., qrCodeData: "data:image/png;base64,..." }
└─ Render QR code image directly (no API call needed)

Ticket Email:
├─ Fetch ticket details
│  └─ Includes: qrCodeData: "data:image/png;base64,..."
├─ Pass to email template (no generation)
└─ Email delivered immediately
```

---

### Data Model Changes

#### Prisma Schema (No Changes Required)
```prisma
model Ticket {
  // ... other fields ...
  
  ticketNumber String @unique     // e.g., "TKT-L8Z9K3-A7B2C5D8E9"
  qrCodeData   String @unique     // BEFORE: ticket number string
                                  // AFTER: PNG data URL (~8-12KB)
  
  // ... other fields ...
  
  @@index([qrCodeData]) // For QR code validation lookups
}
```

**Field Capacity Analysis**:
- Current: `qrCodeData` is `String` type (TEXT in PostgreSQL)
- Average PNG data URL size: ~8-12KB for 400px QR code
- PostgreSQL TEXT limit: 1GB (more than sufficient)
- No schema migration needed (type supports both formats)

#### Data Format Specification

**Before (Current)**:
```typescript
qrCodeData: "TKT-L8Z9K3-A7B2C5D8E9"
```

**After (New)**:
```typescript
qrCodeData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQCAYAAACAvzbMAAA..."
// Full data URL: ~8-12KB
// Contains: PNG image at 400x400px with error correction level H
// Encodes: Same ticket number as before
```

---

### Implementation Changes

#### 1. Update Ticket Creation in Registration Flow

**File**: `src/server/api/routers/registrations.ts`  
**Location**: Lines 184-210

**Current Code**:
```typescript
// Create individual ticket instances for this registration
const tickets = [];
for (let i = 0; i < quantity; i++) {
  const ticketNumber = generateTicketNumber();
  const ticket = await tx.ticket.create({
    data: {
      registrationId: registration.id,
      eventId: event.id,
      ticketTypeId: input.ticketTypeId,
      ticketNumber,
      qrCodeData: ticketNumber, // ← STORES TICKET NUMBER
      isAssigned: false,
      isCheckedIn: false,
    },
  });
  tickets.push(ticket);
}
```

**Updated Code**:
```typescript
import { generateTicketQRCode } from "@/lib/qr-code/generator";

// Create individual ticket instances for this registration
const tickets = [];
for (let i = 0; i < quantity; i++) {
  const ticketNumber = generateTicketNumber();
  
  // Generate QR code data URL during ticket creation
  const qrCodeData = await generateTicketQRCode(ticketNumber, {
    width: 400,
  });
  
  const ticket = await tx.ticket.create({
    data: {
      registrationId: registration.id,
      eventId: event.id,
      ticketTypeId: input.ticketTypeId,
      ticketNumber,
      qrCodeData, // ← STORES PNG DATA URL
      isAssigned: false,
      isCheckedIn: false,
    },
  });
  tickets.push(ticket);
}
```

**Performance Impact**: +100-150ms per ticket creation (acceptable during registration)

---

#### 2. Update Ticket Creation in CSV Import

**File**: `src/server/api/routers/attendees.ts`  
**Location**: Lines 1757-1766

**Current Code**:
```typescript
// 2. Create Ticket record with ticket number and QR code
const ticket = await tx.ticket.create({
  data: {
    registrationId: registration.id,
    eventId: input.eventId,
    ticketTypeId,
    ticketNumber,
    qrCodeData: ticketNumber, // ← STORES TICKET NUMBER
    isAssigned: false,
    isCheckedIn: false,
  },
});
```

**Updated Code**:
```typescript
import { generateTicketQRCode } from "@/lib/qr-code/generator";

// Generate QR code data URL
const qrCodeData = await generateTicketQRCode(ticketNumber, {
  width: 400,
});

// 2. Create Ticket record with ticket number and QR code
const ticket = await tx.ticket.create({
  data: {
    registrationId: registration.id,
    eventId: input.eventId,
    ticketTypeId,
    ticketNumber,
    qrCodeData, // ← STORES PNG DATA URL
    isAssigned: false,
    isCheckedIn: false,
  },
});
```

---

#### 3. Update Manual Registration

**File**: `src/server/api/routers/registrations.ts`  
**Location**: Lines 466-476

**Current Code**:
```typescript
// Create ticket instance for manually added registration
const ticketNumber = generateTicketNumber();
await tx.ticket.create({
  data: {
    registrationId: reg.id,
    eventId: input.eventId,
    ticketTypeId: input.ticketTypeId,
    ticketNumber,
    qrCodeData: ticketNumber, // ← STORES TICKET NUMBER
    isAssigned: false,
    isCheckedIn: false,
  },
});
```

**Updated Code**:
```typescript
import { generateTicketQRCode } from "@/lib/qr-code/generator";

// Create ticket instance for manually added registration
const ticketNumber = generateTicketNumber();

// Generate QR code data URL
const qrCodeData = await generateTicketQRCode(ticketNumber, {
  width: 400,
});

await tx.ticket.create({
  data: {
    registrationId: reg.id,
    eventId: input.eventId,
    ticketTypeId: input.ticketTypeId,
    ticketNumber,
    qrCodeData, // ← STORES PNG DATA URL
    isAssigned: false,
    isCheckedIn: false,
  },
});
```

---

#### 4. Update Ticket Assignment Email

**File**: `src/server/api/routers/tickets.ts`  
**Location**: Lines 658-662

**Current Code**:
```typescript
// Generate QR code for email
const qrCodeData = await generateTicketQRCode(
  result.updatedTicket.qrCodeData,
  {
    width: 400,
  },
);
```

**Updated Code**:
```typescript
// Use pre-generated QR code from ticket
const qrCodeData = result.updatedTicket.qrCodeData;
```

**Performance Impact**: -100-300ms per email (immediate improvement)

---

#### 5. Update CSV Import Email Sending

**File**: `src/server/api/routers/attendees.ts`  
**Location**: Lines 1882-1885

**Current Code**:
```typescript
// Generate QR code
const qrCodeData = await generateTicketQRCode(
  task.ticketNumber,
  { width: 400 },
);
```

**Updated Code**:
```typescript
// Use QR code directly from ticket record
const qrCodeData = task.ticket.qrCodeData;
```

---

#### 6. Deprecate or Update `tickets.generateQRCode` Procedure

**File**: `src/server/api/routers/tickets.ts`  
**Location**: Lines 385-420

**Option A: Complete Removal** (Recommended)
```typescript
// Remove the entire generateQRCode procedure
// Frontend components will use ticket.qrCodeData directly
```

**Option B: Convert to Return Stored Value** (Backward Compatibility)
```typescript
generateQRCode: publicProcedure
  .input(generateQRCodeInputSchema)
  .query(async ({ ctx, input }) => {
    const { ticketId } = input;
    
    const ticket = await ctx.db.ticket.findUnique({
      where: { id: ticketId },
      select: {
        ticketNumber: true,
        qrCodeData: true,
      },
    });
    
    if (!ticket) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Ticket not found",
      });
    }
    
    // Return stored QR code (ignore format and size params)
    return {
      qrCode: ticket.qrCodeData,
      ticketNumber: ticket.ticketNumber,
    };
  }),
```

**Recommendation**: Option A (complete removal) after frontend updates are deployed.

---

#### 7. Update Frontend Components

**File**: `src/components/tickets/qr-code-display.tsx`  
**Location**: Lines 54-61

**Current Code**:
```typescript
const { data: qrData, isLoading } = api.tickets.generateQRCode.useQuery({
  ticketId: ticketId,
  format: "dataUrl",
  size: 400,
});

// ... loading state handling ...

<img src={qrData.qrCode} alt={`QR Code for ${qrData.ticketNumber}`} />
```

**Updated Code**:
```typescript
// Receive QR code directly from ticket prop
interface QRCodeDisplayProps {
  ticketNumber: string;
  qrCodeData: string; // Pre-generated data URL
}

function QRCodeDisplay({ ticketNumber, qrCodeData }: QRCodeDisplayProps) {
  return (
    <img
      src={qrCodeData}
      alt={`QR Code for ${ticketNumber}`}
      width={400}
      height={400}
    />
  );
}
```

**Performance Impact**: Instant rendering (no loading state needed)

---

#### 8. Update Ticket Pages

**File**: `src/app/(public)/tickets/[ticketId]/page.tsx`  
**Location**: Line 81

**Current Code**:
```typescript
const ticket = api.tickets.getById.useQuery({ ticketId });

// Component renders QRCodeDisplay which fetches QR separately
<QRCodeDisplay ticketId={ticket.id} />
```

**Updated Code**:
```typescript
const ticket = api.tickets.getById.useQuery({ ticketId });

// Pass QR code data directly to component
<QRCodeDisplay
  ticketNumber={ticket.ticketNumber}
  qrCodeData={ticket.qrCodeData}
/>
```

---

### Database Migration Script

#### Migration Strategy

**Approach**: One-time migration script to backfill existing tickets

**Script Location**: `prisma/migrations/YYYYMMDDHHMMSS_backfill_qr_codes/migration.sql`

**Script Content**:
```sql
-- Migration is handled via TypeScript script (not raw SQL)
-- See: scripts/backfill-ticket-qr-codes.ts
```

**TypeScript Migration Script**:

**File**: `scripts/backfill-ticket-qr-codes.ts`

```typescript
import { PrismaClient } from "@prisma/client";
import { generateTicketQRCode } from "@/lib/qr-code/generator";

const db = new PrismaClient();

async function backfillQRCodes() {
  console.log("Starting QR code backfill migration...");

  // Find all tickets where qrCodeData looks like a ticket number
  // (starts with "TKT-" and doesn't start with "data:image/png")
  const tickets = await db.ticket.findMany({
    where: {
      qrCodeData: {
        startsWith: "TKT-",
      },
    },
    select: {
      id: true,
      ticketNumber: true,
      qrCodeData: true,
    },
  });

  console.log(`Found ${tickets.length} tickets to migrate`);

  let processed = 0;
  let failed = 0;

  for (const ticket of tickets) {
    try {
      // Generate QR code data URL from ticket number
      const qrCodeData = await generateTicketQRCode(ticket.ticketNumber, {
        width: 400,
      });

      // Update ticket with pre-generated QR code
      await db.ticket.update({
        where: { id: ticket.id },
        data: { qrCodeData },
      });

      processed++;

      // Log progress every 50 tickets
      if (processed % 50 === 0) {
        console.log(`Progress: ${processed}/${tickets.length} tickets migrated`);
      }
    } catch (error) {
      console.error(`Failed to migrate ticket ${ticket.id}:`, error);
      failed++;
    }
  }

  console.log("\nMigration complete!");
  console.log(`✅ Successfully migrated: ${processed} tickets`);
  console.log(`❌ Failed: ${failed} tickets`);

  await db.$disconnect();
}

backfillQRCodes()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
```

**Running the Migration**:
```bash
# Run migration script
pnpm tsx scripts/backfill-ticket-qr-codes.ts

# Or add to package.json scripts:
# "migrate:qr-codes": "tsx scripts/backfill-ticket-qr-codes.ts"
pnpm migrate:qr-codes
```

**Migration Characteristics**:
- **Idempotent**: Can be run multiple times (only processes tickets with ticket number format)
- **Zero Downtime**: Tickets remain accessible during migration
- **Progress Tracking**: Logs every 50 tickets
- **Error Handling**: Logs failures but continues processing
- **Performance**: ~100-150ms per ticket (5,000 tickets ≈ 8-12 minutes)

---

### QR Code Format Specification

#### PNG Data URL Structure
```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQCAYAAACAvzbMAAA...
^    ^         ^       ^
|    |         |       └─ Base64-encoded PNG binary data
|    |         └─ Encoding format
|    └─ MIME type
└─ Data URL scheme
```

#### QR Code Generation Settings
```typescript
const QR_OPTIONS = {
  errorCorrectionLevel: "H", // 30% damage recovery
  margin: 2,                  // Quiet zone (modules)
  width: 400,                 // Output size in pixels
  color: {
    dark: "#000000",          // QR code foreground
    light: "#FFFFFF",         // QR code background
  },
};
```

#### QR Code Payload (Unchanged)
```typescript
// Encodes ticket number only
qrCodePayload: "TKT-L8Z9K3-A7B2C5D8E9"

// NOT a JSON payload (unlike some implementations)
// Simple string for maximum compatibility
```

---

## Implementation Plan

### Phase 1: Update Ticket Creation Logic - COMPLETED ✅
**Estimated Effort**: 2-3 hours

**Tasks**:
1. Update `registrations.ts` ticket creation (registration flow)
2. Update `attendees.ts` ticket creation (CSV import)
3. Update `registrations.ts` manual registration ticket creation
4. Add import for `generateTicketQRCode` in all three files
5. Add QR code generation before `ticket.create()` calls
6. Test ticket creation locally (verify data URL format)
7. Unit tests for ticket creation with QR codes

**Acceptance**: New tickets created with PNG data URLs in `qrCodeData` field.

---

### Phase 2: Update Email Integration - COMPLETED ✅
**Estimated Effort**: 1-2 hours

**Tasks**:
1. Update `tickets.assign` mutation to use stored QR code
2. Update CSV import email sending to use stored QR code
3. Remove async QR generation calls from email flow
4. Test email sending (verify QR codes display correctly)
5. Verify email templates render data URLs properly
6. Performance testing: measure email sending speedup

**Acceptance**: Emails sent with pre-generated QR codes, 100-300ms faster per email.

---

### Phase 3: Update Frontend Components - COMPLETED ✅
**Estimated Effort**: 2-3 hours

**Tasks**:
1. Update `QRCodeDisplay` component to accept `qrCodeData` prop
2. Remove `api.tickets.generateQRCode.useQuery` calls
3. Update ticket pages to pass QR code from ticket data
4. Update buyer dashboard ticket cards
5. Update organizer attendee management views
6. Test all ticket viewing flows
7. Remove loading states for QR codes

**Acceptance**: All frontend views use stored QR codes, no API calls to `generateQRCode`.

---

### Phase 4: Deprecate or Remove `generateQRCode` Procedure- COMPLETED ✅
**Estimated Effort**: 1 hour

**Tasks**:
1. Decide: complete removal vs. backward compatibility shim
2. If removing: Delete `tickets.generateQRCode` procedure
3. If keeping: Update to return stored value (ignore params)
4. Update API documentation
5. Search codebase for any remaining references
6. Add deprecation notice if keeping temporarily

**Acceptance**: `generateQRCode` procedure removed or converted to stub.

---

### Phase 5: Create and Run Migration Script
**Estimated Effort**: 2-3 hours

**Tasks**:
1. Create `scripts/backfill-ticket-qr-codes.ts`
2. Implement ticket lookup with ticket number format filter
3. Add QR code generation loop with progress logging
4. Add error handling and retry logic
5. Test migration on staging database
6. Run migration on production during maintenance window
7. Verify migration completion (100% tickets have data URLs)

**Acceptance**: All existing tickets have PNG data URLs in `qrCodeData` field.

---

### Phase 6: Testing & Validation
**Estimated Effort**: 2-3 hours

**Tasks**:
1. **Functional Testing**:
   - Create new ticket (verify QR code stored)
   - Assign ticket (verify email uses stored QR)
   - View ticket (verify QR displays without API call)
   - Bulk import (verify performance improvement)
2. **Performance Testing**:
   - Measure ticket creation time (< 200ms overhead)
   - Measure email sending time (100-300ms reduction)
   - Measure bulk import time (40-60% reduction)
   - Measure ticket page load time (300-500ms reduction)
3. **Data Integrity Testing**:
   - Verify QR codes encode correct ticket numbers
   - Scan QR codes with mobile devices
   - Test QR code image rendering across browsers
   - Verify email client compatibility (Gmail, Outlook, Apple Mail)
4. **Migration Testing**:
   - Run migration on test dataset
   - Verify idempotency (run twice, same result)
   - Check error handling for corrupted tickets

**Acceptance**: All tests pass, performance metrics met.

---

### Phase 7: Documentation Updates
**Estimated Effort**: 2-3 hours

**Tasks**:
1. **Update Tickets Module README** (`docs/modules/tickets/README.md`):
   - Update "QR Code Data" section to describe PNG data URL storage
   - Remove references to on-the-fly generation
   - Update performance considerations section
   - Add migration notes for existing systems
2. **Update Tickets Backend Documentation** (`docs/modules/tickets/backend.md`):
   - Update procedure descriptions (remove/update `generateQRCode`)
   - Update email integration examples (use stored QR codes)
   - Update performance optimization section
   - Remove QR code caching strategies (no longer needed)
3. **Update Tickets Data Model Documentation** (`docs/modules/tickets/data-model.md`):
   - Update `qrCodeData` field description (PNG data URL, not ticket number)
   - Update field size information (~8-12KB data URLs)
   - Add data format examples
   - Update constraints and validation rules
4. **Update Architecture Documentation** (`docs/architecture/system-overview.md`):
   - Update system flow diagrams (remove QR generation step)
   - Update performance characteristics section
5. **Create Migration Guide**:
   - Document migration script usage
   - Add troubleshooting section
   - Include rollback procedures
6. **Update CHANGELOG**:
   - Add entry for QR code storage optimization
   - Note breaking changes (if any)

**Acceptance**: All documentation reflects new QR code storage approach.

---

## Rollout Strategy

### Pre-Deployment Checklist
- [ ] All code changes completed and tested
- [ ] Frontend components updated and tested
- [ ] Email templates verified
- [ ] Migration script tested on staging
- [ ] Performance benchmarks validated
- [ ] Documentation updated
- [ ] Code review completed and approved
- [ ] Staging environment fully tested

### Deployment Steps

**Step 1: Deploy Code Changes**
1. Deploy updated backend code (ticket creation, email integration)
2. Deploy updated frontend code (components using stored QR codes)
3. Monitor for errors in production logs
4. Verify new tickets created with QR codes

**Step 2: Run Migration (Maintenance Window)**
1. Announce maintenance window (optional - zero downtime expected)
2. Run migration script: `pnpm migrate:qr-codes`
3. Monitor progress (logs every 50 tickets)
4. Verify completion (check random sample of old tickets)
5. Confirm all tickets have data URL format in `qrCodeData`

**Step 3: Remove Old Code**
1. Deploy removal of `tickets.generateQRCode` procedure (if opted for removal)
2. Monitor for any unexpected calls to deprecated procedure
3. Clean up unused imports and utilities

**Step 4: Validation**
1. Test ticket viewing (old and new tickets)
2. Test email sending (verify QR codes display)
3. Test bulk import (verify performance improvement)
4. Monitor performance metrics for 24-48 hours
5. Confirm success metrics achieved

### Rollback Plan

If critical issues are discovered:

**Scenario 1: Code Issues (Before Migration)**
1. Revert deployment to previous version
2. Tickets created with QR codes remain valid (backward compatible)
3. Old tickets still work with ticket number in `qrCodeData`
4. No data loss (migration not yet run)

**Scenario 2: Migration Issues (During Migration)**
1. Stop migration script
2. Investigate errors from logs
3. Fix migration script
4. Re-run migration (idempotent)
5. Partially migrated tickets work correctly (mixed state supported)

**Scenario 3: Post-Migration Issues**
1. Identify issue (frontend, email, or data)
2. Fix specific component without reverting migration
3. Migration data remains valid (QR codes are immutable)
4. Re-run migration only for failed tickets if needed

**Recovery Time Objective (RTO)**: < 30 minutes (standard deployment rollback)  
**Recovery Point Objective (RPO)**: 0 (no data loss risk)

---

## Risks & Mitigation

### Risk 1: Increased Database Storage
**Probability**: High (expected)  
**Impact**: Low  
**Details**: 
- Each QR code: ~8-12KB (vs. ~20 bytes for ticket number)
- 10,000 tickets: ~100MB additional storage
- 100,000 tickets: ~1GB additional storage

**Mitigation**: 
- PostgreSQL handles TEXT fields efficiently
- Storage cost minimal compared to performance gains
- Monitor database size growth
- Consider archival strategy for very old events

---

### Risk 2: Migration Timeout or Failure
**Probability**: Medium  
**Impact**: Medium  
**Details**: 
- Large databases (10,000+ tickets) may take 15-30 minutes
- Network issues could interrupt migration
- QR code generation failures could occur

**Mitigation**: 
- Run migration during low-traffic window
- Implement robust error handling and logging
- Make migration idempotent (can resume)
- Test on staging database first
- Have rollback plan ready

---

### Risk 3: Email Client Compatibility
**Probability**: Low  
**Impact**: Medium  
**Details**: 
- Some email clients may not render large data URLs
- Email size limits could be exceeded with QR codes

**Mitigation**: 
- Test with major email clients (Gmail, Outlook, Apple Mail)
- Data URLs are widely supported (industry standard)
- QR codes are well within typical email size limits
- Fallback: Link to web view with QR code

---

### Risk 4: Performance Regression on Ticket Creation
**Probability**: Low  
**Impact**: Low  
**Details**: 
- Ticket creation will take 100-150ms longer
- Bulk operations may feel slower initially

**Mitigation**: 
- Performance impact is during creation (one-time cost)
- Offset by massive savings during viewing/emailing
- Async QR generation in background (future optimization)
- Net performance gain across ticket lifecycle

---

### Risk 5: QR Code Format Changes
**Probability**: Very Low  
**Impact**: High  
**Details**: 
- If QR code requirements change (size, format, encoding)
- Stored QR codes become outdated

**Mitigation**: 
- Use standardized format (400px PNG, error level H)
- QR code payload remains simple (ticket number only)
- Migration script can be re-run with new format if needed
- Version field could be added for future flexibility

---

## Success Criteria & Metrics

### Immediate Success Metrics (Week 1)
- ✅ 100% of new tickets created with PNG data URL in `qrCodeData`
- ✅ 100% of existing tickets migrated to PNG data URL format
- ✅ Zero `tickets.generateQRCode` API calls in production logs
- ✅ Email sending time reduced by 100-300ms (measured via logs)
- ✅ Ticket page load time (LCP) reduced by 300-500ms

### Performance Metrics (Month 1)
- ✅ Bulk import processing time reduced by 40-60% for 100+ tickets
- ✅ Server CPU usage reduced during peak registration periods
- ✅ Email delivery reliability improved (fewer timeout errors)
- ✅ Ticket page Time to Interactive (TTI) improved by 400-600ms
- ✅ Database storage increase < 2% of total size

### User Experience Metrics (Month 1)
- ✅ Ticket page bounce rate reduced (faster loading)
- ✅ Time on ticket page increased (immediate QR code visibility)
- ✅ Email open rate maintained or improved (faster delivery)
- ✅ Support tickets related to "QR code not loading" reduced to zero

---

## Dependencies

### External Dependencies
- **qrcode** npm package (already installed): For QR code generation
- PostgreSQL TEXT field support (native): For storing data URLs
- Email client data URL support (industry standard): For rendering QR codes

### Internal Dependencies
- **Ticket creation flows**: Registration, CSV import, manual registration
- **Email templates**: `ticket-assigned.tsx`, `ticket-reassigned.tsx`
- **Frontend components**: `QRCodeDisplay`, ticket pages, buyer dashboard
- **tRPC procedures**: `tickets.getById`, `tickets.assign`, `tickets.generateQRCode`

### Team Dependencies
- **Backend Team**: Implement ticket creation and email changes
- **Frontend Team**: Update components to use stored QR codes
- **QA Team**: Comprehensive testing across all flows
- **DevOps Team**: Run migration script, monitor deployment

---

## Open Questions & Decisions Needed

### Q1: Should we support multiple QR code sizes?
**Options**:
- **A**: Single size (400px) for all use cases
- **B**: Multiple sizes (200px, 400px, 800px) stored separately
- **C**: Single size (400px) + on-demand resizing

**Decision**: ✅ **Option A: Single 400px size**  
**Rationale**: 
- 400px works well for all current use cases (web, email, mobile)
- Simplifies storage and migration
- Browsers scale images efficiently if needed
- Reduces complexity and storage overhead
- Can add multiple sizes in future if needed

---

### Q2: Should we keep `tickets.generateQRCode` procedure?
**Options**:
- **A**: Complete removal (recommended)
- **B**: Convert to return stored value (backward compatibility)
- **C**: Keep for regeneration on-demand

**Decision**: ✅ **Option A: Complete removal after frontend update**  
**Rationale**: 
- No longer needed with stored QR codes
- Simplifies codebase
- Prevents confusion about which approach to use
- Frontend changes deployed first for safety
- Can re-add if truly needed (unlikely)

---

### Q3: Should we generate QR codes synchronously or asynchronously?
**Options**:
- **A**: Synchronous during ticket creation (current plan)
- **B**: Asynchronous background job after ticket creation
- **C**: Hybrid: Sync for single tickets, async for bulk

**Decision**: ✅ **Option A: Synchronous (MVP), Option B (future optimization)**  
**Rationale**: 
- MVP: Synchronous ensures QR code always available
- Simple implementation, fewer moving parts
- 100-150ms overhead acceptable during registration
- Future: Background jobs for bulk imports if needed
- Atomic operation ensures data integrity

---

### Q4: Should we add a `qrCodeVersion` field for future flexibility?
**Options**:
- **A**: No version field (simpler)
- **B**: Add `qrCodeVersion: 1` field to track format
- **C**: Add `qrCodeMetadata` JSON field

**Decision**: ⏸️ **Defer to future if needed**  
**Rationale**: 
- Current format unlikely to change (PNG, 400px, error level H)
- Can infer format from data URL prefix (`data:image/png`)
- Ticket number string detection works for migration
- Adding versioning later is non-breaking
- Keep MVP scope focused

---

### Q5: Should we implement QR code regeneration endpoint?
**Options**:
- **A**: No regeneration endpoint (recommended)
- **B**: Admin-only regeneration for specific tickets
- **C**: Automatic regeneration if format changes

**Decision**: ✅ **Option A: No regeneration endpoint (MVP)**  
**Rationale**: 
- QR code content doesn't change (ticket number remains same)
- Format standardized (400px PNG, error level H)
- Migration script can handle bulk regeneration if ever needed
- Reduces API surface area
- Can add later if use case emerges

---

## Timeline

| Phase | Duration | Start Date | End Date |
|-------|----------|------------|----------|
| Planning & PRD | 1 day | Nov 21, 2025 | Nov 21, 2025 |
| Phase 1: Ticket Creation | 0.5 day | Nov 22, 2025 | Nov 22, 2025 |
| Phase 2: Email Integration | 0.5 day | Nov 22, 2025 | Nov 22, 2025 |
| Phase 3: Frontend Components | 0.5 day | Nov 23, 2025 | Nov 23, 2025 |
| Phase 4: Deprecate Procedure | 0.25 day | Nov 23, 2025 | Nov 23, 2025 |
| Phase 5: Migration Script | 0.5 day | Nov 24, 2025 | Nov 24, 2025 |
| Phase 6: Testing | 0.5 day | Nov 24, 2025 | Nov 24, 2025 |
| Phase 7: Documentation | 0.5 day | Nov 25, 2025 | Nov 25, 2025 |
| **Total** | **3.75 days** | **Nov 21** | **Nov 25** |

**Deployment Target**: November 26, 2025 (Tuesday)  
**Migration Window**: November 26, 2025 evening (low traffic period)

---

## Appendix

### A. QR Code Size Comparison

| Format | Before | After |
|--------|--------|-------|
| Storage | ~20 bytes (ticket number string) | ~8-12KB (PNG data URL) |
| API Calls | 1-3 per ticket view | 0 |
| Email Generation | 100-300ms | 0ms |
| Page Load | +300-500ms | 0ms |
| Database Impact | Minimal | +~10KB per ticket |

### B. Performance Benchmarks

**Ticket Creation**:
- Before: ~50ms (database only)
- After: ~150-200ms (+100-150ms for QR generation)
- Net: Acceptable one-time cost

**Email Sending** (single ticket):
- Before: ~400-600ms (includes QR generation)
- After: ~100-300ms (no QR generation)
- Net: -200-400ms improvement

**Bulk Import** (100 tickets):
- Before: ~5-6 minutes (sequential QR generation + rate limiting)
- After: ~2-3 minutes (QR generated during ticket creation)
- Net: ~50% time reduction

**Ticket Page Load**:
- Before: ~800-1200ms (fetch ticket + generate QR)
- After: ~300-700ms (fetch ticket only)
- Net: ~500ms LCP improvement

### C. Database Storage Estimates

| Tickets | Storage Increase (400px PNG) | Cost Impact |
|---------|------------------------------|-------------|
| 1,000 | ~10MB | Negligible |
| 10,000 | ~100MB | < $0.01/month |
| 100,000 | ~1GB | < $0.10/month |
| 1,000,000 | ~10GB | < $1.00/month |

*Based on AWS RDS PostgreSQL pricing (~$0.10/GB/month)*

### D. Migration Script Output Example

```
Starting QR code backfill migration...
Found 5,247 tickets to migrate

Progress: 50/5,247 tickets migrated
Progress: 100/5,247 tickets migrated
Progress: 150/5,247 tickets migrated
...
Progress: 5,200/5,247 tickets migrated
Progress: 5,247/5,247 tickets migrated

Migration complete!
✅ Successfully migrated: 5,247 tickets
❌ Failed: 0 tickets
```

### E. Code Search Patterns

Use these patterns to find all affected code:

```bash
# Find ticket creation locations
grep -r "qrCodeData:" src/ | grep -v "node_modules"
grep -r "generateTicketNumber()" src/

# Find QR code generation calls
grep -r "generateTicketQRCode" src/
grep -r "generateQRCode" src/

# Find component usages
grep -r "QRCodeDisplay" src/
grep -r "tickets.generateQRCode" src/

# Find email template references
grep -r "qrCodeData" emails/
grep -r "ticketUrl" emails/
```

### F. Related Documentation

- [Tickets Module README](../../docs/modules/tickets/README.md)
- [Tickets Backend Documentation](../../docs/modules/tickets/backend.md)
- [Tickets Data Model Documentation](../../docs/modules/tickets/data-model.md)
- [QR Code Generator Utility](../../src/lib/qr-code/generator.ts)
- [Email Templates Documentation](../../docs/modules/communications/email-integration.md)

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
3. Estimate effort and prioritize
4. Begin implementation after approval
