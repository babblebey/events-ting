# API Authentication & Authorization

## Overview

This document details authentication and authorization patterns used in the tRPC API layer, including procedure types, session management, and organizer authorization.

**Auth Provider**: NextAuth.js 5 (Auth.js)  
**Strategy**: Session-based authentication with credentials provider

---

## Procedure Types

### Public Procedure

**No authentication required** - Anyone can call these procedures.

**Definition**:

```typescript
// src/server/api/trpc.ts
export const publicProcedure = t.procedure.use(timingMiddleware);
```

**Use Cases**:
- Listing published events
- Viewing event details by slug
- Public registration form
- CFP submission form
- Viewing schedule and speakers

**Example**:

```typescript
export const eventRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ status: z.enum(["published"]) }))
    .query(async ({ ctx }) => {
      // ctx.session may be null or undefined
      return ctx.db.event.findMany({
        where: { status: "published", isArchived: false },
      });
    }),
});
```

---

### Protected Procedure

**Authentication required** - User must be logged in.

**Definition**:

```typescript
// src/server/api/trpc.ts
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // Infers session as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });
```

**Guarantees**:
- `ctx.session` is defined
- `ctx.session.user` is defined
- `ctx.session.user.id` is available

**Use Cases**:
- Creating events
- Managing ticket types
- Viewing registrations
- Sending email campaigns
- User profile management

**Example**:

```typescript
export const eventRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      // ✅ ctx.session.user is guaranteed to exist
      return ctx.db.event.create({
        data: {
          ...input,
          organizerId: ctx.session.user.id, // Safe to access
        },
      });
    }),
});
```

---

## Session Context

The tRPC context includes the user's session from NextAuth.js:

```typescript
// src/server/api/trpc.ts
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth(); // NextAuth.js session

  return {
    db,       // Prisma client
    session,  // { user: { id, name, email, image }, expires }
    ...opts,
  };
};
```

**Session Structure**:

```typescript
interface Session {
  user: {
    id: string;        // User ID (CUID)
    name: string;      // Display name
    email: string;     // Email address
    image?: string;    // Profile picture URL
  };
  expires: string;     // ISO date string
}
```

---

## Organizer Authorization

Many procedures require **organizer authorization** - verifying that the logged-in user owns the event being accessed.

### Pattern 1: Direct Ownership Check

Verify the user owns the event:

```typescript
export const eventRouter = createTRPCRouter({
  update: protectedProcedure
    .input(updateEventSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const event = await ctx.db.event.findUnique({
        where: { id: input.id },
        select: { organizerId: true },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this event",
        });
      }

      // Proceed with update
      return ctx.db.event.update({
        where: { id: input.id },
        data: input,
      });
    }),
});
```

---

### Pattern 2: Ownership via Related Entity

Verify ownership through a related model (e.g., ticket type → event):

```typescript
export const ticketRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createTicketTypeSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify event exists and user is organizer
      const event = await ctx.db.event.findUnique({
        where: { id: input.eventId },
        select: { organizerId: true },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (event.organizerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to create tickets for this event",
        });
      }

      // Proceed with creation
      return ctx.db.ticketType.create({
        data: input,
      });
    }),
});
```

---

### Pattern 3: Reusable Authorization Helper

For complex authorization, create helper functions:

```typescript
// src/server/services/authorization.ts
import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "@prisma/client";

export async function verifyEventOwnership(
  db: PrismaClient,
  eventId: string,
  userId: string
): Promise<void> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true },
  });

  if (!event) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Event not found",
    });
  }

  if (event.organizerId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this event",
    });
  }
}

// Usage in router
export const registrationRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listRegistrationsSchema)
    .query(async ({ ctx, input }) => {
      await verifyEventOwnership(ctx.db, input.eventId, ctx.session.user.id);
      
      // User is authorized, proceed with query
      return ctx.db.registration.findMany({
        where: { ticketType: { eventId: input.eventId } },
      });
    }),
});
```

---

## Authorization Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     Client Request                            │
│         api.event.update.useMutation()                        │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                    API Route Handler                          │
│               /api/trpc/[trpc]/route.ts                       │
│                                                               │
│  1. Extract session from NextAuth cookies                    │
│  2. Create tRPC context with session                         │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│              Protected Procedure Middleware                   │
│                                                               │
│  if (!ctx.session?.user) {                                   │
│    throw new TRPCError({ code: "UNAUTHORIZED" });           │
│  }                                                            │
└────────────────────┬─────────────────────────────────────────┘
                     │ ✅ User authenticated
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                 Procedure Handler                             │
│                                                               │
│  1. Validate input with Zod                                  │
│  2. Check resource ownership (organizerId)                   │
│  3. Execute business logic                                   │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
                  Response
