# File Structure & Organization

This document explains the Events-Ting project structure, file organization conventions, and where to find specific functionality.

## 📂 Project Root Structure

```
events-ting/
├── .next/                    # Next.js build output (gitignored)
├── docs/                     # Documentation (you are here!)
├── emails/                   # React Email templates
├── generated/                # Generated files (Prisma client)
├── node_modules/             # Dependencies (gitignored)
├── prds/                     # Product Requirement Documents
├── prisma/                   # Database schema and migrations
├── public/                   # Static assets served at /
├── specs/                    # Feature specifications
├── src/                      # Application source code
├── .env                      # Environment variables (gitignored)
├── .env.example              # Example environment variables
├── .eslintrc.json            # ESLint configuration
├── .gitignore                # Git ignore patterns
├── next.config.js            # Next.js configuration
├── package.json              # Dependencies and scripts
├── pnpm-lock.yaml            # pnpm lock file
├── postcss.config.js         # PostCSS configuration
├── prettier.config.js        # Prettier configuration
├── README.md                 # Project README
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── vercel.json               # Vercel deployment config
```

## 📁 Source Directory (`src/`)

```
src/
├── app/                      # Next.js App Router (pages & layouts)
│   ├── (auth)/               # Auth route group (signin, signup)
│   ├── (dashboard)/          # Protected dashboard routes
│   ├── api/                  # API route handlers
│   ├── auth/                 # Auth callback routes
│   ├── events/               # Public event pages
│   ├── _components/          # App-level shared components
│   ├── global-error.tsx      # Global error boundary
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Homepage
├── components/               # React components (by feature)
│   ├── cfp/                  # Call for Papers components
│   ├── communications/       # Email campaign components
│   ├── events/               # Event management components
│   ├── providers/            # React context providers
│   ├── registration/         # Registration form components
│   ├── schedule/             # Schedule timeline components
│   ├── speakers/             # Speaker profile components
│   ├── tickets/              # Ticket management components
│   ├── ui/                   # Reusable UI components (Flowbite)
│   └── app-sidebar.tsx       # Dashboard sidebar
├── hooks/                    # Custom React hooks
│   ├── use-debounce.ts       # Debounce hook
│   └── use-toast.ts          # Toast notification hook
├── lib/                      # Shared utilities
│   ├── utils.ts              # Helper functions
│   ├── validators.ts         # Zod validation schemas
│   └── utils/                # More utilities
├── server/                   # Server-side code
│   ├── api/                  # tRPC API
│   │   ├── routers/          # tRPC routers by feature
│   │   ├── root.ts           # Root tRPC router
│   │   └── trpc.ts           # tRPC configuration
│   ├── auth/                 # NextAuth.js configuration
│   │   ├── config.ts         # Auth providers and callbacks
│   │   └── index.ts          # Auth instance
│   ├── services/             # Business logic services
│   └── db.ts                 # Prisma client instance
├── styles/                   # Global styles
│   └── globals.css           # Tailwind directives + global CSS
├── trpc/                     # tRPC client setup
│   ├── query-client.ts       # React Query client
│   ├── react.tsx             # tRPC React provider
│   └── server.ts             # Server-side tRPC caller
└── env.js                    # Environment variable validation
```

## 🗂️ Detailed Directory Breakdown

### `src/app/` - Next.js App Router

**Purpose**: Pages, layouts, and routing using Next.js App Router

#### Route Groups

**`(auth)/`** - Authentication pages
```
(auth)/
├── signin/
│   └── page.tsx              # Sign in page
└── signup/
    └── page.tsx              # Sign up page
```

**`(dashboard)/`** - Protected organizer dashboard
```
(dashboard)/
├── [id]/                     # Dynamic event ID route
│   ├── attendees/
│   │   └── page.tsx          # Attendee management
│   ├── cfp/
│   │   └── page.tsx          # CFP submissions review
│   ├── communications/
│   │   └── page.tsx          # Email campaigns
│   ├── overview/
│   │   └── page.tsx          # Event overview stats
│   ├── registrations/
│   │   └── page.tsx          # Registration list
│   ├── schedule/
│   │   └── page.tsx          # Schedule builder
│   ├── settings/
│   │   └── page.tsx          # Event settings
│   ├── speakers/
│   │   └── page.tsx          # Speaker management
│   ├── tickets/
│   │   └── page.tsx          # Ticket type management
│   ├── layout.tsx            # Dashboard layout with sidebar
│   └── page.tsx              # Event dashboard home
├── new/
│   └── page.tsx              # Create new event
├── layout.tsx                # Dashboard auth wrapper
└── page.tsx                  # User events dashboard (main dashboard)
```

