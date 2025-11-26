# Check-In Frontend Documentation

## Overview

The Check-In frontend provides a mobile-optimized, responsive interface for checking in attendees at events. It features QR code scanning, real-time metrics, optimistic updates, and two operational modes (Quick and Dashboard).

## Architecture

### Component Structure

```
src/components/check-in/
├── index.ts                          # Barrel export
├── attendee-check-in-table.tsx       # Main table component
├── check-in-drawer.tsx               # Quick mode drawer
├── check-in-filter-dropdown.tsx      # Status filter
├── check-in-metrics.tsx              # Metrics dashboard
├── check-in-mode-toggle.tsx          # Mode switcher
├── check-in-search.tsx               # Search input
├── duplicate-check-in-modal.tsx      # Duplicate warning
├── qr-code-scanner-modal.tsx         # QR scanner modal
├── qr-scanner-wrapper.tsx            # QR scanner integration
├── quick-check-in-drawer.tsx         # Mobile check-in drawer
├── quick-check-in-interface.tsx      # Quick mode layout
├── quick-check-in-confirmation.tsx   # Confirmation dialog
├── attendee-list-skeleton.tsx        # Loading skeleton
└── check-in-metrics-skeleton.tsx     # Metrics skeleton
```

### Pages

```
src/app/events/[slug]/check-in/
└── page.tsx                          # Main check-in page
```

### Hooks

```
src/hooks/
└── use-check-in.ts                   # Check-in operations hook
```

---

## Pages

### Check-In Page

**File**: `src/app/events/[slug]/check-in/page.tsx`

**Route**: `/events/[slug]/check-in`

#### Purpose
- Main entry point for check-in feature
- Server component for SEO and data prefetching
- Permission checking and authorization
- Parallel data loading

#### Implementation

```typescript
export default async function CheckInPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { mode?: string; filter?: string; search?: string; page?: string };
}) {
  // 1. Get authenticated session
  const session = await getServerAuthSession();
  if (!session) redirect("/auth/signin");

  // 2. Get event by slug
  const event = await api.events.getBySlug({ slug: params.slug });
  if (!event) notFound();

  // 3. Check CHECKIN permission
  const hasPermission = await hasTeamModulePermission(
    session.user.id,
    event.id,
    "CHECKIN"
  );
  if (!hasPermission) {
    redirect(`/events/${params.slug}`);
  }

  // 4. Parse URL parameters
  const mode = searchParams.mode === "quick" ? "quick" : "dashboard";
  const filter = searchParams.filter ?? "all";
  const search = searchParams.search ?? "";
  const page = parseInt(searchParams.page ?? "1", 10);

  // 5. Prefetch data in parallel
  const [attendees, metrics] = await Promise.all([
    api.checkIn.listAttendees({
      eventId: event.id,
      filter,
      search,
      page,
      pageSize: 50,
    }),
    api.checkIn.getMetrics({ eventId: event.id }),
  ]);

  // 6. Render appropriate mode
  return (
    <div className="container mx-auto p-4">
      <CheckInModeToggle currentMode={mode} />
      
      {mode === "quick" ? (
        <QuickCheckInInterface 
          eventId={event.id}
          eventSlug={event.slug}
          eventTimezone={event.timezone}
        />
      ) : (
        <>
          <CheckInMetrics initialData={metrics} eventId={event.id} />
          <CheckInFilters />
          <AttendeeCheckInTable 
            initialData={attendees}
            eventId={event.id}
            eventTimezone={event.timezone}
          />
        </>
      )}
    </div>
  );
}
```

#### Features
- ✅ Server-side rendering for initial load
- ✅ Permission checking before render
- ✅ Parallel data prefetching
- ✅ URL state management (mode, filters, search, page)
- ✅ Responsive layout
- ✅ Mode switching between Quick and Dashboard

---

## Core Components

### 1. AttendeeCheckInTable

**File**: `src/components/check-in/attendee-check-in-table.tsx`

**Purpose**: Main table view for Dashboard Mode with pagination and check-in actions.

#### Props

```typescript
interface AttendeeCheckInTableProps {
  initialData: ListAttendeesOutput;
  eventId: string;
  eventTimezone: string;
}
```

