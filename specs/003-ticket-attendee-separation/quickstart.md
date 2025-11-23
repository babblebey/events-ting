# Quickstart Guide: Ticket Instance and Attendee Separation

**Feature**: `003-ticket-attendee-separation`  
**For**: Developers implementing this feature  
**Date**: November 19, 2025

## Overview

This guide walks you through implementing the ticket-attendee separation feature. Follow these steps in order to build the functionality incrementally while maintaining a working codebase.

---

## Prerequisites

Before starting, ensure you have:

- [ ] Development environment set up (see `docs/development/setup.md`)
- [ ] Database running (PostgreSQL via Docker: `./start-database.sh`)
- [ ] Understanding of Prisma, tRPC, and Next.js App Router
- [ ] Reviewed `research.md` and `data-model.md` in this spec folder

---

## Implementation Phases

### Phase 1: Database Schema (Days 1-2)

#### Step 1.1: Update Prisma Schema

Add the new Ticket and Attendee models to `prisma/schema.prisma`:

```prisma
// Already exists in schema - verify fields match data-model.md
model Ticket {
  // ... see data-model.md for full schema
}

model Attendee {
  // ... see data-model.md for full schema
}

// Update Event model
model Event {
  // ... existing fields ...
  
  // NEW fields
  assignmentCutoffType String   @default("event_start")
  assignmentCutoffTime DateTime?
  maxTicketsPerPurchase Int     @default(10)
  
  // NEW relations
  tickets Ticket[]
}

// Update TicketType model
model TicketType {
  // ... existing fields ...
  
  // NEW relations
  tickets Ticket[]
}

// Update Registration model
model Registration {
  // ... existing fields ...
  
  // NEW relations
  tickets Ticket[]
}
```

**Note**: The schema already has Ticket and Attendee models. Verify they match the spec in `data-model.md`.

#### Step 1.2: Create Migration

```bash
pnpm db:generate
# This creates a new migration and updates Prisma Client
```

Review the generated migration in `prisma/migrations/` before applying.

#### Step 1.3: Apply Migration

```bash
pnpm db:push
# Or for production: pnpm db:migrate
```

Verify in Prisma Studio:
```bash
pnpm db:studio
```

---

### Phase 2: Install Dependencies (Day 2)

#### Step 2.1: Install Testing Libraries

```bash
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom playwright @playwright/test
```

#### Step 2.2: Install QR Code Libraries

```bash
pnpm add qrcode nanoid
pnpm add -D @types/qrcode
```

For check-in scanner (client-side):
```bash
pnpm add html5-qrcode
```

#### Step 2.3: Configure Vitest

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Create `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom';
```

#### Step 2.4: Add Test Scripts

Update `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

### Phase 3: Core Utilities (Days 3-4)

#### Step 3.1: Ticket Number Generator

Create `src/lib/tickets/generate-ticket-number.ts`:

```typescript
import { customAlphabet } from 'nanoid';

// Custom alphabet: removes ambiguous characters (0, O, 1, I, l)
const nanoid = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 10);

export function generateTicketNumber(eventId: string): string {
  const prefix = 'TKT';
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = nanoid();
  
  return `${prefix}-${timestamp}-${randomPart}`;
}
```

**Test**:

Create `tests/unit/generate-ticket-number.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateTicketNumber } from '@/lib/tickets/generate-ticket-number';

describe('generateTicketNumber', () => {
  it('should generate unique ticket numbers', () => {
    const num1 = generateTicketNumber('event123');
    const num2 = generateTicketNumber('event123');
    expect(num1).not.toBe(num2);
  });
  
  it('should start with TKT prefix', () => {
    const num = generateTicketNumber('event123');
    expect(num).toMatch(/^TKT-/);
  });
  
  it('should not contain ambiguous characters', () => {
    const num = generateTicketNumber('event123');
    expect(num).not.toMatch(/[0OI1l]/);
  });
});
```

Run test:
```bash
pnpm test
```

#### Step 3.2: QR Code Generator

Create `src/lib/qr-code/generator.ts`:

```typescript
import QRCode from 'qrcode';

