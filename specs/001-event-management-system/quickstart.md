# Quickstart: Event Management System

**Welcome to events-ting!** This guide will help you set up the development environment and understand the architecture of the event management system.

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ (check with `node --version`)
- **pnpm** 10.20+ (install: `npm install -g pnpm`)
- **PostgreSQL** 14+ (local or cloud instance)
- **Git** for version control

---

## Initial Setup

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/babblebey/events-ting.git
cd events-ting
pnpm install
```

### 2. Environment Configuration

Create `.env` file in project root:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/events_ting_dev"

# NextAuth.js
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers (optional, but recommended for testing)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Email (Resend)
RESEND_API_KEY="re_123456789" # Get from https://resend.com

# File Upload (MVP: local storage, no config needed)
# Future: S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY
```

**Get OAuth Credentials**:
- **Google**: [Google Cloud Console](https://console.cloud.google.com/) → Create OAuth 2.0 Client ID → Add redirect URI: `http://localhost:3000/api/auth/callback/google`
- **GitHub**: [GitHub Developer Settings](https://github.com/settings/developers) → New OAuth App → Callback URL: `http://localhost:3000/api/auth/callback/github`

### 3. Database Setup

```bash
# Run migrations
pnpm run db:generate

# (Optional) Seed with sample data
pnpm run db:seed
```

### 4. Start Development Server

```bash
pnpm run dev
```

Visit **http://localhost:3000** 🎉

---

## Project Architecture

### Tech Stack (T3 Stack)

```
┌─────────────────────────────────────────────┐
│  Frontend: Next.js 15 App Router + React 19 │
│  - Server Components (default)              │
│  - Client Components ('use client')         │
│  - Flowbite React UI + Tailwind CSS 4      │
└──────────────┬──────────────────────────────┘
               │ tRPC (type-safe API)
┌──────────────▼──────────────────────────────┐
│  Backend: tRPC 11 + Prisma 6                │
│  - API Routers (domain-organized)           │
│  - Business Logic (services/)               │
│  - Database (PostgreSQL via Prisma ORM)     │
└─────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── app/                      # Next.js App Router (routes)
│   ├── (auth)/               # Auth pages (signin, register)
│   ├── (dashboard)/          # Protected dashboard routes
│   │   └── [id]/             # Dynamic event dashboard
│   ├── events/               # Public event pages
│   ├── api/                  # API route handlers
│   │   ├── auth/[...nextauth]/  # NextAuth.js
│   │   └── trpc/[trpc]/      # tRPC endpoint
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Landing page
├── components/               # Shared React components
│   ├── ui/                   # Flowbite-based UI primitives
│   ├── events/               # Event-specific components
│   └── forms/                # Form components with validation
├── server/
│   ├── api/
│   │   ├── routers/          # tRPC routers (domain-organized)
│   │   │   ├── event.ts
│   │   │   ├── ticket.ts
│   │   │   ├── registration.ts
│   │   │   ├── schedule.ts
│   │   │   ├── cfp.ts
│   │   │   ├── speaker.ts
│   │   │   └── communication.ts
│   │   ├── root.ts           # Combines all routers
│   │   └── trpc.ts           # tRPC setup (context, procedures)
│   ├── auth/                 # NextAuth.js config
│   ├── services/             # Business logic
│   │   ├── email.ts          # Resend integration
│   │   ├── storage.ts        # File upload (local/S3)
│   │   └── payment.ts        # Payment processor (future)
│   └── db.ts                 # Prisma client singleton
├── lib/                      # Utilities
│   ├── utils.ts
│   ├── validators.ts         # Zod schemas
│   └── constants.ts
└── trpc/                     # tRPC client setup
    ├── react.tsx             # React Query hooks
    ├── server.ts             # Server-side caller
    └── query-client.ts       # React Query config

prisma/
├── schema.prisma             # Database schema
└── migrations/               # Database migrations

emails/                       # React Email templates
├── registration-confirmation.tsx
└── cfp-accepted.tsx
```

---

## Key Concepts

### 1. tRPC API Layer

**Server-side (define procedures)**:
```typescript
// src/server/api/routers/event.ts
export const eventRouter = createTRPCRouter({
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

**Client-side (call procedures)**:
```typescript
// src/app/(dashboard)/events/create/page.tsx
import { api } from "@/trpc/react";

export default function CreateEventPage() {
  const createEvent = api.event.create.useMutation();
  
  const handleSubmit = (data: EventFormData) => {
    createEvent.mutate(data, {
      onSuccess: (event) => router.push(`/dashboard/${event.id}`),
    });
  };
  
  return <EventForm onSubmit={handleSubmit} />;
}
```

**Type Safety**: Client knows server's types automatically. No manual API client code!

---

### 2. Server Components vs Client Components

**Default: Server Components** (no `'use client'`)
- Fetch data directly from database
- No JavaScript sent to browser
- Use for static content, data display

```typescript
// src/app/events/[slug]/page.tsx
import { api } from "@/trpc/server"; // Server-side caller

export default async function EventPage({ params }: { params: { slug: string } }) {
  const event = await api.event.getBySlug({ slug: params.slug });
  
  return (
    <div>
      <h1>{event.name}</h1>
      <p>{event.description}</p>
    </div>
  );
}
```

**Client Components**: Add `'use client'` directive
- User interactions (forms, modals, tooltips)
- Browser APIs (localStorage, geolocation)
- React hooks (useState, useEffect)

```typescript
// src/components/forms/event-form.tsx
'use client';

import { useState } from 'react';

export function EventForm({ onSubmit }: { onSubmit: (data: EventData) => void }) {
  const [name, setName] = useState('');
  
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name }); }}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button type="submit">Create Event</button>
    </form>
  );
}
```

---

### 3. Database Operations (Prisma)

**Create**:
```typescript
const event = await ctx.db.event.create({
  data: {
    name: "Next.js Conf 2025",
    slug: "nextjs-conf-2025",
    organizerId: userId,
  },
});
```

**Read**:
```typescript
const events = await ctx.db.event.findMany({
  where: { organizerId: userId },
  include: {
    _count: {
      select: { registrations: true },
    },
  },
});
```

**Update**:
```typescript
await ctx.db.event.update({
  where: { id: eventId },
  data: { name: "Updated Name" },
});
```

**Delete** (soft delete preferred):
```typescript
await ctx.db.event.update({
  where: { id: eventId },
  data: { isArchived: true },
});
```

**Transactions** (prevent race conditions):
```typescript
await ctx.db.$transaction(async (tx) => {
  const ticketType = await tx.ticketType.findUniqueOrThrow({ where: { id } });
  
  if (ticketType.quantity <= soldCount) {
    throw new Error('Sold out');
  }
  
  await tx.registration.create({ data: { ... } });
});
```

---

### 4. Authentication (NextAuth.js)

**Protected Routes** (Server Component):
```typescript
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  
  if (!session) {
    redirect("/auth/signin");
  }
  
  return <div>{children}</div>;
}
```

**Get Current User** (tRPC):
```typescript
// In any protectedProcedure
const userId = ctx.session.user.id;
const userEmail = ctx.session.user.email;
```

---

### 5. Email Sending (Resend)

```typescript
// src/server/services/email.ts
import { Resend } from 'resend';
import { render } from '@react-email/render';
import RegistrationEmail from '@/emails/registration-confirmation';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendRegistrationConfirmation(to: string, data: RegistrationData) {
  const html = render(<RegistrationEmail {...data} />);
  
  await resend.emails.send({
    from: 'events@yourdomain.com',
    to,
    subject: `Registration Confirmed: ${data.eventName}`,
    html,
  });
}
```

**React Email Template**:
```typescript
// emails/registration-confirmation.tsx
import { Html, Head, Body, Container, Heading, Text } from '@react-email/components';

