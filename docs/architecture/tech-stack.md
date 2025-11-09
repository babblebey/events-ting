# Technology Stack

This document details all technologies used in Events-Ting, explaining version choices, configuration, and rationale for each technology decision.

## 📦 Core Technologies

### Next.js 15.2.3

**Purpose**: React framework with App Router for server-side rendering and routing

**Why Next.js?**
- ✅ **App Router**: Modern routing with layouts, loading, and error states
- ✅ **Server Components**: Reduce JavaScript sent to client
- ✅ **Server Actions**: Form submissions without API routes
- ✅ **Streaming**: Progressive rendering with Suspense
- ✅ **Image Optimization**: Automatic image optimization
- ✅ **Production-ready**: Built-in performance optimizations

**Configuration**: `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const config = {
  // Turbopack for faster dev builds
  experimental: {
    turbo: {
      // Future: Turbopack configuration
    }
  }
};

export default config;
```

**Key Features Used**:
- App Router (`src/app/`)
- Server Components (default)
- Client Components (`"use client"`)
- Layouts and nested routing
- Dynamic routes (`[slug]`, `[id]`)
- Route groups (`(dashboard)`, `(auth)`)
- Loading UI (`loading.tsx`)
- Error boundaries (`error.tsx`)

**Documentation**: https://nextjs.org/docs

---

### TypeScript 5.8.2

**Purpose**: Type-safe JavaScript with strict type checking

**Why TypeScript?**
- ✅ **Type Safety**: Catch errors at compile time
- ✅ **IDE Support**: Excellent autocomplete and refactoring
- ✅ **tRPC Integration**: Full end-to-end type safety
- ✅ **Developer Experience**: Clear contracts between modules
- ✅ **Refactoring Safety**: Rename with confidence

**Configuration**: `tsconfig.json`
```json
{
  "compilerOptions": {
    "strict": true,                      // Strict type checking
    "noUncheckedIndexedAccess": true,    // Array access safety
    "noImplicitAny": true,               // No implicit 'any' types
    "strictNullChecks": true,            // Null safety
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "paths": {
      "~/*": ["./src/*"]                 // Path alias
    }
  }
}
```

**Code Quality Standards**:
- ❌ No `any` types allowed
- ❌ No type assertions without justification
- ✅ Explicit return types for functions
- ✅ Zod for runtime validation

**Documentation**: https://www.typescriptlang.org/docs

---

### React 19.0.0

**Purpose**: UI library for building interactive interfaces

**Why React 19?**
- ✅ **Server Components**: Render on server, reduce bundle size
- ✅ **Suspense**: Handle async data loading elegantly
- ✅ **Transitions**: Better UX for navigation
- ✅ **Hooks**: Composable state and effects
- ✅ **Ecosystem**: Largest component library ecosystem

**Key Patterns Used**:
- Server Components (default)
- Client Components for interactivity
- React Server Actions (form submissions)
- Suspense boundaries
- Custom hooks (`use-debounce`, `use-toast`)

**Documentation**: https://react.dev

---

## 🔌 API & Data Layer

### tRPC 11.0.0

**Purpose**: End-to-end type-safe API layer without code generation

**Why tRPC?**
- ✅ **Type Safety**: Full TypeScript inference from server to client
- ✅ **No Codegen**: Types derived automatically
- ✅ **Developer Experience**: Autocomplete for all API calls
- ✅ **Validation**: Zod integration for input validation
- ✅ **React Query**: Built-in caching and state management

**Architecture**:
```
Client Component
    ↓
api.event.list.useQuery()  // Full TypeScript autocomplete
    ↓
tRPC Router (src/server/api/routers/event.ts)
    ↓
Protected/Public Procedure
    ↓
Zod Validation
    ↓
Business Logic
    ↓
Prisma Database Query
    ↓
Typed Response
```

**Configuration**: `src/server/api/trpc.ts`
```typescript
import { initTRPC } from "@trpc/server";
import superjson from "superjson";

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,  // Serialize Date, Map, Set, etc.
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError 
          ? error.cause.flatten() 
          : null,
      },
    };
  },
});
```

**Procedure Types**:
- **publicProcedure**: No authentication required (event listings, registration)
- **protectedProcedure**: Requires authentication (create event, manage attendees)

**Usage Example**:
```typescript
// Server (router definition)
export const eventRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ status: z.enum(["draft", "published"]) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.event.findMany({
        where: { status: input.status }
      });
    }),
});

// Client (usage)
const { data: events } = api.event.list.useQuery({ status: "published" });
//     ^? Event[] - Fully typed!
```

**Documentation**: https://trpc.io/docs

---

### Prisma 6.6.0

