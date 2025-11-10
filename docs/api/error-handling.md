# API Error Handling

## Overview

This document covers error handling patterns in the tRPC API layer, including TRPCError codes, validation errors, and frontend error handling strategies.

---

## TRPCError Codes

tRPC provides standard error codes based on HTTP status codes and gRPC conventions.

### Common Error Codes

| Code | HTTP Status | Meaning | Use Case |
|------|-------------|---------|----------|
| **BAD_REQUEST** | 400 | Invalid input | Malformed request, invalid IDs |
| **UNAUTHORIZED** | 401 | Not authenticated | User not logged in |
| **FORBIDDEN** | 403 | Not authorized | Logged in but no permission |
| **NOT_FOUND** | 404 | Resource not found | Event/ticket/registration doesn't exist |
| **TIMEOUT** | 408 | Request timeout | Long-running operation exceeded limit |
| **CONFLICT** | 409 | Resource conflict | Duplicate slug, overlapping schedule |
| **PRECONDITION_FAILED** | 412 | Condition not met | Optimistic locking failed |
| **PAYLOAD_TOO_LARGE** | 413 | Request too large | File upload exceeds limit |
| **UNPROCESSABLE_CONTENT** | 422 | Validation failed | Zod schema validation error |
| **TOO_MANY_REQUESTS** | 429 | Rate limit exceeded | API rate limiting |
| **CLIENT_CLOSED_REQUEST** | 499 | Client cancelled | User navigated away |
| **INTERNAL_SERVER_ERROR** | 500 | Server error | Unexpected error |

---

## Throwing Errors in Procedures

### Basic Error

```typescript
import { TRPCError } from "@trpc/server";

export const eventRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({
        where: { id: input.id },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      return event;
    }),
});
```

---

### Error with Cause

Include original error for debugging:

```typescript
export const registrationRouter = createTRPCRouter({
  create: publicProcedure
    .input(createRegistrationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const registration = await ctx.db.registration.create({
          data: input,
        });

        // Send email
        await sendEmail({ ... });

        return registration;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create registration",
          cause: error, // Original error attached
        });
      }
    }),
});
```

---

### Authorization Errors

```typescript
// Not logged in
if (!ctx.session?.user) {
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "You must be logged in to perform this action",
  });
}

// Logged in but no permission
if (event.organizerId !== ctx.session.user.id) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You do not have permission to modify this event",
  });
}
```

---

### Conflict Errors

```typescript
export const eventRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if slug already exists
      const existing = await ctx.db.event.findUnique({
        where: { slug: input.slug },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An event with this slug already exists. Please choose a different slug.",
        });
      }

      return ctx.db.event.create({
        data: { ...input, organizerId: ctx.session.user.id },
      });
    }),
});
```

---

## Validation Errors (Zod)

### Automatic Validation

Zod schemas in `.input()` automatically throw validation errors:

```typescript
export const eventRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createEventSchema) // Zod schema
    .mutation(async ({ ctx, input }) => {
      // If input is invalid, tRPC throws TRPCError automatically
      // Code: "UNPROCESSABLE_CONTENT" (422)
      // Data includes Zod error details
      return ctx.db.event.create({ data: input });
    }),
});
```

**Example Validation Error Response**:

```json
{
  "error": {
    "message": "Validation failed",
    "code": "UNPROCESSABLE_CONTENT",
    "data": {
      "zodError": {
        "fieldErrors": {
          "name": ["Name must be at least 3 characters"],
          "endDate": ["End date must be after start date"]
        },
        "formErrors": []
      }
    }
  }
}
```

---

### Custom Validation Errors

Throw custom validation errors in procedure logic:

```typescript
export const scheduleRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createScheduleEntrySchema)
    .mutation(async ({ ctx, input }) => {
      // Check for time overlap
      const overlaps = await checkOverlap(ctx.db, input);

      if (overlaps.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This schedule entry overlaps with existing entries",
          cause: { conflictingEntries: overlaps },
        });
      }

      return ctx.db.scheduleEntry.create({ data: input });
    }),
});
```

---

## Error Formatting

tRPC error formatter in `src/server/api/trpc.ts` structures Zod errors:

```typescript
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten() // Flatten Zod errors for frontend
            : null,
      },
    };
  },
});
```

**Error Shape**:

```typescript
interface TRPCErrorShape {
  message: string;
  code: string;
  data: {
    code: string;
    httpStatus: number;
    path?: string;
    zodError?: {
      fieldErrors: Record<string, string[]>;
      formErrors: string[];
    };
  };
}
```

