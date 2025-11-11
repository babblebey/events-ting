# Dashboard Module

## Overview

The Dashboard module provides event organizers with a centralized hub to view and manage all their events. It serves as the primary landing page after authentication, offering quick access to event management features and displaying key metrics at a glance.

## Features

- **Centralized Event List**: View all events (draft, published, and archived) in one place
- **Status Filtering**: Filter events by status (All, Draft, Published, Archived)
- **Event Cards**: Display key information including dates, location, attendee counts
- **Quick Actions**: Direct navigation to event management, settings, and public pages
- **Empty States**: Helpful guidance for new users and filtered views
- **Pagination**: Efficient handling of large event portfolios (20 events per page)
- **Responsive Design**: Optimized layouts for desktop, tablet, and mobile devices
- **Post-Auth Redirect**: Automatic redirect to dashboard after sign-in

## User Roles

### Organizers (MVP)
- View all events they have created
- Filter events by status
- Access event management dashboards
- Create new events from dashboard
- Navigate to event settings and public pages

### Future Enhancements
- **Team Members**: Shared event access with different permission levels
- **Administrators**: Manage multiple organizations and events
- **Collaborators**: Read-only or limited access to specific events

## Module Dependencies

**This module depends on:**
- **Events Module**: Displays event data and provides navigation to event management
- **Authentication Module**: Requires user session to identify which events to display

**This module is integrated with:**
- **Navigation**: Dashboard link in main navigation after authentication
- **Auth Flow**: Default redirect destination after sign-in
- **Event Creation**: Redirect destination after new event is created

## Quick Links

- [Frontend Documentation](./frontend.md) - Components, pages, and UI structure
- [Workflows](./workflows.md) - Step-by-step user flows and scenarios

## Key Concepts

### Dashboard as Entry Point
The dashboard serves as the "home base" for authenticated users, replacing direct navigation to individual event pages. This provides:
- Better discoverability of all managed events
- Clear overview of event statuses
- Reduced cognitive load for users managing multiple events
- Consistent starting point for event management tasks

### Status-Based Views
Events can be filtered by status to help organizers focus on specific workflows:
- **All**: Complete portfolio view (default)
- **Draft**: Events in progress, not yet published
- **Published**: Active events visible to the public
- **Archived**: Past or cancelled events (soft-deleted)

### Event Card Information
Each event card displays essential information without requiring drill-down:
- Event name and status badge
- Date range and timezone
- Location type (virtual, in-person, hybrid)
- Attendee count
- Quick action buttons (Manage, Edit, View Event)

### Pagination Strategy
- Display 20 events per page for optimal performance
- Cursor-based pagination for efficient queries
- "Load More" button for additional events
- Display total count: "Showing X of Y events"

## Related Modules

- **Events Module**: Core event data and management
- **Registration Module**: Attendee counts displayed on event cards
- **Schedule Module**: Quick links to schedule builder
- **Tickets Module**: Navigation to ticket management

## Future Enhancements

### Phase 2 Features
- **Dashboard Widgets**: Aggregate statistics across all events
- **Quick Stats**: Total attendees, revenue, upcoming events
- **Search**: Find events by name or description
- **Advanced Filtering**: Filter by date range, location type, tags
- **Bulk Actions**: Archive or publish multiple events at once
- **Recent Activity**: Show latest registrations, submissions across events
- **Calendar View**: Month/week view of all events
- **Event Templates**: Quick-create from previous events
- **Export**: Download event list as CSV/PDF

### Phase 3 Features
- **Team Collaboration**: Share events with team members
- **Role-Based Access**: Different permission levels per team member
- **Analytics Dashboard**: Charts and trends visualization
- **Notifications Center**: Alerts for events needing attention
- **Custom Views**: Save filtered views and sort orders
- **Keyboard Shortcuts**: Power user productivity features
- **Mobile App**: Dedicated mobile dashboard experience

## Technical Notes

### Routing
- **Dashboard URL**: `/dashboard`
- **Route Group**: `(dashboard)` - protected by authentication
- **File Location**: `src/app/dashboard/page.tsx`

### Performance Considerations
- Initial page load fetches first 20 events via server component
- Client component handles filtering and pagination
- Separate count query for accurate totals
- Query optimization with selected fields only
- React Query caching for instant filter switches

### Authentication Flow
- Unauthenticated users redirected to sign-in page
- After sign-in, redirect to dashboard (default)
- If user was redirected to sign-in from protected page, return to that page
- Session validation at layout level

## Common Tasks

### View All Events
1. Sign in to Events-Ting
2. Automatically redirected to dashboard
3. See list of all events (sorted by date)

### Filter Events by Status
1. Navigate to dashboard
2. Click status filter tab (Draft, Published, Archived)
3. View filtered event list
4. Filter persists in URL and on page refresh

### Create New Event
1. Navigate to dashboard
2. Click "Create Event" button
3. Fill in event details
4. Submit form
5. Redirected to new event's management dashboard

### Access Event Management
1. Navigate to dashboard
2. Find event in list
3. Click "Manage" button or event card
4. Navigate to event-specific dashboard

### Edit Event Settings
1. Navigate to dashboard
2. Find event in list
3. Click "Edit" button
4. Navigate to event settings page

## Error States

### No Events Created
- Display empty state with large "Create Your First Event" CTA
- Provide helpful message about getting started
- Single, clear action to begin event creation

### No Events Match Filter
- Display empty state indicating no matches
- Show message specific to active filter (e.g., "No draft events found")
- Provide "View All Events" button to clear filter

### Loading States
- Show skeleton UI while fetching events
- Display loading indicator during filter changes
- Optimistic UI updates for quick interactions

### Error States
- Network error: Display retry button
- Authorization error: Redirect to sign-in
- Server error: Display error message with support contact

## Accessibility

- **Keyboard Navigation**: Full keyboard support for filters and event cards
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Focus Management**: Clear focus indicators and logical tab order
- **Color Contrast**: WCAG AA compliant color schemes
- **Responsive Text**: Readable font sizes on all devices

## Testing Checklist

- [ ] Authentication redirect works correctly
- [ ] Events display with all metadata
- [ ] Status filters update event list
- [ ] Pagination loads additional events
- [ ] Event card actions navigate correctly
- [ ] Empty states display appropriately
- [ ] Responsive design works on all screen sizes
- [ ] Filter persists on page refresh
- [ ] Performance acceptable with 50+ events
- [ ] Error states handled gracefully

---

**Last Updated**: November 11, 2025  
**Maintained by**: @babblebey