export default function RegistrationConfirmation({ eventName, attendeeName }: { eventName: string, attendeeName: string }) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Heading>Registration Confirmed!</Heading>
          <Text>Hi {attendeeName},</Text>
          <Text>You're registered for {eventName}. See you there!</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

---

## Development Workflow

### 1. Create a New Feature

```bash
# 1. Create feature branch
git checkout -b feat/ticket-management

# 2. Update database schema (if needed)
# Edit prisma/schema.prisma

# 3. Generate migration
pnpm run db:generate

# 4. Implement tRPC router
# Create src/server/api/routers/ticket.ts

# 5. Add router to root
# Edit src/server/api/root.ts

# 6. Create UI components
# Add components to src/components/

# 7. Create pages
# Add routes to src/app/

# 8. Test
pnpm run dev
# Manual testing in browser

# 9. Lint & typecheck
pnpm run check

# 10. Commit
git add .
git commit -m "feat: add ticket management"
```

### 2. Database Changes

```bash
# After editing schema.prisma
pnpm run db:generate  # Creates migration + regenerates client

# Apply to production (later)
pnpm run db:migrate
```

### 3. Code Quality

```bash
# Lint
pnpm run lint

# Typecheck
pnpm run typecheck

# Format code
pnpm run format:write

# All checks
pnpm run check
```

