# Attendees Workflows

## Overview

This document describes the workflows for managing attendees from the organizer dashboard. These workflows focus on attendee list management, filtering, exporting, and individual attendee actions.

---

## Workflow 1: View Attendee List

**Actor**: Event Organizer  
**Goal**: View all registered attendees for an event  
**Prerequisites**: Event exists with at least one registration

### Steps

1. **Navigate to Attendees Page**
   - Go to event dashboard: `/(dashboard)/[eventId]`
   - Click "Attendees" tab in navigation
   - Route: `/(dashboard)/[eventId]/attendees`

2. **Page Loads**
   - Server component fetches event data
   - Verifies user owns event (redirects if not)
   - Renders `<AttendeeTable>` component

3. **Initial Data Display**
   - tRPC query: `registration.list` with `eventId`
   - Table shows first 50 registrations
   - Columns: Name, Email, Ticket Type, Payment, Email Status, Date, Actions
   - Shows total count: "Showing 50 of 150 attendees"

4. **Scroll for More** (if applicable)
   - Scroll to bottom of list
   - Infinite scroll automatically loads next page
   - Uses cursor-based pagination
   - Seamless loading experience

### Result

Organizer sees complete list of attendees with key information at a glance.

---

## Workflow 2: Search for Attendee

**Actor**: Event Organizer  
**Goal**: Find specific attendee by name or email  
**Prerequisites**: Attendees exist

### Steps

1. **Start on Attendees Page**
   - Attendee list displayed

2. **Enter Search Term**
   - Click in search box (top left)
   - Type name or email: "john"
   - Search is debounced (500ms delay)

3. **Search Executes**
   - After 500ms pause, tRPC query updates:
     ```typescript
     api.registration.list({
       eventId,
       search: "john",
       limit: 50
     })
     ```

4. **Filtered Results Display**
   - Table updates with matching attendees
   - Shows: "John Doe", "john@example.com", etc.
   - Case-insensitive search
   - Matches partial strings

5. **Clear Search**
   - Delete search text or click X
   - After 500ms, full list returns

### Result

Organizer quickly finds specific attendee without scrolling through entire list.

---

## Workflow 3: Filter by Ticket Type

**Actor**: Event Organizer  
**Goal**: View attendees with specific ticket type  
**Prerequisites**: Event has multiple ticket types

### Steps

1. **Start on Attendees Page**
   - Full attendee list displayed

2. **Select Ticket Type**
   - Click ticket type dropdown (next to search)
   - Options: "All Ticket Types", "VIP Pass", "General Admission", etc.
   - Select "VIP Pass"

3. **Filter Applies**
   - tRPC query updates:
     ```typescript
     api.registration.list({
       eventId,
       ticketTypeId: "clx...",
       limit: 50
     })
     ```

4. **Filtered Results Display**
   - Table shows only VIP Pass attendees
   - Count updates: "Showing 20 of 20 attendees"

5. **Clear Filter**
   - Select "All Ticket Types" from dropdown
   - Full list returns

### Use Cases

- Check VIP attendee count
- Export specific ticket type list
- Verify ticket distribution

### Result

Organizer views attendees segmented by access level.

---

## Workflow 4: Export Attendee List

**Actor**: Event Organizer  
**Goal**: Download attendee data as CSV for offline use  
**Prerequisites**: At least one attendee registered

### Steps

1. **Start on Attendees Page**
   - Attendee list displayed (filtered or unfiltered)

2. **Click Export Button**
   - Green "Export CSV" button (top right)
   - Button shows download icon

3. **Export Processes**
   - tRPC mutation: `registration.export`
   - Server generates CSV:
     ```csv
     Name,Email,Ticket Type,Registration Date,Payment Status
     John Doe,john@example.com,General Admission,2025-01-15T10:30:00Z,free
     ```
   - Filename: `{event-slug}-attendees-{YYYY-MM-DD}.csv`

4. **Download Starts**
   - Browser triggers download automatically
   - CSV file saved to Downloads folder
   - Button returns to normal state

5. **Use CSV Data**
   - Open in Excel, Google Sheets, etc.
   - Use for badge printing
   - Import into email marketing tools
   - Generate reports

### CSV Format

- **Columns**: Name, Email, Ticket Type, Registration Date, Payment Status
- **Encoding**: UTF-8
- **Delimiter**: Comma
- **Headers**: First row

### Data Privacy Note

CSV contains PII (names, emails). Organizer responsible for:
- Secure storage
- GDPR compliance
- Proper disposal after event

### Result

Organizer has offline copy of attendee data for operational use.

---

## Workflow 5: Resend Confirmation Email

**Actor**: Event Organizer  
**Goal**: Re-send confirmation email to attendee  
**Prerequisites**: Attendee's registration exists

### Steps

1. **Locate Attendee**
   - Use search or scroll to find attendee
   - Example: "Jane Doe" who didn't receive email

2. **Click Resend Button**
   - Mail icon button in Actions column
   - Confirmation modal may appear (recommended)

3. **Server Processing**
   - tRPC mutation: `registration.resendConfirmation`
   - Fetches registration with event details
   - Retrieves registration code from customData
   - Sends confirmation email:
     ```typescript
     sendEmail({
       to: registration.email,
       subject: "Registration Confirmed: {eventName}",
       react: RegistrationConfirmation({ ... })
     })
     ```