#### Features
- Paginated attendee list (50 per page)
- Real-time status updates (10-second polling)
- Optimistic UI updates
- Search and filter integration
- Check-in button for each attendee
- Displays attendee vs buyer information
- Loading skeleton during fetch

#### Implementation Highlights

```typescript
export function AttendeeCheckInTable({ initialData, eventId, eventTimezone }: Props) {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") ?? "all";
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);

  // Query with auto-refresh
  const { data, isLoading } = trpc.checkIn.listAttendees.useQuery(
    { eventId, filter, search, page, pageSize: 50 },
    { 
      initialData,
      refetchInterval: 10000, // 10 seconds
    }
  );

  const { checkInByTicketNumber, isCheckingIn, checkingInId } = useCheckIn();

  const handleCheckIn = (ticketNumber: string) => {
    checkInByTicketNumber({ eventId, ticketNumber });
  };

  return (
    <Table>
      <Table.Head>
        <Table.HeadCell>Ticket Number</Table.HeadCell>
        <Table.HeadCell>Attendee Name</Table.HeadCell>
        <Table.HeadCell>Email</Table.HeadCell>
        <Table.HeadCell>Status</Table.HeadCell>
        <Table.HeadCell>Checked In At</Table.HeadCell>
        <Table.HeadCell>Actions</Table.HeadCell>
      </Table.Head>
      <Table.Body>
        {data.attendees.map((ticket) => (
          <Table.Row key={ticket.id}>
            <Table.Cell className="font-mono">{ticket.ticketNumber}</Table.Cell>
            <Table.Cell>
              {ticket.attendee?.name ?? ticket.registration.name}
              {ticket.attendee && ticket.attendee.name !== ticket.registration.name && (
                <p className="text-xs text-gray-500">
                  Buyer: {ticket.registration.name}
                </p>
              )}
            </Table.Cell>
            <Table.Cell>{ticket.attendee?.email ?? ticket.registration.email}</Table.Cell>
            <Table.Cell>
              {ticket.isCheckedIn ? (
                <Badge color="success">Checked In</Badge>
              ) : (
                <Badge color="gray">Not Checked In</Badge>
              )}
            </Table.Cell>
            <Table.Cell>
              {ticket.checkedInAt && formatInTimeZone(
                ticket.checkedInAt,
                eventTimezone,
                "MMM d, yyyy 'at' h:mm a zzz"
              )}
            </Table.Cell>
            <Table.Cell>
              <Button
                size="sm"
                color={ticket.isCheckedIn ? "gray" : "blue"}
                onClick={() => handleCheckIn(ticket.ticketNumber)}
                disabled={isCheckingIn && checkingInId === ticket.id}
              >
                {isCheckingIn && checkingInId === ticket.id ? (
                  <Spinner size="sm" />
                ) : ticket.isCheckedIn ? (
                  "Already Checked In"
                ) : (
                  "Check In"
                )}
              </Button>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
```

#### State Management
- Uses tRPC query for server state
- URL search params for filter/search/page state
- Optimistic updates via `useCheckIn` hook
- Auto-refresh every 10 seconds

---

### 2. QuickCheckInInterface

**File**: `src/components/check-in/quick-check-in-interface.tsx`

**Purpose**: Mobile-first check-in interface with embedded QR scanner.

#### Props

```typescript
interface QuickCheckInInterfaceProps {
  eventId: string;
  eventSlug: string;
  eventTimezone: string;
}
```

#### Features
- Always-visible embedded QR scanner
- Ticket number search form
- Slide-up drawer for check-in confirmation
- Auto-close after successful check-in
- Touch-optimized controls
- Minimal UI for speed

#### Implementation Highlights

