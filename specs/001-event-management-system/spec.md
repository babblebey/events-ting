# Feature Specification: All-in-One Event Management System

**Feature Branch**: `001-event-management-system`  
**Created**: November 8, 2025  
**Status**: Draft  
**Input**: User description: "Create an all-in-one event management system. User can create event and manage each events, each event will have its own dashboard to manage tickets(free or paid)/registration, attendees, Schedules, Call for Papers to accepts sessions and speakers, Speakers, Communication for email newsletter/alerts."

## Clarifications

### Session 2025-11-08

- Q: What authentication mechanism should the system use for user login and registration? → A: OAuth providers (Google, GitHub) + email/password - Flexible, industry standard, already scaffolded in codebase
- Q: Which transactional email service should the system use for sending emails? → A: Resend
- Q: How should the system handle overlapping schedule entries for the same location? → A: Warning only - Show visual warning but allow organizers to proceed if intentional (flexible)
- Q: What should happen when an organizer tries to delete an event with active registrations? → A: Soft delete with archive - Mark event as archived/deleted but preserve all data in database (recoverable, audit-friendly)
- Q: What page load performance target should the system achieve for optimal user experience? → A: Page load <2s at 95th percentile - Industry standard, good UX, realistic with Next.js SSR/SSG

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Event Creation and Basic Management (Priority: P1)

Event organizers need to create events and access a dedicated dashboard to manage event details. This is the foundation that enables all other event management capabilities.

**Why this priority**: Without the ability to create events and access their dashboards, no other functionality can be utilized. This is the minimum viable product.

**Independent Test**: Can be fully tested by creating a new event, accessing its dashboard, and viewing/editing basic event information (name, description, dates, location). Delivers immediate value by allowing organizers to establish their event presence.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they navigate to create a new event, **Then** they can enter event details (name, description, start date, end date, location type) and save the event
2. **Given** a user has created an event, **When** they navigate to the events list, **Then** they see all their created events with key information displayed
3. **Given** a user selects an event from their list, **When** they access the event dashboard, **Then** they see a centralized view with navigation to all event management sections
4. **Given** a user is on an event dashboard, **When** they update event details, **Then** changes are saved and reflected immediately across all views

---

### User Story 2 - Ticket and Registration Management (Priority: P2)

Event organizers need to create different ticket types and manage attendee registrations. Attendees need a simple registration process. MVP focuses on free tickets with architecture ready for future paid ticket support.

**Why this priority**: Ticketing is the primary access control mechanism for events. Free ticket support enables organizers to manage attendance and capacity while the pluggable architecture prepares for future monetization.

**Independent Test**: Can be tested by creating free ticket types, publishing registration forms, completing test registrations, and viewing attendee lists. Delivers value by enabling event attendance tracking and capacity management.

**Acceptance Scenarios**:

1. **Given** an event dashboard, **When** an organizer creates a ticket type, **Then** they can specify ticket name, description, quantity available, and sale period (MVP: price field present but must be set to free/0)
2. **Given** ticket types are configured, **When** an organizer publishes the registration, **Then** a public registration page becomes available with all active ticket types
3. **Given** a public registration page, **When** an attendee selects a free ticket and provides required information, **Then** they receive confirmation and their registration is recorded
4. **Given** registrations exist, **When** an organizer views the attendees section, **Then** they see a list of all registered attendees with their ticket type and registration date
5. **Given** the system architecture, **When** reviewing the payment integration points, **Then** pluggable payment processor interfaces exist for future Stripe and Paystack integration

---

### User Story 3 - Event Schedule Management (Priority: P3)

Event organizers need to create and publish a schedule showing when different sessions, talks, or activities occur during the event.

**Why this priority**: A clear schedule helps attendees plan their participation and adds professional structure to the event. Essential for multi-day or multi-track events.