**Purpose**: Next-generation ORM for type-safe database access

**Why Prisma?**
- ✅ **Type Safety**: Auto-generated types from schema
- ✅ **Migrations**: Version-controlled schema changes
- ✅ **Developer Experience**: Excellent autocomplete
- ✅ **Query Builder**: Intuitive, type-safe queries
- ✅ **Relation Handling**: Automatic joins and includes

**Schema**: `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Event {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String   @db.Text
  // ... more fields
  
  ticketTypes   TicketType[]
  registrations Registration[]
  
  @@index([slug])
  @@index([organizerId, status])
}
```

**Key Features**:
- Auto-generated client with types
- Relation loading (include, select)
- Transactions for data integrity
- Connection pooling
- Query optimization

**Common Patterns**:
```typescript
// Include relations
const event = await db.event.findUnique({
  where: { slug: "tech-conf-2025" },
  include: { 
    ticketTypes: true,
    organizer: { select: { name: true, email: true } }
  }
});

// Transactions
await db.$transaction([
  db.registration.create({ data: registrationData }),
  db.ticketType.update({
    where: { id: ticketTypeId },
    data: { quantity: { decrement: 1 } }
  })
]);
```

**Documentation**: https://www.prisma.io/docs

---

### PostgreSQL 14+

**Purpose**: Primary relational database

**Why PostgreSQL?**
- ✅ **ACID Compliance**: Data integrity guarantees
- ✅ **JSON Support**: Store flexible data in columns
- ✅ **Full-text Search**: Built-in search capabilities
- ✅ **Scalability**: Handles millions of records
- ✅ **Open Source**: No licensing costs

**Schema Design Principles**:
- Normalized data (avoid duplication)
- Foreign key constraints
- Cascade deletes for child records
- Strategic indexes for performance
- CUID primary keys (collision-resistant)

**Recommended Hosting**:
- **Vercel Postgres**: Managed PostgreSQL optimized for Vercel
- **Supabase**: Open-source Firebase alternative
- **Neon**: Serverless PostgreSQL with branching
- **Railway**: Simple deployment with databases

**Documentation**: https://www.postgresql.org/docs

---

## 🔐 Authentication & Authorization

### NextAuth.js 5.0.0-beta.25

**Purpose**: Authentication for Next.js with OAuth and credentials

**Why NextAuth.js?**
- ✅ **OAuth Support**: Google, GitHub, Discord out of the box
- ✅ **Credentials**: Username/password authentication
- ✅ **Session Management**: Secure session handling
- ✅ **Database Sessions**: Store sessions in PostgreSQL
- ✅ **JWT Support**: Stateless sessions (used in Events-Ting)

**Configuration**: `src/server/auth/config.ts`
```typescript
export const authConfig = {
  providers: [
    Credentials({
      async authorize(credentials) {
        // Validate email and password
        const user = await db.user.findUnique({
          where: { email: credentials.email }
        });
        
        if (!user?.password) return null;
        
        const passwordsMatch = await compare(
          credentials.password,
          user.password
        );
        
        return passwordsMatch ? user : null;
      },
    }),
  ],
  session: {
    strategy: "jwt",  // JWT sessions (no database lookup per request)
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) token.id = user.id;
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: { ...session.user, id: token.id },
    }),
  },
  pages: {
    signIn: "/auth/signin",
  },
};
```

**Session Access**:
```typescript
// Server Component
import { auth } from "@/server/auth";
const session = await auth();

// Client Component
import { useSession } from "next-auth/react";
const { data: session } = useSession();

// tRPC Context
export const createTRPCContext = async () => {
  const session = await auth();
  return { db, session };
};
```

**Authorization Patterns**:
```typescript
// Protected procedure (requires auth)
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { session: ctx.session } });
});

// Organizer check (resource ownership)
const event = await ctx.db.event.findUnique({ where: { id: input.id } });
if (event.organizerId !== ctx.session.user.id) {
  throw new TRPCError({ code: "FORBIDDEN" });
}
```

**Documentation**: https://next-auth.js.org

---

### bcryptjs 3.0.3

**Purpose**: Password hashing with bcrypt algorithm

**Why bcryptjs?**
- ✅ **Security**: Industry-standard password hashing
- ✅ **Salted Hashing**: Each hash is unique
- ✅ **Configurable Rounds**: Balance security vs performance
- ✅ **Pure JavaScript**: No native dependencies

**Usage**:
```typescript
import { hash, compare } from "bcryptjs";

// Hash password (registration)
const hashedPassword = await hash(plainPassword, 10);  // 10 salt rounds

// Verify password (login)
const isValid = await compare(plainPassword, hashedPassword);
```