**Dashboard Components** (`src/components/dashboard/`):
```
dashboard/
├── events-dashboard.tsx      # Main dashboard client component
├── event-card.tsx            # Event card with metadata
├── status-filter.tsx         # Status filter tabs
├── empty-state.tsx           # Empty state variants
└── dashboard-header.tsx      # Dashboard header with actions
```

**`events/`** - Public event pages
```
events/
├── [slug]/                   # Dynamic event slug route
│   ├── cfp/
│   │   └── page.tsx          # Public CFP submission form
│   ├── register/
│   │   └── page.tsx          # Public registration form
│   ├── registrations/
│   │   └── [registrationId]/
│   │       └── page.tsx      # Buyer ticket dashboard
│   ├── schedule/
│   │   └── page.tsx          # Public schedule view
│   ├── speakers/
│   │   ├── [id]/
│   │   │   └── page.tsx      # Speaker profile page
│   │   └── page.tsx          # Speakers directory
│   ├── tickets/
│   │   └── [ticketId]/
│   │       └── page.tsx      # Individual ticket view (attendee)
│   └── page.tsx              # Event landing page
└── page.tsx                  # All events list (public)
```

**`api/`** - API route handlers
```
api/
├── auth/
│   └── [...nextauth]/
│       └── route.ts          # NextAuth.js callback route
├── trpc/
│   └── [trpc]/
│       └── route.ts          # tRPC HTTP handler
└── uploads/
    └── route.ts              # File upload endpoint
```

#### File Conventions

- **`page.tsx`**: Route component (rendered at URL)
- **`layout.tsx`**: Shared layout wrapping child routes
- **`loading.tsx`**: Loading UI (Suspense fallback)
- **`error.tsx`**: Error boundary for route
- **`not-found.tsx`**: 404 page for route segment
- **`route.ts`**: API route handler (not a page)

#### Naming Conventions

- **Route groups**: `(name)` - groups routes without affecting URL
- **Dynamic routes**: `[param]` - captures URL segment as param
- **Catch-all routes**: `[...param]` - captures remaining URL segments

### `src/components/` - React Components

**Organization**: Components organized by feature module

#### Component Categories

**Feature Components** (`cfp/`, `events/`, `registration/`, etc.)
- Domain-specific components
- Used in specific feature pages
- Can be complex (forms, lists, modals)

**UI Components** (`ui/`)
- Reusable, generic components
- Flowbite React wrappers or custom
- No business logic

**Provider Components** (`providers/`)
- React context providers
- Wrap app or specific routes

#### Naming Conventions

```typescript
// ✅ GOOD: kebab-case file names
event-form.tsx
registration-list.tsx
ticket-card.tsx

// ✅ GOOD: PascalCase component names
export function EventForm() {}
export function RegistrationList() {}
export function TicketCard() {}

// ❌ BAD: PascalCase file names
EventForm.tsx  // Use kebab-case instead

// ❌ BAD: Default exports (use named exports)
export default function EventForm() {}
```

#### Component Structure

```typescript
// src/components/events/event-form.tsx
"use client";  // If interactive

import { useState } from "react";
import { Button, TextInput } from "flowbite-react";
import { api } from "~/trpc/react";

// Props interface
interface EventFormProps {
  eventId?: string;
  onSuccess?: (eventId: string) => void;
}

// Component
export function EventForm({ eventId, onSuccess }: EventFormProps) {
  const [name, setName] = useState("");
  
  const createEvent = api.event.create.useMutation({
    onSuccess: (data) => {
      onSuccess?.(data.id);
    },
  });

  return (
    <form onSubmit={handleSubmit}>
      <TextInput
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Event name"
      />
      <Button type="submit">Create Event</Button>
    </form>
  );
}
```

