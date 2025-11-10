# Tables Documentation

## Overview

This document covers data table patterns, sorting, filtering, pagination, and best practices for displaying tabular data using Flowbite React Table components.

---

## Basic Table Pattern

### Simple Table

```tsx
import { Table } from "flowbite-react";

function AttendeeTable({ registrations }: { registrations: Registration[] }) {
  return (
    <Table>
      <Table.Head>
        <Table.HeadCell>Name</Table.HeadCell>
        <Table.HeadCell>Email</Table.HeadCell>
        <Table.HeadCell>Ticket Type</Table.HeadCell>
        <Table.HeadCell>Registered At</Table.HeadCell>
        <Table.HeadCell>
          <span className="sr-only">Actions</span>
        </Table.HeadCell>
      </Table.Head>
      <Table.Body className="divide-y">
        {registrations.map((registration) => (
          <Table.Row key={registration.id} className="bg-white hover:bg-gray-50">
            <Table.Cell className="font-medium text-gray-900">
              {registration.name}
            </Table.Cell>
            <Table.Cell>{registration.email}</Table.Cell>
            <Table.Cell>{registration.ticketType.name}</Table.Cell>
            <Table.Cell>
              {new Date(registration.registeredAt).toLocaleDateString()}
            </Table.Cell>
            <Table.Cell>
              <Button size="xs" color="blue">View</Button>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
```

---

## Table Components

### Table Structure

```tsx
<Table striped hoverable>
  {/* Table header */}
  <Table.Head>
    <Table.HeadCell>Column 1</Table.HeadCell>
    <Table.HeadCell>Column 2</Table.HeadCell>
  </Table.Head>

  {/* Table body */}
  <Table.Body className="divide-y">
    <Table.Row>
      <Table.Cell>Data 1</Table.Cell>
      <Table.Cell>Data 2</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```

**Props**:
- `striped`: Alternating row colors
- `hoverable`: Hover effect on rows

---

### Table Head

```tsx
<Table.Head>
  <Table.HeadCell>Name</Table.HeadCell>
  <Table.HeadCell>
    <span className="sr-only">Actions</span> {/* Hidden column label */}
  </Table.HeadCell>
</Table.Head>
```

---

### Table Row

```tsx
<Table.Row className="bg-white hover:bg-gray-50 dark:bg-gray-800">
  <Table.Cell className="font-medium text-gray-900">
    John Doe
  </Table.Cell>
  <Table.Cell>john@example.com</Table.Cell>
</Table.Row>
```

---

### Table Cell

```tsx
<Table.Cell className="font-medium text-gray-900">
  Primary content
</Table.Cell>

<Table.Cell className="text-sm text-gray-600">
  Secondary content
</Table.Cell>
```

---

## Sorting

### Client-Side Sorting

```tsx
"use client";

import { useState, useMemo } from "react";
import { Table, Button } from "flowbite-react";
import { HiArrowUp, HiArrowDown } from "react-icons/hi";

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
};

function SortableTable({ data }: { data: Registration[] }) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "name",
    direction: "asc",
  });

  const sortedData = useMemo(() => {
    const sorted = [...data];
    sorted.sort((a, b) => {
      const aValue = a[sortConfig.key as keyof Registration];
      const bValue = b[sortConfig.key as keyof Registration];

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    return sorted;
  }, [data, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  return (
    <Table>
      <Table.Head>
        <Table.HeadCell>
          <button
            onClick={() => handleSort("name")}
            className="flex items-center gap-2"
          >
            Name
            {sortConfig.key === "name" && (
              sortConfig.direction === "asc" ? <HiArrowUp /> : <HiArrowDown />
            )}
          </button>
        </Table.HeadCell>
        <Table.HeadCell>
          <button
            onClick={() => handleSort("email")}
            className="flex items-center gap-2"
          >
            Email
            {sortConfig.key === "email" && (
              sortConfig.direction === "asc" ? <HiArrowUp /> : <HiArrowDown />
            )}
          </button>
        </Table.HeadCell>
      </Table.Head>
      <Table.Body className="divide-y">
        {sortedData.map((row) => (
          <Table.Row key={row.id}>
            <Table.Cell>{row.name}</Table.Cell>
            <Table.Cell>{row.email}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
```

