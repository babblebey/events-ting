# Dashboard Workflows

## Overview

This document describes the key user workflows in the Dashboard module. Each workflow provides a step-by-step walkthrough of user actions, system responses, and expected outcomes.

---

## Workflow 1: First-Time User Creating Event from Dashboard

### Scenario
A new user signs up for Events-Ting and wants to create their first event.

### Preconditions
- User has successfully signed up/signed in
- User has no existing events

### Steps

#### 1. Sign In / Sign Up
**User Action**: User completes authentication
**System Response**: 
- Validates credentials
- Creates session
- Redirects to `/dashboard`

#### 2. View Empty Dashboard
**User Sees**:
```
┌─────────────────────────────────────────┐
│         My Events                       │
│  [+ Create Event]                       │
│                                          │
│           📅                            │
│                                          │
│    Create Your First Event              │
│                                          │
│  Start managing amazing events with     │
│  Events Ting. It takes just a few       │
│  minutes to get started.                │
│                                          │
│    [Create Your First Event]            │
└─────────────────────────────────────────┘
```

**System State**:
- Dashboard fetches events for user (returns empty array)
- Displays empty state component
- Renders prominent CTA button

#### 3. Click "Create Your First Event"
**User Action**: Clicks primary CTA button
**System Response**:
- Navigates to `/create-event`
- Pre-populates organizer information from session

#### 4. Fill Event Creation Form
**User Actions**:
- Enters event name: "Tech Summit 2025"
- Generates slug automatically: "tech-summit-2025"
- Enters description (minimum 50 characters)
- Selects location type: "Virtual"
- Enters event URL: "https://zoom.us/j/123456"
- Selects dates: Start: Dec 15, 2025, End: Dec 17, 2025
- Selects timezone: "America/New_York"

**System Response**:
- Validates each field in real-time
- Shows validation errors if any
- Enables "Create Event" button when form is valid

#### 5. Submit Event Creation
**User Action**: Clicks "Create Event" button
**System Response**:
- Validates all inputs server-side
- Creates Event record in database (status: "draft")
- Associates event with current user as organizer
- Returns created event with ID

**Database Changes**:
```sql
INSERT INTO Event (
  id, name, slug, description, 
  startDate, endDate, timezone,
  locationType, locationUrl,
  status, organizerId, createdAt
) VALUES (
  'cuid123', 'Tech Summit 2025', 'tech-summit-2025', '...',
  '2025-12-15T00:00:00Z', '2025-12-17T23:59:59Z', 'America/New_York',
  'virtual', 'https://zoom.us/j/123456',
  'draft', 'user123', NOW()
);
```

#### 6. Redirect to Event Dashboard
**System Response**:
- Redirects to `/[eventId]` (event-specific dashboard)
- Displays success toast: "Event created successfully!"
- Shows event dashboard with setup wizard

**User Sees**:
```
┌─────────────────────────────────────────┐
│  Tech Summit 2025               [Draft] │
│  ← Back to Dashboard                    │
│                                          │
│  Welcome to your event dashboard!       │
│                                          │
│  Next steps:                            │
│  [ ] Add ticket types                   │
│  [ ] Configure registration             │
│  [ ] Build schedule                     │
│  [ ] Publish event                      │
└─────────────────────────────────────────┘
```

#### 7. Return to Main Dashboard
**User Action**: Clicks "← Back to Dashboard" or uses navigation
**System Response**:
- Navigates to `/dashboard`
- Fetches updated event list
- Displays newly created event

**User Sees**:
```
┌─────────────────────────────────────────┐
│         My Events                       │
│  [+ Create Event]                       │
│                                          │
│  [All (1)] [Draft (1)] [Published (0)]  │
│                                          │
│  ┌──────────────────────────┐           │
│  │ 📷 Tech Summit 2025      │           │
│  │ [Draft ⚠]                │           │
│  │ 📅 Dec 15-17, 2025       │           │
│  │ 📍 Virtual               │           │
│  │ 👥 0 attendees           │           │
│  │ [Manage]         [Edit]  │           │
│  └──────────────────────────┘           │
│                                          │
│  Showing 1 of 1 events                  │
└─────────────────────────────────────────┘
```

### Postconditions
- ✅ User has created first event
- ✅ Event visible in dashboard (draft status)
- ✅ User can access event management dashboard
- ✅ User understands next steps

### Success Metrics
- Time from sign-in to first event creation: < 5 minutes
- Completion rate of event creation form: > 85%
- User returns to dashboard to create second event within 24 hours: > 40%