### `src/server/` - Server-Side Code

**Purpose**: All server-only code (API, database, auth)

#### `server/api/` - tRPC API

```
server/api/
├── routers/                  # Feature-based routers
│   ├── cfp.ts                # CFP submission & review
│   ├── communication.ts      # Email campaigns
│   ├── event.ts              # Event CRUD
│   ├── post.ts               # Demo posts (T3 Stack)
│   ├── registration.ts       # Registration & attendees
│   ├── schedule.ts           # Schedule management
│   ├── speaker.ts            # Speaker profiles
│   └── ticket.ts             # Ticket types
├── root.ts                   # Merges all routers
└── trpc.ts                   # tRPC init & procedures
```

**Router Structure**:

```typescript
// src/server/api/routers/event.ts
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { createEventSchema, updateEventSchema } from "~/lib/validators";

export const eventRouter = createTRPCRouter({
  // Public query - no auth
  list: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.db.event.findMany({
        where: { status: "published", isArchived: false }
      });
    }),

  // Protected mutation - requires auth
  create: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.event.create({
        data: {
          ...input,
          organizerId: ctx.session.user.id,
        },
      });
    }),
});
```

**Root Router** (`root.ts`):

```typescript
import { createTRPCRouter } from "./trpc";
import { eventRouter } from "./routers/event";
import { ticketRouter } from "./routers/ticket";
// ... more imports

export const appRouter = createTRPCRouter({
  event: eventRouter,
  ticket: ticketRouter,
  registration: registrationRouter,
  schedule: scheduleRouter,
  speaker: speakerRouter,
  cfp: cfpRouter,
  communication: communicationRouter,
  post: postRouter,  // Demo
});

export type AppRouter = typeof appRouter;
```

#### `server/services/` - Business Logic

**Purpose**: Reusable business logic separated from API layer

```typescript
// src/server/services/event-service.ts
import type { PrismaClient } from "@prisma/client";

export class EventService {
  constructor(private db: PrismaClient) {}

  async publishEvent(eventId: string, userId: string) {
    // 1. Check ownership
    const event = await this.db.event.findUnique({
      where: { id: eventId },
    });

    if (!event || event.organizerId !== userId) {
      throw new Error("Not authorized");
    }

    // 2. Validate event has required data
    const ticketCount = await this.db.ticketType.count({
      where: { eventId },
    });

    if (ticketCount === 0) {
      throw new Error("Event must have at least one ticket type");
    }

    // 3. Publish
    return this.db.event.update({
      where: { id: eventId },
      data: { status: "published" },
    });
  }
}

// Usage in router
import { EventService } from "~/server/services/event-service";

const eventService = new EventService(ctx.db);
await eventService.publishEvent(input.id, ctx.session.user.id);
```

#### `server/auth/` - Authentication

```
server/auth/
├── config.ts                 # NextAuth providers & callbacks
└── index.ts                  # Cached auth instance
```

#### `server/db.ts` - Prisma Client

```typescript
// Singleton Prisma client
import { PrismaClient } from "generated/prisma";

const createPrismaClient = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === "development" 
      ? ["query", "error", "warn"] 
      : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

### `src/lib/` - Shared Utilities

**Purpose**: Reusable utilities, helpers, and validation schemas

```
lib/
├── utils.ts                  # Helper functions
├── validators.ts             # Zod schemas for validation
└── utils/                    # Additional utilities
```

**`utils.ts`** - Utility functions:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency
export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}
```

**`validators.ts`** - Zod schemas:

```typescript
import { z } from "zod";

export const createEventSchema = z.object({
  name: z.string().min(3).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().min(50),
  locationType: z.enum(["in-person", "virtual", "hybrid"]),
  startDate: z.date(),
  endDate: z.date(),
  timezone: z.string(),
}).refine(
  (data) => data.endDate > data.startDate,
  { message: "End date must be after start date" }
);

export type CreateEventInput = z.infer<typeof createEventSchema>;
```

### `prisma/` - Database

```
prisma/
├── migrations/               # Version-controlled schema changes
│   ├── migration_lock.toml   # Lock file (PostgreSQL)
│   ├── 20251107_xxx/
│   │   └── migration.sql     # SQL migration
│   └── 20251108_yyy/
│       └── migration.sql
├── schema.prisma             # Database schema definition
└── seed.ts                   # Database seeding script
```

