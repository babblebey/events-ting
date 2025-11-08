# Research: Event Management System

**Feature**: All-in-One Event Management System  
**Phase**: 0 - Outline & Research  
**Date**: November 8, 2025

## Purpose

This document consolidates research findings for technical decisions and patterns needed to implement the event management system. Each section addresses unknowns from the Technical Context or specific integration challenges identified in the feature specification.

---

## 1. Email Service Integration (Resend)

### Decision
Use **Resend** SDK with **React Email** for transactional email and campaign delivery.

### Rationale
- **Spec Requirement**: FR-045, FR-057 specify Resend as the email service
- **Developer Experience**: Simple API (`resend.emails.send()`), TypeScript SDK, React-based template authoring
- **Deliverability**: High inbox placement rates, dedicated IPs available, automatic DMARC/SPF/DKIM setup
- **Features Needed**: Batch sending for campaigns, webhook support for bounces (FR-049), scheduling (FR-047), template variables
- **React Email Benefits**: Component-based templates with TypeScript, preview server, responsive by default, works with Resend SDK

### Implementation Pattern
```typescript
// src/server/services/email.ts
import { Resend } from 'resend';
import { render } from '@react-email/render';
import RegistrationConfirmationEmail from '@/emails/registration-confirmation';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendRegistrationConfirmation(to: string, data: RegistrationData) {
  const html = render(<RegistrationConfirmationEmail {...data} />);
  
  const result = await resend.emails.send({
    from: 'events@yourdomain.com',
    to,
    subject: `Registration Confirmed: ${data.eventName}`,
    html,
  });
  
  // Log for observability (NFR-013)
  console.log('[EMAIL] Sent registration confirmation', { to, messageId: result.id });
  
  return result;
}

// Batch sending for campaigns (FR-044, FR-045)
export async function sendBulkEmails(recipients: string[], campaignId: string, template: JSX.Element) {
  const html = render(template);
  
  // Resend supports batch sending (up to 100 recipients per call)
  const batches = chunk(recipients, 100);
  
  for (const batch of batches) {
    await resend.batch.send(
      batch.map(to => ({
        from: 'events@yourdomain.com',
        to,
        subject: 'Event Update',
        html,
        tags: [{ name: 'campaign_id', value: campaignId }],
      }))
    );
  }
}
```

### Webhook Handling (Bounces, Opens, Clicks)
```typescript
// src/app/api/webhooks/resend/route.ts
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const event = await req.json();
  
  // Verify webhook signature (Resend provides this)
  // Handle bounce events (FR-049)
  if (event.type === 'email.bounced') {
    await db.emailCampaign.update({
      where: { id: event.data.tags.campaign_id },
      data: {
        bounces: { increment: 1 },
      },
    });
    
    // Mark recipient as bounced
    await db.registration.updateMany({
      where: { email: event.data.to },
      data: { emailStatus: 'bounced' },
    });
  }
  
  return new Response('OK', { status: 200 });
}
```

### Alternatives Considered
- **SendGrid**: More complex API, heavier SDK, pricing less favorable for startups
- **AWS SES**: Lower-level, requires more infrastructure management, no template authoring
- **Mailgun**: Good alternative, but Resend's React Email integration is superior for DX

### Dependencies to Add
```json
{
  "dependencies": {
    "resend": "^4.0.0",
    "@react-email/components": "^1.0.0",
    "@react-email/render": "^1.0.0"
  },
  "devDependencies": {
    "@react-email/cli": "^1.0.0"
  }
}
```

---

## 2. File Upload Strategy (Speaker Photos, Event Images)

### Decision
Use **Next.js native file uploads** with **local filesystem storage** for MVP, designed for easy migration to **AWS S3** or **Cloudflare R2** in future.

