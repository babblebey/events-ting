# Feature Specification: Ticket Instance and Attendee Separation

**Feature Branch**: `003-ticket-attendee-separation`  
**Created**: November 19, 2025  
**Status**: Draft  
**Input**: User description: "The system needs to distinguish clearly between buyers and actual attendees. A single purchase (called a Registration) may contain multiple tickets, but each ticket must represent an individual person who will attend the event. To support this, the system should introduce a Ticket model where each ticket is created as a separate unit with its own QR code and check-in status. Each Ticket should be linked to an Attendee model, which stores the real attendee's details, including name, email, and custom registration form responses. This allows the buyer to purchase multiple tickets, assign them to different people, collect accurate attendee information, and ensure check-in happens at the individual ticket level rather than the buyer level."

## Clarifications

### Session 2025-11-19

- Q: What is the deadline/cutoff time for ticket assignment and reassignment before events? → A: Organizer-configurable cutoff time (e.g., 24h/1h before, or event start)
- Q: What happens if an attendee provides an invalid email address during assignment? → A: Format validation + soft warning for suspicious patterns (typos, common mistakes)
- Q: What happens if a buyer wants a refund for specific tickets after assignment? → A: Support individual ticket refunds up to cutoff time, buyer manages attendee notification
- Q: How does the system handle attendee data privacy when a buyer assigns tickets to others? → A: Buyer confirms they have permission + attendee accepts terms when receiving ticket
- Q: What is the maximum number of tickets allowed in a single purchase transaction? → A: Organizer-configurable limit per event (with system default of 10)
- Q: How should the system handle concurrent ticket assignments when multiple buyers or team members try to assign the same unassigned ticket simultaneously? → A: Optimistic locking with last-write-wins and notification to previous assigner
- Q: When a ticket is reassigned from one attendee to another, what should happen to the original attendee's custom registration field data? → A: Delete original data and require new attendee to provide fresh responses
- Q: Should the system support transferring a ticket from one buyer's order to a different buyer's order (ownership transfer)? → A: No - tickets remain with original purchase order

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multiple Ticket Purchase with Individual Assignment (Priority: P1)

An event organizer needs to track who actually attends their event, not just who purchased the tickets. A company representative purchases 5 tickets for their team members. Each team member receives their own unique ticket with their personal information and a scannable code for event check-in.

**Why this priority**: Core functionality that enables the fundamental distinction between buyers and attendees. Without this, the system cannot support the primary use case of multi-ticket purchases where different people attend.

**Independent Test**: Can be fully tested by purchasing multiple tickets, assigning each to a different person with their details, and verifying that each person receives a unique ticket with their information. Delivers value by allowing accurate attendee tracking.

**Acceptance Scenarios**:

1. **Given** a buyer is on the ticket purchase page, **When** they select quantity of 3 tickets, **Then** the system creates 3 separate ticket instances
2. **Given** a buyer has purchased 3 tickets, **When** they assign each ticket to a different person with name and email, **Then** each attendee receives their own unique ticket
3. **Given** tickets have been assigned to attendees, **When** each attendee arrives at the event, **Then** their individual ticket can be scanned for check-in
4. **Given** a buyer purchases tickets, **When** they haven't assigned all tickets yet, **Then** unassigned tickets show as pending assignment in their order dashboard

---

### User Story 2 - Attendee Information Collection (Priority: P2)

Event organizers need to collect specific information from each attendee (dietary restrictions, t-shirt size, accessibility needs) beyond just basic contact details. When a buyer assigns tickets, each attendee fills out a custom registration form with questions specific to the event.

**Why this priority**: Critical for events that need attendee-specific data, but can be built after basic ticket assignment works. Many events require this for logistics planning.

**Independent Test**: Can be tested by creating an event with custom registration questions, purchasing tickets, and verifying that each attendee must answer the questions when assigned a ticket. Delivers value by enabling personalized event experiences.

**Acceptance Scenarios**:

1. **Given** an event has custom registration questions (dietary needs, t-shirt size), **When** a ticket is assigned to an attendee, **Then** the attendee must provide responses to all required questions
2. **Given** an attendee has provided custom registration data, **When** the event organizer views attendee details, **Then** they can see all custom field responses
3. **Given** custom fields are optional vs required, **When** an attendee fills the form, **Then** the system only enforces required fields
4. **Given** a ticket is reassigned to a different person, **When** the new attendee takes over, **Then** they must provide their own custom registration data

---

### User Story 3 - Buyer Self-Service Ticket Management (Priority: P2)

A buyer who purchased multiple tickets needs to manage their purchase, including assigning tickets to attendees, viewing who's attending, and making changes before the event. They access a dashboard showing their order with all tickets and their assignment status.

**Why this priority**: Important for user experience and reducing organizer support burden, but the system can function with manual assignment processes initially.