export async function generateTicketQRCodeDataUrl(ticketNumber: string): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(ticketNumber, {
    errorCorrectionLevel: 'H',
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
  const svg = await QRCode.toString(ticketNumber, {
    type: 'svg',
    errorCorrectionLevel: 'H',
  });
  return svg;
}
```

**Test**:

Create `tests/unit/qr-code-generator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateTicketQRCodeDataUrl, generateTicketQRCodeSVG } from '@/lib/qr-code/generator';

describe('QR Code Generator', () => {
  it('should generate data URL', async () => {
    const dataUrl = await generateTicketQRCodeDataUrl('TKT-L8Z9K3-A7B2C5D8E9');
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });
  
  it('should generate SVG', async () => {
    const svg = await generateTicketQRCodeSVG('TKT-L8Z9K3-A7B2C5D8E9');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });
});
```

#### Step 3.3: Assignment Cutoff Helper

Create `src/lib/events/assignment-cutoff.ts`:

```typescript
import { type Event } from '@prisma/client';

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

export function isAssignmentAllowed(event: Event): boolean {
  const cutoff = getAssignmentCutoffTime(event);
  return new Date() < cutoff;
}
```

**Test**:

Create `tests/unit/assignment-cutoff.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getAssignmentCutoffTime, isAssignmentAllowed } from '@/lib/events/assignment-cutoff';

describe('Assignment Cutoff', () => {
  it('should return event start for event_start type', () => {
    const event = {
      startDate: new Date('2025-12-01T10:00:00Z'),
      assignmentCutoffType: 'event_start',
    } as any;
    
    const cutoff = getAssignmentCutoffTime(event);
    expect(cutoff).toEqual(event.startDate);
  });
  
  it('should return 1 hour before for 1h_before type', () => {
    const event = {
      startDate: new Date('2025-12-01T10:00:00Z'),
      assignmentCutoffType: '1h_before',
    } as any;
    
    const cutoff = getAssignmentCutoffTime(event);
    const expected = new Date('2025-12-01T09:00:00Z');
    expect(cutoff).toEqual(expected);
  });
});
```

---

### Phase 4: tRPC Routers (Days 5-8)

#### Step 4.1: Create Tickets Router

Create `src/server/api/routers/tickets.ts`:

Follow the contract in `contracts/tickets-router.md`. Implement procedures in this order:

1. **tickets.list** - Start with read operations
2. **tickets.getByNumber** - Critical for check-in
3. **tickets.generateQRCode** - Needed for ticket display
4. **tickets.assign** - Core assignment logic
5. **tickets.unassign** - Assignment management
6. **tickets.checkIn** - Check-in logic
7. **tickets.getCheckInMetrics** - Metrics dashboard

**Example implementation** (tickets.assign):

```typescript
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { getAssignmentCutoffTime } from '@/lib/events/assignment-cutoff';

export const ticketsRouter = createTRPCRouter({
  assign: protectedProcedure
    .input(
      z.object({
        ticketId: z.string(),
        attendee: z.object({
          name: z.string().min(1),
          email: z.string().email(),
          customData: z.record(z.any()).optional(),
        }),
        expectedUpdatedAt: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch ticket with related data
      const ticket = await ctx.db.ticket.findUnique({
        where: { id: input.ticketId },
        include: {
          registration: true,
          event: true,
          attendee: true,
        },
      });

      if (!ticket) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket not found' });
      }

      // Authorization: user must be buyer or event organizer
      const isAuthorized =
        ticket.registration.userId === ctx.session.user.id ||
        ticket.event.organizerId === ctx.session.user.id;

      if (!isAuthorized) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to assign this ticket',
        });
      }

      // Check assignment cutoff
      const cutoff = getAssignmentCutoffTime(ticket.event);
      if (new Date() > cutoff) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Assignment deadline has passed',
        });
      }

      // Optimistic lock check
      if (ticket.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Ticket was modified by another user. Please refresh and try again.',
        });
      }

      // Delete old attendee if reassigning
      if (ticket.attendee) {
        await ctx.db.attendee.delete({
          where: { id: ticket.attendee.id },
        });
      }

      // Create new attendee and update ticket
      const updatedTicket = await ctx.db.ticket.update({
        where: { id: input.ticketId },
        data: {
          isAssigned: true,
          assignedAt: new Date(),
          attendee: {
            create: {
              name: input.attendee.name,
              email: input.attendee.email,
              customData: input.attendee.customData,
              emailStatus: 'active',
            },
          },
        },
        include: {
          attendee: true,
          ticketType: true,
        },
      });

      // TODO: Send email to attendee with ticket details

      return {
        ticket: updatedTicket,
        attendee: updatedTicket.attendee!,
      };
    }),
  
  // ... other procedures
});
```

**Test**:

Create `tests/integration/tickets-router.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createCaller } from '@/server/api/routers/tickets';
import { createMockContext } from '@/tests/helpers';

