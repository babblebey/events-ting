# Forms Documentation

## Overview

This document covers form patterns, validation, error handling, and best practices for building forms in Events-Ting using Flowbite React, Zod validation, and tRPC mutations.

---

## Form Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Client Component (Form)                     │
│  • React state for form data                            │
│  • Flowbite React form components                       │
│  • Client-side validation (optional)                    │
└────────────────────┬────────────────────────────────────┘
                     │ Submit
                     ▼
┌─────────────────────────────────────────────────────────┐
│             tRPC Mutation Hook                           │
│  • api.event.create.useMutation()                       │
│  • onSuccess, onError callbacks                         │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP POST
                     ▼
┌─────────────────────────────────────────────────────────┐
│              tRPC Procedure                              │
│  • Input validation with Zod schema                     │
│  • Business logic & database operations                 │
└────────────────────┬────────────────────────────────────┘
                     │ Response
                     ▼
                  Success/Error
```

---

## Basic Form Pattern

### 1. Define Zod Schema

**File**: `src/lib/validators.ts`

```typescript
import { z } from "zod";

export const createEventSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters"),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);

export type CreateEventInput = z.infer<typeof createEventSchema>;
```

---

### 2. Create Form Component

**File**: `src/components/events/event-form.tsx`

```tsx
"use client";

import { useState } from "react";
import { Button, Label } from "flowbite-react";
import { FormField, FormSection, FormError } from "@/components/ui/form-field";
import { api } from "@/trpc/react";
import { type CreateEventInput } from "@/lib/validators";
import { useRouter } from "next/navigation";

interface EventFormProps {
  onSuccess?: (eventId: string) => void;
  onCancel?: () => void;
}