```typescript
export function QuickCheckInInterface({ eventId, eventSlug, eventTimezone }: Props) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);

  const { mutate: getTicketDetails } = trpc.checkIn.getTicketDetails.useMutation({
    onSuccess: (data) => {
      setTicketData(data.ticket);
      setIsDrawerOpen(true);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { checkInByQRCode, isCheckingIn } = useCheckIn({
    onSuccess: () => {
      toast.success("Checked in successfully!");
      setIsDrawerOpen(false);
      setTicketData(null);
    },
  });

  const handleQRScan = (qrCodeData: string) => {
    getTicketDetails({ eventId, ticketNumber: parseQRCode(qrCodeData) });
  };

  const handleTicketSearch = (ticketNumber: string) => {
    getTicketDetails({ eventId, ticketNumber });
  };

  const handleConfirmCheckIn = () => {
    if (ticketData) {
      checkInByQRCode({ eventId, qrCodeData: ticketData.ticketNumber });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Embedded QR Scanner - Always Visible */}
      <div className="rounded-lg border bg-white p-4 dark:bg-gray-800">
        <h3 className="mb-3 text-lg font-semibold">Scan QR Code</h3>
        <QRScannerWrapper onScan={handleQRScan} />
      </div>

      {/* Manual Entry Form */}
      <div className="rounded-lg border bg-white p-4 dark:bg-gray-800">
        <h3 className="mb-3 text-lg font-semibold">Enter Ticket Number</h3>
        <CheckInSearch onSearch={handleTicketSearch} />
      </div>

      {/* Check-In Drawer */}
      {ticketData && (
        <QuickCheckInDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onCheckIn={handleConfirmCheckIn}
          isProcessing={isCheckingIn}
          ticketNumber={ticketData.ticketNumber}
          attendeeName={ticketData.attendee?.name ?? null}
          attendeeEmail={ticketData.attendee?.email ?? null}
          buyerName={ticketData.registration.name}
          buyerEmail={ticketData.registration.email}
          isCheckedIn={ticketData.isCheckedIn}
          checkedInAt={ticketData.checkedInAt}
          eventTimezone={eventTimezone}
        />
      )}
    </div>
  );
}
```

#### Workflow
1. Team member scans QR or types ticket number
2. System fetches ticket details
3. Drawer slides up with attendee information
4. Team member confirms check-in
5. Optimistic update shows success
6. Drawer auto-closes
7. Ready for next attendee

---

### 3. QuickCheckInDrawer

**File**: `src/components/check-in/quick-check-in-drawer.tsx`

**Purpose**: Mobile-optimized slide-up drawer for displaying check-in results.

#### Props

```typescript
interface QuickCheckInDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckIn?: () => void;
  isProcessing?: boolean;
  
  // Ticket data
  ticketNumber: string;
  attendeeName: string | null;
  attendeeEmail: string | null;
  buyerName: string;
  buyerEmail: string;
  
  // Check-in status
  isCheckedIn: boolean;
  checkedInAt?: Date | null;
  eventTimezone: string;
}
```

#### Features
- Smooth slide-up animation
- Backdrop with dismiss on click
- Handle bar for visual affordance
- Status indicators (checked in vs ready)
- Attendee vs buyer distinction
- Check-in timestamp display
- Action buttons (Cancel, Check In)

#### Implementation Highlights

