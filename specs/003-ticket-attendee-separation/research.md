# Research Notes: Ticket Instance and Attendee Separation

**Feature**: `003-ticket-attendee-separation`  
**Date**: November 19, 2025  
**Phase**: Phase 0 - Research & Discovery

## Overview

This document captures research findings and technical decisions made during the planning phase. All "NEEDS CLARIFICATION" items from the Technical Context have been investigated and resolved below.

---

## 1. Testing Framework Selection

### Decision
**Vitest + Playwright** (hybrid approach)

### Rationale

**Vitest for unit and integration tests:**
- Native TypeScript/ESM support (matches Next.js 15+ ecosystem)
- Jest-compatible API but 10-20x faster
- Built-in code coverage with c8
- Better watch mode performance
- First-class Vite integration (Next.js uses Turbopack but Vitest works well with TypeScript projects)

**Playwright for end-to-end tests:**
- Multi-browser support (Chromium, Firefox, WebKit)
- Built-in test runner with parallel execution
- Visual regression testing capabilities
- Network interception for API mocking
- Mobile viewport testing (critical for attendee ticket views)

### Alternatives Considered

**Jest:**
- Rejected: Slower than Vitest, requires babel/ts-jest transforms
- No significant advantage given project uses pure ESM

**Testing Library + Jest:**
- Rejected: Same performance issues as Jest
- Testing Library will still be used with Vitest for React component testing

**Cypress:**
- Rejected: Heavier than Playwright, no multi-browser support by default
- Playwright has better TypeScript support

### Implementation Plan

```json
// package.json additions
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@vitest/ui": "^2.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "playwright": "^1.40.0",
    "@playwright/test": "^1.40.0"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

**Test organization:**
- `tests/unit/` - Vitest (utilities, helpers, pure functions)
- `tests/integration/` - Vitest (tRPC procedures, database operations)
- `tests/contract/` - Vitest (API contracts, schema validation)
- `tests/e2e/` - Playwright (full user journeys: purchase → assign → check-in)

---

## 2. QR Code Generation Library

### Decision
**qrcode** npm package (https://www.npmjs.com/package/qrcode)

### Rationale

- **Lightweight**: ~30KB minified, no external dependencies
- **Flexible output**: Supports Canvas, SVG, and data URL formats
- **Standard compliant**: Generates ISO/IEC 18004 QR codes
- **Wide compatibility**: Works with all standard QR readers
- **Active maintenance**: 40M+ weekly downloads, last updated <3 months ago
- **Next.js friendly**: Works in both server and client components

### Alternatives Considered

**react-qr-code:**
- Rejected: Client-side only, larger bundle size
- Not suitable for server-side QR generation (needed for email tickets)

**qr-scanner:**
- Rejected: This is for reading QR codes, not generating them
- Will be evaluated separately for check-in scanner component

**Handwritten QR generator:**
- Rejected: Reinventing the wheel, QR spec is complex
- Risk of compatibility issues with readers

### Implementation Approach

```typescript
// lib/qr-code/generator.ts
import QRCode from 'qrcode';