### Rationale
- **Spec Scope**: FR-036 requires speaker photos, FR-001 implies event images
- **MVP Constraints**: Avoid additional infrastructure costs and complexity
- **Next.js 15 Support**: Native `Request.formData()` in Route Handlers, no external library needed
- **Performance**: Serve images via Next.js `<Image>` component for automatic optimization (WebP, responsive sizes)
- **Future-Ready**: Abstract storage interface for easy swap to cloud storage

### Implementation Pattern
```typescript
// src/server/services/storage.ts
export interface StorageAdapter {
  upload(file: File, path: string): Promise<string>; // returns public URL
  delete(url: string): Promise<void>;
}

// Local filesystem adapter (MVP)
class LocalStorageAdapter implements StorageAdapter {
  async upload(file: File, path: string): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const publicPath = `/uploads/${path}`;
    const fsPath = `./public${publicPath}`;
    
    await fs.promises.mkdir(dirname(fsPath), { recursive: true });
    await fs.promises.writeFile(fsPath, buffer);
    
    return publicPath; // Next.js serves from /public
  }
  
  async delete(url: string): Promise<void> {
    const fsPath = `./public${url}`;
    await fs.promises.unlink(fsPath);
  }
}

// Future: S3 adapter
class S3StorageAdapter implements StorageAdapter {
  async upload(file: File, path: string): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `uploads/${path}`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }));
    
    return `https://${process.env.CDN_DOMAIN}/${key}`;
  }
  
  async delete(url: string): Promise<void> {
    const key = url.split('.com/')[1];
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    }));
  }
}

// Singleton export
export const storage: StorageAdapter = new LocalStorageAdapter();
```

### File Upload Route Handler
```typescript
// src/app/api/upload/route.ts
import { NextRequest } from 'next/server';
import { storage } from '@/server/services/storage';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return new Response('No file uploaded', { status: 400 });
  }
  
  // Validate file type and size
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return new Response('Invalid file type', { status: 400 });
  }
  
  if (file.size > 5 * 1024 * 1024) { // 5MB limit
    return new Response('File too large', { status: 400 });
  }
  
  // Generate unique filename
  const ext = file.name.split('.').pop();
  const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  
  const url = await storage.upload(file, filename);
  
  return Response.json({ url });
}
```

### Alternatives Considered
- **Uploadthing**: Purpose-built for Next.js, but adds external dependency and costs
- **Cloudinary**: Powerful transformations, but overkill for simple photo uploads
- **Direct S3 presigned URLs**: More complex client-side flow, harder to validate

### Security Considerations
- File type validation (magic number check, not just extension)
- Size limits enforced (5MB for photos)
- Filename sanitization (no path traversal)
- Rate limiting on upload endpoint (prevent abuse)
- Authenticated uploads only (organizers, speakers)

---

## 3. Payment Processor Architecture (Future-Ready)

### Decision
Implement **Strategy pattern** with pluggable payment processors. MVP supports **free tickets only**, architecture ready for **Stripe** and **Paystack** integration.

### Rationale
- **Spec Requirements**: FR-014, FR-015 require pluggable architecture for Stripe and Paystack
- **MVP Scope**: Free tickets only (price = 0), but data model accommodates payment status
- **Flexibility**: Organizers in different regions prefer different processors (Stripe for global, Paystack for Africa)
- **Risk Mitigation**: Design interfaces now, avoid costly refactoring when paid tickets launch

### Implementation Pattern
```typescript
// src/server/services/payment/types.ts
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  metadata: Record<string, string>;
}

export interface PaymentProcessor {
  name: string; // 'stripe' | 'paystack'
  
  createIntent(params: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }): Promise<PaymentIntent>;
  
  confirmIntent(intentId: string): Promise<PaymentIntent>;
  
  refund(intentId: string, amount?: number): Promise<void>;
  
  verifyWebhook(signature: string, payload: string): boolean;
  
  handleWebhook(event: unknown): Promise<void>;
}

// src/server/services/payment/free.ts (MVP)
export class FreeTicketProcessor implements PaymentProcessor {
  name = 'free';
  
