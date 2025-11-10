# tRPC Overview

## Introduction

**tRPC** (TypeScript Remote Procedure Call) is the core API layer for Events-Ting, providing end-to-end type-safe communication between the client and server without code generation. It eliminates the need for REST endpoints or GraphQL schemas while maintaining full TypeScript type inference.

**Version**: 11.0.0

---

## Why tRPC?

### ✅ Key Benefits

1. **Full Type Safety**
   - Input types validated at compile time
   - Output types automatically inferred
   - No manual API client generation needed

2. **Developer Experience**
   - Autocomplete for all API calls
   - Refactoring-friendly (rename procedures, IDE updates all usages)
   - Immediate error feedback

3. **Validation Built-in**
   - Zod schemas for runtime validation
   - Type-safe error handling
   - Structured validation errors

4. **React Query Integration**
   - Automatic caching and background refetching
   - Optimistic updates
   - Mutation state management

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Component                         │
│  api.event.list.useQuery({ status: "published" })           │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP Request
                     │ /api/trpc/event.list
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js API Route                          │
│               /api/trpc/[trpc]/route.ts                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     tRPC Router                              │
│            src/server/api/routers/event.ts                   │
│                                                              │
│  list: publicProcedure                                       │
│    .input(z.object({ status: z.enum(...) }))               │
│    .query(async ({ ctx, input }) => {...})                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Input Validation (Zod)                      │
│            Validates input against schema                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                Authorization Middleware                      │
│         Check session for protected procedures               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic                             │
│              Query database via Prisma                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Typed Response (JSON)                        │
│            Serialized with SuperJSON                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Procedures

**Procedures** are the building blocks of tRPC APIs. Each procedure is either a **query** (read operation) or a **mutation** (write operation).

#### Query vs Mutation

| Aspect | Query | Mutation |
|--------|-------|----------|
| **HTTP Method** | GET | POST |
| **Purpose** | Fetch data | Modify data |
| **Caching** | Automatic (React Query) | No caching |
| **React Hook** | `useQuery` | `useMutation` |
| **Example** | List events | Create event |

#### Procedure Types

```typescript
// Public Procedure - No authentication required
export const publicProcedure = t.procedure.use(timingMiddleware);

// Protected Procedure - Requires authentication
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });
```

---

### 2. Context

**Context** contains data available to all procedures:

```typescript
// src/server/api/trpc.ts
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();

  return {
    db,        // Prisma client
    session,   // NextAuth session
    ...opts,
  };
};
```

**Usage in Procedures**:

```typescript
export const eventRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      // ctx.db - Database client
      // ctx.session.user - Authenticated user (guaranteed in protectedProcedure)
      return ctx.db.event.create({
        data: {
          ...input,
          organizerId: ctx.session.user.id,
        },
      });
    }),
});
```

---

### 3. Input Validation with Zod

All procedure inputs are validated using **Zod schemas** before execution.

**Benefits**:
- Runtime type checking
- Custom error messages
- Complex validation rules
- Type inference

**Example**:

```typescript
import { z } from "zod";
import { createEventSchema } from "@/lib/validators";

export const eventRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createEventSchema) // Zod schema
    .mutation(async ({ ctx, input }) => {
      // input is fully typed and validated
      return ctx.db.event.create({ data: input });
    }),
});
```

**Validation Schema** (`src/lib/validators.ts`):

```typescript
export const createEventSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);
```

---

### 4. Type Safety

tRPC provides **full end-to-end type safety** from the server to the client.

**Server-Side** (`src/server/api/routers/event.ts`):

```typescript
export const eventRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.event.findUnique({
        where: { id: input.id },
      });
    }),
});
```

**Client-Side** (`src/app/events/[id]/page.tsx`):

```typescript
"use client";
import { api } from "@/trpc/react";

function EventPage({ eventId }: { eventId: string }) {
  const { data: event, isLoading, error } = api.event.getById.useQuery({ id: eventId });
  
  // `event` is fully typed as Prisma Event model
  // TypeScript knows all fields: event.name, event.description, etc.
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <h1>{event.name}</h1>; // ✅ TypeScript autocomplete
}
```

---

## Client-Side Usage Patterns

### Server Components (Recommended)

Use `api` from `@/trpc/server` for server-side data fetching:

```typescript
// src/app/events/[slug]/page.tsx
import { api } from "@/trpc/server";

export default async function EventPage({ params }: { params: { slug: string } }) {
  const event = await api.event.getBySlug({ slug: params.slug });
  
  return <EventDetails event={event} />;
}
```

**Benefits**:
- No client-side JavaScript
- Faster initial page load
- SEO-friendly

---

### Client Components (Interactive)

Use `api` from `@/trpc/react` for client-side interactions:

#### Queries (Data Fetching)

```typescript
"use client";
import { api } from "@/trpc/react";

function EventList() {
  const { data, isLoading, error, refetch } = api.event.list.useQuery({
    status: "published"
  });
  
  if (isLoading) return <Spinner />;
  if (error) return <Alert>{error.message}</Alert>;
  
  return (
    <div>
      {data.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
      <Button onClick={() => refetch()}>Refresh</Button>
    </div>
  );
}
```