```typescript
export function QuickCheckInDrawer({ 
  isOpen, 
  onClose, 
  onCheckIn,
  isProcessing,
  ticketNumber,
  attendeeName,
  attendeeEmail,
  buyerName,
  buyerEmail,
  isCheckedIn,
  checkedInAt,
  eventTimezone,
}: QuickCheckInDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10); // Smooth animation
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const displayName = attendeeName ?? buyerName;
  const displayEmail = attendeeEmail ?? buyerEmail;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-gray-900/50 transition-opacity ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl transform rounded-t-2xl bg-white shadow-2xl transition-transform ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-4">
          {/* Status Header */}
          {isCheckedIn ? (
            <div className="mb-6 text-center">
              <HiCheckCircle className="mx-auto h-12 w-12 text-yellow-600" />
              <h2 className="mt-3 text-2xl font-bold">Already Checked In</h2>
              <p className="mt-1 text-sm text-gray-600">This attendee is all set</p>
            </div>
          ) : (
            <div className="mb-6 text-center">
              <HiCheckCircle className="mx-auto h-12 w-12 text-green-600" />
              <h2 className="mt-3 text-2xl font-bold">Ready to Check In</h2>
              <p className="mt-1 text-sm text-gray-600">Confirm attendee details below</p>
            </div>
          )}

          {/* Attendee Details Card */}
          <div className="mb-6 space-y-4 rounded-xl border bg-gray-50 p-5">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Ticket Number</p>
              <p className="mt-1.5 font-mono text-2xl font-bold">{ticketNumber}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Attendee</p>
              <p className="mt-1.5 text-lg font-semibold">{displayName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Email</p>
              <p className="mt-1.5 text-sm">{displayEmail}</p>
            </div>
            
            {/* Different buyer note */}
            {attendeeName && attendeeName !== buyerName && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-medium text-blue-800">
                  Purchased by: {buyerName}
                </p>
              </div>
            )}

            {/* Check-in timestamp */}
            {isCheckedIn && checkedInAt && (
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">Checked In At</p>
                <p className="mt-1.5 text-sm font-medium">
                  {formatInTimeZone(checkedInAt, eventTimezone, "MMM d, yyyy 'at' h:mm a zzz")}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {isCheckedIn ? (
              <Button color="gray" onClick={onClose} className="flex-1" size="lg">
                Close
              </Button>
            ) : (
              <>
                <Button color="gray" onClick={onClose} disabled={isProcessing} className="flex-1" size="lg">
                  Cancel
                </Button>
                <Button color="blue" onClick={onCheckIn} disabled={isProcessing} className="flex-1" size="lg">
                  {isProcessing ? <Spinner size="sm" className="mr-2" /> : <HiCheckCircle className="mr-2" />}
                  {isProcessing ? "Checking In..." : "Check In"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
```

#### Animation Details
- **Slide-Up**: `translate-y-full` → `translate-y-0` (300ms ease-out)
- **Backdrop Fade**: `opacity-0` → `opacity-100` (300ms)
- **10ms Delay**: For smooth initial render

---

### 4. QRCodeScannerModal

**File**: `src/components/check-in/qr-code-scanner-modal.tsx`

**Purpose**: Modal dialog for QR scanning in Dashboard Mode.

#### Props

```typescript
interface QRCodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (qrCodeData: string) => void;
}
```

#### Features
- Camera permission handling
- Real-time QR detection
- Error states and retry
- Close button
- Modal overlay
- Loading state during camera initialization

#### Implementation Highlights

```typescript
export function QRCodeScannerModal({ isOpen, onClose, onScan }: Props) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = (decodedText: string) => {
    onScan(decodedText);
    onClose(); // Auto-close on successful scan
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsScanning(false);
  };

  return (
    <Modal show={isOpen} onClose={onClose} size="xl">
      <Modal.Header>Scan QR Code</Modal.Header>
      <Modal.Body>
        {error ? (
          <div className="text-center">
            <p className="text-red-600">{error}</p>
            <Button onClick={() => { setError(null); setIsScanning(true); }}>
              Retry
            </Button>
          </div>
        ) : (
          <QRScannerWrapper onScan={handleScan} onError={handleError} />
        )}
      </Modal.Body>
    </Modal>
  );
}
```

---

### 5. CheckInMetrics

**File**: `src/components/check-in/check-in-metrics.tsx`

**Purpose**: Real-time metrics dashboard with auto-refresh.

#### Props

```typescript
interface CheckInMetricsProps {
  initialData: GetMetricsOutput;
  eventId: string;
}
```

#### Features
- Total tickets, checked-in count, remaining count
- Check-in percentage with progress bar
- Recent check-ins feed (last 10)
- Auto-refresh every 10 seconds
- Loading skeleton during refresh

#### Implementation Highlights

