# Events Module

## Overview

The Events module is the foundational module of the Events-Ting platform. It handles the creation, management, and lifecycle of events. Every other module (Tickets, Registration, Schedule, Speakers, CFP, Communications) depends on events as their parent entity.

## Features

- **Event Creation**: Create events with detailed information (name, description, location, dates)
- **Event Lifecycle**: Draft → Published → Archived workflow
- **Location Management**: Support for in-person, virtual, and hybrid events
- **Timezone Handling**: Store dates in UTC, display in event timezone
- **Slug-based URLs**: Human-readable URLs for public event pages
- **Dashboard Metrics**: Real-time statistics for organizers
- **Soft Delete**: Archive events instead of permanent deletion
- **Access Control**: Public access for published events, organizer-only for drafts

## User Roles

### Organizers
- Create and manage events
- Edit event details (when in draft)
- Publish events to make them public
- Archive events (soft delete)
- View dashboard metrics
- Access all related modules (tickets, registrations, etc.)

### Public Users
- View published events
- Access event details via slug
- See available tickets
- Register for events

## Module Dependencies

**This module is required by:**
- Tickets Module (each ticket type belongs to an event)
- Registration Module (registrations are for specific events)
- Schedule Module (schedule entries belong to events)
- Speakers Module (speakers are associated with events)
- CFP Module (call for papers belongs to an event)
- Communications Module (email campaigns target event attendees)

**This module depends on:**
- User/Auth Module (for organizer authentication)

## Quick Links

- [Backend Documentation](./backend.md) - tRPC router, procedures, and business logic
- [Frontend Documentation](./frontend.md) - Components, pages, and forms
- [Data Model](./data-model.md) - Prisma schema and relationships
- [Workflows](./workflows.md) - Step-by-step event management flows

## Key Concepts

### Event Status
- **draft**: Event is being prepared, not visible to public
- **published**: Event is live and visible on public pages
- **archived**: Event is soft-deleted, hidden from public but data preserved

### Location Types
- **in-person**: Physical location (requires address)
- **virtual**: Online event (requires URL)
- **hybrid**: Both physical and online (requires both address and URL)

### Timezone Strategy
All dates are stored in UTC in the database, but displayed in the event's configured timezone for consistency across all users viewing the event.

## Related Modules

- **Tickets Module**: Manages ticket types and availability for events
- **Registration Module**: Handles attendee sign-ups for events
- **Schedule Module**: Organizes event sessions and timeline
- **Communications Module**: Sends emails to event attendees