**Independent Test**: Can be tested by creating schedule entries with dates, times, and session details, then viewing the published schedule from both organizer and attendee perspectives. Delivers value by providing attendees with clear event programming information.

**Acceptance Scenarios**:

1. **Given** an event dashboard, **When** an organizer accesses the schedule section, **Then** they can add schedule entries with date, time, duration, title, description, and location
2. **Given** multiple schedule entries exist, **When** an organizer views the schedule, **Then** entries are displayed chronologically with visual indicators for time conflicts
3. **Given** a published schedule, **When** an attendee views the event page, **Then** they see the complete schedule organized by date and time
4. **Given** a schedule entry, **When** an organizer links it to a speaker or session, **Then** the schedule displays speaker information and session details

---

### User Story 4 - Call for Papers (CFP) Management (Priority: P4)

Event organizers need to accept session proposals and speaker applications through a Call for Papers process, then review and approve submissions.

**Why this priority**: CFP enables community-driven content for conferences and ensures quality speaker selection. Critical for community conferences but not essential for all event types.

**Independent Test**: Can be tested by opening a CFP, submitting proposals as a speaker, reviewing submissions as an organizer, and accepting/rejecting proposals. Delivers value by crowdsourcing quality content from the community.

**Acceptance Scenarios**:

1. **Given** an event dashboard, **When** an organizer opens a Call for Papers, **Then** they can specify submission deadline, required fields, session formats, and guidelines
2. **Given** an active CFP, **When** a potential speaker accesses the CFP page, **Then** they can submit a proposal with session title, description, format, and speaker bio
3. **Given** CFP submissions exist, **When** an organizer reviews submissions, **Then** they see all proposals with speaker information and can mark them as accepted, rejected, or pending
4. **Given** a proposal is accepted, **When** the decision is saved, **Then** the speaker receives notification and the session is available for schedule assignment
5. **Given** multiple organizers review proposals, **When** they add review scores or comments, **Then** other organizers can see the collective feedback to inform decisions

---

### User Story 5 - Speaker Management (Priority: P5)

Event organizers need to manage speaker information, track their sessions, and communicate important details to speakers.

**Why this priority**: Dedicated speaker management streamlines coordination with presenters and ensures all speaker information is accurate and accessible.

**Independent Test**: Can be tested by adding speakers (manually or from CFP), assigning them to sessions, updating speaker profiles, and viewing speaker directories. Delivers value by centralizing all speaker-related information.

**Acceptance Scenarios**:

1. **Given** an event dashboard, **When** an organizer accesses the speakers section, **Then** they can add speaker profiles with name, bio, photo, email, and social media links
2. **Given** speaker profiles exist, **When** an organizer assigns speakers to schedule sessions, **Then** the speaker information automatically appears in the schedule
3. **Given** speakers are assigned to sessions, **When** an organizer views a speaker profile, **Then** they see all sessions that speaker is presenting
4. **Given** accepted CFP proposals, **When** an organizer reviews speakers, **Then** speakers from accepted proposals are automatically added to the speaker roster
5. **Given** a public event page, **When** attendees view speakers, **Then** they see a speaker directory with photos, bios, and session information

---

### User Story 6 - Event Communications (Priority: P6)

Event organizers need to send email newsletters and alerts to attendees, speakers, or all participants to share updates, reminders, and important information.

**Why this priority**: Communication keeps all stakeholders informed and engaged. While important, events can function without automated communications using external tools.

**Independent Test**: Can be tested by creating email campaigns, selecting recipient groups, sending test emails, and tracking delivery. Delivers value by enabling direct communication with event stakeholders.

**Acceptance Scenarios**:

1. **Given** an event dashboard, **When** an organizer accesses communications, **Then** they can create a new email campaign with subject, body content, and rich text formatting
2. **Given** a draft email campaign, **When** an organizer selects recipients, **Then** they can choose from predefined groups (all attendees, specific ticket types, speakers, or custom lists)
3. **Given** a prepared email campaign, **When** an organizer sends it, **Then** all selected recipients receive the email and the organizer sees delivery confirmation
4. **Given** past email campaigns, **When** an organizer views communication history, **Then** they see all sent emails with recipient counts, send dates, and delivery statistics
5. **Given** an event update is needed, **When** an organizer creates an alert email, **Then** they can schedule it for immediate sending or specify a future send time

---

### Edge Cases

- **Resolved**: When an organizer tries to create overlapping schedule entries for the same location, the system displays a visual warning but allows the organizer to proceed if the overlap is intentional (e.g., different rooms, virtual breakout sessions)
- **Resolved**: When an organizer tries to delete an event with active registrations, the system shows a confirmation dialog with impact summary, then marks the event as archived (soft delete) preserving all related data. Organizers can restore archived events if needed.
- How does the system handle registration attempts when a ticket type is sold out?
- What happens when a speaker withdraws from an accepted CFP session close to the event date?
- How does the system handle timezone differences for virtual or international events?
- What happens when two organizers try to edit the same schedule entry simultaneously?
- How does the system handle bulk email sends that exceed reasonable limits or trigger spam filters?
- What happens when an attendee's email address bounces during communication campaigns?
- How does the system handle CFP submissions after the deadline has passed?
- How does the system handle schedule conflicts across multiple tracks?
- What happens when an organizer tries to assign more speakers to a session than the interface can display?

## Requirements *(mandatory)*

### Functional Requirements

#### Event Management Core

- **FR-001**: System MUST allow authenticated users to create events with name, description, start date, end date, location (physical address or virtual URL), and event type
- **FR-002**: System MUST provide each event with a unique identifier and public URL
- **FR-003**: System MUST allow event organizers to edit event details at any time
- **FR-004**: System MUST implement soft delete for events by marking them as archived rather than permanently removing data, with confirmation dialog showing impact summary (registrations, tickets, schedules affected)
- **FR-005**: System MUST provide a dashboard for each event showing summary metrics (total registrations, ticket sales, upcoming sessions, pending CFP submissions)
- **FR-006**: System MUST restrict event management access to authorized organizers only
- **FR-007**: System MUST allow organizers to add multiple co-organizers with the same management permissions
- **FR-058**: System MUST exclude archived events from default event listings but allow organizers to view archived events in a separate section
- **FR-059**: System MUST allow organizers to restore archived events to active status
- **FR-060**: System MUST preserve all related data (registrations, tickets, schedules, speakers, communications) when an event is archived

#### Authentication & Authorization

- **FR-051**: System MUST support OAuth authentication via Google and GitHub providers using NextAuth.js
- **FR-052**: System MUST support email/password authentication with secure password hashing
- **FR-053**: System MUST provide user registration flow for email/password accounts
- **FR-054**: System MUST implement password reset functionality for email/password users
- **FR-055**: System MUST maintain secure session management across all authentication methods

#### Ticket and Registration Management

- **FR-008**: System MUST allow organizers to create multiple ticket types per event with name, description, price field (MVP: free/0 only), quantity, and sale start/end dates
- **FR-009**: System MUST support free ticket types in MVP with architecture designed for future paid ticket integration
- **FR-010**: System MUST generate a public registration page for each event displaying available ticket types
- **FR-011**: System MUST collect attendee information during registration including name, email, and any custom fields defined by organizers
- **FR-012**: System MUST prevent registration when ticket quantity limit is reached
- **FR-013**: System MUST send confirmation emails to attendees upon successful registration
- **FR-014**: System MUST provide a pluggable payment processor architecture designed to support Stripe and Paystack (Note: MVP will support free tickets only; paid ticket integration deferred to future release)
- **FR-015**: System MUST design registration data model to accommodate payment status for future paid ticket support
- **FR-016**: System MUST allow organizers to view all attendee registrations with filters by ticket type and registration date
- **FR-017**: System MUST allow organizers to manually add or cancel individual registrations
- **FR-018**: System MUST allow organizers to export attendee lists in common formats (CSV, Excel)