```typescript
export function CheckInMetrics({ initialData, eventId }: Props) {
  const { data, isLoading } = trpc.checkIn.getMetrics.useQuery(
    { eventId },
    { 
      initialData,
      refetchInterval: 10000, // 10 seconds
    }
  );

  if (isLoading && !data) {
    return <CheckInMetricsSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Tickets */}
      <Card>
        <h5 className="text-sm font-medium text-gray-500">Total Tickets</h5>
        <p className="text-3xl font-bold">{data.totalTickets}</p>
      </Card>

      {/* Checked In */}
      <Card>
        <h5 className="text-sm font-medium text-gray-500">Checked In</h5>
        <p className="text-3xl font-bold text-green-600">{data.checkedInCount}</p>
      </Card>

      {/* Not Checked In */}
      <Card>
        <h5 className="text-sm font-medium text-gray-500">Not Checked In</h5>
        <p className="text-3xl font-bold text-gray-600">{data.notCheckedInCount}</p>
      </Card>

      {/* Progress */}
      <Card>
        <h5 className="text-sm font-medium text-gray-500">Progress</h5>
        <p className="text-3xl font-bold">{data.checkInPercentage}%</p>
        <Progress progress={data.checkInPercentage} color="blue" className="mt-2" />
      </Card>

      {/* Recent Check-Ins */}
      <Card className="lg:col-span-4">
        <h5 className="mb-4 text-lg font-semibold">Recent Check-Ins</h5>
        <div className="space-y-2">
          {data.recentCheckIns.map((checkIn) => (
            <div key={checkIn.id} className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="font-medium">
                  {checkIn.attendee?.name ?? checkIn.registration.name}
                </p>
                <p className="text-xs text-gray-500">{checkIn.ticketNumber}</p>
              </div>
              <p className="text-sm text-gray-600">
                {formatDistance(checkIn.checkedInAt!, new Date(), { addSuffix: true })}
              </p>
            </div>
          ))}
          {data.recentCheckIns.length === 0 && (
            <p className="text-center text-gray-500">No check-ins yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}
```

---

### 6. CheckInSearch

**File**: `src/components/check-in/check-in-search.tsx`

**Purpose**: Debounced search input for ticket number.

#### Props

```typescript
interface CheckInSearchProps {
  onSearch: (searchTerm: string) => void;
  placeholder?: string;
}
```

#### Features
- 500ms debounce to reduce API calls
- Clear button
- URL state sync
- Real-time search

#### Implementation Highlights

```typescript
export function CheckInSearch({ onSearch, placeholder = "Search by ticket number..." }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (searchTerm) {
        params.set("search", searchTerm);
      } else {
        params.delete("search");
      }
      params.delete("page"); // Reset to page 1
      router.push(`${pathname}?${params.toString()}`);
      onSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border px-4 py-2"
      />
      {searchTerm && (
        <button
          onClick={() => setSearchTerm("")}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <HiX />
        </button>
      )}
    </div>
  );
}
```

---

## Hooks

### useCheckIn

**File**: `src/hooks/use-check-in.ts`

**Purpose**: Custom hook for check-in operations with optimistic updates.

#### API

```typescript
function useCheckIn(options?: {
  onSuccess?: (data: CheckInOutput) => void;
  onError?: (error: Error) => void;
}): {
  checkInByTicketNumber: (input: { eventId: string; ticketNumber: string }) => void;
  checkInByQRCode: (input: { eventId: string; qrCodeData: string }) => void;
  isCheckingIn: boolean;
  checkingInId: string | null;
  error: Error | null;
}
```

#### Features
- Optimistic UI updates for instant feedback
- Automatic rollback on error
- Query invalidation on success
- Loading state management
- Error handling
- Success/error callbacks

#### Implementation

