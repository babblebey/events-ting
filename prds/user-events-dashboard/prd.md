# PRD: User Events Dashboard

**Status**: 🔴 Not Started  
**Priority**: High  
**Created**: November 11, 2025  
**Issue**: [#7 - Implement user events dashboard](https://github.com/babblebey/events-ting/issues/7)  
**Issue Type**: Feature Enhancement

---

## Problem Statement

### Business Need
Currently, when users authenticate into the Events-Ting platform, they are not immediately directed to a centralized dashboard showing their managed events. Instead, users must navigate through the application to find their events, leading to:
1. Poor onboarding experience for new users
2. Friction in accessing event management features
3. No clear "home base" for event organizers
4. Inefficient workflow for users managing multiple events

The platform needs a dedicated landing page that serves as the primary hub for authenticated users, displaying all events they organize/manage with quick access to key metrics and management functions.

### User Impact
**Primary Users**: Event organizers and administrators  
**Secondary Users**: Team members managing events (future enhancement)

**Current Pain Points**:
- No default landing page after authentication
- Cannot see all managed events at a glance
- Must remember event URLs or navigate through menus
- No overview of event statuses across portfolio
- Difficult to prioritize which events need attention
- No quick access to recently accessed events

### Use Case Scenario
> *Sarah is an event organizer managing 3 different conferences. After signing in, she wants to quickly see the status of all her events, check which ones have pending CFP submissions, see registration numbers, and jump directly into the event that needs her attention most urgently. Currently, she has to manually navigate to each event or remember their URLs.*

---

## Goals & Success Criteria

### Primary Goals
1. **Provide a centralized dashboard** that displays all user-managed events
2. **Enable quick access** to event management features from the dashboard
3. **Display key metrics** for each event at a glance
4. **Improve post-authentication UX** with clear next steps
5. **Support efficient event portfolio management** for users with multiple events

### Success Metrics
- ✅ 100% of authenticated users land on dashboard after sign-in
- ✅ Users can see all their events in under 2 seconds
- ✅ 90%+ of users navigate to event management from dashboard (not URL)
- ✅ Dashboard loads in <1s for users with up to 50 events
- ✅ Zero navigation confusion in user testing

### Out of Scope (MVP)
- ❌ Team collaboration features (shared event management)
- ❌ Dashboard widgets or customizable layouts
- ❌ Event templates or quick-create wizards
- ❌ Analytics charts and trend visualization
- ❌ Cross-event reporting and aggregation
- ❌ Event archiving/bulk operations from dashboard
- ❌ Search and advanced filtering (beyond basic status filters)

---

## User Stories

### US1: View Events Dashboard After Authentication
**As an** event organizer  
**I want to** be redirected to my events dashboard after signing in  
**So that** I can immediately see and access all my managed events

**Acceptance Criteria**:
- After successful authentication, user is redirected to `/dashboard`
- Dashboard displays all events where `organizerId` matches `session.user.id`
- Events are displayed in a card/list format with key information
- If user has no events, show empty state with "Create Event" CTA
- Loading state shows skeleton UI during data fetch
- Dashboard is mobile-responsive

---

### US2: View Event Cards with Key Information
**As an** event organizer  
**I want to** see key information for each event on the dashboard  
**So that** I can quickly assess event status without drilling into details

**Acceptance Criteria**:
- Each event card displays:
  - Event name
  - Event date (formatted with timezone awareness)
  - Event status badge (draft, published, archived)
  - Location type (in-person, virtual, hybrid) with icon
  - Thumbnail image (if available) or placeholder
  - Total registrations count
  - Quick action buttons (Manage, Edit, View Event)
- Status badges are color-coded:
  - Draft: Yellow/Orange
  - Published: Green
  - Archived: Gray
- Events are sorted by start date:
  - Upcoming events (startDate >= today): Sorted ascending (soonest first)
  - Past events (startDate < today): Appear after upcoming events, sorted descending (most recent first)
- Display shows whether event is upcoming or past

---

### US3: Navigate to Event Management
**As an** event organizer  
**I want to** quickly navigate to a specific event's management dashboard  
**So that** I can perform event-specific tasks efficiently

**Acceptance Criteria**:
- Clicking event card navigates to `/{eventId}` (event dashboard)
- "Manage" button navigates to `/{eventId}` (event dashboard)
- "Edit" button navigates to `/{eventId}/settings` (event settings page)
- "View Event" button opens public event page at `/events/{slug}` in new tab
- Hover state provides visual feedback
- Navigation preserves scroll position when returning to dashboard

**Note**: Current implementation uses `/{eventId}` for event routes. Future refactoring may move to `/dashboard/{eventId}` or `/dashboard/{slug}` for better semantics.

---

### US4: Filter Events by Status
**As an** event organizer managing multiple events  
**I want to** filter events by status  
**So that** I can focus on draft, published, or archived events

**Acceptance Criteria**:
- Filter tabs/pills at top: "All", "Draft", "Published", "Archived"
- Default view shows "All" (includes draft, published, and archived - all events)
- Clicking a filter updates the event list without page reload
- Count badges show number of events in each status
- Filter selection persists in URL query params (e.g., `?status=draft`)
- No events matching filter shows appropriate empty state

---

### US5: Create New Event from Dashboard
**As an** event organizer  
**I want to** create a new event directly from the dashboard  
**So that** I can quickly start setting up a new event

**Acceptance Criteria**:
- Prominent "Create Event" button in dashboard header
- Button navigates to `/create-event` (existing route)
- Empty state includes large "Create Your First Event" CTA
- Consistent with existing event creation flow
- After event creation, user is redirected to new event's dashboard

---

### US6: Handle Performance with Many Events
**As a** power user with many events  
**I want** the dashboard to load quickly even with 50+ events  
**So that** I can efficiently manage my event portfolio

**Acceptance Criteria**:
- Pagination: Display 20 events per page
- Infinite scroll OR "Load More" button for additional events
- Initial page load (first 20 events) returns in <1s
- Subsequent pages load in <500ms
- Total event count displayed using separate count query: "Showing 20 of 47 events"
- Optimistic UI updates when filtering/navigating

**Technical Note**: Use cursor-based pagination with a separate `count()` query to display accurate totals. This requires two queries but provides better UX and performance at scale.

---

## Technical Design

### Architecture Decisions

#### Routing Strategy
**Dashboard Location**: `/dashboard` (root level under `(dashboard)` route group)

**Rationale**:
- Clear, semantic URL for user's event portfolio
- Separates user dashboard from individual event dashboards (currently at `/{eventId}`)
- Aligns with existing route structure (`/create-event`)

**Note**: Current implementation uses `/{eventId}` for event-specific routes (e.g., `/{eventId}`, `/{eventId}/settings`). Future refactoring may consolidate routes under `/dashboard/{eventId}` or use slugs (`/dashboard/{slug}`) for better URL semantics.

#### Authentication Flow
**Post-Sign-In Redirect**: 
- Default NextAuth redirect: `/dashboard`
- If user was redirected to sign-in from a protected page, return to that page (using `callbackUrl`)
- If user navigates to sign-in directly, redirect to `/dashboard` after authentication
- Configured in `src/server/auth.ts` callbacks

**Authorization**:
- All routes under `(dashboard)` require authentication
- Layout-level auth check with redirect to `/auth/signin?callbackUrl={currentUrl}`
- Individual event dashboards verify organizer ownership

#### Data Fetching Strategy
**Server Components** (Recommended):
- Use `api.event.list.useQuery()` for initial SSR
- Enables fast initial page load with hydrated data
- SEO-friendly (though dashboard is authenticated)

**Client Components** (Alternative):
- Use `api.event.list.useQuery()` in client component
- Enables filtering/sorting without page reload
- Better for interactive features

**Hybrid Approach** (Chosen):
- Server component fetches initial data (first 20 events)
- Client component handles filtering, pagination, interactions
- Best of both: fast initial load + rich interactivity

---

### Data Model

No new database tables required. Dashboard queries existing `Event` model.

**Query Structure**:
```typescript
const events = await db.event.findMany({
  where: {
    organizerId: session.user.id,
    ...(statusFilter && { status: statusFilter }),
  },
  orderBy: [
    { startDate: 'asc' }, // Upcoming events first (soonest)
  ],
  include: {
    _count: {
      select: {
        registrations: true,
        ticketTypes: true,
        scheduleEntries: true,
      },
    },
  },
  take: 20,
  skip: (page - 1) * 20,
});

// Separate count query for "Showing X of Y"
const totalCount = await db.event.count({
  where: {
    organizerId: session.user.id,
    ...(statusFilter && { status: statusFilter }),
  },
});
```

**Sorting Logic**:
- Upcoming events (startDate >= today): Sorted by `startDate` ASC (soonest first)
- Past events (startDate < today): Appear after all upcoming events, sorted by `startDate` DESC (most recent past event first)
- This can be implemented with conditional ordering or by splitting into two queries and merging results

**Data Returned per Event**:
- `id`, `slug`, `name`, `description`
- `startDate`, `endDate`, `timezone`
- `locationType`, `locationAddress`, `locationUrl`
- `status`, `isArchived`
- `_count.registrations` (total attendees)
- `_count.ticketTypes` (ticket options)
- `_count.scheduleEntries` (sessions)

---

### System Architecture

#### Component Hierarchy
```
/dashboard
└── DashboardPage (Server Component)
    └── EventsDashboard (Client Component)
        ├── DashboardHeader
        │   ├── Title & Description
        │   └── CreateEventButton
        ├── StatusFilter
        │   └── FilterTabs (All, Draft, Published, Archived)
        ├── EventsGrid
        │   └── EventCard (repeated)
        │       ├── EventImage
        │       ├── EventHeader (name, status badge)
        │       ├── EventMetadata (date, location, counts)
        │       └── ActionButtons (Manage, Edit, View)
        ├── EmptyState (if no events)
        └── Pagination (if >20 events)
```

#### Page Structure

**File**: `src/app/(dashboard)/page.tsx`  
**Route**: `/dashboard`  
**Type**: Server Component with Client Component for interactions

```typescript
// src/app/(dashboard)/page.tsx
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import { EventsDashboard } from "./_components/events-dashboard";

export const metadata = {
  title: "My Events | Events Ting",
  description: "Manage all your events",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Fetch initial events (first page)
  const initialEvents = await api.event.list({
    organizerId: session.user.id,
    status: searchParams.status as "draft" | "published" | "archived" | undefined,
    limit: 20,
  });

  return <EventsDashboard initialEvents={initialEvents} />;
}
```

---

### API Design

#### Existing Router: `eventRouter`

The dashboard will use the existing `event.list` procedure with organizer filtering.

**Current Implementation**: `src/server/api/routers/event.ts`

```typescript
list: publicProcedure
  .input(listEventsSchema)
  .query(async ({ ctx, input }) => {
    const { limit, cursor, status, organizerId } = input;

    const isAuthenticated = !!ctx.session;
    const baseWhere = isAuthenticated
      ? {
          ...(status && { status }),
          ...(organizerId && { organizerId }),
        }
      : {
          status: "published" as const,
          isArchived: false,
        };

    const events = await ctx.db.event.findMany({
      where: baseWhere,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { startDate: "desc" },
      include: {
        organizer: { select: { id: true, name: true } },
        _count: {
          select: {
            registrations: true,
            ticketTypes: true,
            scheduleEntries: true,
          },
        },
      },
    });

    let nextCursor: string | undefined = undefined;
    if (events.length > limit) {
      const nextItem = events.pop();
      nextCursor = nextItem?.id;
    }

    return {
      events,
      nextCursor,
    };
  }),
```

#### Enhancements Needed

**1. Add status filtering to include archived events**:
```typescript
const baseWhere = isAuthenticated
  ? {
      organizerId,
      ...(status && { status }),
      // Note: When status filter is "All", include archived events
      // When specific status selected, filter by that status
    }
  : {
      status: "published" as const,
      isArchived: false,
    };
```

**2. Add status counts query** (new procedure):
```typescript
getStatusCounts: protectedProcedure
  .query(async ({ ctx }) => {
    const [draft, published, archived, all] = await Promise.all([
      ctx.db.event.count({
        where: { organizerId: ctx.session.user.id, status: "draft" },
      }),
      ctx.db.event.count({
        where: { organizerId: ctx.session.user.id, status: "published" },
      }),
      ctx.db.event.count({
        where: { organizerId: ctx.session.user.id, isArchived: true },
      }),
      ctx.db.event.count({
        where: { organizerId: ctx.session.user.id },
      }),
    ]);

    return {
      all, // Total count including archived
      draft,
      published,
      archived,
    };
  }),
```

**3. Add total count return to list query**:
```typescript
// Return both events and total count
return {
  events,
  nextCursor,
  totalCount, // For "Showing X of Y" display
};
```

---

### Authentication & Authorization

#### NextAuth Configuration

**Update**: `src/server/auth.ts`

```typescript
export const authOptions: NextAuthOptions = {
  // ... existing config
  callbacks: {
    // ... existing callbacks
    async redirect({ url, baseUrl }) {
      // If a callbackUrl is provided, use it (user was redirected to sign-in)
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      
      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      
      // Default redirect to dashboard (direct sign-in)
      return `${baseUrl}/dashboard`;
    },
  },
};
```

#### Route Protection

**Existing**: `src/app/(dashboard)/layout.tsx`

The existing layout already handles authentication:
```typescript
async function DashboardLayout({ children, params }: EventDashboardLayoutProps) {
  const session = await auth();

  // Redirect to sign-in if not authenticated
  if (!session?.user) {
    redirect("/auth/signin");
  }
  
  // ... rest of layout
}
```

This protection applies to all routes under `(dashboard)/`, including the new dashboard page.

---

### UI/UX Design

#### Dashboard Layout

**Desktop View**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Events Ting                    [Profile ▾]    [Sign Out]       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  My Events                                    [+ Create Event]  │
│  Manage all your events in one place                            │
│                                                                  │
│  [All (12)] [Draft (3)] [Published (8)] [Archived (1)]         │
│  ━━━━━━━                                                         │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │ 📷              │  │ 📷              │  │ 📷              ││
│  │                 │  │                 │  │                 ││
│  │ Tech Summit     │  │ DevOps Days     │  │ JS Conference   ││
│  │ 2025            │  │ Nov 2025        │  │ Dec 2025        ││
│  │ [Published ✓]   │  │ [Draft ⚠]       │  │ [Published ✓]   ││
│  │                 │  │                 │  │                 ││
│  │ 📅 Dec 15-17    │  │ 📅 Nov 20-21    │  │ 📅 Dec 5-6      ││
│  │ 📍 Virtual      │  │ 📍 San Francisco│  │ 📍 Hybrid       ││
│  │ 👥 247 attendees│  │ 👥 12 attendees │  │ 👥 89 attendees ││
│  │                 │  │                 │  │                 ││
│  │ [Manage]  [Edit]│  │ [Manage]  [Edit]│  │ [Manage]  [Edit]││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
│                                                                  │
│  Showing 3 of 12 events                        [Load More]     │
└─────────────────────────────────────────────────────────────────┘
```

**Mobile View**:
```
┌─────────────────────────────┐
│  ☰  Events Ting       [👤] │
├─────────────────────────────┤
│                              │
│  My Events                   │
│  [+ Create Event]            │
│                              │
│  [All]                       │
│  [Draft]                     │
│  [Published]                 │
│  [Archived]                  │
│  ━━━━━                       │
│                              │
│  ┌──────────────────────────┐│
│  │ 📷 Tech Summit 2025      ││
│  │ [Published ✓]            ││
│  │                          ││
│  │ 📅 Dec 15-17, 2025       ││
│  │ 📍 Virtual               ││
│  │ 👥 247 attendees         ││
│  │                          ││
│  │ [Manage]         [Edit]  ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ 📷 DevOps Days           ││
│  │ [Draft ⚠]                ││
│  │ ...                      ││
│  └──────────────────────────┘│
│                              │
│  [Load More]                 │
└─────────────────────────────┘
```

**Note**: Filter tabs are stacked vertically on mobile for better touch targets and readability.

#### Event Card Design

**Information Hierarchy**:
1. **Visual**: Thumbnail image or gradient placeholder
2. **Status**: Badge (top-right overlay)
3. **Title**: Event name (bold, 18-20px)
4. **Metadata**:
   - Date (icon + formatted range)
   - Location (icon + type/address)
   - Attendees (icon + count)
5. **Actions**: Primary "Manage" button (prominent), secondary "Edit" button, tertiary "View Event" link

**State Variations**:
- **Upcoming Event**: Bright colors, "Manage" CTA prominent
- **Past Event**: Muted colors, "View Results" CTA
- **Draft Event**: Warning accent, "Finish Setup" CTA
- **Archived Event**: Gray scale, "View Archive" CTA

**Action Buttons**:
- **Manage**: Primary action, navigates to `/{eventId}` (event dashboard)
- **Edit**: Secondary action, navigates to `/{eventId}/settings` (event settings)
- **View Event**: Opens public event page at `/events/{slug}` in new tab

#### Empty States

**No Events Created**:
```
┌─────────────────────────────────────────┐
│                                          │
│            📅                            │
│                                          │
│      Create Your First Event             │
│                                          │
│   Start managing amazing events with     │
│   Events Ting. It takes just a few       │
│   minutes to get started.                │
│                                          │
│        [Create Your First Event]         │
│                                          │
└─────────────────────────────────────────┘
```

**No Events Match Filter**:
```
┌─────────────────────────────────────────┐
│                                          │
│            🔍                            │
│                                          │
│     No Draft Events Found                │
│                                          │
│   You don't have any draft events.       │
│   All your events are published!         │
│                                          │
│        [View All Events]                 │
│                                          │
└─────────────────────────────────────────┘
```

**Note**: "View All Events" button clears the active filter and shows all events (returns to "All" tab).

---

## Implementation Plan

### Phase 1: Core Dashboard Page (Day 1, 4-5 hours)

- [ ] Create `src/app/(dashboard)/page.tsx` (Server Component)
- [ ] Implement authentication check and redirect logic
- [ ] Fetch initial events using `api.event.list` with `organizerId` filter
- [ ] Add `searchParams` handling for status filter from URL
- [ ] Pass initial data to client component
- [ ] Add page metadata (title, description)
- [ ] Test authentication flow (redirect when not logged in)
- [ ] Update `src/server/auth.ts` redirect callback to `/dashboard`

**Deliverable**: Authenticated dashboard route that fetches user events

---

### Phase 2: Event Card Component (Day 1-2, 5-6 hours)

- [ ] Create `src/app/(dashboard)/_components/event-card.tsx`
- [ ] Implement event card layout with image, title, metadata
- [ ] Add status badge component with color variants
- [ ] Format dates with timezone awareness (using `date-fns` or similar)
- [ ] Add location type icon mapping (virtual, in-person, hybrid)
- [ ] Display registration count with icon
- [ ] Implement action buttons (Manage, Edit, View Event)
- [ ] Add hover states and transitions
- [ ] Make card clickable (navigate on click)
- [ ] Responsive design (card stacking on mobile)
- [ ] Add loading skeleton variant

**Deliverable**: Reusable event card component with all metadata

---

### Phase 3: Events Grid & List Management (Day 2, 4-5 hours)

- [ ] Create `src/app/(dashboard)/_components/events-dashboard.tsx` (Client Component)
- [ ] Implement events grid layout (responsive grid)
- [ ] Add grid/list view toggle (optional for MVP)
- [ ] Handle empty events array
- [ ] Sort events by date (upcoming first, then past)
- [ ] Add visual distinction for past events
- [ ] Implement loading states during data fetch
- [ ] Error handling with retry option
- [ ] Test with various event counts (0, 1, 5, 20+)

**Deliverable**: Events grid displaying all user events

---

### Phase 4: Status Filtering (Day 2-3, 4-5 hours)

- [ ] Create `src/app/(dashboard)/_components/status-filter.tsx`
- [ ] Implement filter tabs: All, Draft, Published, Archived
- [ ] Add count badges to each tab
- [ ] Create `getStatusCounts` tRPC procedure
- [ ] Update filter state on tab click
- [ ] Update URL query params on filter change
- [ ] Re-fetch events based on active filter
- [ ] Show appropriate empty state when no events match
- [ ] Add loading indicator during filter switch
- [ ] Test filter persistence (refresh page maintains filter)

**Deliverable**: Functional status filtering with counts

---

### Phase 5: Dashboard Header & Actions (Day 3, 3-4 hours)

- [ ] Create `src/app/(dashboard)/_components/dashboard-header.tsx`
- [ ] Add page title and description
- [ ] Implement "Create Event" button (navigates to `/dashboard/create-event`)
- [ ] Add user profile dropdown (name, email, sign out)
- [ ] Style header with consistent spacing
- [ ] Make header sticky on scroll (optional)
- [ ] Responsive header (collapse on mobile)

**Deliverable**: Dashboard header with creation CTA

---

### Phase 6: Empty States (Day 3, 2-3 hours)

- [ ] Create `src/app/(dashboard)/_components/empty-state.tsx`
- [ ] Implement "No events" empty state with CTA
- [ ] Implement "No events match filter" empty state
- [ ] Add illustrations or icons
- [ ] Different messaging per state
- [ ] Make empty state responsive

**Deliverable**: Polished empty state experiences

---

### Phase 7: Pagination & Performance (Day 4, 4-5 hours)

- [ ] Implement cursor-based pagination in `event.list` query
- [ ] Add "Load More" button to dashboard
- [ ] Show "Showing X of Y events" counter
- [ ] Implement optimistic updates when navigating
- [ ] Add pagination state management
- [ ] Test with 50+ events
- [ ] Optimize query (select only needed fields)
- [ ] Add query caching strategy with React Query
- [ ] Implement infinite scroll (optional alternative)

**Deliverable**: Dashboard handles large event portfolios efficiently

---

### Phase 8: Navigation & Integration (Day 4, 2-3 hours)

- [ ] Update sign-in page redirect to `/dashboard` (already in auth config)
- [ ] Update app navigation to include dashboard link
- [ ] Add breadcrumbs to event dashboard pages (back to dashboard)
- [ ] Test navigation flow: Sign in → Dashboard → Event → Back to Dashboard
- [ ] Update landing page CTA for authenticated users (show "Go to Dashboard")
- [ ] Ensure event creation redirects back to dashboard after completion

**Deliverable**: Seamless navigation throughout app

---

### Phase 9: Manual Testing & QA (Day 5, 4-5 hours)

- [ ] Manual testing with different user scenarios:
  - New user (no events)
  - User with 1 event
  - User with 5 events (mixed statuses)
  - User with 25+ events (pagination)
- [ ] Test authentication flows:
  - Direct navigation while logged out
  - Sign in redirect
  - Session expiry
- [ ] Test filtering and sorting functionality
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Performance testing (load time, interaction speed)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Test all navigation flows and user journeys
- [ ] Verify error states and edge cases

**Deliverable**: Comprehensive manual QA validation

---

### Phase 10: Documentation & Polish (Day 5-6, 3-4 hours)

#### Code Documentation
- [ ] Add JSDoc comments to dashboard components
- [ ] Document component props with TypeScript interfaces
- [ ] Add inline code comments for complex logic
- [ ] Create component usage examples

#### User Documentation
- [ ] Update getting started guide with dashboard information
- [ ] Add dashboard section to user guide (if exists)
- [ ] Create dashboard feature walkthrough
- [ ] Document keyboard shortcuts (if implemented)

#### Module Documentation Updates

- [ ] **Create `docs/modules/dashboard/README.md`**:
  - Overview of dashboard module
  - User roles (organizers only for MVP)
  - Features list (event listing, filtering, navigation)
  - Module dependencies (Events, Authentication)
  - Future enhancements

- [ ] **Create `docs/modules/dashboard/frontend.md`**:
  - Document dashboard page structure
  - Document EventCard component
  - Document StatusFilter component
  - Document EmptyState variants
  - Add UI component tree
  - Document responsive behavior

- [ ] **Create `docs/modules/dashboard/workflows.md`**:
  - Workflow 1: First-time user creating event from dashboard
  - Workflow 2: Organizer accessing existing event
  - Workflow 3: Filtering events by status
  - Workflow 4: Managing multiple events

- [ ] **Update `docs/architecture/file-structure.md`**:
  - Add dashboard page to `(dashboard)/` route group section
  - Document dashboard components location

- [ ] **Update `docs/getting-started.md`**:
  - Update post-authentication flow (redirects to dashboard)
  - Add dashboard screenshot/description
  - Update "First Steps" section

- [ ] **Update `docs/modules/events/README.md`**:
  - Add reference to dashboard as primary entry point
  - Update navigation flow description

- [ ] **Update `docs/index.md`**:
  - Add "Dashboard" to the Modules section
  - Add dashboard quick reference link
  - Update "Common Tasks" section to include dashboard navigation

- [ ] **Update `docs/README.md`**:
  - Add Dashboard to module interconnection map/diagram
  - Add dashboard to "I want to..." navigation section
  - Update learning path to include dashboard as starting point

- [ ] **Update `docs/api/routers.md`** (if new procedures added):
  - Document any new dashboard-specific API procedures
  - Update event router documentation if list query changes
  - Add examples for dashboard-related API calls

**Deliverable**: Complete documentation for dashboard feature

---

## User Experience Flows

### Flow 1: New User First Visit

1. User signs up or signs in
2. Redirected to `/dashboard` (default redirect)
3. Sees empty state: "Create Your First Event"
4. Clicks "Create Your First Event" button
5. Navigates to `/create-event`
6. Fills out event form and submits
7. Redirected to new event dashboard at `/{eventId}`
8. Can click "Back to Dashboard" or use navigation to return to `/dashboard`

### Flow 2: Returning User with Events

1. User signs in
2. Redirected to `/dashboard` (default redirect)
3. Sees grid of event cards (sorted by date: upcoming first, then past)
4. Reviews event statuses and metrics at a glance
5. Clicks "Manage" on an event needing attention
6. Navigates to event-specific dashboard at `/{eventId}`
7. Completes task
8. Returns to main dashboard via navigation or back button

### Flow 3: Power User Managing Portfolio

1. User signs in (has 30+ events)
2. Redirected to `/dashboard` (default redirect)
3. Sees first 20 events (sorted: upcoming first, then past)
4. Clicks "Draft" filter to see only draft events
5. Reviews 5 draft events
6. Opens one to complete setup (navigates to `/{eventId}`)
7. Returns to dashboard (filter persists - still showing "Draft")
8. Clicks "Published" to review active events
9. Scrolls down and clicks "Load More"
10. Reviews additional published events

### Flow 4: Protected Route Redirect

1. User (logged out) tries to access `/{eventId}` (requires auth)
2. Redirected to `/auth/signin?callbackUrl=/{eventId}`
3. User signs in
4. Redirected back to `/{eventId}` (intended destination)
5. Can navigate to `/dashboard` if needed to see all events

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance issues with many events | Medium | Medium | Implement pagination with separate count query, optimize queries, add indexes |
| Route conflicts with event slugs | Low | High | Use explicit `/dashboard` route with documented future refactoring plan |
| Date formatting inconsistencies | Medium | Low | Use standardized library (date-fns), timezone-aware |
| Mobile responsiveness issues | Low | Medium | Mobile-first design with stacked filter buttons, thorough testing |
| Authentication edge cases | Low | High | Comprehensive auth testing with callbackUrl handling, session expiry testing |
| Complex sorting logic (upcoming vs past) | Medium | Low | Implement clear sorting strategy, test edge cases (today's events) |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Users expect more dashboard features | High | Low | Clear MVP scope, collect feedback for Phase 2 |
| Confusion between event dashboard and main dashboard | Medium | Medium | Clear naming, distinct visual design |
| Users expect team collaboration | Medium | Medium | Document as future feature, single-user MVP |

---

## Dependencies

### External Libraries
- **Date Formatting**: `date-fns` (existing) - Date display and timezone handling
- **Icons**: `lucide-react` (existing) - Icons for status, location, etc.
- **UI Components**: Flowbite React (existing) - Cards, buttons, badges

### Internal Dependencies
- ✅ Event Management System (must exist)
- ✅ Authentication (NextAuth) (must be configured)
- ✅ Event Router (`event.list` procedure)
- ✅ User session management

### Infrastructure Requirements
- Database: PostgreSQL (existing)
- No new infrastructure needed

---

## Post-Launch Improvements

### Phase 2 Enhancements
1. **Quick Stats Dashboard**: Aggregate metrics across all events
2. **Search & Advanced Filtering**: Search by name, date range filters
3. **Bulk Actions**: Archive/publish multiple events at once
4. **Dashboard Customization**: Reorder cards, pin favorites
5. **Recent Activity Feed**: Show latest registrations, submissions across events
6. **Event Templates**: Quick-create from previous events
7. **Calendar View**: Month/week view of all events
8. **Export Options**: Download event list as CSV/PDF

### Future Integrations
- **Team Collaboration**: Shared event management (multiple organizers)
- **Analytics Dashboard**: Charts and trends visualization
- **Notifications Center**: Alerts for events needing attention
- **Mobile App**: Dedicated mobile experience
- **Keyboard Shortcuts**: Power user productivity features

---

## Success Metrics & KPIs

### Quantitative Metrics (Week 1 Post-Launch)
- ✅ **Adoption**: 100% of authenticated users see dashboard first
- ✅ **Performance**: Dashboard loads in <1s for 95% of users
- ✅ **Engagement**: 80%+ of event access happens via dashboard
- ✅ **Retention**: Users return to dashboard 3+ times per session

### Qualitative Metrics
- ✅ **User Satisfaction**: 4+ star rating for dashboard UX
- ✅ **Navigation Clarity**: Zero confusion in user testing
- ✅ **Perceived Value**: Users report time savings

### Business Impact
- ✅ **Reduced Support Tickets**: 50% fewer "how do I find my events" tickets
- ✅ **Increased Engagement**: 25% increase in event management activity
- ✅ **Faster Onboarding**: New users create second event 30% faster

---

## Testing Strategy

### Manual Testing Approach

Since the project does not have automated testing infrastructure, all testing will be performed manually through comprehensive QA processes.

### Manual QA Checklist

**Authentication & Access**
- [ ] Sign in redirects to dashboard
- [ ] Unauthenticated users redirected to sign-in
- [ ] Session expiry handling works correctly
- [ ] Sign out from dashboard works

**Display & Layout**
- [ ] Empty state displays for new users with no events
- [ ] Events display correctly (all metadata visible)
- [ ] Status badges match event status and are color-coded
- [ ] Event cards show correct dates with timezone
- [ ] Location icons display correctly (virtual, in-person, hybrid)
- [ ] Registration counts are accurate

**Filtering & Sorting**
- [ ] Filter tabs show correct event counts
- [ ] Clicking filter updates event list
- [ ] URL updates with filter query params
- [ ] Filter persists on page refresh
- [ ] Empty state shows when no events match filter
- [ ] Events sorted correctly by date (upcoming first)

**Pagination**
- [ ] "Load More" button appears when >20 events
- [ ] Pagination loads additional events correctly
- [ ] "Showing X of Y events" counter is accurate
- [ ] Performance acceptable with 50+ events

**Navigation**
- [ ] Clicking event card navigates to event dashboard
- [ ] "Manage" button navigates correctly
- [ ] "Create Event" button works
- [ ] Breadcrumbs allow return to dashboard
- [ ] Navigation preserves scroll position

**Responsive Design**
- [ ] Desktop view displays correctly (1920px, 1440px, 1024px)
- [ ] Tablet view works properly (768px)
- [ ] Mobile view is fully functional (375px, 414px)
- [ ] Cards stack appropriately on small screens
- [ ] Filter tabs stack vertically on mobile (stacked buttons)

**Performance**
- [ ] Dashboard loads in <1s with up to 20 events
- [ ] Dashboard loads in <2s with 50+ events
- [ ] Filter switches are instantaneous (<200ms)
- [ ] Pagination loads in <500ms
- [ ] No noticeable lag during interactions

**Accessibility**
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Focus indicators visible
- [ ] Screen reader announcements make sense
- [ ] Color contrast meets WCAG standards
- [ ] Alt text present for images

**Error Handling**
- [ ] Loading states display correctly
- [ ] Error states handle failures gracefully
- [ ] Network errors show retry option
- [ ] 404 handling for invalid event IDs
- [ ] Graceful degradation when data incomplete

**Cross-Browser Testing**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## Launch Checklist

### Pre-Launch
- [ ] All phases completed and tested
- [ ] Documentation published
- [ ] Performance benchmarks met (< 1s load time)
- [ ] Mobile responsiveness verified
- [ ] Cross-browser testing completed
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Security review completed
- [ ] Staging deployment successful

### Launch Day
- [ ] Deploy to production
- [ ] Monitor error logs for first 2 hours
- [ ] Verify redirect flow works in production
- [ ] Test with real user accounts
- [ ] Monitor performance metrics
- [ ] Have rollback plan ready

### Post-Launch (Week 1)
- [ ] Collect user feedback via survey
- [ ] Monitor analytics (page views, navigation patterns)
- [ ] Review support tickets for issues
- [ ] Document common user questions
- [ ] Plan Phase 2 enhancements based on feedback

---

## Estimated Effort

**Total Development Time**: 5-6 days (40-48 hours)

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Core Dashboard Page | 4-5 hours | None |
| Phase 2: Event Card Component | 5-6 hours | Phase 1 |
| Phase 3: Events Grid | 4-5 hours | Phase 2 |
| Phase 4: Status Filtering | 4-5 hours | Phase 3 |
| Phase 5: Dashboard Header | 3-4 hours | Phase 3 |
| Phase 6: Empty States | 2-3 hours | Phase 3 |
| Phase 7: Pagination | 4-5 hours | Phase 3 |
| Phase 8: Navigation | 2-3 hours | Phase 7 |
| Phase 9: Manual Testing & QA | 4-5 hours | Phase 8 |
| Phase 10: Documentation | 3-4 hours | Phase 9 |

**Team Composition**: 1 full-stack developer  
**Timeline**: 5-6 business days with buffer  
**Confidence**: High - Well-defined scope, existing infrastructure

---

## Implementation Notes

### Design Decisions

**Why `/dashboard` instead of `/events`?**
- More semantic for user-centric view
- Differentiates from public `/events` listing
- Aligns with common dashboard patterns
- Allows future expansion (analytics, notifications, etc.)

**Why Server Component with Client Component child?**
- Fast initial page load (SSR)
- SEO-friendly (though authenticated)
- Hydration with initial data
- Client interactivity for filters/pagination
- Best of both rendering strategies

**Why cursor-based pagination instead of offset?**
- More performant for large datasets
- Consistent results during concurrent inserts
- Better for infinite scroll pattern
- Aligns with existing tRPC patterns

**Why no team collaboration in MVP?**
- Adds significant complexity (permissions, roles)
- User research shows single-organizer is most common
- Can be added later without breaking changes
- Keeps MVP scope focused and deliverable

### Lessons from Similar Features

- **Clear status indicators** are critical for multi-event management
- **Visual hierarchy** helps users scan quickly (date, status most important)
- **Empty states** significantly impact new user experience
- **Performance** is more important than feature richness for dashboards
- **Consistent navigation** reduces cognitive load

### Future Considerations

- **Multi-tenancy**: If team features are added, consider workspace/organization model
- **Webhooks**: Dashboard could show real-time updates (registrations, submissions)
- **Notifications**: Badge counts for events needing attention
- **Progressive Enhancement**: Add features gradually without overwhelming users
- **Localization**: Dashboard should support multiple languages/timezones

---

## Related Documentation

### Existing Documentation
- [Authentication & Authorization](../../docs/architecture/authentication.md) - Auth patterns
- [File Structure](../../docs/architecture/file-structure.md) - Route organization
- [Events Module](../../docs/modules/events/README.md) - Event management
- [API Routers](../../docs/api/routers.md) - Event router reference

### New Documentation (To Be Created)
- **Dashboard Module**: Complete module documentation
- **User Guide**: How to use the dashboard
- **Developer Guide**: Component API reference

---

## Approval & Sign-Off

**Product Owner**: @babblebey  
**Technical Lead**: @babblebey  
**Status**: Ready for Review

**Approved**: _Pending_  
**Date**: November 11, 2025

---

## Notes & Feedback

### Open Questions
1. ✅ **RESOLVED**: "All" filter shows all events including archived
2. ✅ **RESOLVED**: Events sorted by upcoming (asc) then past (desc)
3. ✅ **RESOLVED**: Using `/{eventId}` routes (current implementation)
4. ✅ **RESOLVED**: Cursor pagination + separate count query
5. ✅ **RESOLVED**: Create button navigates to `/create-event`
6. ✅ **RESOLVED**: "View All Events" clears active filter
7. ✅ **RESOLVED**: Manage → `/{eventId}`, Edit → `/{eventId}/settings`, View → `/events/{slug}`
8. ✅ **RESOLVED**: Stacked filter buttons on mobile
9. ✅ **RESOLVED**: Performance target is for initial 20 events load
10. ✅ **RESOLVED**: callbackUrl handling with default to `/dashboard`

### Design Considerations
- Keep the design consistent with existing event dashboards
- Ensure color scheme works for status badges (colorblind-friendly)
- Consider adding event category/tags for future filtering
- Plan for team collaboration UI (even if not in MVP)
- Stacked filter buttons on mobile provide better touch targets

### Technical Considerations
- Ensure query performance with proper database indexes
- Consider caching strategy for frequently accessed dashboard
- Plan for real-time updates (webhooks/polling) in future
- Ensure mobile performance is optimized (lazy loading images)
- Implement separate count query for accurate "Showing X of Y" display
- Handle edge cases: events happening today, timezone boundaries
- Future refactoring: consolidate routes under `/dashboard/{eventId}` or use `/dashboard/{slug}`

### Authentication Considerations
- Implement `callbackUrl` handling for seamless auth flow
- Default to `/dashboard` for direct sign-in (no callback)
- Preserve filter state in URL for return navigation
- Test session expiry during long dashboard sessions

---

**Last Updated**: November 11, 2025  
**Document Version**: 1.0  
**Next Review**: Post-Implementation