  async createIntent(params: any): Promise<PaymentIntent> {
    // Free tickets auto-succeed
    return {
      id: `free_${crypto.randomUUID()}`,
      amount: 0,
      currency: 'USD',
      status: 'succeeded',
      metadata: params.metadata,
    };
  }
  
  async confirmIntent(intentId: string): Promise<PaymentIntent> {
    return { id: intentId, amount: 0, currency: 'USD', status: 'succeeded', metadata: {} };
  }
  
  async refund() { /* no-op for free tickets */ }
  verifyWebhook() { return true; }
  async handleWebhook() { /* no-op */ }
}

// src/server/services/payment/stripe.ts (future)
export class StripeProcessor implements PaymentProcessor {
  name = 'stripe';
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  
  async createIntent(params: any): Promise<PaymentIntent> {
    const intent = await this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      metadata: params.metadata,
    });
    
    return {
      id: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status as PaymentIntent['status'],
      metadata: intent.metadata,
    };
  }
  
  // ... implement other methods
}

// src/server/services/payment/paystack.ts (future)
export class PaystackProcessor implements PaymentProcessor {
  name = 'paystack';
  private apiKey = process.env.PAYSTACK_SECRET_KEY!;
  
  async createIntent(params: any): Promise<PaymentIntent> {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amount,
        email: params.metadata.email,
        currency: params.currency,
        metadata: params.metadata,
      }),
    });
    
    const data = await response.json();
    
    return {
      id: data.data.reference,
      amount: params.amount,
      currency: params.currency,
      status: 'pending',
      metadata: params.metadata,
    };
  }
  
  // ... implement other methods
}

// Factory pattern for processor selection
export function getPaymentProcessor(type: 'free' | 'stripe' | 'paystack'): PaymentProcessor {
  switch (type) {
    case 'free': return new FreeTicketProcessor();
    case 'stripe': return new StripeProcessor();
    case 'paystack': return new PaystackProcessor();
    default: throw new Error(`Unknown payment processor: ${type}`);
  }
}
```

### Data Model Preparation
```prisma
model TicketType {
  id        String   @id @default(cuid())
  eventId   String
  name      String
  price     Decimal  @db.Decimal(10, 2) // MVP: must be 0.00
  currency  String   @default("USD")
  quantity  Int
  // ... other fields
}