#### Schedule Management

- **FR-019**: System MUST allow organizers to create schedule entries with date, start time, end time, title, description, and location
- **FR-020**: System MUST support multi-day schedules with entries spanning different dates
- **FR-021**: System MUST display visual warnings when schedule entries overlap in the same location but allow organizers to save if intentional
- **FR-022**: System MUST allow organizers to reorder, edit, or delete schedule entries
- **FR-023**: System MUST display the schedule publicly on the event page organized chronologically
- **FR-024**: System MUST allow linking schedule entries to speakers and sessions from CFP
- **FR-025**: System MUST support multiple tracks or concurrent sessions with visual track indicators, color coding, and filtering by track to enable multi-track conferences

#### Call for Papers (CFP)

- **FR-026**: System MUST allow organizers to open a Call for Papers with submission deadline, guidelines, and required fields
- **FR-027**: System MUST provide a public CFP submission form accessible via unique URL
- **FR-028**: System MUST collect session proposals including title, description, session format, duration, and speaker information
- **FR-029**: System MUST allow speakers to submit multiple proposals for the same event
- **FR-030**: System MUST prevent submissions after the CFP deadline has passed
- **FR-031**: System MUST allow organizers to review all submissions with status indicators (pending, accepted, rejected)
- **FR-032**: System MUST allow organizers to add review scores or comments to submissions
- **FR-033**: System MUST notify speakers when their proposals are accepted or rejected
- **FR-034**: System MUST automatically add speakers from accepted proposals to the speaker roster
- **FR-035**: System MUST allow organizers to close CFP and hide the submission form

#### Speaker Management

- **FR-036**: System MUST allow organizers to manually add speaker profiles with name, bio, photo, email, and social media links
- **FR-037**: System MUST automatically create speaker profiles from accepted CFP submissions
- **FR-038**: System MUST allow assigning speakers to schedule entries
- **FR-039**: System MUST display speaker information on the public event page
- **FR-040**: System MUST show all sessions associated with each speaker in their profile
- **FR-041**: System MUST allow organizers to edit or remove speaker profiles
- **FR-042**: System MUST support multiple speakers per session

#### Communications

- **FR-043**: System MUST allow organizers to create email campaigns with subject, body content, and basic formatting
- **FR-044**: System MUST support recipient selection by groups (all attendees, specific ticket types, speakers, or custom lists)
- **FR-045**: System MUST send emails to selected recipients via Resend API and track delivery status
- **FR-046**: System MUST provide email templates for common communications (registration confirmation, payment confirmation, event reminders) using React Email components
- **FR-047**: System MUST allow scheduling emails for future sending
- **FR-048**: System MUST display communication history showing all sent emails with dates and recipient counts
- **FR-049**: System MUST handle bounced emails reported by Resend and update recipient status
- **FR-050**: System MUST respect unsubscribe requests for marketing communications while maintaining transactional emails
- **FR-056**: System MUST implement retry logic for failed email sends with exponential backoff
- **FR-057**: System MUST log all email sending attempts and responses from Resend for debugging

### Key Entities

- **Event**: Represents a single event with properties including name, description, dates, location, type (in-person/virtual/hybrid), organizers, public URL, and status (active/archived)
- **User**: Represents system users who can be event organizers or attendees with authentication credentials and profile information
- **Ticket Type**: Represents different registration options for an event with pricing, quantity limits, and availability windows; relates to one Event
- **Registration**: Represents an attendee's registration for an event with selected ticket type, payment status, registration date, and attendee information; relates to one Event and one Ticket Type
- **Schedule Entry**: Represents a single session or activity in the event schedule with timing, title, description, and location; relates to one Event and optionally to Speakers and Sessions
- **CFP Submission**: Represents a session proposal submitted through Call for Papers with proposal details, speaker information, and review status; relates to one Event
- **Speaker**: Represents an individual presenting at the event with bio, contact info, and social links; can be associated with multiple Schedule Entries and CFP Submissions
- **Email Campaign**: Represents a communication sent to event stakeholders with content, recipient criteria, send date, and delivery status; relates to one Event
- **Session**: Represents an accepted presentation or activity with details from CFP or manual creation; relates to Schedule Entry and Speakers