4. **Success Feedback**
   - Toast notification: "Confirmation email resent to jane@example.com"
   - OR: Success message in UI

5. **Attendee Receives Email**
   - Email arrives within minutes
   - Contains registration code and event details

### Use Cases

- Attendee claims they didn't receive original email
- Email bounced initially, now fixed
- Attendee lost/deleted original email

### Error Handling

- Email send failure: Error logged, organizer notified
- Registration not found: Error message displayed

### Result

Attendee receives their confirmation email again.

---

## Workflow 6: Cancel Registration

**Actor**: Event Organizer  
**Goal**: Cancel an attendee's registration and free up ticket  
**Prerequisites**: Attendee's registration exists

### Steps

1. **Locate Attendee**
   - Use search or scroll to find attendee
   - Example: Duplicate registration or attendee requested cancellation

2. **Click Cancel Button**
   - Trash icon button (red) in Actions column
   - **Confirmation modal appears**: "Are you sure you want to cancel this registration?"
   - Warning: "This action cannot be undone"

3. **Confirm Cancellation**
   - Click "Yes, Cancel Registration"
   - tRPC mutation: `registration.cancel`

4. **Server Processing**
   - Database transaction:
     ```typescript
     await db.$transaction(async (tx) => {
       // Delete registration
       await tx.registration.delete({ where: { id } });
       // Future: Update ticket availability
     });
     ```

5. **Success Feedback**
   - Registration removed from table
   - Toast notification: "Registration cancelled successfully"
   - Table row disappears or fades out

6. **Manual Notification** (Recommended)
   - System does NOT automatically email attendee
   - Organizer should manually notify:
     - "Your registration has been cancelled"
     - Reason for cancellation
     - Refund info (if applicable)

### Use Cases

- Duplicate registration
- Attendee requested cancellation
- Test registration cleanup
- Inappropriate/spam registration

### Important Notes

- **Permanent**: Cannot be undone
- **No Email**: Organizer must notify attendee manually
- **Ticket Freed**: Future: increases available ticket count
- **Data Lost**: Registration data permanently deleted

### Result

Registration cancelled, ticket potentially available for someone else.

---

## Workflow 7: Monitor Email Status

**Actor**: Event Organizer  
**Goal**: Identify attendees with email delivery issues  
**Prerequisites**: Email webhooks configured (Resend)

### Steps

1. **View Attendees List**
   - Navigate to attendees page
   - Email Status column visible

2. **Identify Issues**
   - **Green "Active" badge**: Email deliverable (normal)
   - **Red "Bounced" badge**: Email hard bounced (problem)
   - **Gray "Unsubscribed" badge**: User opted out

3. **Filter by Email Status** (future enhancement)
   - Currently: Visual scan of badges
   - Future: Add email status filter dropdown

4. **Take Action on Bounced Emails**
   - **Option 1**: Contact attendee via alternative method
   - **Option 2**: Request updated email address
   - **Option 3**: Cancel registration if unreachable

5. **Respect Unsubscribed Status**
   - Do not send campaign emails to unsubscribed users
   - Communications module automatically filters them out

### Email Status Updates

**Automatic** (via webhook):
```typescript
// Called by Resend webhook
POST /api/webhooks/email-status
{
  email: "attendee@example.com",
  status: "bounced"
}

// Updates all registrations with that email
await db.registration.updateMany({
  where: { email },
  data: { emailStatus: "bounced" }
});
```

### Use Cases

- Pre-event: Identify bad emails before mass email campaign
- Post-event: Follow up with unreachable attendees
- Compliance: Respect opt-outs

### Result

Organizer maintains clean email list, respects attendee preferences.

---

## State Transitions

### Email Status Flow

```
active → bounced (via webhook)
active → unsubscribed (via webhook or user action)
bounced → active (manual correction, rare)
```

### Registration Lifecycle

```
[Registration Created]
       ↓
[Active in System]
       ↓
    ┌──┴──┐
    ↓     ↓
[Attended] [Cancelled]
```

---

## Best Practices

### For Organizers

1. **Regular Monitoring**: Check attendee list weekly leading up to event
2. **Export Early**: Export attendee list 1 week before event for planning
3. **Clean Email List**: Address bounced emails promptly
4. **Confirm Cancellations**: Always confirm before canceling (prevent accidents)
5. **Manual Notifications**: Email attendees when canceling their registration
6. **Data Privacy**: Delete exports after event if not needed for records

### For Developers

1. **Confirmation Modals**: Always confirm destructive actions (cancel)
2. **Loading States**: Show feedback during mutations
3. **Error Handling**: Gracefully handle API failures
4. **Debounce Search**: 500ms standard for search inputs
5. **Pagination**: Use infinite scroll for large lists
6. **Authorization**: Always verify organizer ownership

---

## Related Documentation

- [Backend Documentation](./backend.md) - Registration router procedures
- [Frontend Documentation](./frontend.md) - AttendeeTable component
- [Data Model](./data-model.md) - Registration model
- [Registration Module Workflows](../registration/workflows.md) - Registration creation