**Schema Location**: `prisma/schema.prisma`  
**Generated Client**: `generated/prisma/` (gitignored, auto-generated)

### `emails/` - Email Templates

```
emails/
├── cfp-accepted.tsx          # CFP acceptance email
├── cfp-rejected.tsx          # CFP rejection email
├── cfp-submission-received.tsx  # CFP confirmation
├── event-reminder.tsx        # Event reminder
└── registration-confirmation.tsx  # Registration confirmation
```

**Email Template Structure**:

```typescript
// emails/registration-confirmation.tsx
import { Html, Head, Body, Container, Text, Button } from "@react-email/components";

interface RegistrationConfirmationProps {
  attendeeName: string;
  eventName: string;
  eventDate: string;
  eventUrl: string;
}

export default function RegistrationConfirmation({
  attendeeName,
  eventName,
  eventDate,
  eventUrl,
}: RegistrationConfirmationProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif" }}>
        <Container>
          <Text>Hi {attendeeName},</Text>
          <Text>Your registration for {eventName} is confirmed!</Text>
          <Text>Event Date: {eventDate}</Text>
          <Button href={eventUrl}>View Event Details</Button>
        </Container>
      </Body>
    </Html>
  );
}
```

## 🎯 Where to Find Things

### Adding a New Feature

1. **Database**: Add models to `prisma/schema.prisma`
2. **API**: Create router in `src/server/api/routers/[feature].ts`
3. **Validation**: Add schemas to `src/lib/validators.ts`
4. **Components**: Create in `src/components/[feature]/`
5. **Pages**: Add to `src/app/[route]/page.tsx`
6. **Emails**: Create template in `emails/[template].tsx`

### Modifying Existing Features

| Want to modify... | Look in... |
|------------------|-----------|
| Event CRUD | `src/server/api/routers/event.ts` |
| Event form UI | `src/components/events/event-form.tsx` |
| Event schema | `prisma/schema.prisma` (Event model) |
| Event validation | `src/lib/validators.ts` (createEventSchema) |
| Dashboard layout | `src/app/(dashboard)/layout.tsx` |
| Public event page | `src/app/events/[slug]/page.tsx` |

## 📝 File Naming Conventions

### Files

- **Components**: `kebab-case.tsx` (e.g., `event-form.tsx`)
- **Utilities**: `kebab-case.ts` (e.g., `use-debounce.ts`)
- **Pages**: `page.tsx`, `layout.tsx`, `loading.tsx`
- **Routers**: `lowercase.ts` (e.g., `event.ts`, `cfp.ts`)

### Exports

```typescript
// ✅ GOOD: Named exports
export function EventForm() {}
export const formatDate = () => {};

// ❌ BAD: Default exports (harder to refactor)
export default function EventForm() {}
```

### TypeScript Types

```typescript
// ✅ GOOD: PascalCase interfaces/types
interface EventFormProps {}
type CreateEventInput = z.infer<typeof createEventSchema>;

// ✅ GOOD: Infer types from Zod schemas
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// ✅ GOOD: Infer types from Prisma
import type { Event, TicketType } from "generated/prisma";
```

## 🚀 Import Path Aliases

**Configured in `tsconfig.json`**:

```json
{
  "compilerOptions": {
    "paths": {
      "~/*": ["./src/*"]
    }
  }
}
```

**Usage**:

```typescript
// ✅ GOOD: Use alias
import { api } from "~/trpc/react";
import { EventForm } from "~/components/events/event-form";
import { db } from "~/server/db";

// ❌ BAD: Relative imports across directories
import { api } from "../../../trpc/react";
import { EventForm } from "../../components/events/event-form";
```

## 📚 Related Documentation

- **[Getting Started](../getting-started.md)** - Local setup
- **[Tech Stack](./tech-stack.md)** - Technologies used
- **[System Overview](./system-overview.md)** - Architecture patterns
- **[Data Model](./data-model.md)** - Database schema

---

**Last Updated**: November 9, 2025  
**Next Review**: December 9, 2025