**React Query Features**:
- `isLoading` - Initial loading state
- `isFetching` - Background refetching state
- `error` - Error object
- `refetch()` - Manual refetch
- Automatic caching and background updates

---

#### Mutations (Data Modification)

```typescript
"use client";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

function CreateEventForm() {
  const router = useRouter();
  const utils = api.useUtils();
  
  const createEvent = api.event.create.useMutation({
    onSuccess: (data) => {
      // Invalidate cache to refetch list
      utils.event.list.invalidate();
      // Navigate to new event
      router.push(`/dashboard/${data.id}`);
    },
    onError: (error) => {
      alert(error.message);
    },
  });
  
  const handleSubmit = (formData: FormData) => {
    createEvent.mutate({
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      // ... other fields
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required />
      <button type="submit" disabled={createEvent.isPending}>
        {createEvent.isPending ? "Creating..." : "Create Event"}
      </button>
    </form>
  );
}
```

---

### Optimistic Updates

Update UI immediately before server confirms:

```typescript
const utils = api.useUtils();

const updateEvent = api.event.update.useMutation({
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await utils.event.getById.cancel({ id: newData.id });
    
    // Snapshot current value
    const previousEvent = utils.event.getById.getData({ id: newData.id });
    
    // Optimistically update cache
    utils.event.getById.setData({ id: newData.id }, (old) => ({
      ...old!,
      ...newData,
    }));
    
    return { previousEvent };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    utils.event.getById.setData({ id: newData.id }, context?.previousEvent);
  },
  onSettled: (data, error, variables) => {
    // Refetch after success or error
    utils.event.getById.invalidate({ id: variables.id });
  },
});
```

---

## Configuration

### Server Configuration

**File**: `src/server/api/trpc.ts`

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

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

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure.use(timingMiddleware);
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(authMiddleware);
```

---

### Client Configuration

**File**: `src/trpc/react.tsx`

```typescript
import { httpBatchStreamLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import SuperJSON from "superjson";

export const api = createTRPCReact<AppRouter>();

// Links configuration
const links = [
  loggerLink({
    enabled: (opts) =>
      process.env.NODE_ENV === "development" ||
      (opts.direction === "down" && opts.result instanceof Error),
  }),
  httpBatchStreamLink({
    url: `${getBaseUrl()}/api/trpc`,
    transformer: SuperJSON,
  }),
];
```

**Features**:
- **Batch Requests**: Multiple queries in single HTTP request
- **Streaming**: Real-time data updates
- **Logging**: Development debugging

---

## SuperJSON Transformer

**SuperJSON** extends JSON to support additional data types:

```typescript
// Supports:
- Date objects
- Map, Set
- BigInt
- RegExp
- undefined
- NaN, Infinity

// Example
const event = {
  name: "Tech Conference",
  startDate: new Date("2025-01-15"), // ✅ Preserved as Date object
  metadata: new Map([["key", "value"]]), // ✅ Preserved as Map
};
```

Without SuperJSON, dates would become strings, requiring manual parsing on the client.

---

## Middleware

Middleware runs before procedure handlers to add common functionality:

### Timing Middleware

Logs execution time for all procedures:

```typescript
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();
  const result = await next();
  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);
  return result;
});
```

### Authentication Middleware

Ensures user is logged in:

```typescript
const authMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});
```

---

## Best Practices

### 1. **Use Server Components When Possible**
- Fetch data on the server (faster, SEO-friendly)
- Only use client components for interactivity

### 2. **Collocate Validation Schemas**
- Store Zod schemas in `src/lib/validators.ts`
- Reuse schemas in forms and procedures

### 3. **Organize Routers by Domain**
- One router per feature (event, ticket, registration)
- Keep procedures focused and small

### 4. **Use Type Inference**
```typescript
import type { RouterOutputs } from "@/trpc/react";

type Event = RouterOutputs["event"]["getById"];
// ✅ Automatically typed, stays in sync with backend
```

### 5. **Handle Errors Gracefully**
```typescript
const { data, error } = api.event.getById.useQuery({ id });

if (error) {
  // Check error type
  if (error.data?.code === "NOT_FOUND") {
    return <NotFoundPage />;
  }
  return <ErrorPage message={error.message} />;
}
```

---

## Related Documentation

- **[API Routers Reference](./routers.md)** - Complete list of all procedures
- **[Authentication](./authentication.md)** - Protected vs public procedures
- **[Error Handling](./error-handling.md)** - TRPCError codes and patterns
- **[Tech Stack: tRPC](../architecture/tech-stack.md#trpc)** - More technical details

---

## Resources

- **Official Documentation**: https://trpc.io/docs
- **React Query**: https://tanstack.com/query/latest
- **Zod Validation**: https://zod.dev
- **T3 Stack**: https://create.t3.gg