---

## Common Tasks

### Add a New tRPC Procedure

1. **Define router procedure** (`src/server/api/routers/event.ts`):
   ```typescript
   export const eventRouter = createTRPCRouter({
     create: protectedProcedure
       .input(z.object({ name: z.string() }))
       .mutation(async ({ ctx, input }) => {
         return ctx.db.event.create({ data: input });
       }),
   });
   ```

2. **Use in component**:
   ```typescript
   const createEvent = api.event.create.useMutation();
   createEvent.mutate({ name: "My Event" });
   ```

### Add a New Database Model

1. **Edit `prisma/schema.prisma`**:
   ```prisma
   model Event {
     id   String @id @default(cuid())
     name String
   }
   ```

2. **Generate migration**:
   ```bash
   pnpm run db:generate
   ```

3. **Use in tRPC**:
   ```typescript
   await ctx.db.event.create({ data: { name: "Test" } });
   ```

### Add a New Page

1. **Create file** in `src/app/`:
   ```
   src/app/events/[slug]/page.tsx
   ```

2. **Export default component**:
   ```typescript
   export default async function EventPage({ params }: { params: { slug: string } }) {
     return <div>Event: {params.slug}</div>;
   }
   ```

---

## Debugging Tips

### tRPC Errors

**Client Error**:
```typescript
createEvent.mutate(data, {
  onError: (error) => {
    console.error(error.message); // User-friendly message
    console.error(error.data?.zodError); // Validation errors
  },
});
```

**Server Error** (check terminal output):
```
[TRPC] event.create took 243ms to execute
Error: Validation failed
  at ...
```

### Database Issues

```bash
# View database in GUI
pnpm run db:studio

# Reset database (WARNING: deletes all data)
pnpm run db:push --force-reset
```

### Type Errors

```bash
# Regenerate Prisma client
pnpm run db:generate

# Check for type errors
pnpm run typecheck
```

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start dev server (http://localhost:3000) |
| `pnpm run build` | Build for production |
| `pnpm run start` | Start production server |
| `pnpm run check` | Lint + typecheck |
| `pnpm run lint` | Run ESLint |
| `pnpm run lint:fix` | Fix ESLint issues |
| `pnpm run typecheck` | TypeScript type checking |
| `pnpm run format:write` | Format code with Prettier |
| `pnpm run db:generate` | Run migrations + generate Prisma client |
| `pnpm run db:push` | Push schema changes (dev only) |
| `pnpm run db:studio` | Open Prisma Studio (database GUI) |

---

## Next Steps

1. **Read the Feature Spec**: `specs/001-event-management-system/spec.md`
2. **Review Data Model**: `specs/001-event-management-system/data-model.md`
3. **Check API Contracts**: `specs/001-event-management-system/contracts/`
4. **Start Implementing**: Pick a user story from `spec.md` and build it!

---

## Getting Help

- **Documentation**: [Next.js Docs](https://nextjs.org/docs), [tRPC Docs](https://trpc.io/docs), [Prisma Docs](https://www.prisma.io/docs)
- **Codebase Questions**: Check existing code in `src/server/api/routers/post.ts` (example router)
- **Constitution**: `.specify/memory/constitution.md` (project principles and standards)

Happy coding! 🚀