model Registration {
  id            String   @id @default(cuid())
  ticketTypeId  String
  email         String
  name          String
  
  // Payment fields (future)
  paymentStatus String   @default("free") // 'free' | 'pending' | 'paid' | 'failed'
  paymentIntentId String? // Stripe/Paystack intent ID
  paymentProcessor String? // 'stripe' | 'paystack' | null
  
  // ... other fields
}
```

### Alternatives Considered
- **Single processor only**: Would require refactoring when adding second processor
- **Abstract factory pattern**: Overly complex for 2-3 processors
- **External payment gateway SDK**: Lock-in risk, less control over flow

---

## 4. Timezone Handling

### Decision
Store all dates/times in **UTC in PostgreSQL**, display in **event's local timezone** or **user's browser timezone** using **Temporal API** polyfill or **date-fns-tz**.

### Rationale
- **Spec Assumption**: "Standard timezone handling will use UTC with local timezone display"
- **Data Integrity**: UTC eliminates DST ambiguity, consistent sorting, no migration when events move locations
- **Display Flexibility**: Event schedule shown in event's timezone, user's dashboard in their timezone
- **Next.js SSR**: Server renders in UTC, client hydrates with browser timezone (progressive enhancement)

### Implementation Pattern
```typescript
// src/lib/utils/date.ts
import { formatInTimeZone, zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

export function formatEventTime(utcDate: Date, eventTimezone: string): string {
  return formatInTimeZone(utcDate, eventTimezone, 'PPpp'); // "Apr 29, 2023, 9:30 AM"
}

export function parseEventTime(localDateString: string, eventTimezone: string): Date {
  return zonedTimeToUtc(localDateString, eventTimezone);
}

// Display schedule in event's timezone
export function ScheduleEntry({ entry, event }: { entry: ScheduleEntry, event: Event }) {
  const localStartTime = formatEventTime(entry.startTime, event.timezone);
  
  return (
    <div>
      <time dateTime={entry.startTime.toISOString()}>
        {localStartTime}
      </time>
    </div>
  );
}
```

### Database Schema
```prisma
model Event {
  id       String @id @default(cuid())
  name     String
  timezone String @default("UTC") // IANA timezone identifier (e.g., "America/New_York")
  startDate DateTime // Stored in UTC
  endDate   DateTime // Stored in UTC
  // ... other fields
}

model ScheduleEntry {
  id        String @id @default(cuid())
  eventId   String
  startTime DateTime // Stored in UTC
  endTime   DateTime // Stored in UTC
  // ... other fields
}
```

### User Input Handling
```typescript
// When organizer creates schedule entry
export const scheduleRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      eventId: z.string(),
      date: z.string(), // ISO date string
      startTime: z.string(), // "14:30" (local time)
      endTime: z.string(),
      // ... other fields
    }))
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUniqueOrThrow({
        where: { id: input.eventId },
      });
      
      // Combine date + time in event's timezone, convert to UTC
      const localStartDateTime = `${input.date}T${input.startTime}:00`;
      const utcStartTime = parseEventTime(localStartDateTime, event.timezone);
      
      const localEndDateTime = `${input.date}T${input.endTime}:00`;
      const utcEndTime = parseEventTime(localEndDateTime, event.timezone);
      
      return ctx.db.scheduleEntry.create({
        data: {
          eventId: input.eventId,
          startTime: utcStartTime,
          endTime: utcEndTime,
          // ... other fields
        },
      });
    }),
});
```

### Alternatives Considered
- **Store in event's local timezone**: Breaks when event moves, DST changes cause bugs
- **Store as separate date/time fields**: More complex queries, error-prone conversions
- **Luxon library**: Heavier bundle size than date-fns-tz, similar features

### Dependencies to Add
```json
{
  "dependencies": {
    "date-fns": "^3.0.0",
    "date-fns-tz": "^3.0.0"
  }
}
```

---

## 5. Optimistic Concurrency Control (Schedule Edits)

### Decision
Use **Prisma's `@@updatedAt` automatic timestamp** with client-side **version checking** to detect concurrent edits. Display conflict resolution UI when detected.

### Rationale
- **Edge Case**: Spec mentions "two organizers try to edit the same schedule entry simultaneously"
- **User Experience**: Show warning rather than silently overwriting changes
- **Prisma Support**: `@@updatedAt` automatically tracks last modification time
- **Lightweight**: No additional columns needed, works with existing schema

### Implementation Pattern
```typescript
// tRPC mutation with optimistic concurrency check
export const scheduleRouter = createTRPCRouter({
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      updatedAt: z.date(), // Client sends last known updatedAt
      // ... fields to update
    }))
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.scheduleEntry.findUnique({
        where: { id: input.id },
        select: { updatedAt: true },
      });
      
      // Check if record was modified since client loaded it
      if (current.updatedAt.getTime() !== input.updatedAt.getTime()) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This schedule entry was modified by another user. Please refresh and try again.',
        });
      }
      
      return ctx.db.scheduleEntry.update({
        where: { id: input.id },
        data: {
          // ... updated fields
        },
      });
    }),
});