### Non-Functional Requirements

#### Performance

- **NFR-001**: System MUST achieve page load times under 2 seconds at 95th percentile for all public-facing pages (event listings, registration, schedule)
- **NFR-002**: System MUST achieve page load times under 3 seconds at 95th percentile for authenticated dashboard pages
- **NFR-003**: System MUST render initial page content within 1 second using Next.js Server-Side Rendering or Static Site Generation
- **NFR-004**: System MUST handle concurrent dashboard operations (editing schedule, viewing attendees) without blocking UI for more than 500ms

#### Scalability

- **NFR-005**: System MUST support events with up to 10,000 registered attendees without performance degradation
- **NFR-006**: System MUST handle up to 100 concurrent registrations for the same event without race conditions or overselling tickets
- **NFR-007**: System MUST support up to 50 events per organizer account
- **NFR-008**: Database queries MUST complete within 200ms for typical dashboard operations (viewing attendees, schedule)

#### Reliability & Availability

- **NFR-009**: System MUST maintain 99.5% uptime during high-traffic registration periods
- **NFR-010**: System MUST implement graceful degradation when external services (Resend, OAuth providers) are unavailable
- **NFR-011**: System MUST retry failed email sends with exponential backoff for up to 3 attempts

#### Observability

- **NFR-012**: System MUST log all authentication attempts with success/failure status and timestamp
- **NFR-013**: System MUST log all email sending attempts with delivery status and error details
- **NFR-014**: System MUST track and report key metrics: registration conversion rate, page load times, email delivery rate
- **NFR-015**: System MUST provide error tracking for failed operations (registration errors, payment failures, email bounces)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Organizers can create a new event and publish a registration page within 10 minutes
- **SC-002**: Attendees can complete event registration in under 3 minutes for free tickets and under 5 minutes for paid tickets
- **SC-003**: Public event pages load in under 2 seconds for 95% of requests
- **SC-004**: 95% of CFP submissions are successfully received and accessible to organizers within 1 minute of submission
- **SC-005**: Schedule changes made by organizers are visible on public pages within 30 seconds
- **SC-006**: Email campaigns are delivered to 98% of recipients within 15 minutes of sending via Resend
- **SC-007**: Organizers can locate any attendee or speaker information within 3 clicks from the event dashboard
- **SC-008**: 90% of organizers successfully complete their first event setup without requiring support documentation
- **SC-009**: System maintains 99.5% uptime during high-traffic registration periods
- **SC-010**: Attendee data export completes within 2 minutes for events with up to 5,000 registrations

## Assumptions

- Organizers have basic familiarity with web-based management tools and email systems
- Events primarily serve English-speaking audiences (internationalization is not in initial scope)
- MVP will support free tickets only; paid ticket functionality with pluggable payment processor architecture (Stripe and Paystack) will be implemented in future releases
- Email delivery will use Resend transactional email service with React Email for template rendering
- The system will support modern web browsers (Chrome, Firefox, Safari, Edge) from the last 2 years
- Events are typically small to medium scale (under 10,000 attendees) for initial release
- Organizers are responsible for compliance with local data protection and payment regulations
- Session duration is typically in 15-minute increments (standard for scheduling interfaces)
- CFP review process is managed by organizers; no automated acceptance/rejection logic is needed
- Standard timezone handling will use UTC with local timezone display for event dates and times
- Track support will include visual indicators with color coding and filtering capabilities for multi-track conferences
