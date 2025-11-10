# UI System

## Overview

Events-Ting uses a **utility-first CSS approach** with **Tailwind CSS** and **Flowbite React** components for a consistent, accessible, and customizable design system.

**UI Framework**: Flowbite React 0.12.10  
**CSS Framework**: Tailwind CSS 4.0.15  
**Icon Library**: React Icons 5.5.0 + Lucide React 0.553.0  
**Font**: Geist Sans (Next.js font optimization)

---

## Design Philosophy

### 1. **Utility-First Styling**

Tailwind CSS provides low-level utility classes for rapid UI development:

```tsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
  <h2 className="text-2xl font-bold text-gray-900">Event Title</h2>
  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
    Register
  </button>
</div>
```

**Benefits**:
- No CSS files to manage
- Prevents style conflicts
- Tree-shaking removes unused styles
- Responsive by default

---

### 2. **Component-Based UI**

Flowbite React provides pre-built, accessible components:

```tsx
import { Button, Card, Badge } from "flowbite-react";

<Card>
  <h5 className="text-2xl font-bold tracking-tight text-gray-900">
    Tech Conference 2025
  </h5>
  <Badge color="success">Published</Badge>
  <Button color="blue">View Details</Button>
</Card>
```

**Benefits**:
- WCAG AA accessibility
- TypeScript support
- Consistent design language
- Customizable via Tailwind classes

---

## Tailwind CSS Configuration

### Installation

```json
// package.json
{
  "dependencies": {
    "tailwindcss": "^4.0.15",
    "@tailwindcss/typography": "^0.5.19",
    "@tailwindcss/postcss": "^4.0.15"
  }
}
```

### Global Styles

**File**: `src/styles/globals.css`

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@plugin "flowbite-react/plugin/tailwindcss";
@source "../../.flowbite-react/class-list.json";

@theme {
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif,
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
}
```

---

### Color Palette

Tailwind's default color palette is used throughout the application:

| Color | Usage |
|-------|-------|
| **Gray** | Neutral backgrounds, text, borders |
| **Blue** | Primary actions, links |
| **Green** | Success states, published events |
| **Yellow** | Warning states, draft events |
| **Red** | Error states, destructive actions |
| **Purple** | Accent colors, special features |

**Example**:

```tsx
// Text colors
<p className="text-gray-700">Regular text</p>
<p className="text-blue-600">Link text</p>
<p className="text-green-600">Success message</p>
<p className="text-red-600">Error message</p>

// Background colors
<div className="bg-white">White background</div>
<div className="bg-gray-50">Light gray background</div>
<div className="bg-blue-50">Light blue background</div>
```

---

### Responsive Design

Tailwind uses mobile-first breakpoints:

```tsx
<div className="p-4 sm:p-6 md:p-8 lg:p-10">
  {/* Padding increases on larger screens */}
</div>

<div className="flex flex-col md:flex-row">
  {/* Stacked on mobile, side-by-side on desktop */}
</div>

<div className="w-full md:w-1/2 lg:w-1/3">
  {/* Full width on mobile, 50% on tablet, 33% on desktop */}
</div>
```

**Breakpoints**:
- `sm`: 640px (small tablets)
- `md`: 768px (tablets)
- `lg`: 1024px (laptops)
- `xl`: 1280px (desktops)
- `2xl`: 1536px (large desktops)

---

### Dark Mode Support

Tailwind includes dark mode utilities (not yet implemented in Events-Ting):

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  {/* Automatically switches based on system preference */}
</div>
```

---

## Flowbite React Components

### Core Components Used

#### 1. **Buttons**

```tsx
import { Button } from "flowbite-react";

// Primary action
<Button color="blue" size="md">
  Create Event
</Button>

// Secondary action
<Button color="gray" size="sm">
  Cancel
</Button>

// Destructive action
<Button color="failure" size="md">
  Delete Event
</Button>

// Loading state
<Button color="blue" disabled>
  <Spinner size="sm" className="mr-2" />
  Creating...
</Button>
```