// Client-side handling
function ScheduleEditForm({ entry }: { entry: ScheduleEntry }) {
  const updateMutation = api.schedule.update.useMutation({
    onError: (error) => {
      if (error.data?.code === 'CONFLICT') {
        // Show modal with conflict resolution UI
        toast.error('This entry was modified by another organizer. Refreshing...');
        refetch(); // Reload latest data
      }
    },
  });
  
  const handleSubmit = (data: FormData) => {
    updateMutation.mutate({
      id: entry.id,
      updatedAt: entry.updatedAt, // Send last known version
      ...data,
    });
  };
  
  // ... form UI
}
```

### Database Schema
```prisma
model ScheduleEntry {
  id        String   @id @default(cuid())
  title     String
  // ... other fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt // Prisma auto-updates on every modification
}
```

### Alternatives Considered
- **Explicit version column**: More robust but requires manual increment, extra field
- **Row-level locking**: Database-level locks, harder to implement gracefully in tRPC
- **Last-write-wins**: Silent data loss, poor UX for collaborative editing

---

## 6. Sold-Out Ticket Handling

### Decision
Use **database-level transaction with row locking** (`SELECT FOR UPDATE`) to prevent race conditions. Display sold-out state instantly via **optimistic UI updates** and **React Query cache invalidation**.

### Rationale
- **Edge Case**: "How does the system handle registration attempts when a ticket type is sold out?"
- **NFR-006**: System must handle 100 concurrent registrations without overselling
- **Data Integrity**: Database transaction ensures atomic check-and-decrement
- **User Experience**: Show real-time ticket availability, prevent bad UX of failed checkout

### Implementation Pattern
```typescript
// tRPC mutation with transaction and row locking
export const registrationRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({
      ticketTypeId: z.string(),
      email: z.string().email(),
      name: z.string(),
      // ... other fields
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        // Lock the ticket type row for update
        const ticketType = await tx.$queryRaw<{ id: string; quantity: number; sold: number }[]>`
          SELECT id, quantity, 
                 (SELECT COUNT(*) FROM "Registration" WHERE "ticketTypeId" = ${input.ticketTypeId}) as sold
          FROM "TicketType"
          WHERE id = ${input.ticketTypeId}
          FOR UPDATE
        `.then(rows => rows[0]);
        
        if (!ticketType) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket type not found' });
        }
        
        const available = ticketType.quantity - ticketType.sold;
        
        if (available <= 0) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'This ticket type is sold out. Please try another ticket type.',
          });
        }
        
        // Create registration (atomic with lock)
        return tx.registration.create({
          data: {
            ticketTypeId: input.ticketTypeId,
            email: input.email,
            name: input.name,
            // ... other fields
          },
        });
      });
    }),
});

