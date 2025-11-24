# Feature Specification: Attendee Check-In Service

**Feature Branch**: `001-attendee-check-in`  
**Created**: November 24, 2025  
**Status**: Draft  
**Input**: User description: "Create a check-in service to allow event team check-in attendee, it should support checking in by ticketNumber in a list view and allow QR code scanning for check in; List view should show attendees status, basic info (name, ticket and email), and checkin status."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manual Check-In via List View (Priority: P1)

Event team members need a quick way to check in attendees at the venue using a searchable list view with ticket number lookup. This is the core functionality that enables check-in operations even when QR scanning is unavailable or impractical.

**Why this priority**: This is the foundation of the check-in system. It provides a reliable manual fallback and delivers immediate value by allowing team members to process attendees. Can function independently without QR scanning capabilities.

**Independent Test**: Can be fully tested by loading an attendee list, searching by ticket number, and marking attendees as checked in. Delivers value by enabling manual check-in operations at the event.

**Acceptance Scenarios**:

1. **Given** an event team member is on the check-in page, **When** they search for an attendee by ticket number "TKT-12345", **Then** the attendee's details (name, email, ticket number, and current check-in status) are displayed in the list
2. **Given** an attendee is found in the list with status "Not Checked In", **When** the team member clicks the check-in action, **Then** the attendee's status updates to "Checked In" and the timestamp is recorded
3. **Given** multiple attendees exist for an event, **When** the team member views the attendee list, **Then** all attendees are displayed with their name, email, ticket number, and check-in status clearly visible
4. **Given** an attendee is already checked in, **When** the team member views their record, **Then** the check-in status shows "Checked In" with the timestamp of when they were checked in

---

### User Story 2 - QR Code Scanning for Check-In (Priority: P2)

Event team members need to quickly check in attendees by scanning QR codes on their tickets, reducing wait times and improving the attendee experience at busy entry points.

**Why this priority**: Enhances the check-in experience with faster processing but depends on the core list view functionality. Provides significant efficiency gains for high-volume events.

**Independent Test**: Can be tested by generating QR codes for tickets, scanning them with the check-in interface, and verifying automatic check-in. Delivers value by enabling rapid check-in processing.

**Acceptance Scenarios**:

1. **Given** an event team member has access to the QR scanner interface, **When** they scan an attendee's ticket QR code, **Then** the system automatically identifies the attendee and marks them as checked in
2. **Given** a QR code contains a valid ticket number, **When** it is scanned, **Then** the attendee's details are displayed and their status updates to "Checked In"
3. **Given** an attendee has already been checked in, **When** their QR code is scanned again, **Then** the system displays a message indicating they are already checked in with the original check-in timestamp
4. **Given** a QR code is invalid or not associated with the event, **When** it is scanned, **Then** the system displays an error message indicating the ticket is not valid

---

### User Story 3 - Attendee Status Filtering and Overview (Priority: P3)

Event team members need to filter and view attendees by their check-in status to monitor event attendance in real-time and identify who has not yet arrived.

**Why this priority**: Provides operational insights and helps manage the check-in process but is not essential for the core check-in functionality. Useful for larger events with complex logistics.

**Independent Test**: Can be tested by applying status filters (All, Checked In, Not Checked In) and verifying the list updates accordingly. Delivers value by providing attendance visibility.

**Acceptance Scenarios**:

1. **Given** an event team member is viewing the attendee list, **When** they apply a filter to show only "Checked In" attendees, **Then** only attendees who have been checked in are displayed
2. **Given** an event team member is viewing the attendee list, **When** they apply a filter to show only "Not Checked In" attendees, **Then** only attendees who have not been checked in are displayed
3. **Given** filtering is applied, **When** an attendee's status changes (e.g., they get checked in), **Then** the list updates automatically to reflect the current filter criteria

---

### Edge Cases

- What happens when a ticket number is entered that doesn't exist in the system?
- How does the system handle scanning a QR code when offline or with poor connectivity?
- What happens when an attendee tries to check in before the event start time or after the event has ended?
- How does the system handle checking in an attendee whose ticket has been cancelled or refunded?
- What happens if multiple team members try to check in the same attendee simultaneously?
- How does the system handle QR codes that are damaged, partially readable, or from a different event?
- What happens when searching for attendees with similar names or duplicate ticket numbers (if allowed)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a searchable list of all attendees for a specific event showing name, email, ticket number, and check-in status
- **FR-002**: System MUST allow event team members to search for attendees by ticket number with instant filtering results
- **FR-003**: System MUST allow team members to manually mark an attendee as checked in from the list view
- **FR-004**: System MUST record the timestamp when an attendee is checked in
- **FR-005**: System MUST support QR code scanning to automatically identify and check in attendees
- **FR-006**: System MUST validate that the scanned QR code belongs to a valid ticket for the current event
- **FR-007**: System MUST prevent duplicate check-ins by displaying a warning when an already checked-in attendee is processed again
- **FR-008**: System MUST display clear visual indicators for check-in status (checked in vs. not checked in) in the attendee list
- **FR-009**: System MUST provide filtering options to view all attendees, only checked-in attendees, or only not-checked-in attendees
- **FR-010**: System MUST restrict check-in functionality to authorized event team members only
- **FR-011**: System MUST display error messages when invalid ticket numbers are searched or invalid QR codes are scanned
- **FR-012**: System MUST update the attendee list in real-time when check-in status changes

### Key Entities

- **Attendee**: Represents a person registered for an event with attributes including name, email address, current check-in status (checked in or not checked in), and check-in timestamp. Associated with a specific ticket and event.
- **Ticket**: Represents proof of registration with a unique ticket number and associated QR code data. Links an attendee to an event and contains check-in eligibility information.
- **Check-In Record**: Represents the act of checking in an attendee, including the timestamp of check-in and which team member performed the action.
- **Event Team Member**: Represents an authorized user with permission to perform check-in operations for specific events.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Team members can locate an attendee by ticket number and complete check-in within 10 seconds using the list view
- **SC-002**: Team members can check in attendees via QR code scan in under 3 seconds per attendee
- **SC-003**: The system accurately prevents duplicate check-ins 100% of the time, displaying appropriate warnings
- **SC-004**: The attendee list updates check-in status within 2 seconds of any check-in action
- **SC-005**: Team members can successfully identify and resolve invalid ticket numbers or QR codes based on clear error messages in 95% of cases
- **SC-006**: The check-in interface supports processing at least 100 attendees per hour per team member during peak entry times