---

### Server-Side Sorting

Pass sorting parameters to tRPC query:

```tsx
"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

function ServerSortedTable({ eventId }: { eventId: string }) {
  const [sortBy, setSortBy] = useState<"name" | "email">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { data, isLoading } = api.registration.list.useQuery({
    eventId,
    sortBy,
    sortOrder,
  });

  const handleSort = (key: "name" | "email") => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  if (isLoading) return <Spinner />;

  return <Table>{/* Render sorted data */}</Table>;
}
```

---

## Filtering

### Client-Side Filtering

```tsx
"use client";

import { useState, useMemo } from "react";
import { TextInput } from "flowbite-react";
import { HiSearch } from "react-icons/hi";

function FilterableTable({ data }: { data: Registration[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Text search
      const matchesSearch =
        row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.email.toLowerCase().includes(searchQuery.toLowerCase());

      // Dropdown filter
      const matchesTicketType =
        !ticketTypeFilter || row.ticketTypeId === ticketTypeFilter;

      return matchesSearch && matchesTicketType;
    });
  }, [data, searchQuery, ticketTypeFilter]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <TextInput
          icon={HiSearch}
          placeholder="Search by name or email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Select
          value={ticketTypeFilter ?? ""}
          onChange={(e) => setTicketTypeFilter(e.target.value || null)}
        >
          <option value="">All Ticket Types</option>
          <option value="ticket-1">VIP</option>
          <option value="ticket-2">General Admission</option>
        </Select>
      </div>

      <Table>
        <Table.Body className="divide-y">
          {filteredData.map((row) => (
            <Table.Row key={row.id}>
              <Table.Cell>{row.name}</Table.Cell>
              <Table.Cell>{row.email}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}
```

---

### Server-Side Filtering

```tsx
"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";

function ServerFilteredTable({ eventId }: { eventId: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketTypeId, setTicketTypeId] = useState<string | null>(null);

  // Debounce search to avoid excessive API calls
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data, isLoading } = api.registration.list.useQuery({
    eventId,
    search: debouncedSearch,
    ticketTypeId: ticketTypeId ?? undefined,
  });

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <TextInput
          icon={HiSearch}
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Select
          value={ticketTypeId ?? ""}
          onChange={(e) => setTicketTypeId(e.target.value || null)}
        >
          <option value="">All Tickets</option>
          {/* Populate from data */}
        </Select>
      </div>

      {isLoading ? <Spinner /> : <Table>{/* Render data */}</Table>}
    </div>
  );
}
```

---

## Pagination

### Cursor-Based Pagination (Recommended)

```tsx
"use client";

import { Button } from "flowbite-react";
import { api } from "@/trpc/react";

function PaginatedTable({ eventId }: { eventId: string }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.registration.list.useInfiniteQuery(
      { eventId, limit: 20 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  return (
    <div>
      <Table>
        <Table.Body className="divide-y">
          {data?.pages.flatMap((page) =>
            page.items.map((registration) => (
              <Table.Row key={registration.id}>
                <Table.Cell>{registration.name}</Table.Cell>
                <Table.Cell>{registration.email}</Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table>

      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

### Offset-Based Pagination

```tsx
"use client";

import { useState } from "react";
import { Pagination } from "flowbite-react";
import { api } from "@/trpc/react";