```typescript
export function useCheckIn(options?: {
  onSuccess?: (data: CheckInOutput) => void;
  onError?: (error: Error) => void;
}) {
  const utils = trpc.useUtils();
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  const { mutate, isLoading, error } = trpc.checkIn.checkIn.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await utils.checkIn.listAttendees.cancel();

      // Snapshot current value
      const previousData = utils.checkIn.listAttendees.getData();

      // Optimistically update
      utils.checkIn.listAttendees.setData(
        { eventId: variables.eventId },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            attendees: old.attendees.map((attendee) =>
              attendee.ticketNumber === variables.ticketNumber
                ? { ...attendee, isCheckedIn: true, checkedInAt: new Date() }
                : attendee
            ),
          };
        }
      );

      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        utils.checkIn.listAttendees.setData(
          { eventId: variables.eventId },
          context.previousData
        );
      }
      options?.onError?.(error);
      setCheckingInId(null);
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refetch
      utils.checkIn.listAttendees.invalidate({ eventId: variables.eventId });
      utils.checkIn.getMetrics.invalidate({ eventId: variables.eventId });
      options?.onSuccess?.(data);
      setCheckingInId(null);
    },
  });

  const checkInByTicketNumber = (input: { eventId: string; ticketNumber: string }) => {
    setCheckingInId(input.ticketNumber);
    mutate(input);
  };

  const checkInByQRCode = (input: { eventId: string; qrCodeData: string }) => {
    const ticketNumber = parseQRCode(input.qrCodeData);
    setCheckingInId(ticketNumber);
    mutate({ eventId: input.eventId, qrCodeData: input.qrCodeData });
  };

  return {
    checkInByTicketNumber,
    checkInByQRCode,
    isCheckingIn: isLoading,
    checkingInId,
    error,
  };
}
```

#### Usage Example

```typescript
const { checkInByTicketNumber, isCheckingIn, checkingInId } = useCheckIn({
  onSuccess: () => {
    toast.success("Checked in successfully!");
  },
  onError: (error) => {
    toast.error(error.message);
  },
});

// In a button click handler
<Button 
  onClick={() => checkInByTicketNumber({ eventId, ticketNumber: "TKT-2025-ABC123" })}
  disabled={isCheckingIn && checkingInId === "TKT-2025-ABC123"}
>
  {isCheckingIn && checkingInId === "TKT-2025-ABC123" ? "Checking In..." : "Check In"}
</Button>
```

---

## State Management

### URL State

Search parameters manage filter/search/page state:

```typescript
const searchParams = useSearchParams();
const filter = searchParams.get("filter") ?? "all";
const search = searchParams.get("search") ?? "";
const page = parseInt(searchParams.get("page") ?? "1", 10);
const mode = searchParams.get("mode") ?? "dashboard";

// Update URL
const router = useRouter();
const pathname = usePathname();

const updateURL = (newParams: Record<string, string>) => {
  const params = new URLSearchParams(searchParams);
  Object.entries(newParams).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  });
  router.push(`${pathname}?${params.toString()}`);
};
```

**Benefits**:
- Shareable URLs with current state
- Browser back/forward navigation works
- Refreshable without losing state

### React Query Cache (via tRPC)

All server data cached by TanStack Query:

```typescript
// Automatic caching
const { data } = trpc.checkIn.listAttendees.useQuery({ eventId });

// Manual cache updates (optimistic)
utils.checkIn.listAttendees.setData({ eventId }, (old) => ({ ...old, ... }));

// Invalidation (refetch)
utils.checkIn.listAttendees.invalidate({ eventId });
utils.checkIn.getMetrics.invalidate({ eventId });
```

**Benefits**:
- Reduced API calls
- Instant navigation between pages
- Background refetching

### Local Component State

Minimal local state for UI-only concerns:

```typescript
const [isDrawerOpen, setIsDrawerOpen] = useState(false);
const [isScannerOpen, setIsScannerOpen] = useState(false);
const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
```

---

## QR Code Integration

### html5-qrcode Library

**Library**: `html5-qrcode` (npm package)

**Wrapper Component**: `src/components/check-in/qr-scanner-wrapper.tsx`

#### Implementation

```typescript
import { Html5QrcodeScanner } from "html5-qrcode";

export function QRScannerWrapper({ onScan, onError }: {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.clear();
      },
      (errorMessage) => {
        onError?.(errorMessage);
      }
    );

    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch(console.error);
    };
  }, []);

  return <div id="qr-reader" />;
}
```

#### Camera Permissions

Handled automatically by browser:
1. First scan attempt triggers permission prompt
2. User grants/denies camera access
3. If denied, show error with instructions
4. If granted, scanner initializes

---

## Styling and UI

### Tailwind CSS Classes

Responsive design with Tailwind:

```typescript
// Mobile-first drawer
<div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl transform rounded-t-2xl">

// Responsive grid
<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">

// Touch-friendly buttons
<Button size="lg" className="min-h-[48px]">
```