**Independent Test**: Can be tested by purchasing tickets as a buyer, accessing the order management dashboard, assigning/reassigning tickets, and verifying all changes are reflected. Delivers value by empowering buyers to manage their purchases independently.

**Acceptance Scenarios**:

1. **Given** a buyer has purchased tickets, **When** they access their order confirmation link or email, **Then** they see a dashboard with all their tickets and assignment status
2. **Given** a buyer is viewing their ticket dashboard, **When** they click to assign an unassigned ticket, **Then** they can enter attendee name, email, and submit
3. **Given** a buyer has assigned a ticket, **When** they need to change the attendee, **Then** they can reassign the ticket to someone else before the event starts
4. **Given** all tickets in an order are assigned, **When** the buyer views their dashboard, **Then** they see a summary showing all attendees

---

### User Story 4 - Individual Check-in Tracking (Priority: P1)

Event staff need to check in attendees at the venue using their individual tickets. Each attendee presents their QR code (digital or printed), staff scan it, and the system records that specific person as checked in. The organizer can see real-time check-in status and attendance metrics.

**Why this priority**: Essential for event operations and attendee tracking. Without individual check-in, the system cannot fulfill its core promise of tracking actual attendees vs buyers.

**Independent Test**: Can be tested by generating tickets with QR codes, scanning them at a simulated event entrance, and verifying check-in status is recorded per ticket. Delivers value by enabling accurate attendance tracking.

**Acceptance Scenarios**:

1. **Given** an attendee has a valid ticket with QR code, **When** staff scan the QR code, **Then** the system marks that specific ticket as checked in and displays attendee name
2. **Given** a ticket has been checked in, **When** someone tries to scan the same QR code again, **Then** the system indicates the ticket was already used
3. **Given** multiple attendees from the same purchase arrive, **When** each scans their individual ticket, **Then** each check-in is recorded separately
4. **Given** event organizer views check-in dashboard, **When** they refresh during the event, **Then** they see real-time count of checked-in attendees vs total tickets sold

---

### User Story 5 - Buyer vs Attendee Communication (Priority: P3)

Event organizers need to communicate with actual attendees, not just buyers. When sending event updates or reminders, the system sends emails to each individual attendee based on their ticket assignment, rather than only to the buyer.

**Why this priority**: Valuable for communication effectiveness but can initially work with buyer-only emails. Can be enhanced after core ticketing works.

**Independent Test**: Can be tested by assigning tickets to different email addresses, sending an event announcement, and verifying each attendee receives the email at their individual address. Delivers value by ensuring all attendees receive important event information.

**Acceptance Scenarios**:

1. **Given** tickets are assigned to individual attendees with their emails, **When** an organizer sends an event update, **Then** each attendee receives the email at their registered address
2. **Given** some tickets in an order are assigned and some are not, **When** an event reminder is sent, **Then** only assigned attendees receive the email (unassigned tickets don't have recipient)
3. **Given** organizer wants to send attendee-specific information (personalized agenda), **When** they send the email campaign, **Then** each attendee's email includes their specific details

---

### Edge Cases

- What happens when a buyer purchases tickets but never assigns them to attendees before the organizer-configured cutoff time?
- How does the system handle a ticket being reassigned close to the organizer-configured cutoff time?
- What happens if an attendee loses their QR code and needs a replacement at the venue?
- How does the system handle partial check-ins when a buyer purchased 5 tickets but only 3 people show up?
- How does the system handle concurrent ticket assignment attempts (e.g., buyer and team admin both try to assign the same ticket)? → Resolved: Optimistic locking with last-write-wins; system notifies previous assigner if their assignment was overwritten

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create individual ticket instances when a registration is completed, with quantity matching the number of tickets purchased
- **FR-002**: System MUST generate a unique identifier (QR code compatible) for each ticket instance
- **FR-003**: System MUST allow tickets to be assigned to attendees with required information: name and email at minimum
- **FR-004**: System MUST support custom registration form fields that attendees complete when assigned a ticket
- **FR-005**: System MUST track check-in status at the individual ticket instance level, not at the registration (order) level
- **FR-006**: System MUST prevent duplicate check-ins for the same ticket instance
- **FR-007**: System MUST maintain the relationship between a buyer (registration) and the tickets they purchased
- **FR-008**: System MUST maintain the relationship between each ticket instance and its assigned attendee
- **FR-009**: System MUST allow buyers to view and manage their ticket assignments through an order management interface
- **FR-010**: System MUST enable tickets to be reassigned to different attendees up until the organizer-configured cutoff time (which may be set to event start time, or earlier such as 24 hours or 1 hour before event start)
- **FR-011**: System MUST store attendee-specific data separately from buyer data
- **FR-012**: System MUST display real-time check-in metrics to event organizers (total checked in vs total tickets)
- **FR-013**: System MUST validate attendee email addresses during assignment using RFC 5322 compliant format validation and provide soft warnings for suspicious patterns (common typos like "gmial.com" or missing "@" symbols) while still allowing assignment to proceed
- **FR-014**: System MUST handle unassigned tickets gracefully, allowing assignment up to the organizer-configured cutoff time
- **FR-016**: System MUST allow event organizers to configure a ticket assignment/reassignment cutoff time (options: event start time, 1 hour before, 24 hours before, or custom)
- **FR-017**: System MUST support refunds for individual tickets (not just entire orders) up to the organizer-configured cutoff time, with buyer responsible for notifying affected attendees *(DEFERRED to future sprint - requires payment/paid ticket module)*
- **FR-018**: System MUST require buyers to confirm they have permission to share attendee information during ticket assignment
- **FR-019**: System MUST require attendees to accept terms and conditions when they first access their assigned ticket (via email link or ticket access page)
- **FR-020**: System MUST allow event organizers to configure the maximum number of tickets allowed per transaction (with a system default of 10 tickets)
- **FR-021**: System MUST implement optimistic locking for ticket assignment operations to handle concurrent attempts, using last-write-wins strategy with notification sent to any previously assigned user whose assignment was overwritten
- **FR-022**: System MUST delete the original attendee's custom registration field data when a ticket is reassigned, requiring the new attendee to provide fresh responses to all registration questions
- **FR-023**: System MUST NOT support transferring ticket ownership between different buyer registrations; tickets remain permanently associated with their original purchase order
- **FR-015**: System MUST support event communications sent to individual attendees based on their ticket assignments

### Key Entities

- **Ticket**: Represents a single physical or digital ticket created from a registration. Each instance is a separate unit that can be assigned to one attendee. Contains unique identifier (QR code data), check-in status, check-in timestamp, and relationship to both the original registration (purchase order) and the assigned attendee.

- **Attendee**: Represents a real person who will attend the event. Stores personal information (name, email), custom registration form responses, and links to their assigned ticket instance. An attendee exists only when a ticket is assigned to them. When a ticket is reassigned, the previous attendee's data is permanently deleted to ensure privacy and data accuracy.

- **Registration**: Represents the buyer's purchase transaction. Contains buyer contact information, payment details, selected ticket type, and quantity purchased. Has one-to-many relationship with ticket instances (one registration creates multiple ticket instances based on quantity).

- **Custom Registration Fields**: Event-specific questions that attendees must answer when assigned a ticket. Can be required or optional. Examples include dietary restrictions, t-shirt size, accessibility needs, session preferences.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Buyers can successfully purchase multiple tickets (up to the organizer-configured limit per event, with system default of 10) in a single transaction and receive confirmation within 5 seconds
- **SC-002**: Each ticket instance is assigned a unique identifier that can be encoded as a QR code and successfully scanned by standard QR readers
- **SC-003**: Attendees can complete ticket assignment and custom registration form in under 3 minutes
- **SC-004**: Event check-in staff can scan and validate a ticket in under 3 seconds per attendee
- **SC-005**: System accurately prevents duplicate check-ins with 100% reliability
- **SC-006**: Event organizers can view real-time attendance metrics showing checked-in count vs total tickets sold, updating within 2 seconds of each check-in
- **SC-007**: When sending event communications, 100% of assigned attendees receive emails at their individual addresses (not buyer's address)
- **SC-008**: Buyers can reassign tickets with changes reflected in the system within 5 seconds
- **SC-009**: System maintains accurate relationship between buyers and their tickets with 100% data integrity (no orphaned tickets)
- **SC-010**: Custom registration field responses are captured and stored with 100% accuracy for reporting and event logistics

## Assumptions

- Event organizers want to track individual attendees for operational and engagement purposes
- Buyers are willing to assign tickets to attendees (provide attendee information)
- Attendees will have access to email to receive their individual tickets
- Standard QR code format is sufficient for check-in scanning (no specialized hardware required)
- Event check-in will use QR code scanning (most common approach for modern events)
- Attendee data privacy and consent will be handled through dual-layer confirmation: buyers confirm they have permission to share attendee information during assignment, and attendees accept terms when first accessing their ticket
- The system should support the most common pattern: buyer purchases tickets and assigns them to attendees before the event starts
- Custom registration fields are defined at the event level, not per ticket type
- Check-in is a one-time action (attendees don't check out when leaving)
- Ticket ownership transfers between different buyers are not supported; the registration-ticket relationship is immutable to maintain payment and audit trail integrity

## Dependencies

- Email delivery system must support sending individual emails to multiple attendees from a single purchase
- QR code generation library must be available and integrated
- Database schema must be updated to support new Ticket and Attendee models
- Existing Registration model must be refactored to represent the buyer/purchase rather than the attendee
- Authentication system must support both buyers accessing their orders and attendees accessing their individual tickets