---

## 🎨 UI & Styling

### Tailwind CSS 4.0.15

**Purpose**: Utility-first CSS framework

**Why Tailwind?**
- ✅ **Utility Classes**: Rapid prototyping
- ✅ **No CSS Files**: Styles in JSX
- ✅ **Purging**: Remove unused CSS in production
- ✅ **Responsive**: Mobile-first breakpoints
- ✅ **Customizable**: Extend with custom classes

**Configuration**: `tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Custom brand colors
      }
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
};
```

**Usage**:
```tsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
  <h2 className="text-2xl font-bold text-gray-900">Event Title</h2>
  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
    Register
  </button>
</div>
```

**Documentation**: https://tailwindcss.com/docs

---

### Flowbite React 0.12.10

**Purpose**: Component library built on Tailwind CSS

**Why Flowbite React?**
- ✅ **Tailwind-based**: Consistent with Tailwind styling
- ✅ **Accessible**: WCAG AA compliance
- ✅ **Comprehensive**: 40+ components
- ✅ **TypeScript**: Full type definitions
- ✅ **Customizable**: Override default styles

**Components Used**:
- **Forms**: TextInput, Textarea, Select, Checkbox, Radio
- **Buttons**: Button, ButtonGroup
- **Navigation**: Navbar, Sidebar, Breadcrumb
- **Feedback**: Alert, Toast, Modal, Spinner
- **Data Display**: Table, Card, Badge, Avatar
- **Overlays**: Modal, Dropdown, Tooltip

**Usage**:
```tsx
import { Button, TextInput, Card } from "flowbite-react";

<Card>
  <form onSubmit={handleSubmit}>
    <TextInput
      type="email"
      placeholder="Enter your email"
      required
    />
    <Button type="submit" color="blue">
      Submit
    </Button>
  </form>
</Card>
```

**Documentation**: https://flowbite-react.com

---

### Lucide React 0.553.0

**Purpose**: Icon library with React components

**Why Lucide?**
- ✅ **Tree-shakeable**: Only bundle icons you use
- ✅ **Consistent Design**: 1000+ icons
- ✅ **Customizable**: Size, color, stroke width
- ✅ **TypeScript**: Full type support

**Usage**:
```tsx
import { Calendar, Users, Mail, MapPin } from "lucide-react";

<div className="flex items-center gap-2">
  <Calendar className="h-5 w-5 text-gray-500" />
  <span>March 15, 2025</span>
</div>
```

**Documentation**: https://lucide.dev

---

## ✉️ Email & Communication

### Resend 4.0.1

**Purpose**: Modern email API for transactional emails

**Why Resend?**
- ✅ **Developer Experience**: Simple, intuitive API
- ✅ **React Email**: Build emails with React components
- ✅ **Deliverability**: High inbox placement rates
- ✅ **Analytics**: Open and click tracking
- ✅ **Webhooks**: Real-time delivery status

**Configuration**: Environment variables
```bash
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@yourdomain.com"
```

**Usage**:
```typescript
import { Resend } from "resend";
import RegistrationConfirmationEmail from "~/emails/registration-confirmation";

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL,
  to: attendee.email,
  subject: "Registration Confirmed",
  react: RegistrationConfirmationEmail({ attendee, event }),
});
```

**Documentation**: https://resend.com/docs

---

### React Email

**Purpose**: Build emails using React components

**Why React Email?**
- ✅ **Component-based**: Reusable email components
- ✅ **Type-safe**: TypeScript support
- ✅ **Preview**: Live preview in development
- ✅ **Responsive**: Mobile-friendly by default

**Email Templates** (`emails/`):
- `registration-confirmation.tsx`
- `cfp-submission-received.tsx`
- `cfp-accepted.tsx`
- `cfp-rejected.tsx`
- `event-reminder.tsx`

**Usage**:
```tsx
import { Html, Head, Body, Container, Text, Button } from "@react-email/components";

export default function RegistrationConfirmation({ attendee, event }) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Text>Hi {attendee.name},</Text>
          <Text>Your registration for {event.name} is confirmed!</Text>
          <Button href={`${baseUrl}/events/${event.slug}`}>
            View Event Details
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
```

**Documentation**: https://react.email

---

## ✅ Validation & Type Safety

### Zod 3.24.2

**Purpose**: TypeScript-first schema validation

**Why Zod?**
- ✅ **Type Inference**: Infer TypeScript types from schemas
- ✅ **Composable**: Build complex schemas from simple ones
- ✅ **Error Messages**: Detailed validation errors
- ✅ **tRPC Integration**: Native support in tRPC
- ✅ **Form Validation**: Works with React Hook Form