describe('tickets.assign', () => {
  beforeEach(async () => {
    // Setup test data in database
  });

  it('should assign ticket to attendee', async () => {
    const ctx = createMockContext({ userId: 'buyer123' });
    const caller = createCaller(ctx);
    
    const result = await caller.assign({
      ticketId: 'ticket123',
      attendee: {
        name: 'John Doe',
        email: 'john@example.com',
      },
      expectedUpdatedAt: new Date(),
    });
    
    expect(result.ticket.isAssigned).toBe(true);
    expect(result.attendee.name).toBe('John Doe');
  });
});
```

#### Step 4.2: Create Attendees Router

Create `src/server/api/routers/attendees.ts`:

Follow `contracts/attendees-router.md`. Implement in this order:

1. **attendees.list**
2. **attendees.getById**
3. **attendees.update**
4. **attendees.exportList**
5. **attendees.getCustomFieldResponses**

#### Step 4.3: Update Root Router

Update `src/server/api/root.ts`:

```typescript
import { ticketsRouter } from './routers/tickets';
import { attendeesRouter } from './routers/attendees';

export const appRouter = createTRPCRouter({
  // ... existing routers
  tickets: ticketsRouter,
  attendees: attendeesRouter,
});
```

---

### Phase 5: UI Components (Days 9-12)

#### Step 5.1: QR Code Display Component

Create `src/components/tickets/qr-code-display.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/trpc/react';

interface QRCodeDisplayProps {
  ticketId: string;
  size?: number;
}

export function QRCodeDisplay({ ticketId, size = 300 }: QRCodeDisplayProps) {
  const { data, isLoading } = api.tickets.generateQRCode.useQuery({
    ticketId,
    format: 'dataUrl',
    size,
  });

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-64 w-64" />;
  }

  if (!data) {
    return <div>Failed to generate QR code</div>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <img src={data.qrCode} alt="Ticket QR Code" className="w-full max-w-sm" />
      <p className="text-sm text-gray-600">{data.ticketNumber}</p>
    </div>
  );
}
```

#### Step 5.2: Ticket Assignment Form

Create `src/components/tickets/assignment-form.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { Button, Label, TextInput } from 'flowbite-react';
import { toast } from 'react-hot-toast';

interface AssignmentFormProps {
  ticketId: string;
  onSuccess?: () => void;
}