---

## Workflow 2: Organizer Accessing Existing Event

### Scenario
A returning user with existing events wants to manage a specific event.

### Preconditions
- User is signed in
- User has at least one event

### Steps

#### 1. Navigate to Dashboard
**User Action**: Signs in or clicks "Dashboard" in navigation
**System Response**:
- Fetches all events where `organizerId = user.id`
- Sorts events: upcoming first, then past
- Displays first 20 events with metadata

**User Sees**:
```
┌─────────────────────────────────────────────────────────────────┐
│  My Events                                    [+ Create Event]  │
│  Manage all your events in one place                            │
│                                                                  │
│  [All (5)] [Draft (1)] [Published (3)] [Archived (1)]          │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │ Tech Summit     │  │ DevOps Days     │  │ JS Conference   ││
│  │ 2025            │  │ Nov 2025        │  │ Dec 2025        ││
│  │ [Published ✓]   │  │ [Draft ⚠]       │  │ [Published ✓]   ││
│  │ ...             │  │ ...             │  │ ...             ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

#### 2. Review Event Card Information
**User Observes**:
- Event name and status badge
- Date: "Dec 15-17, 2025"
- Location: "Virtual Event"
- Attendance: "247 attendees"
- Action buttons: "Manage" and "Edit"

**System State**:
- Event data loaded with counts (registrations, tickets, sessions)
- Status badge color-coded (green for published, yellow for draft)
- Dates displayed in event timezone

#### 3. Click "Manage" Button
**User Action**: Clicks "Manage" button on "Tech Summit 2025" card
**System Response**:
- Validates user ownership: `event.organizerId === user.id`
- Navigates to `/[eventId]`
- Loads event-specific dashboard

**Navigation Path**: `/dashboard` → `/cuid123`

#### 4. View Event Dashboard
**User Sees**:
```
┌─────────────────────────────────────────┐
│  ← Back to Dashboard                    │
│                                          │
│  Tech Summit 2025            [Published]│
│  Dec 15-17, 2025 • Virtual              │
│                                          │
│  ┌─────────┬─────────┬─────────┐       │
│  │   247   │    4    │   18    │       │
│  │Attendees│ Tickets │ Sessions│       │
│  └─────────┴─────────┴─────────┘       │
│                                          │
│  Quick Actions:                         │
│  • View Registrations                   │
│  • Manage Schedule                      │
│  • Send Email Campaign                  │
│                                          │
│  Recent Activity:                       │
│  • New registration: John Doe (2m ago)  │
│  • CFP submission reviewed (1h ago)     │
└─────────────────────────────────────────┘
```

**Available Actions**:
- Navigate to Registrations (`/[id]/registrations`)
- Navigate to Schedule (`/[id]/schedule`)
- Navigate to Settings (`/[id]/settings`)
- Send email campaign (`/[id]/communications`)

#### 5. Complete Task
**User Action**: Performs event management task (e.g., reviews registrations)
**System Response**: Updates relevant data

#### 6. Return to Dashboard
**User Action**: Clicks "← Back to Dashboard" or uses navigation menu
**System Response**:
- Navigates to `/dashboard`
- Preserves previous filter state (if any)
- Scroll position restored (if possible)

### Postconditions
- ✅ User successfully accessed event management
- ✅ User completed intended task
- ✅ User can easily return to dashboard for next task

### Success Metrics
- Time from dashboard to event dashboard: < 2 seconds
- User can locate desired event without search: > 90%
- User returns to dashboard after task: > 70%

---

## Workflow 3: Filtering Events by Status

### Scenario
An organizer managing multiple events wants to focus on draft events that need completion.

### Preconditions
- User is signed in
- User has events in multiple statuses (draft, published, archived)

### Steps

#### 1. View All Events
**User Sees**:
```
┌─────────────────────────────────────────┐
│  [All (12)] [Draft (3)] [Published (8)] [Archived (1)]│
│  ━━━━━━━                                │
│                                          │
│  12 events displayed (mixed statuses)   │
└─────────────────────────────────────────┘
```

**System State**:
- Active filter: "All"
- URL: `/dashboard` (no query params)
- Displaying all events sorted by date

#### 2. Click "Draft" Filter
**User Action**: Clicks "Draft" tab
**System Response**:
- Updates active filter state
- Updates URL: `/dashboard?status=draft`
- Triggers new tRPC query with filter
- Shows loading indicator briefly

**Loading State**:
```
┌─────────────────────────────────────────┐
│  [All (12)] [Draft (3)] [Published (8)] │
│             ━━━━━━━                     │
│                                          │
│         🔄 Loading...                   │
└─────────────────────────────────────────┘
```

#### 3. View Filtered Results
**User Sees**:
```
┌─────────────────────────────────────────┐
│  [All (12)] [Draft (3)] [Published (8)] │
│             ━━━━━━━                     │
│                                          │
│  ┌──────────────────────────┐           │
│  │ 📷 DevOps Days           │           │
│  │ [Draft ⚠]                │           │
│  │ 📅 Nov 20-21, 2025       │           │
│  │ ...                      │           │
│  └──────────────────────────┘           │
│                                          │
│  ┌──────────────────────────┐           │
│  │ 📷 AI Summit             │           │
│  │ [Draft ⚠]                │           │
│  │ 📅 Jan 10-12, 2026       │           │
│  │ ...                      │           │
│  └──────────────────────────┘           │
│                                          │
│  ┌──────────────────────────┐           │
│  │ 📷 Cloud Conference       │           │
│  │ [Draft ⚠]                │           │
│  │ 📅 Feb 5-7, 2026         │           │
│  │ ...                      │           │
│  └──────────────────────────┘           │
│                                          │
│  Showing 3 of 3 events                  │
└─────────────────────────────────────────┘
```

**System State**:
- Filtered query: `event.list({ status: 'draft', organizerId: user.id })`
- Only draft events displayed
- URL reflects filter: `/dashboard?status=draft`

#### 4. Navigate to Event and Return
**User Action**: 
1. Clicks "Manage" on "DevOps Days"
2. Completes some setup tasks
3. Clicks "Back to Dashboard"

**System Response**:
- Navigates to event dashboard
- Completes tasks
- Returns to `/dashboard?status=draft` (filter persists!)
- Shows same filtered view

**User Sees**:
```
┌─────────────────────────────────────────┐
│  [All (12)] [Draft (2)] [Published (9)] │
│             ━━━━━━━                     │
│                                          │
│  ✅ DevOps Days is now published!       │
│                                          │
│  ┌──────────────────────────┐           │
│  │ 📷 AI Summit             │           │
│  │ [Draft ⚠]                │           │
│  │ ...                      │           │
│  └──────────────────────────┘           │
│                                          │
│  ┌──────────────────────────┐           │
│  │ 📷 Cloud Conference       │           │
│  │ [Draft ⚠]                │           │
│  │ ...                      │           │
│  └──────────────────────────┘           │
│                                          │
│  Showing 2 of 2 events                  │
└─────────────────────────────────────────┘
```

**Notes**:
- Count badges updated: Draft (2), Published (9)
- Published event no longer in draft view
- Success toast: "DevOps Days is now published!"

#### 5. Switch to "Published" Filter
**User Action**: Clicks "Published" tab
**System Response**:
- Updates URL: `/dashboard?status=published`
- Fetches published events
- Displays 9 published events

#### 6. Clear Filter (View All)
**User Action**: Clicks "All" tab
**System Response**:
- Updates URL: `/dashboard` (removes query param)
- Fetches all events
- Displays complete event list

### Postconditions
- ✅ User can efficiently filter events by status
- ✅ Filter state persists across navigation
- ✅ Count badges accurately reflect event counts
- ✅ User can clear filter to see all events

### Success Metrics
- Filter response time: < 500ms
- Filter persistence accuracy: 100%
- Users using filters: > 60% of multi-event organizers

---

## Workflow 4: Managing Multiple Events

### Scenario
A power user managing 30+ events across different stages needs to efficiently navigate and maintain their event portfolio.

### Preconditions
- User is signed in
- User has 30+ events
- Events span draft, published, and archived statuses

### Steps

#### 1. View Initial Dashboard (First Page)
**User Sees**:
```
┌─────────────────────────────────────────┐
│  My Events                              │
│  [+ Create Event]                       │
│                                          │
│  [All (35)] [Draft (5)] [Published (27)] [Archived (3)]│
│                                          │
│  [20 event cards displayed in 3-column grid]│
│                                          │
│  Showing 20 of 35 events   [Load More]  │
└─────────────────────────────────────────┘
```

**System State**:
- Initial query: First 20 events (cursor-based pagination)
- Sorted by date: upcoming first, past last
- Separate count query: Total = 35

#### 2. Review Upcoming Events
**User Actions**:
- Scans first 20 events
- Observes dates, statuses, attendee counts
- Identifies events needing attention

**Observations**:
- 3 draft events in first page (need publishing)
- 15 upcoming published events
- 2 past events (recently ended)

#### 3. Filter by Draft Status
**User Action**: Clicks "Draft (5)" tab
**System Response**:
- Filters to show only 5 draft events
- All fit on one page (no pagination needed)
- Updates URL: `/dashboard?status=draft`

**User Sees**:
```
┌─────────────────────────────────────────┐
│  [All (35)] [Draft (5)] [Published (27)]│
│             ━━━━━━━                     │
│                                          │
│  [5 draft event cards]                  │
│                                          │
│  Showing 5 of 5 events                  │
└─────────────────────────────────────────┘
```

#### 4. Bulk Review Draft Events
**User Actions**:
1. Opens first draft event
2. Completes setup (adds tickets)
3. Publishes event
4. Returns to dashboard (filter persists)
5. Repeats for remaining drafts

**System Response** (after 3 events published):
- Count badges update: Draft (2), Published (30)
- Filtered view shows only remaining 2 drafts
- Smooth, optimistic UI updates

#### 5. Switch to Published Events
**User Action**: Clicks "Published (30)" tab
**System Response**:
- Loads first 20 published events
- Shows pagination: "Showing 20 of 30"
- Displays "Load More" button

#### 6. Load More Published Events
**User Action**: Scrolls down, clicks "Load More"
**System Response**:
- Fetches next 10 events (cursor-based)
- Appends to existing list (no page reload)
- Updates counter: "Showing 30 of 30"
- Hides "Load More" button

**User Sees**:
```
┌─────────────────────────────────────────┐
│  [All (35)] [Draft (2)] [Published (30)]│
│                          ━━━━━━━━━━━━   │
│                                          │
│  [First 20 events]                      │
│  ...                                    │
│  [Next 10 events (newly loaded)]        │
│                                          │
│  Showing 30 of 30 events                │
└─────────────────────────────────────────┘
```

#### 7. Monitor Specific Event
**User Action**: Finds "Tech Summit 2025" (upcoming in 2 weeks)
**User Observes**:
- Attendee count: 247 (strong registration)
- Status: Published ✓
- All metrics look healthy

**User Action**: Clicks "Manage" to review details
**System Response**: Opens event dashboard with full analytics

#### 8. Archive Completed Event
**User Action**: 
1. Returns to dashboard
2. Clicks "View All" to see all events
3. Scrolls to past events section
4. Finds "Summer Conference 2024" (ended 3 months ago)
5. Clicks "Edit" → "Event Settings"
6. Clicks "Archive Event" button

**System Response**:
- Confirms archive action with modal
- Updates event: `isArchived = true`
- Removes from main list
- Shows toast: "Event archived successfully"
- Updates counts: All (34), Archived (4)

### Postconditions
- ✅ User efficiently managed large event portfolio
- ✅ Draft events reviewed and published
- ✅ Published events monitored
- ✅ Completed events archived
- ✅ Dashboard remains performant with many events

### Success Metrics
- Dashboard load time with 50+ events: < 2 seconds
- Pagination load time: < 500ms
- User can locate specific event within 30 seconds: > 80%
- Users with 20+ events using filters: > 85%

---

## Error Recovery Workflows

### Network Error During Load

**Scenario**: User navigates to dashboard but network fails

**User Sees**:
```
┌─────────────────────────────────────────┐
│         My Events                       │
│                                          │
│           ⚠️                            │
│                                          │
│    Failed to Load Events                │
│                                          │
│  Unable to connect to server.           │
│  Please check your internet connection. │
│                                          │
│        [Try Again]                      │
└─────────────────────────────────────────┘
```

**User Action**: Clicks "Try Again"
**System Response**: Retries query, displays events on success

### Session Expired

**Scenario**: User session expires while viewing dashboard

**System Response**:
- Detects 401 Unauthorized response
- Redirects to `/auth/signin?callbackUrl=/dashboard`
- Preserves filter state in callbackUrl

**After Re-authentication**:
- Redirects back to `/dashboard` with previous filter
- Seamless continuation of workflow

---

## Related Documentation

- [Dashboard README](./README.md) - Module overview
- [Dashboard Frontend](./frontend.md) - Component details
- [Events Module Workflows](../events/workflows.md) - Event management flows
- [Authentication](../../architecture/authentication.md) - Auth patterns

---

**Last Updated**: November 11, 2025  
**Maintained by**: @babblebey