```

---

## Mixed Access Procedures

Some procedures allow **optional authentication** - behavior changes based on login state:

```typescript
export const eventRouter = createTRPCRouter({
  list: publicProcedure
    .input(listEventsSchema)
    .query(async ({ ctx, input }) => {
      // If logged in, show user's own events regardless of status
      if (ctx.session?.user) {
        return ctx.db.event.findMany({
          where: {
            OR: [
              { status: "published", isArchived: false },
              { organizerId: ctx.session.user.id }, // Own drafts
            ],
          },
        });
      }

      // Public users only see published events
      return ctx.db.event.findMany({
        where: { status: "published", isArchived: false },
      });
    }),
});
```

---

## Frontend Authorization

### Client-Side Session Access

```typescript
"use client";
import { useSession } from "next-auth/react";

function MyComponent() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <Spinner />;
  }

  if (status === "unauthenticated") {
    return <SignInButton />;
  }

  // User is authenticated
  return <div>Welcome, {session.user.name}!</div>;
}
```

---

### Conditional UI Rendering

```typescript
"use client";
import { useSession } from "next-auth/react";

function EventCard({ event }: { event: Event }) {
  const { data: session } = useSession();
  
  const isOwner = session?.user?.id === event.organizerId;

  return (
    <div>
      <h2>{event.name}</h2>
      {isOwner && (
        <Button onClick={() => router.push(`/dashboard/${event.id}`)}>
          Manage Event
        </Button>
      )}
    </div>
  );
}
```

---

### Protected Client Components

Redirect unauthenticated users:

```typescript
"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return <Spinner />;
  }

  return <Dashboard />;
}
```

---

## Security Best Practices

### 1. **Never Trust Client Input**

Always validate and authorize on the server:

```typescript
// ❌ BAD: Trusting client to send organizerId
create: protectedProcedure
  .input(z.object({ organizerId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return ctx.db.event.create({
      data: { ...input, organizerId: input.organizerId }, // ❌ Client could fake this
    });
  }),

// ✅ GOOD: Use server-side session
create: protectedProcedure
  .input(createEventSchema)
  .mutation(async ({ ctx, input }) => {
    return ctx.db.event.create({
      data: { ...input, organizerId: ctx.session.user.id }, // ✅ Trusted
    });
  }),
```

---

### 2. **Check Ownership Before Actions**

```typescript
// ❌ BAD: No ownership check
delete: protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return ctx.db.event.delete({ where: { id: input.id } }); // ❌ Any user could delete any event
  }),

// ✅ GOOD: Verify ownership
delete: protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const event = await ctx.db.event.findUnique({
      where: { id: input.id },
      select: { organizerId: true },
    });

    if (!event || event.organizerId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return ctx.db.event.delete({ where: { id: input.id } });
  }),
```

---

### 3. **Use Appropriate Error Codes**

```typescript
// Authentication errors
throw new TRPCError({ code: "UNAUTHORIZED" }); // Not logged in

// Authorization errors
throw new TRPCError({ code: "FORBIDDEN" });    // Logged in but no permission

// Resource not found
throw new TRPCError({ code: "NOT_FOUND" });    // Resource doesn't exist
```

---

### 4. **Limit Data Exposure**

Only return data the user should see:

```typescript
// ❌ BAD: Returning all user data including sensitive fields
getProfile: protectedProcedure
  .query(async ({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
    }); // ❌ Includes password hash
  }),

// ✅ GOOD: Select only safe fields
getProfile: protectedProcedure
  .query(async ({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        // ✅ Password hash excluded
      },
    });
  }),
```

---

## Testing Authorization

### Unit Tests

```typescript
import { appRouter } from "@/server/api/root";
import { createInnerTRPCContext } from "@/server/api/trpc";

describe("Event Authorization", () => {
  it("should prevent non-owners from deleting events", async () => {
    const ctx = createInnerTRPCContext({
      session: { user: { id: "user-1" }, expires: "..." },
    });

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.event.delete({ id: "event-owned-by-user-2" })
    ).rejects.toThrow("FORBIDDEN");
  });
});
```

---

## Related Documentation

- **[Authentication Architecture](../architecture/authentication.md)** - NextAuth.js setup
- **[tRPC Overview](./trpc-overview.md)** - Core concepts
- **[Error Handling](./error-handling.md)** - Error codes
- **[Module Docs](../modules/)** - Feature-specific authorization

---

## Common Issues

### Issue: "UNAUTHORIZED" error on protected procedure

**Cause**: Session cookie not sent or expired

**Solution**:
1. Check if user is logged in: `useSession()`
2. Verify cookie settings in `src/server/auth/config.ts`
3. Check browser console for CORS issues

---

### Issue: "FORBIDDEN" error despite being logged in

**Cause**: User is authenticated but doesn't own the resource

**Solution**:
1. Verify event ownership in database
2. Check if event ID is correct
3. Review authorization logic in procedure

---

## Future Enhancements

- **Role-Based Access Control (RBAC)**: Admin, organizer, speaker roles
- **Team Management**: Multiple organizers per event
- **Permission Scopes**: Fine-grained permissions (e.g., "can edit schedule")
- **API Keys**: Public API access for third-party integrations