**Props**:
- `color`: `blue`, `gray`, `green`, `red`, `yellow`, `purple`, `failure`, `success`, `warning`
- `size`: `xs`, `sm`, `md`, `lg`, `xl`
- `pill`: Rounded pill shape
- `disabled`: Disabled state
- `type`: `button`, `submit`, `reset`

---

#### 2. **Cards**

```tsx
import { Card } from "flowbite-react";

<Card className="max-w-sm">
  <h5 className="text-2xl font-bold tracking-tight text-gray-900">
    Event Title
  </h5>
  <p className="font-normal text-gray-700">
    Event description goes here.
  </p>
</Card>
```

**Use Cases**:
- Event cards
- Ticket type cards
- Speaker profiles
- Dashboard metrics

---

#### 3. **Badges**

```tsx
import { Badge } from "flowbite-react";

<Badge color="success">Published</Badge>
<Badge color="warning">Draft</Badge>
<Badge color="gray">Archived</Badge>
<Badge color="info">Free</Badge>
```

**Props**:
- `color`: `info`, `success`, `warning`, `failure`, `gray`, `indigo`, `purple`, `pink`
- `size`: `xs`, `sm`

---

#### 4. **Forms**

```tsx
import { Label, TextInput, Textarea, Select, Checkbox } from "flowbite-react";

<div>
  <Label htmlFor="email">Email</Label>
  <TextInput
    id="email"
    type="email"
    placeholder="name@example.com"
    required
  />
</div>

<div>
  <Label htmlFor="description">Description</Label>
  <Textarea
    id="description"
    placeholder="Enter event description"
    rows={4}
  />
</div>

<div>
  <Label htmlFor="category">Category</Label>
  <Select id="category">
    <option>Conference</option>
    <option>Workshop</option>
    <option>Meetup</option>
  </Select>
</div>

<Checkbox id="agree" />
<Label htmlFor="agree">I agree to the terms</Label>
```

**Validation States**:

```tsx
<TextInput
  color="failure" // Red border
  helperText="This field is required"
/>

<TextInput
  color="success" // Green border
/>
```

---

#### 5. **Tables**

```tsx
import { Table } from "flowbite-react";

<Table>
  <Table.Head>
    <Table.HeadCell>Name</Table.HeadCell>
    <Table.HeadCell>Email</Table.HeadCell>
    <Table.HeadCell>Actions</Table.HeadCell>
  </Table.Head>
  <Table.Body>
    <Table.Row>
      <Table.Cell>John Doe</Table.Cell>
      <Table.Cell>john@example.com</Table.Cell>
      <Table.Cell>
        <Button size="xs">Edit</Button>
      </Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```

**Features**:
- Striped rows
- Hoverable rows
- Custom cell styling

---

#### 6. **Modals**

```tsx
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "flowbite-react";
import { useState } from "react";

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>

      <Modal show={isOpen} onClose={() => setIsOpen(false)}>
        <ModalHeader>Confirm Action</ModalHeader>
        <ModalBody>
          <p>Are you sure you want to proceed?</p>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setIsOpen(false)}>Confirm</Button>
          <Button color="gray" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
```

---

#### 7. **Alerts**

```tsx
import { Alert } from "flowbite-react";
import { HiInformationCircle } from "react-icons/hi";

<Alert color="info" icon={HiInformationCircle}>
  This is an informational message.
</Alert>

<Alert color="failure">
  <strong>Error!</strong> Something went wrong.
</Alert>

<Alert color="success">
  <strong>Success!</strong> Your changes have been saved.
</Alert>
```

---

#### 8. **Spinners**

```tsx
import { Spinner } from "flowbite-react";

<Spinner size="md" />
<Spinner size="lg" color="blue" />

// With text
<div className="flex items-center gap-2">
  <Spinner size="sm" />
  <span>Loading...</span>
</div>
```

---

#### 9. **Toasts**

Custom toast system using Flowbite Toast component:

```tsx
import { Toast } from "flowbite-react";
import { HiCheckCircle, HiXCircle } from "react-icons/hi";

<Toast>
  <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-500">
    <HiCheckCircle className="h-5 w-5" />
  </div>
  <div className="ml-3 text-sm font-normal">
    Item moved successfully.
  </div>
  <Toast.Toggle />
</Toast>
```

**Toast Provider** (`src/components/ui/toast-provider.tsx`):

```tsx
import { useToast } from "@/hooks/use-toast";

const { showToast } = useToast();

showToast("Operation successful", "success");
showToast("An error occurred", "error");
showToast("Please review this", "warning");
showToast("New message received", "info");
```

---

## Custom Theme

**File**: `src/components/providers/theme-provider.tsx`

```tsx
import { createTheme, ThemeProvider as FlowbiteThemeProvider } from "flowbite-react";

const customTheme = createTheme({
  badge: {
    root: {
      base: "w-fit" // Badges fit content width
    }
  },
  // Add more customizations here
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <FlowbiteThemeProvider theme={customTheme}>
      {children}
    </FlowbiteThemeProvider>
  );
}
```

---

## Icon Libraries

### React Icons

**Installation**: `react-icons` (5.5.0)

**Usage**:

```tsx
import { HiPlus, HiTrash, HiPencil } from "react-icons/hi";
import { FaEnvelope, FaGithub, FaTwitter } from "react-icons/fa";

<HiPlus className="h-5 w-5" />
<FaEnvelope className="h-4 w-4 text-blue-600" />
```

**Common Icons**:
- `HiPlus` - Add action
- `HiTrash` - Delete action
- `HiPencil` - Edit action
- `HiCheckCircle` - Success indicator
- `HiXCircle` - Error indicator
- `HiClock` - Time indicator
- `HiMail` - Email

---

### Lucide React

**Installation**: `lucide-react` (0.553.0)

**Usage**:

```tsx
import { Calendar, Users, MapPin } from "lucide-react";

<Calendar className="h-5 w-5" />
<Users className="h-5 w-5 text-gray-600" />
```

---

## Typography

### Font Family

**Primary Font**: Geist Sans (optimized by Next.js)

```tsx
// src/app/layout.tsx
import { Geist } from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
```

Applied globally in `globals.css`:

```css
@theme {
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
}
```

---

### Text Styles

```tsx
// Headings
<h1 className="text-4xl font-bold text-gray-900">Main Heading</h1>
<h2 className="text-3xl font-semibold text-gray-800">Section Heading</h2>
<h3 className="text-2xl font-medium text-gray-700">Subsection Heading</h3>

// Body text
<p className="text-base text-gray-700">Regular paragraph text</p>
<p className="text-sm text-gray-600">Smaller text</p>
<p className="text-xs text-gray-500">Caption text</p>

// Links
<a href="#" className="text-blue-600 hover:text-blue-700 underline">
  Link text
</a>
```

---

### Text Utilities

```tsx
// Font weight
<span className="font-light">Light</span>
<span className="font-normal">Normal</span>
<span className="font-medium">Medium</span>
<span className="font-semibold">Semibold</span>
<span className="font-bold">Bold</span>

// Text alignment
<p className="text-left">Left aligned</p>
<p className="text-center">Center aligned</p>
<p className="text-right">Right aligned</p>

// Text transform
<p className="uppercase">UPPERCASE</p>
<p className="lowercase">lowercase</p>
<p className="capitalize">Capitalized</p>

// Line clamping
<p className="line-clamp-2">
  This text will be truncated after 2 lines...
</p>
```

---

## Spacing System

Tailwind uses a consistent spacing scale (0.25rem = 4px per unit):

```tsx
// Padding
<div className="p-4">Padding 16px</div>
<div className="px-6 py-3">Horizontal 24px, Vertical 12px</div>

// Margin
<div className="m-4">Margin 16px</div>
<div className="mt-8 mb-4">Top 32px, Bottom 16px</div>

// Gap (for flex/grid)
<div className="flex gap-4">Items with 16px gap</div>
<div className="grid grid-cols-3 gap-6">Grid with 24px gap</div>
```