### Flowbite React Components

Pre-built components from Flowbite:
- `<Button>` - Call-to-action buttons
- `<Modal>` - Scanner modal
- `<Table>` - Attendee list table
- `<Badge>` - Status indicators
- `<Progress>` - Check-in percentage bar
- `<Card>` - Metric cards
- `<Spinner>` - Loading indicators

### Dark Mode Support

All components support dark mode via Tailwind:

```typescript
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
```

---

## Performance Optimizations

### 1. Server Components

Page uses React Server Components:
- Pre-fetch data on server
- Reduce client bundle size
- Faster initial render

### 2. Pagination

50 items per page limit:
- Reduces DOM nodes
- Faster rendering
- Lower memory usage

### 3. Debounced Search

500ms delay prevents excessive API calls:
- 1 API call vs 10+ while typing
- Better server performance
- Improved user experience

### 4. Auto-Refresh Intervals

10-second polling instead of WebSockets:
- Simpler implementation
- Lower server load
- Adequate real-time feel

### 5. Optimistic Updates

Instant UI feedback:
- Perceived performance <1 second
- Reduced perceived latency
- Automatic rollback on error

### 6. Lazy Loading

QR scanner loaded only when opened:
- Smaller initial bundle
- Faster page load
- Better mobile performance

---

## Accessibility

### Keyboard Navigation

All interactive elements keyboard-accessible:
- Tab through buttons
- Enter to activate
- Escape to close modals/drawers

### ARIA Labels

Screen reader support:

```typescript
<button aria-label="Scan QR code">
<div role="dialog" aria-modal="true">
<input aria-describedby="search-help">
```

### Loading States

Announce loading to screen readers:

```typescript
<div role="status" aria-live="polite">
  {isLoading ? "Loading attendees..." : `${data.pagination.total} attendees found`}
</div>
```

### Focus Management

Focus returns to trigger on modal close:

```typescript
const triggerRef = useRef<HTMLButtonElement>(null);

const handleClose = () => {
  setIsOpen(false);
  triggerRef.current?.focus();
};
```

---

## Error Handling

### User-Friendly Messages

All errors show clear, actionable messages:

```typescript
onError: (error) => {
  const message = error.message === "NOT_FOUND"
    ? "Ticket not found for this event. Please verify the ticket number."
    : "An error occurred. Please try again.";
  toast.error(message);
}
```

### Retry Mechanisms

Failed operations can be retried:
- QR scanner: Retry button after error
- Check-in: Click button again
- Network errors: Auto-retry with exponential backoff (tRPC default)

### Fallback UI

Graceful degradation:
- QR scanner fails → Manual ticket entry
- Camera denied → Manual ticket entry
- Network offline → Show cached data, disable check-in

---

## Testing Considerations

### Component Tests

Test each component in isolation:

```typescript
describe("QuickCheckInDrawer", () => {
  it("shows 'Ready to Check In' when not checked in", () => {
    render(<QuickCheckInDrawer isCheckedIn={false} {...props} />);
    expect(screen.getByText("Ready to Check In")).toBeInTheDocument();
  });

  it("shows 'Already Checked In' when checked in", () => {
    render(<QuickCheckInDrawer isCheckedIn={true} {...props} />);
    expect(screen.getByText("Already Checked In")).toBeInTheDocument();
  });
});
```

### Integration Tests

Test full workflows:

```typescript
it("checks in attendee via QR scan", async () => {
  render(<CheckInPage />);
  
  // Simulate QR scan
  const scanner = screen.getByTestId("qr-scanner");
  fireEvent.scan(scanner, "TKT-2025-ABC123");
  
  // Drawer appears
  await waitFor(() => {
    expect(screen.getByText("Ready to Check In")).toBeInTheDocument();
  });
  
  // Confirm check-in
  fireEvent.click(screen.getByText("Check In"));
  
  // Success
  await waitFor(() => {
    expect(screen.getByText("Checked in successfully!")).toBeInTheDocument();
  });
});
```

---

## Related Documentation

- [Check-In Module Overview](./README.md)
- [Backend Documentation](./backend.md)
- [Workflows](./workflows.md)