function OffsetPaginatedTable({ eventId }: { eventId: string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = api.registration.list.useQuery({
    eventId,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  });

  const totalPages = Math.ceil((data?.totalCount ?? 0) / pageSize);

  return (
    <div>
      <Table>{/* Render data */}</Table>

      <div className="mt-4 flex justify-center">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
```

---

## Responsive Tables

### Horizontal Scroll

Wrap table in scrollable container for mobile:

```tsx
<div className="overflow-x-auto">
  <Table>
    {/* Table content */}
  </Table>
</div>
```

---

### Stacked Layout (Mobile)

Transform table to cards on small screens:

```tsx
function ResponsiveTable({ data }: { data: Registration[] }) {
  return (
    <>
      {/* Desktop: Table */}
      <div className="hidden md:block">
        <Table>
          {/* Full table */}
        </Table>
      </div>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-4">
        {data.map((row) => (
          <Card key={row.id}>
            <div className="flex flex-col gap-2">
              <div className="font-medium text-gray-900">{row.name}</div>
              <div className="text-sm text-gray-600">{row.email}</div>
              <div className="text-sm text-gray-600">
                {row.ticketType.name}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
```

---

## Action Columns

### Inline Actions

```tsx
<Table.Cell>
  <div className="flex items-center gap-2">
    <Button size="xs" color="blue">
      Edit
    </Button>
    <Button size="xs" color="gray">
      View
    </Button>
    <Button size="xs" color="failure">
      Delete
    </Button>
  </div>
</Table.Cell>
```

---

### Dropdown Menu

```tsx
import { Dropdown } from "flowbite-react";
import { HiDotsVertical } from "react-icons/hi";

<Table.Cell>
  <Dropdown
    label=""
    dismissOnClick={false}
    renderTrigger={() => (
      <button className="p-2 hover:bg-gray-100 rounded">
        <HiDotsVertical className="h-5 w-5" />
      </button>
    )}
  >
    <Dropdown.Item onClick={() => handleEdit(row.id)}>
      Edit
    </Dropdown.Item>
    <Dropdown.Item onClick={() => handleView(row.id)}>
      View
    </Dropdown.Item>
    <Dropdown.Divider />
    <Dropdown.Item onClick={() => handleDelete(row.id)} className="text-red-600">
      Delete
    </Dropdown.Item>
  </Dropdown>
</Table.Cell>
```

---

## Empty States

```tsx
function DataTable({ data, isLoading }: { data: any[]; isLoading: boolean }) {
  if (isLoading) {
    return <TableSkeleton rows={5} />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title="No registrations found"
        description="Registrations will appear here once attendees sign up"
        icon={HiUserGroup}
        actionLabel="Invite Attendees"
        onAction={() => router.push("/invite")}
      />
    );
  }

  return <Table>{/* Render data */}</Table>;
}
```

---

## Loading States

### Skeleton Loader

```tsx
import { TableSkeleton } from "@/components/ui/skeletons";

function DataTable() {
  const { data, isLoading } = api.registration.list.useQuery({ eventId });

  if (isLoading) {
    return <TableSkeleton rows={10} />;
  }

  return <Table>{/* Render data */}</Table>;
}
```

**TableSkeleton Component**:

```tsx
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Table>
      <Table.Head>
        <Table.HeadCell><Skeleton className="h-4 w-24" /></Table.HeadCell>
        <Table.HeadCell><Skeleton className="h-4 w-32" /></Table.HeadCell>
        <Table.HeadCell><Skeleton className="h-4 w-20" /></Table.HeadCell>
      </Table.Head>
      <Table.Body className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <Table.Row key={i}>
            <Table.Cell><Skeleton className="h-4 w-full" /></Table.Cell>
            <Table.Cell><Skeleton className="h-4 w-full" /></Table.Cell>
            <Table.Cell><Skeleton className="h-4 w-16" /></Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
```

---

## Selection (Checkboxes)

### Select All & Individual Selection

```tsx
"use client";

import { useState } from "react";
import { Checkbox } from "flowbite-react";

function SelectableTable({ data }: { data: Registration[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isAllSelected = selectedIds.size === data.length;

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((row) => row.id)));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div>
      {selectedIds.size > 0 && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            {selectedIds.size} item(s) selected
          </p>
          <Button size="sm" color="blue" onClick={() => handleBulkAction()}>
            Delete Selected
          </Button>
        </div>
      )}

      <Table>
        <Table.Head>
          <Table.HeadCell className="w-12">
            <Checkbox
              checked={isAllSelected}
              onChange={toggleAll}
            />
          </Table.HeadCell>
          <Table.HeadCell>Name</Table.HeadCell>
          <Table.HeadCell>Email</Table.HeadCell>
        </Table.Head>
        <Table.Body className="divide-y">
          {data.map((row) => (
            <Table.Row key={row.id}>
              <Table.Cell>
                <Checkbox
                  checked={selectedIds.has(row.id)}
                  onChange={() => toggleRow(row.id)}
                />
              </Table.Cell>
              <Table.Cell>{row.name}</Table.Cell>
              <Table.Cell>{row.email}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}
```

---

## Best Practices

### 1. **Use Semantic HTML**

```tsx
// ✅ GOOD: Table for tabular data
<Table>
  <Table.Head>...</Table.Head>
  <Table.Body>...</Table.Body>
</Table>

// ❌ BAD: Divs for tabular layout
<div className="grid grid-cols-3">...</div>
```

---

### 2. **Optimize for Performance**

```tsx
// ✅ GOOD: Memoize sorted/filtered data
const sortedData = useMemo(() => {
  return data.sort(...);
}, [data, sortConfig]);

// ❌ BAD: Sort on every render
const sortedData = data.sort(...);
```

---

### 3. **Debounce Search Input**

```tsx
// ✅ GOOD: Debounce to reduce API calls
const debouncedSearch = useDebounce(searchQuery, 300);

// ❌ BAD: Query on every keystroke
const { data } = api.search.useQuery({ query: searchQuery });
```

---

### 4. **Provide Loading States**

```tsx
// ✅ GOOD
if (isLoading) return <TableSkeleton />;

// ❌ BAD: No loading indicator
if (isLoading) return null;
```

---

### 5. **Handle Empty States**

```tsx
// ✅ GOOD: Helpful empty state
if (data.length === 0) {
  return <EmptyState title="No data" description="..." />;
}

// ❌ BAD: Blank table
<Table.Body>{/* Empty */}</Table.Body>
```

---

## Complete Example

**File**: `src/components/registration/attendee-table.tsx`

```tsx
"use client";

import { useState, useMemo } from "react";
import { Table, TextInput, Select, Button } from "flowbite-react";
import { HiSearch, HiDownload } from "react-icons/hi";
import { api } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";
import { TableSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/empty-state";

export function AttendeeTable({ eventId }: { eventId: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data, isLoading } = api.registration.list.useQuery({
    eventId,
    search: debouncedSearch,
    ticketTypeId: ticketTypeFilter ?? undefined,
  });

  const exportMutation = api.registration.export.useMutation({
    onSuccess: (csvData) => {
      // Download CSV
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "registrations.csv";
      a.click();
    },
  });

  if (isLoading) {
    return <TableSkeleton rows={10} />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No attendees found"
        description="Registrations will appear here"
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <TextInput
          icon={HiSearch}
          placeholder="Search by name or email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button
          color="gray"
          onClick={() => exportMutation.mutate({ eventId, format: "csv" })}
          disabled={exportMutation.isPending}
        >
          <HiDownload className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table striped hoverable>
          <Table.Head>
            <Table.HeadCell>Name</Table.HeadCell>
            <Table.HeadCell>Email</Table.HeadCell>
            <Table.HeadCell>Ticket Type</Table.HeadCell>
            <Table.HeadCell>Registered</Table.HeadCell>
          </Table.Head>
          <Table.Body className="divide-y">
            {data.map((registration) => (
              <Table.Row key={registration.id}>
                <Table.Cell className="font-medium text-gray-900">
                  {registration.name}
                </Table.Cell>
                <Table.Cell>{registration.email}</Table.Cell>
                <Table.Cell>{registration.ticketType.name}</Table.Cell>
                <Table.Cell>
                  {new Date(registration.registeredAt).toLocaleDateString()}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </div>
  );
}
```

---

## Related Documentation

- **[UI System](./ui-system.md)** - Design system overview
- **[Reusable Components](./reusable-components.md)** - Custom components
- **[tRPC Queries](../api/trpc-overview.md)** - Data fetching
- **[Flowbite Tables](https://flowbite-react.com/docs/components/table)** - Official docs

---

## Resources

- **Flowbite Tables**: https://flowbite-react.com/docs/components/table
- **Pagination**: https://flowbite-react.com/docs/components/pagination
- **React Virtualized** (for large datasets): https://github.com/bvaughn/react-virtualized
- **TanStack Table** (advanced): https://tanstack.com/table