export async function generateTicketQRCode(ticketNumber: string): Promise<string> {
  // Generate QR code as data URL for embedding in emails/PDFs
  const qrDataUrl = await QRCode.toDataURL(ticketNumber, {
    errorCorrectionLevel: 'H', // High redundancy for damaged/partial scans
    margin: 2,
    width: 300,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
  return qrDataUrl;
}

export async function generateTicketQRCodeSVG(ticketNumber: string): Promise<string> {
  // Generate SVG for responsive web display
  const svg = await QRCode.toString(ticketNumber, {
    type: 'svg',
    errorCorrectionLevel: 'H',
  });
  return svg;
}
```

**Ticket number format**: `EVT-{eventId}-{ticketId}` (e.g., `EVT-cm3abc123-cm3def456`)
- Encodes event and ticket identifiers for quick lookup
- Human-readable for support/debugging
- Compatible with URL encoding for deep linking

---

## 3. QR Code Scanner for Check-In

### Decision
**html5-qrcode** npm package (https://www.npmjs.com/package/html5-qrcode)

### Rationale

- **Browser native**: Uses device camera via getUserMedia API
- **No server required**: Scanning happens client-side
- **Mobile optimized**: Works on iOS Safari and Android Chrome
- **Fallback support**: File upload option if camera unavailable
- **Active maintenance**: 15K+ stars, updated monthly
- **TypeScript support**: Type definitions available

### Alternatives Considered

**zxing-js:**
- Rejected: Larger bundle size (~150KB), slower scan performance
- html5-qrcode is more focused on web QR scanning

**Native mobile apps:**
- Rejected: Over-engineering for MVP
- Web-based check-in sufficient for 90% of events
- Can build native app later if needed

**Manual text input:**
- Kept as fallback: Allow staff to type ticket number if QR fails
- Accessibility consideration for damaged tickets

### Implementation Approach

```typescript
// components/tickets/check-in-scanner.tsx
'use client';

import { Html5Qrcode } from 'html5-qrcode';
import { useEffect, useRef } from 'react';

export function CheckInScanner({ onScan }: { onScan: (ticketNumber: string) => void }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' }, // Use back camera on mobile
      {
        fps: 10, // Scan 10 times per second
        qrbox: { width: 250, height: 250 },
      },
      (decodedText) => {
        onScan(decodedText); // Pass ticket number to parent
        scanner.pause(); // Pause after successful scan
      },
      (errorMessage) => {
        // Silent fail - no need to spam console
      }
    );

    return () => {
      scanner.stop().catch(console.error);
    };
  }, [onScan]);

  return <div id="qr-reader" className="w-full max-w-md" />;
}
```

---

## 4. Optimistic Locking Strategy for Concurrent Assignment

### Decision
**Prisma's `@updatedAt` + version checking**

### Rationale

- **Built-in**: Prisma automatically manages `updatedAt` timestamps
- **No additional columns**: Avoids adding `version` field to schema
- **Last-write-wins**: Acceptable for ticket assignment (not financial data)
- **Notification mechanism**: Use tRPC subscriptions or polling to notify previous assigner

### Alternatives Considered

**Database-level row locking:**
- Rejected: Requires `SELECT FOR UPDATE` and transaction management
- Over-engineering for non-critical concurrent writes (assignments)

**Version column:**
- Rejected: Adds schema complexity
- `updatedAt` provides equivalent functionality

**Distributed locks (Redis):**
- Rejected: Adds infrastructure dependency
- Not needed for ticket assignment concurrency (rare edge case)

### Implementation Approach

```typescript
// server/api/routers/tickets.ts
export const ticketsRouter = createTRPCRouter({
  assign: protectedProcedure
    .input(
      z.object({
        ticketId: z.string(),
        attendeeData: z.object({
          name: z.string(),
          email: z.string().email(),
          customData: z.record(z.any()).optional(),
        }),
        expectedUpdatedAt: z.date(), // Client sends last known updatedAt
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch current ticket state
      const ticket = await ctx.db.ticket.findUnique({
        where: { id: input.ticketId },
        include: { attendee: true },
      });

      if (!ticket) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket not found' });
      }

      // Check if ticket was modified since client last loaded it
      if (ticket.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Ticket was modified by another user. Please refresh and try again.',
        });
      }

      // Proceed with assignment...
      const updatedTicket = await ctx.db.ticket.update({
        where: { id: input.ticketId },
        data: {
          isAssigned: true,
          assignedAt: new Date(),
          attendee: {
            create: input.attendeeData,
          },
        },
      });

      return updatedTicket;
    }),
});
```

**Notification strategy:**
- On conflict, return CONFLICT error to client
- Client displays: "This ticket was just assigned to someone else. Refreshing..."
- Auto-refresh ticket list to show updated state

---

## 5. Email Delivery for Individual Attendees

### Decision
**Resend API with batch sending** (already integrated)

### Rationale

- **Already in use**: `resend` package in dependencies
- **Batch support**: Send up to 100 emails per API call
- **Individual tracking**: Each email has unique tracking ID
- **Template support**: React Email components (already used in `emails/`)
- **Deliverability**: High inbox placement, DKIM/SPF configured

### Alternatives Considered

**SendGrid:**
- Rejected: Resend already integrated, no need to switch
- Resend has better DX for Next.js projects

**Nodemailer + SMTP:**
- Rejected: Requires managing email server, deliverability issues
- No tracking/analytics

**AWS SES:**
- Rejected: More complex setup, similar pricing to Resend
- Resend provides better developer experience

### Implementation Approach

```typescript
// lib/email/send-attendee-emails.ts
import { Resend } from 'resend';
import { RegistrationConfirmation } from '@/emails/registration-confirmation';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAttendeeEmails(
  attendees: Array<{ email: string; name: string; ticketNumber: string }>,
  eventDetails: { name: string; startDate: Date }
) {
  // Batch emails in groups of 100 (Resend limit)
  const batches = chunkArray(attendees, 100);

  for (const batch of batches) {
    await resend.batch.send(
      batch.map((attendee) => ({
        from: 'Events-Ting <no-reply@events-ting.com>',
        to: attendee.email,
        subject: `Your ticket for ${eventDetails.name}`,
        react: RegistrationConfirmation({
          attendeeName: attendee.name,
          eventName: eventDetails.name,
          ticketNumber: attendee.ticketNumber,
          eventDate: eventDetails.startDate,
        }),
      }))
    );
  }
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

**New email templates needed:**
- `emails/ticket-assigned.tsx` - Sent when buyer assigns ticket to attendee
- `emails/ticket-reassigned.tsx` - Sent when buyer changes assignment
- Update existing `emails/registration-confirmation.tsx` to send to buyer (not attendees)

---

## 6. Custom Registration Form Storage

### Decision
**JSON column in Attendee.customData** (already in schema)

### Rationale

- **Schema flexibility**: Each event can have different questions
- **No migrations**: Adding/removing questions doesn't require schema changes
- **Prisma support**: Native JSON type with type-safe queries
- **Query capability**: PostgreSQL JSONB supports indexing and filtering if needed

### Alternatives Considered

**EAV (Entity-Attribute-Value) pattern:**
- Rejected: Requires separate tables, complex joins
- JSON is simpler and faster for read-heavy operations

**Dynamic columns:**
- Rejected: Would require schema migrations per event
- Not scalable for multi-tenant event platform

**Separate CustomField table:**
- Rejected: Over-engineering for MVP
- JSON covers 90% of use cases (text, select, checkbox)

### Implementation Approach

```typescript
// Event custom fields definition (stored in Event.customData)
interface CustomFieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio';
  required: boolean;
  options?: string[]; // For select/radio
  placeholder?: string;
}

// Attendee responses (stored in Attendee.customData)
interface CustomFieldResponses {
  [fieldId: string]: string | boolean | string[];
}

// Example
const eventCustomFields: CustomFieldDefinition[] = [
  { id: 'dietary', label: 'Dietary Restrictions', type: 'select', required: false, options: ['None', 'Vegetarian', 'Vegan', 'Gluten-Free'] },
  { id: 'tshirt', label: 'T-Shirt Size', type: 'select', required: true, options: ['S', 'M', 'L', 'XL'] },
  { id: 'accessibility', label: 'Accessibility Needs', type: 'textarea', required: false },
];

const attendeeResponses: CustomFieldResponses = {
  dietary: 'Vegan',
  tshirt: 'M',
  accessibility: '',
};
```

**Validation approach:**
- Define custom fields in Event model (Event.customData JSON)
- Validate attendee responses against field definitions using Zod
- Store validated responses in Attendee.customData JSON

---

## 7. Ticket Number Generation

### Decision
**Nanoid with custom alphabet** (https://www.npmjs.com/package/nanoid)

### Rationale

- **Collision-resistant**: 21-character ID has lower collision probability than UUID
- **URL-safe**: Uses only alphanumeric characters (no special chars)
- **Compact**: Shorter than UUID (21 vs 36 characters)
- **Human-readable option**: Can use custom alphabet to avoid ambiguous chars (0/O, 1/I/l)
- **Fast**: 2x faster than UUID v4 generation

### Alternatives Considered

**UUID v4:**
- Rejected: Longer, harder to type/read for manual entry
- Contains hyphens (not ideal for QR codes)

**Sequential integers:**
- Rejected: Security risk (enumeration attack)
- Predictable ticket numbers allow unauthorized access

**CUID:**
- Rejected: Already using for database IDs (Prisma default)
- Nanoid is more compact for tickets

### Implementation Approach

```typescript
// lib/tickets/generate-ticket-number.ts
import { customAlphabet } from 'nanoid';

// Custom alphabet: removes ambiguous characters (0, O, 1, I, l)
const nanoid = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 10);

export function generateTicketNumber(eventId: string): string {
  const prefix = 'TKT';
  const randomPart = nanoid(); // 10 characters
  const timestamp = Date.now().toString(36).toUpperCase(); // Base36 timestamp
  
  return `${prefix}-${timestamp}-${randomPart}`;
  // Example: TKT-L8Z9K3-A7B2C5D8E9
}
```

**Format rationale:**
- Prefix: Identifies as ticket (vs other QR codes)
- Timestamp: Sortable, helps with debugging
- Random part: Ensures uniqueness

**Database storage:**
- `Ticket.ticketNumber` (unique index)
- `Ticket.qrCodeData` stores same value (could store additional metadata if needed)

---

## 8. Database Migration Strategy

### Decision
**Additive migrations with feature flag**

### Rationale

- **Zero downtime**: New models don't break existing functionality
- **Rollback safety**: Can toggle between old/new models
- **Gradual migration**: Migrate existing registrations in batches
- **Testing in production**: Feature flag allows testing with real users

### Alternatives Considered

**Big-bang migration:**
- Rejected: High risk, requires downtime
- All-or-nothing approach increases bug impact

**Dual-write pattern:**
- Rejected: Adds complexity, data consistency issues
- Not needed since old Registration model can coexist

**Blue-green deployment:**
- Rejected: Requires duplicate infrastructure
- Feature flag achieves same goal with less complexity

### Migration Steps

**Step 1: Add new models (non-breaking)**
```prisma
// Already done in schema - Ticket and Attendee models exist
```

**Step 2: Deploy code with feature flag**
```typescript
// env.js
export const env = {
  FEATURE_TICKET_SEPARATION: process.env.FEATURE_TICKET_SEPARATION === 'true',
};
```

**Step 3: Conditional logic in registration flow**
```typescript
if (env.FEATURE_TICKET_SEPARATION) {
  // Create tickets + attendees (new behavior)
} else {
  // Create legacy registration (old behavior)
}
```

**Step 4: Data migration script**
```typescript
// scripts/migrate-registrations-to-tickets.ts
async function migrateRegistrations() {
  const legacyRegistrations = await db.legacyRegistration.findMany();
  
  for (const legacy of legacyRegistrations) {
    // Create Registration (buyer)
    const registration = await db.registration.create({ ... });
    
    // Create Ticket
    const ticket = await db.ticket.create({ ... });
    
    // Create Attendee
    const attendee = await db.attendee.create({ ... });
    
    // Link ticket to attendee
    await db.ticket.update({ where: { id: ticket.id }, data: { attendeeId: attendee.id } });
  }
}
```

**Step 5: Remove feature flag after validation**
**Step 6: Drop LegacyRegistration model**

---

## 9. Performance Optimization for Check-In

### Decision
**Redis cache for ticket lookup + database indexes**

### Rationale

- **Check-in is read-heavy**: Same ticket scanned once, but lookup happens on every scan attempt
- **Sub-second response**: Redis lookup <10ms vs PostgreSQL ~50-100ms
- **Reduce database load**: During peak check-in (event start time), thousands of concurrent scans
- **Cache invalidation**: Simple - only invalidate on ticket assignment/reassignment

### Alternatives Considered

**Database indexes only:**
- Rejected: Not fast enough for <3s check-in requirement
- Database can become bottleneck with 1000+ concurrent scans

**In-memory cache (Node.js):**
- Rejected: Not shared across serverless instances
- Vercel/Netlify deployments spawn multiple instances

**CDN caching:**
- Rejected: Not suitable for write-after-read (check-in status update)
- CDN purge latency too high

### Implementation Approach (Future Enhancement)

**Note**: Redis not in current dependencies. Add if performance testing shows database bottleneck.

```typescript
// lib/cache/ticket-cache.ts (FUTURE)
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getTicketFromCache(ticketNumber: string) {
  const cached = await redis.get(`ticket:${ticketNumber}`);
  if (cached) return JSON.parse(cached);
  
  // Cache miss - fetch from database
  const ticket = await db.ticket.findUnique({ where: { ticketNumber } });
  if (ticket) {
    await redis.set(`ticket:${ticketNumber}`, JSON.stringify(ticket), 'EX', 3600); // 1 hour TTL
  }
  return ticket;
}

export async function invalidateTicketCache(ticketNumber: string) {
  await redis.del(`ticket:${ticketNumber}`);
}
```

**Database indexes (already needed):**
```prisma
// prisma/schema.prisma
model Ticket {
  ticketNumber String @unique // Auto-creates index
  
  @@index([ticketNumber]) // Explicit index for lookup
  @@index([eventId, isCheckedIn]) // For check-in metrics
  @@index([eventId, isAssigned]) // For assignment tracking
}
```

**For MVP**: Start with database indexes only. Add Redis if check-in performance <3s.

---

## 10. Ticket Assignment Cutoff Time

### Decision
**Database enum + nullable timestamp**

### Rationale

- **Flexibility**: Organizers choose preset (event start, 1h before, 24h before) or custom time
- **Easy validation**: Compare `new Date()` against cutoff timestamp
- **Simple UI**: Radio buttons for presets + datetime picker for custom

### Alternatives Considered

**Hard-coded cutoff:**
- Rejected: Different events have different needs (conferences vs concerts)
- Inflexible

**Duration-based (e.g., "2 hours before"):**
- Rejected: Harder to display to users ("cutoff is at <calculated time>")
- Requires calculation on every page load

### Implementation Approach

```typescript
// Event model addition
model Event {
  // ... existing fields
  
  assignmentCutoffType String @default("event_start") // 'event_start' | '1h_before' | '24h_before' | 'custom'
  assignmentCutoffTime DateTime? // Only used if type = 'custom'
}

// Utility function
export function getAssignmentCutoffTime(event: Event): Date {
  switch (event.assignmentCutoffType) {
    case 'event_start':
      return event.startDate;
    case '1h_before':
      return new Date(event.startDate.getTime() - 60 * 60 * 1000);
    case '24h_before':
      return new Date(event.startDate.getTime() - 24 * 60 * 60 * 1000);
    case 'custom':
      return event.assignmentCutoffTime ?? event.startDate;
    default:
      return event.startDate;
  }
}

// Validation in ticket assignment procedure
export const ticketsRouter = createTRPCRouter({
  assign: protectedProcedure.mutation(async ({ ctx, input }) => {
    const event = await ctx.db.event.findUnique({ where: { id: eventId } });
    const cutoff = getAssignmentCutoffTime(event);
    
    if (new Date() > cutoff) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Ticket assignment deadline has passed',
      });
    }
    
    // Proceed with assignment...
  }),
});
```

---

## Summary of Technical Decisions

| Area | Decision | Package/Approach | Rationale |
|------|----------|------------------|-----------|
| **Testing** | Vitest + Playwright | `vitest`, `@playwright/test` | Fast, TypeScript-native, comprehensive coverage |
| **QR Generation** | qrcode library | `qrcode` | Lightweight, standard-compliant, Next.js compatible |
| **QR Scanning** | html5-qrcode | `html5-qrcode` | Browser-native, mobile-optimized, no server needed |
| **Optimistic Locking** | Prisma @updatedAt | Built-in | Simple, sufficient for non-critical concurrency |
| **Email Delivery** | Resend (existing) | `resend` | Already integrated, batch support, great DX |
| **Custom Forms** | JSON column | Prisma JSONB | Flexible, no migrations, query-capable |
| **Ticket Numbers** | Nanoid | `nanoid` | Compact, collision-resistant, human-readable |
| **Migration** | Feature flag + additive | Gradual rollout | Zero downtime, rollback safety |
| **Check-In Perf** | Database indexes (MVP) | Prisma indexes | Start simple, add Redis if needed |
| **Assignment Cutoff** | Enum + nullable timestamp | Database fields | Flexible, easy validation |

---

## Next Steps (Phase 1)

1. Create `data-model.md` with detailed entity definitions
2. Generate API contracts in `/contracts/` (tRPC procedure schemas)
3. Write `quickstart.md` for developers implementing this feature
4. Update `.github/copilot-instructions.md` with new technology decisions