// Real-time availability display (optimistic updates)
function TicketTypeCard({ ticketType }: { ticketType: TicketType }) {
  const { data: stats } = api.ticket.getStats.useQuery({ id: ticketType.id });
  const available = ticketType.quantity - (stats?.sold ?? 0);
  
  const isSoldOut = available <= 0;
  const isLowStock = available > 0 && available < 10;
  
  return (
    <Card>
      <h3>{ticketType.name}</h3>
      <p>{ticketType.description}</p>
      
      {isSoldOut && (
        <Badge color="failure">Sold Out</Badge>
      )}
      
      {isLowStock && (
        <Badge color="warning">Only {available} left!</Badge>
      )}
      
      {!isSoldOut && (
        <Button onClick={handleRegister}>
          Register Now
        </Button>
      )}
    </Card>
  );
}
```

### Database Indexing
```prisma
model Registration {
  id           String   @id @default(cuid())
  ticketTypeId String
  // ... other fields
  
  @@index([ticketTypeId]) // Optimize sold count query
}
```

### Alternatives Considered
- **Application-level locking**: Race conditions possible, less reliable
- **Redis counter**: Adds infrastructure dependency, eventual consistency issues
- **Overbook + waitlist**: More complex UX, doesn't truly solve problem

---

## 7. CFP Deadline Enforcement

### Decision
**Database constraint** (`CHECK` constraint or application-level validation) ensures submissions rejected after deadline. **Scheduled job** (cron via Vercel Cron or pg_cron) auto-closes CFP at deadline.

### Rationale
- **FR-030**: "System MUST prevent submissions after the CFP deadline has passed"
- **Data Integrity**: Database-level enforcement prevents bypassing via direct API calls
- **UX Clarity**: Hide CFP form after deadline, show clear messaging
- **Automation**: Scheduled job auto-closes CFP, reduces manual organizer work

### Implementation Pattern
```typescript
// tRPC mutation with deadline check
export const cfpRouter = createTRPCRouter({
  submitProposal: publicProcedure
    .input(z.object({
      eventId: z.string(),
      title: z.string(),
      description: z.string(),
      // ... other fields
    }))
    .mutation(async ({ ctx, input }) => {
      const cfp = await ctx.db.callForPapers.findUnique({
        where: { eventId: input.eventId },
        select: { deadline: true, status: true },
      });
      
      if (!cfp) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'CFP not found for this event' });
      }
      
      if (cfp.status !== 'open') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'CFP is not currently accepting submissions' });
      }
      
      const now = new Date();
      if (now > cfp.deadline) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: `CFP deadline has passed (${cfp.deadline.toLocaleDateString()})`,
        });
      }
      
      // Create submission
      return ctx.db.cfpSubmission.create({
        data: {
          eventId: input.eventId,
          title: input.title,
          description: input.description,
          // ... other fields
        },
      });
    }),
});

// Scheduled job to auto-close expired CFPs
// src/app/api/cron/close-expired-cfps/route.ts
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel Cron header)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const now = new Date();
  
  const result = await db.callForPapers.updateMany({
    where: {
      status: 'open',
      deadline: { lt: now },
    },
    data: {
      status: 'closed',
    },
  });
  
  console.log(`[CRON] Closed ${result.count} expired CFPs`);
  
  return Response.json({ closed: result.count });
}

// vercel.json (if using Vercel)
{
  "crons": [{
    "path": "/api/cron/close-expired-cfps",
    "schedule": "0 * * * *" // Hourly
  }]
}
```

### Database Schema
```prisma
model CallForPapers {
  id       String   @id @default(cuid())
  eventId  String   @unique
  deadline DateTime
  status   String   @default("open") // 'open' | 'closed'
  // ... other fields
  
  @@index([status, deadline]) // Optimize cron query
}

model CfpSubmission {
  id          String   @id @default(cuid())
  eventId     String
  submittedAt DateTime @default(now())
  // ... other fields
  
  // Optional: Database-level constraint (PostgreSQL)
  // @@check("submittedAt <= (SELECT deadline FROM CallForPapers WHERE eventId = CfpSubmission.eventId)")
}
```

### Alternatives Considered
- **Client-side only validation**: Easily bypassed, not secure
- **Manual closure by organizers**: Relies on human action, error-prone
- **Background worker queue**: Overkill for simple deadline check

---

## Summary

All critical technical decisions resolved:

| Area | Decision | Dependencies | Risk |
|------|----------|--------------|------|
| Email | Resend + React Email | `resend`, `@react-email/*` | Low (battle-tested) |
| File Upload | Local FS (MVP) → S3 (future) | None (native Next.js) | Low (easy migration) |
| Payments | Strategy pattern, free MVP | None (future: `stripe`, `paystack`) | Low (interfaces defined) |
| Timezones | UTC storage + `date-fns-tz` | `date-fns`, `date-fns-tz` | Low (standard pattern) |
| Concurrency | `updatedAt` versioning | None (Prisma built-in) | Medium (UX-dependent) |
| Sold-Out | DB transaction + row lock | None (PostgreSQL feature) | Low (ACID compliant) |
| CFP Deadline | App validation + cron | None (Vercel Cron or pg_cron) | Low (redundant checks) |

**Next Phase**: Generate data model with complete Prisma schema incorporating these patterns.