export function AssignmentForm({ ticketId, onSuccess }: AssignmentFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const assignMutation = api.tickets.assign.useMutation({
    onSuccess: () => {
      toast.success('Ticket assigned successfully!');
      onSuccess?.();
    },
    onError: (error) => {
      if (error.data?.code === 'CONFLICT') {
        toast.error('This ticket was just assigned by someone else. Refreshing...');
      } else {
        toast.error(error.message);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    assignMutation.mutate({
      ticketId,
      attendee: { name, email },
      expectedUpdatedAt: new Date(), // TODO: Get from ticket query
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Attendee Name</Label>
        <TextInput
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="email">Attendee Email</Label>
        <TextInput
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <Button type="submit" isProcessing={assignMutation.isPending}>
        Assign Ticket
      </Button>
    </form>
  );
}
```

#### Step 5.3: Check-In Scanner

Create `src/components/tickets/check-in-scanner.tsx`:

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '@/trpc/react';
import { toast } from 'react-hot-toast';

interface CheckInScannerProps {
  eventId: string;
  onCheckIn?: (ticketNumber: string) => void;
}

export function CheckInScanner({ eventId, onCheckIn }: CheckInScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const checkInMutation = api.tickets.checkIn.useMutation({
    onSuccess: (data) => {
      toast.success(`Checked in: ${data.attendee.name}`);
      onCheckIn?.(data.ticket.ticketNumber);
    },
    onError: (error) => {
      if (error.data?.code === 'CONFLICT') {
        toast.error('This ticket was already checked in!');
      } else {
        toast.error(error.message);
      }
    },
  });

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        checkInMutation.mutate({ ticketNumber: decodedText });
        scanner.pause();
        setTimeout(() => scanner.resume(), 2000); // Resume after 2s
      },
      () => {
        // Silent fail
      }
    );

    return () => {
      scanner.stop().catch(console.error);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div id="qr-reader" className="w-full max-w-md mx-auto" />
      {checkInMutation.isPending && (
        <p className="text-center">Checking in...</p>
      )}
    </div>
  );
}
```

---

### Phase 6: Pages (Days 13-15)

#### Step 6.1: Ticket Purchase Flow (Update Existing)

Update `src/app/(public)/events/[slug]/register/page.tsx`:

When registration is created, also create ticket instances:

```typescript
// After creating registration
const tickets = [];
for (let i = 0; i < quantity; i++) {
  const ticketNumber = generateTicketNumber(event.id);
  const ticket = await db.ticket.create({
    data: {
      registrationId: registration.id,
      eventId: event.id,
      ticketTypeId: ticketType.id,
      ticketNumber,
      qrCodeData: ticketNumber,
    },
  });
  tickets.push(ticket);
}
```

#### Step 6.2: Buyer Ticket Management Dashboard

Create `src/app/(dashboard)/my-tickets/page.tsx`:

```typescript
import { api } from '@/trpc/server';
import { TicketCard } from '@/components/tickets/ticket-card';

export default async function MyTicketsPage() {
  const tickets = await api.tickets.list.query({
    // registrationId will be inferred from session
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Tickets</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tickets.tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  );
}
```

#### Step 6.3: Check-In Interface

Create `src/app/(dashboard)/events/[eventId]/check-in/page.tsx`:

```typescript
'use client';

import { CheckInScanner } from '@/components/tickets/check-in-scanner';
import { api } from '@/trpc/react';

export default function CheckInPage({ params }: { params: { eventId: string } }) {
  const { data: metrics } = api.tickets.getCheckInMetrics.useQuery({
    eventId: params.eventId,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Event Check-In</h1>
      
      {metrics && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-600">Total Tickets</p>
            <p className="text-3xl font-bold">{metrics.totalTickets}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-600">Checked In</p>
            <p className="text-3xl font-bold">{metrics.checkedInTickets}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-600">Check-In Rate</p>
            <p className="text-3xl font-bold">{metrics.checkInPercentage}%</p>
          </div>
        </div>
      )}
      
      <CheckInScanner eventId={params.eventId} />
    </div>
  );
}
```

---

### Phase 7: Email Templates (Days 16-17)

#### Step 7.1: Ticket Assigned Email

Create `emails/ticket-assigned.tsx`:

```typescript
import { Html, Head, Preview, Body, Container, Section, Text, Button } from '@react-email/components';

interface TicketAssignedEmailProps {
  attendeeName: string;
  eventName: string;
  ticketNumber: string;
  eventDate: Date;
  qrCodeDataUrl: string;
}

export default function TicketAssignedEmail({
  attendeeName,
  eventName,
  ticketNumber,
  eventDate,
  qrCodeDataUrl,
}: TicketAssignedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your ticket for {eventName}</Preview>
      <Body>
        <Container>
          <Section>
            <Text>Hi {attendeeName},</Text>
            <Text>You've been assigned a ticket for {eventName}!</Text>
            
            <img src={qrCodeDataUrl} alt="Your Ticket QR Code" />
            
            <Text>Ticket Number: {ticketNumber}</Text>
            <Text>Event Date: {eventDate.toLocaleDateString()}</Text>
            
            <Button href={`https://events-ting.com/tickets/${ticketNumber}`}>
              View Ticket
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

Send email in `tickets.assign` mutation:

```typescript
// After assigning ticket
import { resend } from '@/lib/email';
import TicketAssignedEmail from '@/emails/ticket-assigned';

await resend.emails.send({
  from: 'Events-Ting <no-reply@events-ting.com>',
  to: input.attendee.email,
  subject: `Your ticket for ${ticket.event.name}`,
  react: TicketAssignedEmail({
    attendeeName: input.attendee.name,
    eventName: ticket.event.name,
    ticketNumber: updatedTicket.ticketNumber,
    eventDate: ticket.event.startDate,
    qrCodeDataUrl: await generateTicketQRCodeDataUrl(updatedTicket.ticketNumber),
  }),
});
```

---

### Phase 8: Testing & Polish (Days 18-20)

#### Step 8.1: Integration Tests

Run all integration tests:

```bash
pnpm test
```

Add tests for:
- Multi-ticket purchase creates multiple ticket instances
- Ticket assignment updates attendee
- Ticket reassignment deletes old attendee
- Check-in prevents duplicate scans
- Assignment cutoff enforcement

#### Step 8.2: E2E Tests

Create `tests/e2e/ticket-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('complete ticket purchase and assignment flow', async ({ page }) => {
  // 1. Purchase 3 tickets
  await page.goto('/events/test-event/register');
  await page.fill('[name="quantity"]', '3');
  await page.click('button[type="submit"]');
  
  // 2. Navigate to my tickets
  await page.goto('/my-tickets');
  await expect(page.locator('.ticket-card')).toHaveCount(3);
  
  // 3. Assign first ticket
  await page.click('.ticket-card:first-child .assign-button');
  await page.fill('[name="name"]', 'John Doe');
  await page.fill('[name="email"]', 'john@example.com');
  await page.click('button[type="submit"]');
  
  // 4. Verify assignment
  await expect(page.locator('.ticket-card:first-child')).toContainText('John Doe');
});
```

Run E2E tests:

```bash
pnpm test:e2e
```

#### Step 8.3: Manual Testing Checklist

- [ ] Purchase multiple tickets in one order
- [ ] Assign tickets to different people
- [ ] Verify each person receives individual email with QR code
- [ ] Scan QR code with phone camera (test in production-like environment)
- [ ] Check in attendee via scanner interface
- [ ] Attempt duplicate check-in (should fail)
- [ ] Try assigning ticket after cutoff time (should fail)
- [ ] View check-in metrics dashboard
- [ ] Export attendee list as CSV

---

## Deployment

### Step 1: Run Linting & Type Checking

```bash
pnpm run check
```

Fix any errors before proceeding.

### Step 2: Run Full Test Suite

```bash
pnpm test
pnpm test:e2e
```

### Step 3: Database Migration (Production)

```bash
# On production server
pnpm db:migrate
```

### Step 4: Deploy to Vercel

```bash
git push origin 003-ticket-attendee-separation
# Create PR and merge to main
# Vercel auto-deploys
```

---

## Troubleshooting

### Issue: QR code not scanning

**Solution**: Increase error correction level to 'H' and verify QR code size is at least 200x200px.

### Issue: Optimistic locking conflicts

**Solution**: Ensure client sends `expectedUpdatedAt` from the ticket query, not a new Date().

### Issue: Email not sending

**Solution**: Check Resend API key in environment variables and verify sender domain is verified.

---

## Next Steps

After completing this feature:

1. Monitor production metrics (check-in success rate, assignment completion rate)
2. Gather organizer feedback on UX
3. Consider adding:
   - Ticket transfer between buyers (future spec)
   - Mobile app for check-in (native QR scanner)
   - Offline check-in mode (sync when back online)

---

## Resources

- **Research Notes**: `specs/003-ticket-attendee-separation/research.md`
- **Data Model**: `specs/003-ticket-attendee-separation/data-model.md`
- **API Contracts**: `specs/003-ticket-attendee-separation/contracts/`
- **Constitution**: `.specify/memory/constitution.md`
- **Project Docs**: `docs/`

---

**Questions?** Reach out to the team or create an issue in GitHub.