**Common Spacing Values**:
- `0`: 0px
- `1`: 4px
- `2`: 8px
- `3`: 12px
- `4`: 16px
- `6`: 24px
- `8`: 32px
- `12`: 48px
- `16`: 64px

---

## Layout Patterns

### Container

```tsx
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  {/* Centered content with responsive padding */}
</div>
```

---

### Flexbox

```tsx
// Horizontal layout
<div className="flex items-center justify-between">
  <span>Left content</span>
  <span>Right content</span>
</div>

// Vertical stack
<div className="flex flex-col gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Centered content
<div className="flex items-center justify-center min-h-screen">
  <div>Centered content</div>
</div>
```

---

### Grid

```tsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
</div>

// Auto-fit grid
<div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
  {/* Cards automatically wrap based on available space */}
</div>
```

---

## Utility Components

### Custom UI Components

**Location**: `src/components/ui/`

#### FormField

Wrapper for form inputs with labels and error messages:

```tsx
import { FormField } from "@/components/ui/form-field";

<FormField
  label="Event Name"
  name="name"
  type="text"
  placeholder="Enter event name"
  required
  error={errors.name}
  helpText="Choose a descriptive name"
/>
```

#### EmptyState

Placeholder for empty lists:

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { HiPlus } from "react-icons/hi";

<EmptyState
  title="No events found"
  description="Get started by creating your first event"
  icon={HiPlus}
  actionLabel="Create Event"
  onAction={() => router.push("/dashboard/create")}
/>
```

#### Skeletons

Loading placeholders:

```tsx
import { TableSkeleton, CardListSkeleton } from "@/components/ui/skeletons";

{isLoading ? (
  <TableSkeleton rows={5} />
) : (
  <DataTable data={data} />
)}
```

---

## Best Practices

### 1. **Use Semantic HTML**

```tsx
// ✅ GOOD
<button className="px-4 py-2 bg-blue-600">Click me</button>

// ❌ BAD
<div className="px-4 py-2 bg-blue-600 cursor-pointer">Click me</div>
```

---

### 2. **Leverage Flowbite Components**

```tsx
// ✅ GOOD: Use Flowbite Button
import { Button } from "flowbite-react";
<Button color="blue">Click me</Button>

// ❌ AVOID: Custom button unless necessary
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
  Click me
</button>
```

---

### 3. **Keep Consistent Spacing**

```tsx
// ✅ GOOD: Consistent spacing scale
<div className="p-4 mb-6">
  <h2 className="text-2xl mb-4">Title</h2>
  <p className="mb-4">Paragraph</p>
</div>

// ❌ BAD: Inconsistent spacing
<div className="p-3 mb-7">
  <h2 className="text-2xl mb-5">Title</h2>
  <p className="mb-3">Paragraph</p>
</div>
```

---

### 4. **Mobile-First Responsive Design**

```tsx
// ✅ GOOD: Mobile-first approach
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* Full width on mobile, half on tablet, third on desktop */}
</div>

// ❌ BAD: Desktop-first (harder to override)
<div className="w-1/3 md:w-1/2 sm:w-full">
  {/* Harder to reason about */}
</div>
```

---

## Related Documentation

- **[Forms Documentation](./forms.md)** - Form patterns and validation
- **[Tables Documentation](./tables.md)** - Data table patterns
- **[Reusable Components](./reusable-components.md)** - Custom component library
- **[Tailwind CSS Docs](https://tailwindcss.com)** - Official documentation
- **[Flowbite React Docs](https://flowbite-react.com)** - Component documentation

---

## Resources

- **Tailwind CSS**: https://tailwindcss.com
- **Flowbite React**: https://flowbite-react.com
- **React Icons**: https://react-icons.github.io/react-icons/
- **Lucide Icons**: https://lucide.dev
- **Geist Font**: https://vercel.com/font
