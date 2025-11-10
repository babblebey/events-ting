# Schedule Module

## Overview

The Schedule module enables organizers to build comprehensive event agendas with sessions organized by time, tracks, and speakers. It provides timeline views for attendees and management tools for organizers, including overlap detection to prevent scheduling conflicts.

## Features

- **Schedule Entry Management**: Create, edit, and delete sessions
- **Multi-Track Support**: Organize sessions into parallel tracks with color coding
- **Speaker Assignment**: Link speakers to sessions via junction table
- **Timeline Views**: Chronological display with filtering by track and date
- **Overlap Detection**: Warning system for conflicting time slots
- **Session Types**: Categorize sessions (keynote, talk, workshop, break, networking)
- **Timezone Handling**: Proper conversion between event timezone and UTC
- **Optimistic Concurrency Control**: Prevent conflicting edits via version tracking

## User Roles

### Public Users (Attendees)
- View published event schedules
- Filter by track and date
- See speaker assignments
- Navigate chronological timeline

### Organizers
- Create and edit schedule entries
- Assign speakers to sessions
- Set track colors for visual organization
- Detect scheduling conflicts
- Reorder sessions
- Delete schedule entries

## Module Dependencies

**This module depends on:**
- Events Module (schedule belongs to event, uses timezone)
- Speakers Module (assigns speakers to sessions)

**This module is required by:**
- CFP Module (accepted proposals can auto-create schedule entries)
- Public Pages (displays event schedule)

## Key Concepts

### Schedule Entry
A single session or activity in the event schedule:
- Title and description
- Start and end times (stored in UTC, displayed in event timezone)
- Location (room, stage, venue)
- Track assignment (for multi-track events)
- Session type classification
- Multiple speaker assignments

### Tracks
Parallel session streams at multi-track conferences:
- Each track has a name and color
- Sessions can be filtered by track
- Timeline view shows tracks side-by-side
- Examples: "Technical Track", "Business Track", "Workshop Track"

### Session Types
- **keynote**: Main presentation for all attendees
- **talk**: Standard conference presentation
- **workshop**: Hands-on learning session
- **break**: Coffee break, lunch, networking
- **networking**: Social or networking activity

### Speaker Session (Junction Table)
Links speakers to schedule entries:
- Supports multiple speakers per session (panels, co-presenters)
- Defines speaker role (speaker, moderator, panelist)
- Cascading deletes when speaker or session removed

### Overlap Detection
Non-blocking warning system:
- Checks for time conflicts in the same location
- Uses precise time range comparison logic
- Warns organizers but allows scheduling (intentional conflicts may be valid)
- Useful for catching mistakes before publishing

### Timezone Handling
- User inputs date and time in event's local timezone
- Backend converts to UTC for storage
- Frontend displays in event timezone
- Uses `combineDateTime` utility function

### Optimistic Concurrency Control
Prevents lost updates when multiple organizers edit simultaneously:
- Each entry has `updatedAt` timestamp
- Update mutations require latest `updatedAt` value
- Returns `CONFLICT` error if entry was modified since last read
- Client must refresh and retry

## Quick Links

- [Backend Documentation](./backend.md)
- [Frontend Documentation](./frontend.md)
- [Data Model](./data-model.md)
- [Workflows](./workflows.md)

## Related Modules

- **[Events Module](../events/)**: Schedule belongs to events
- **[Speakers Module](../speakers/)**: Speakers assigned to schedule entries
- **[CFP Module](../cfp/)**: Accepted proposals can create schedule entries