---

## Frontend Error Handling

### Basic Error Display

```typescript
"use client";
import { api } from "@/trpc/react";

function EventPage({ eventId }: { eventId: string }) {
  const { data, error, isLoading } = api.event.getById.useQuery({ id: eventId });

  if (isLoading) return <Spinner />;

  if (error) {
    return (
      <Alert color="failure">
        <strong>Error:</strong> {error.message}
      </Alert>
    );
  }

  return <EventDetails event={data} />;
}
```

---

### Handling Specific Error Codes

```typescript
"use client";
import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";

function EventPage({ eventId }: { eventId: string }) {
  const { data, error } = api.event.getById.useQuery({ id: eventId });

  if (error) {
    // Check error code
    if (error.data?.code === "NOT_FOUND") {
      return <NotFoundPage message="Event not found" />;
    }

    if (error.data?.code === "UNAUTHORIZED") {
      return <SignInPrompt />;
    }

    if (error.data?.code === "FORBIDDEN") {
      return <ForbiddenPage message="You don't have access to this event" />;
    }

    // Generic error
    return <ErrorPage message={error.message} />;
  }

  return <EventDetails event={data!} />;
}
```

---

### Mutation Error Handling

```typescript
"use client";
import { api } from "@/trpc/react";
import { useState } from "react";

function CreateEventForm() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createEvent = api.event.create.useMutation({
    onSuccess: (data) => {
      router.push(`/dashboard/${data.id}`);
    },
    onError: (error) => {
      // Handle different error types
      if (error.data?.code === "CONFLICT") {
        setErrorMessage("This event slug is already taken. Please choose another.");
      } else if (error.data?.zodError) {
        // Zod validation errors
        const fieldErrors = error.data.zodError.fieldErrors;
        setErrorMessage(Object.values(fieldErrors).flat().join(", "));
      } else {
        setErrorMessage(error.message);
      }
    },
  });

  return (
    <form onSubmit={handleSubmit}>
      {errorMessage && (
        <Alert color="failure">{errorMessage}</Alert>
      )}
      {/* Form fields */}
    </form>
  );
}
```

---

### Displaying Zod Validation Errors

```typescript
"use client";
import { api } from "@/trpc/react";
import { useState } from "react";

function EventForm() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const createEvent = api.event.create.useMutation({
    onError: (error) => {
      if (error.data?.zodError?.fieldErrors) {
        setFieldErrors(error.data.zodError.fieldErrors);
      }
    },
    onSuccess: () => {
      setFieldErrors({}); // Clear errors on success
    },
  });

  return (
    <form>
      <div>
        <Label htmlFor="name">Event Name</Label>
        <TextInput
          id="name"
          name="name"
          color={fieldErrors.name ? "failure" : undefined}
        />
        {fieldErrors.name && (
          <p className="text-sm text-red-600">{fieldErrors.name[0]}</p>
        )}
      </div>

      <div>
        <Label htmlFor="slug">Slug</Label>
        <TextInput
          id="slug"
          name="slug"
          color={fieldErrors.slug ? "failure" : undefined}
        />
        {fieldErrors.slug && (
          <p className="text-sm text-red-600">{fieldErrors.slug[0]}</p>
        )}
      </div>

      <Button type="submit">Create Event</Button>
    </form>
  );
}
```

---

### Toast Notifications for Errors

```typescript
"use client";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";

function DeleteEventButton({ eventId }: { eventId: string }) {
  const { showToast } = useToast();

  const deleteEvent = api.event.delete.useMutation({
    onSuccess: () => {
      showToast("Event deleted successfully", "success");
      router.push("/dashboard");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <Button
      color="failure"
      onClick={() => deleteEvent.mutate({ id: eventId })}
    >
      Delete Event
    </Button>
  );
}
```

---

### Error Boundaries (React)

Catch unexpected errors in React components:

```typescript
"use client";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
          <p className="text-gray-700">{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

---

## Retry Logic

### Automatic Retries with React Query

```typescript
const { data, error } = api.event.list.useQuery(
  { status: "published" },
  {
    retry: 3, // Retry failed queries 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  }
);
```

---

### Manual Retry

```typescript
const { data, error, refetch } = api.event.getById.useQuery({ id: eventId });

return (
  <div>
    {error && (
      <Alert color="failure">
        <p>{error.message}</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </Alert>
    )}
  </div>
);
```

---

## Server-Side Error Logging

### Development Logging

Configured in `src/app/api/trpc/[trpc]/route.ts`:

```typescript
const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
            );
          }
        : undefined,
  });
