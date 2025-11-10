# Speakers Module

## Overview

The Speakers module manages speaker profiles for events, including biographical information, social links, photos, and session assignments. Speakers can be added manually by organizers or automatically created when CFP proposals are accepted.

## Features

- **Speaker Profile Management**: Create, edit, and delete speaker profiles
- **Photo Upload**: Support for speaker headshots (local storage or URLs)
- **Social Links**: Twitter, GitHub, LinkedIn, and personal website
- **Session Assignment**: Link speakers to schedule entries with roles
- **Public Directory**: Filterable speaker listing on event pages
- **CFP Integration**: Auto-create speakers from accepted proposals
- **Duplicate Prevention**: Email-based uniqueness per event
- **Cascade Deletion**: Automatically remove session assignments when speaker deleted

## User Roles

### Public Users (Attendees)
- View speaker directory for published events
- See speaker profiles with bios and social links
- View speaker sessions and schedule
- Click through to speaker websites/social profiles

### Organizers
- Create speaker profiles manually
- Upload speaker photos
- Edit speaker information
- Assign speakers to schedule entries with roles (speaker, moderator, panelist)
- Remove speakers from sessions
- Delete speakers (removes from all sessions)
- View all speakers for their events

## Module Dependencies

**This module depends on:**
- Events Module (speakers belong to events)
- Schedule Module (speakers assigned to sessions via SpeakerSession)

**This module is required by:**
- CFP Module (accepted proposals create speaker records)
- Schedule Module (sessions link to speakers)
- Public Pages (speaker directory and profiles)

## Key Concepts

### Speaker Profile
A speaker record contains:
- Basic info (name, email, bio)
- Photo (uploaded image or URL)
- Social links (Twitter, GitHub, LinkedIn, website)
- Event association
- Session assignments

### Duplicate Prevention
- Speakers are unique by email **per event**
- Same person can speak at multiple events (separate records)
- Prevents accidental duplicate profiles
- Enforced at database and application level

### Speaker Roles
When assigned to a session, speakers have roles:
- **speaker**: Primary presenter (default)
- **moderator**: Panel moderator or session host
- **panelist**: Panel participant

### Session Assignment (SpeakerSession)
Junction table linking speakers to schedule entries:
- Many-to-many relationship
- Multiple speakers per session (panels, co-presenters)
- Multiple sessions per speaker
- Role specification
- Cascading deletes

### Photo Storage
Speakers can have photos from:
- **Uploaded files**: Stored in `/public/uploads/images/`
- **External URLs**: CFP submissions may include URLs
- **Fallback**: UI shows initials if no photo

### CFP Integration
When a CFP proposal is accepted:
1. Speaker record auto-created from proposal data
2. Email, name, bio, photo copied from submission
3. Social links transferred
4. Submission linked to speaker via `speakerId`
5. Optionally creates schedule entry

## Quick Links

- [Backend Documentation](./backend.md)
- [Frontend Documentation](./frontend.md)
- [Data Model](./data-model.md)
- [Workflows](./workflows.md)

## Related Modules

- **[Events Module](../events/)**: Speakers belong to events
- **[Schedule Module](../schedule/)**: Speakers assigned to sessions
- **[CFP Module](../cfp/)**: Accepted proposals create speakers