**Common Schemas** (`src/lib/validators.ts`):
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

// Infer TypeScript type
type CreateEventInput = z.infer<typeof createEventSchema>;
```

**Usage in tRPC**:
```typescript
export const eventRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      // input is fully typed based on schema
      return ctx.db.event.create({ data: input });
    }),
});
```

**Documentation**: https://zod.dev

---

## 🗃️ State Management

### TanStack Query (React Query) 5.69.0

**Purpose**: Async state management and data fetching

**Why React Query?**
- ✅ **Built-in with tRPC**: Automatic integration
- ✅ **Caching**: Smart cache management
- ✅ **Optimistic Updates**: Instant UI feedback
- ✅ **Background Refetching**: Keep data fresh
- ✅ **Devtools**: Debug queries and mutations

**Configuration** (`src/trpc/react.tsx`):
```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

**Usage**:
```typescript
// Query
const { data, isLoading, error } = api.event.list.useQuery();

// Mutation
const { mutate: createEvent } = api.event.create.useMutation({
  onSuccess: () => {
    // Invalidate cache to refetch
    utils.event.list.invalidate();
  },
});
```

**Documentation**: https://tanstack.com/query

---

## 🛠️ Developer Tools

### pnpm 10.20.0

**Purpose**: Fast, disk-efficient package manager

**Why pnpm?**
- ✅ **Disk Efficiency**: Shared package store (saves GB)
- ✅ **Speed**: Faster than npm/yarn
- ✅ **Strict**: Better dependency resolution
- ✅ **Monorepo Support**: Workspaces for large projects

**Documentation**: https://pnpm.io

---

### ESLint 9.23.0

**Purpose**: JavaScript/TypeScript linting

**Configuration**: `eslint.config.js`
```javascript
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "eslint-config-next";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  nextPlugin,
);
```

**Documentation**: https://eslint.org

---

### Prettier 3.5.3

**Purpose**: Code formatting

**Configuration**: `prettier.config.js`
```javascript
export default {
  plugins: ["prettier-plugin-tailwindcss"],
  semi: true,
  trailingComma: "all",
  singleQuote: false,
  printWidth: 100,
  tabWidth: 2,
};
```

**Documentation**: https://prettier.io

---

## 🌐 Utilities

### date-fns 4.1.0 + date-fns-tz 3.2.0

**Purpose**: Date manipulation and timezone handling

**Why date-fns?**
- ✅ **Modular**: Import only what you need
- ✅ **Immutable**: No mutating dates
- ✅ **TypeScript**: Full type definitions
- ✅ **Timezone Support**: With date-fns-tz

**Usage**:
```typescript
import { format, formatDistanceToNow } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

// Format date
format(new Date(), "PPP");  // "January 1, 2025"

// Relative time
formatDistanceToNow(registeredAt);  // "2 days ago"

// Timezone conversion
formatInTimeZone(date, "America/New_York", "PPPpp");
```

**Documentation**: https://date-fns.org

---

## 📊 Technology Comparison

### Why Not REST?
- ❌ No type safety between client and server
- ❌ Requires API documentation
- ❌ Manual serialization/deserialization
- ✅ tRPC: Automatic types, no codegen needed

### Why Not GraphQL?
- ❌ Complex setup and tooling
- ❌ Overfetching/underfetching considerations
- ❌ Requires schema definition language
- ✅ tRPC: Simpler, leverages TypeScript

### Why Not Plain CSS/SCSS?
- ❌ Separate CSS files
- ❌ Class naming conventions needed
- ❌ Unused CSS in production
- ✅ Tailwind: Utility-first, automatic purging

### Why Not MUI/Ant Design?
- ❌ Large bundle sizes
- ❌ Opinionated styling hard to override
- ❌ Not Tailwind-native
- ✅ Flowbite: Lightweight, Tailwind-based

---

## 🚀 Production Deployment Stack

### Vercel (Recommended)

- **Framework**: Next.js native support
- **Edge Network**: Global CDN
- **Auto-scaling**: Serverless functions
- **GitHub Integration**: Auto-deploy on push
- **Environment Variables**: Secure secret management

### Alternatives

- **Netlify**: Similar to Vercel
- **Railway**: Easy deployment with database
- **Render**: Free tier for side projects
- **Self-hosted**: Docker + nginx + PM2

---

## 📚 Related Documentation

- **[System Overview](./system-overview.md)** - Architecture patterns
- **[Data Model](./data-model.md)** - Database schema
- **[Authentication](./authentication.md)** - Auth implementation
- **[Getting Started](../getting-started.md)** - Setup guide

---

**Last Updated**: November 9, 2025  
**Next Review**: December 9, 2025