export function EventForm({ onSuccess, onCancel }: EventFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<CreateEventInput>>({
    name: "",
    description: "",
    slug: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const createEvent = api.event.create.useMutation({
    onSuccess: (data) => {
      onSuccess?.(data.id);
      router.push(`/dashboard/${data.id}`);
    },
    onError: (error) => {
      // Handle Zod validation errors
      if (error.data?.zodError?.fieldErrors) {
        const errors: Record<string, string> = {};
        Object.entries(error.data.zodError.fieldErrors).forEach(([key, value]) => {
          errors[key] = value[0] ?? "";
        });
        setFieldErrors(errors);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({}); // Clear previous errors
    
    createEvent.mutate(formData as CreateEventInput);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FormSection title="Event Details">
        <FormField
          label="Event Name"
          name="name"
          type="text"
          placeholder="Tech Conference 2025"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={fieldErrors.name}
        />

        <FormField
          label="Slug"
          name="slug"
          type="text"
          placeholder="tech-conference-2025"
          required
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          error={fieldErrors.slug}
          helpText="Used in URL (lowercase letters, numbers, hyphens only)"
        />

        <FormField
          label="Description"
          name="description"
          type="textarea"
          rows={4}
          placeholder="Enter event description"
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          error={fieldErrors.description}
        />
      </FormSection>

      <div className="flex items-center justify-end gap-3 border-t pt-6">
        {onCancel && (
          <Button color="gray" onClick={onCancel} type="button">
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={createEvent.isPending}
          color="blue"
        >
          {createEvent.isPending ? "Creating..." : "Create Event"}
        </Button>
      </div>
    </form>
  );
}
```

---

## Form Components

### FormField (Custom Wrapper)

**File**: `src/components/ui/form-field.tsx`

```tsx
import { Label, TextInput, Textarea } from "flowbite-react";

interface FormFieldProps {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "number" | "url" | "textarea";
  placeholder?: string;
  required?: boolean;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  helpText?: string;
  rows?: number;
}

export function FormField({
  label,
  name,
  type = "text",
  placeholder,
  required,
  value,
  onChange,
  error,
  helpText,
  rows = 4,
}: FormFieldProps) {
  const isTextarea = type === "textarea";

  return (
    <div>
      <div className="mb-2 block">
        <Label htmlFor={name} value={label} />
        {required && <span className="text-red-600 ml-1">*</span>}
      </div>
      {isTextarea ? (
        <Textarea
          id={name}
          name={name}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          rows={rows}
          color={error ? "failure" : undefined}
        />
      ) : (
        <TextInput
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          color={error ? "failure" : undefined}
        />
      )}
      {helpText && !error && (
        <p className="mt-2 text-sm text-gray-500">{helpText}</p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
```

---

### FormSection (Grouping)

```tsx
interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <div className="border-b pb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 mb-4">{description}</p>
      )}
      <div className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}
```

---

## Validation Patterns

### Client-Side Validation (Optional)

Add immediate feedback before submission:

```tsx
const [errors, setErrors] = useState<Record<string, string>>({});

const validateField = (name: string, value: string) => {
  switch (name) {
    case "email":
      if (!value.includes("@")) {
        setErrors((prev) => ({ ...prev, email: "Invalid email address" }));
      } else {
        setErrors((prev) => ({ ...prev, email: "" }));
      }
      break;
    case "name":
      if (value.length < 3) {
        setErrors((prev) => ({ ...prev, name: "Name must be at least 3 characters" }));
      } else {
        setErrors((prev) => ({ ...prev, name: "" }));
      }
      break;
  }
};

<TextInput
  name="email"
  value={email}
  onChange={(e) => {
    setEmail(e.target.value);
    validateField("email", e.target.value);
  }}
  color={errors.email ? "failure" : undefined}
/>
```

---

### Server-Side Validation (Required)

Always validate on the server using Zod schemas in tRPC procedures:

```typescript
// src/server/api/routers/event.ts
export const eventRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createEventSchema) // ✅ Zod schema validation
    .mutation(async ({ ctx, input }) => {
      // Input is validated and type-safe here
      return ctx.db.event.create({
        data: { ...input, organizerId: ctx.session.user.id },
      });
    }),
});
```

---

### Complex Validation Rules

Use Zod's `.refine()` for custom validation:

```typescript
export const createScheduleEntrySchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
}).refine(
  (data) => {
    const [startHour, startMin] = data.startTime.split(":").map(Number);
    const [endHour, endMin] = data.endTime.split(":").map(Number);
    const startMinutes = (startHour ?? 0) * 60 + (startMin ?? 0);
    const endMinutes = (endHour ?? 0) * 60 + (endMin ?? 0);
    return endMinutes > startMinutes;
  },
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
);
```

---

## Error Handling

### Displaying Validation Errors

```tsx
const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

const createEvent = api.event.create.useMutation({
  onError: (error) => {
    if (error.data?.zodError?.fieldErrors) {
      setFieldErrors(error.data.zodError.fieldErrors);
    }
  },
});

// Display errors under each field
<FormField
  label="Event Name"
  name="name"
  error={fieldErrors.name?.[0]}
  {...props}
/>
```

---

### Global Error Messages

```tsx
const [globalError, setGlobalError] = useState<string | null>(null);

const createEvent = api.event.create.useMutation({
  onError: (error) => {
    if (error.data?.zodError) {
      // Handle field errors
      setFieldErrors(error.data.zodError.fieldErrors);
    } else {
      // Generic error
      setGlobalError(error.message);
    }
  },
  onSuccess: () => {
    setGlobalError(null);
  },
});

{globalError && (
  <Alert color="failure" className="mb-4">
    <strong>Error:</strong> {globalError}
  </Alert>
)}
```

---

## Form State Management

### Loading State

```tsx
const createEvent = api.event.create.useMutation();

<Button type="submit" disabled={createEvent.isPending}>
  {createEvent.isPending ? (
    <>
      <Spinner size="sm" className="mr-2" />
      Creating...
    </>
  ) : (
    "Create Event"
  )}
</Button>
```

---

### Success State

```tsx
const [showSuccess, setShowSuccess] = useState(false);

const createEvent = api.event.create.useMutation({
  onSuccess: () => {
    setShowSuccess(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
  },
});

{showSuccess && (
  <Alert color="success" className="mb-4">
    <HiCheckCircle className="h-5 w-5 mr-2" />
    Event created successfully! Redirecting...
  </Alert>
)}
```

---

## Advanced Form Patterns

### Multi-Step Forms

```tsx
const [step, setStep] = useState(1);

return (
  <form onSubmit={handleSubmit}>
    {step === 1 && (
      <div>
        <h2>Step 1: Basic Info</h2>
        <FormField label="Name" name="name" {...props} />
        <Button onClick={() => setStep(2)}>Next</Button>
      </div>
    )}

    {step === 2 && (
      <div>
        <h2>Step 2: Details</h2>
        <FormField label="Description" name="description" {...props} />
        <Button onClick={() => setStep(1)}>Back</Button>
        <Button type="submit">Create</Button>
      </div>
    )}
  </form>
);
```

---

### Dynamic Fields

```tsx
const [ticketTypes, setTicketTypes] = useState([{ name: "", price: 0 }]);

const addTicketType = () => {
  setTicketTypes([...ticketTypes, { name: "", price: 0 }]);
};

const removeTicketType = (index: number) => {
  setTicketTypes(ticketTypes.filter((_, i) => i !== index));
};

return (
  <div>
    {ticketTypes.map((ticket, index) => (
      <div key={index} className="flex items-end gap-2">
        <FormField
          label="Ticket Name"
          name={`ticket-name-${index}`}
          value={ticket.name}
          onChange={(e) => {
            const newTickets = [...ticketTypes];
            newTickets[index]!.name = e.target.value;
            setTicketTypes(newTickets);
          }}
        />
        <Button color="failure" onClick={() => removeTicketType(index)}>
          Remove
        </Button>
      </div>
    ))}
    <Button onClick={addTicketType}>Add Ticket Type</Button>
  </div>
);
```

---

### File Uploads

```tsx
const [selectedFile, setSelectedFile] = useState<File | null>(null);

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setSelectedFile(file);
  }
};

const uploadFile = async () => {
  if (!selectedFile) return;

  const formData = new FormData();
  formData.append("file", selectedFile);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  return data.url;
};

<input
  type="file"
  onChange={handleFileChange}
  accept="image/*"
  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer"
/>
```

---

## Accessibility

### Form Labels

Always associate labels with inputs:

```tsx
// ✅ GOOD
<Label htmlFor="email">Email</Label>
<TextInput id="email" name="email" />

// ❌ BAD (no association)
<Label>Email</Label>
<TextInput name="email" />
```

---

### Required Fields

Indicate required fields clearly:

```tsx
<Label htmlFor="name">
  Event Name <span className="text-red-600">*</span>
</Label>
<TextInput id="name" name="name" required />
```

---

### Error Announcements

Use ARIA attributes for screen readers:

```tsx
<TextInput
  id="email"
  name="email"
  aria-invalid={!!error}
  aria-describedby={error ? "email-error" : undefined}
/>
{error && (
  <p id="email-error" className="text-sm text-red-600" role="alert">
    {error}
  </p>
)}
```

---

## Best Practices

### 1. **Always Validate on the Server**

```typescript
// ✅ GOOD: Server-side validation with Zod
.input(createEventSchema)

// ❌ BAD: Trusting client input
.input(z.any())
```

---

### 2. **Provide Clear Error Messages**

```typescript
// ✅ GOOD
z.string().min(3, "Name must be at least 3 characters")

// ❌ BAD
z.string().min(3)
```

---

### 3. **Disable Submit Button During Submission**

```tsx
// ✅ GOOD
<Button type="submit" disabled={createEvent.isPending}>
  Submit
</Button>

// ❌ BAD (allows double-submit)
<Button type="submit">Submit</Button>
```

---

### 4. **Clear Errors on Retry**

```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  setFieldErrors({}); // ✅ Clear previous errors
  createEvent.mutate(formData);
};
```

---

### 5. **Use TypeScript for Type Safety**

```typescript
import { type CreateEventInput } from "@/lib/validators";

const [formData, setFormData] = useState<CreateEventInput>({
  name: "",
  slug: "",
  description: "",
  // TypeScript ensures all required fields are present
});
```

---

## Example: Complete Registration Form

**File**: `src/components/registration/registration-form.tsx`

```tsx
"use client";

import { useState } from "react";
import { Button } from "flowbite-react";
import { FormField, FormError } from "@/components/ui/form-field";
import { api } from "@/trpc/react";
import { type CreateRegistrationInput } from "@/lib/validators";

export function RegistrationForm({ ticketTypeId }: { ticketTypeId: string }) {
  const [formData, setFormData] = useState<Partial<CreateRegistrationInput>>({
    ticketTypeId,
    name: "",
    email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createRegistration = api.registration.create.useMutation({
    onSuccess: () => {
      alert("Registration successful! Check your email for confirmation.");
    },
    onError: (error) => {
      if (error.data?.zodError?.fieldErrors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(error.data.zodError.fieldErrors).forEach(([key, value]) => {
          fieldErrors[key] = value[0] ?? "";
        });
        setErrors(fieldErrors);
      } else {
        alert(error.message);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    createRegistration.mutate(formData as CreateRegistrationInput);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField
        label="Full Name"
        name="name"
        type="text"
        placeholder="John Doe"
        required
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
      />

      <FormField
        label="Email Address"
        name="email"
        type="email"
        placeholder="john@example.com"
        required
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        error={errors.email}
      />

      <Button type="submit" disabled={createRegistration.isPending}>
        {createRegistration.isPending ? "Registering..." : "Complete Registration"}
      </Button>
    </form>
  );
}
```

---

## Related Documentation

- **[UI System](./ui-system.md)** - Design system overview
- **[Validation Schemas](../../src/lib/validators.ts)** - Zod schemas
- **[tRPC Mutations](../api/trpc-overview.md)** - API integration
- **[Error Handling](../api/error-handling.md)** - Error patterns

---

## Resources

- **Flowbite Forms**: https://flowbite-react.com/docs/components/forms
- **Zod Documentation**: https://zod.dev
- **React Hook Form** (alternative): https://react-hook-form.com
- **Form Accessibility**: https://www.w3.org/WAI/tutorials/forms/