```

---

### Production Error Tracking

Integrate error tracking service (Sentry, LogRocket, etc.):

```typescript
import * as Sentry from "@sentry/nextjs";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    // ...
    onError: ({ path, error }) => {
      // Log to Sentry in production
      Sentry.captureException(error, {
        tags: {
          trpcPath: path,
          trpcCode: error.code,
        },
      });

      // Development console logging
      if (env.NODE_ENV === "development") {
        console.error(`❌ tRPC failed on ${path}: ${error.message}`);
      }
    },
  });
```

---

## Common Error Patterns

### Pattern 1: Not Found with Helpful Message

```typescript
const event = await ctx.db.event.findUnique({
  where: { slug: input.slug },
});

if (!event) {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: `Event with slug "${input.slug}" not found. It may have been deleted or the URL is incorrect.`,
  });
}
```

---

### Pattern 2: Pre-condition Checks

```typescript
// Check ticket availability before registration
if (ticketType.soldCount >= ticketType.quantity) {
  throw new TRPCError({
    code: "CONFLICT",
    message: "This ticket type is sold out",
  });
}

// Check sale period
const now = new Date();
if (ticketType.saleStart && now < ticketType.saleStart) {
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "Ticket sales have not started yet",
  });
}
```

---

### Pattern 3: Transaction Rollback

```typescript
try {
  const result = await ctx.db.$transaction(async (tx) => {
    const ticket = await tx.ticketType.update({
      where: { id: input.ticketTypeId },
      data: { soldCount: { increment: 1 } },
    });

    const registration = await tx.registration.create({
      data: input,
    });

    return registration;
  });

  return result;
} catch (error) {
  // Transaction automatically rolled back on error
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to complete registration. Please try again.",
    cause: error,
  });
}
```

---

## Best Practices

### 1. **Use Appropriate Error Codes**

```typescript
// ✅ GOOD: Specific error code
throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });

// ❌ BAD: Generic error code
throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Event not found" });
```

---

### 2. **Provide Actionable Error Messages**

```typescript
// ✅ GOOD: Tells user what to do
throw new TRPCError({
  code: "CONFLICT",
  message: "An event with this slug already exists. Please choose a different slug.",
});

// ❌ BAD: Vague error
throw new TRPCError({
  code: "CONFLICT",
  message: "Conflict",
});
```

---

### 3. **Don't Leak Sensitive Information**

```typescript
// ❌ BAD: Exposes internal details
throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: `Database error: ${dbError.message}`, // Exposes DB structure
});

// ✅ GOOD: Generic message, log details server-side
console.error("Database error:", dbError);
throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: "An unexpected error occurred. Please try again later.",
});
```

---

### 4. **Handle Async Errors**

```typescript
// ✅ GOOD: Try-catch for async operations
try {
  await sendEmail({ to: input.email, subject: "..." });
} catch (error) {
  console.error("Email send failed:", error);
  // Don't fail the entire operation, just log
  // Or throw TRPCError if critical
}
```

---

## Testing Error Handling

### Unit Tests

```typescript
import { appRouter } from "@/server/api/root";
import { createInnerTRPCContext } from "@/server/api/trpc";

describe("Event Errors", () => {
  it("should throw NOT_FOUND for missing event", async () => {
    const ctx = createInnerTRPCContext({ session: null });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.event.getById({ id: "nonexistent-id" })
    ).rejects.toThrow("NOT_FOUND");
  });

  it("should throw CONFLICT for duplicate slug", async () => {
    const ctx = createInnerTRPCContext({
      session: { user: { id: "user-1" }, expires: "..." },
    });
    const caller = appRouter.createCaller(ctx);

    await caller.event.create({ slug: "tech-conf", ... });

    await expect(
      caller.event.create({ slug: "tech-conf", ... })
    ).rejects.toThrow("CONFLICT");
  });
});
```

---

## Related Documentation

- **[tRPC Overview](./trpc-overview.md)** - Core concepts
- **[Authentication](./authentication.md)** - Auth errors
- **[API Routers](./routers.md)** - All procedures
- **[Zod Validation](https://zod.dev)** - Schema validation

---

## Resources

- **tRPC Error Handling**: https://trpc.io/docs/server/error-handling
- **HTTP Status Codes**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
- **React Query Error Handling**: https://tanstack.com/query/latest/docs/framework/react/guides/query-functions#handling-and-throwing-errors
