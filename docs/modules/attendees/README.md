# Attendees Module

## Overview

The Attendees module provides organizers with comprehensive attendee management capabilities. It's essentially a specialized view of the Registration module, focused on managing and exporting attendee data. The module enables organizers to view, search, filter, and export their event registrations for operational purposes.

## Features

- **Attendee List View**: Comprehensive table of all registrations
- **Real-time Search**: Debounced search by name or email
- **Ticket Type Filtering**: Filter attendees by ticket type
- **Email Status Tracking**: Monitor email bounces and unsubscribes
- **CSV Export**: Download attendee data for offline use
- **Resend Confirmations**: Re-send confirmation emails to attendees
- **Registration Cancellation**: Cancel registrations (frees up tickets)
- **Pagination**: Infinite scroll for large attendee lists
- **Status Badges**: Visual indicators for payment and email status

## User Roles

### Organizers
- View all attendees for their events
- Search and filter attendee list
- Export attendee data to CSV
- Resend confirmation emails
- Cancel registrations
- Monitor email delivery status
- **Full control** over attendee management

### Attendees
- No direct access to this module
- Receive confirmation emails via Registration module
- Can view their own registration details (not covered in this module)

### Public Users
- No access to attendee data
- Privacy protected

## Module Dependencies

**This module depends on:**
- **Events Module**: Attendees belong to events
- **Tickets Module**: Attendees have ticket types
- **Registration Module**: **Core dependency** - Uses registration router procedures
- **Communications Module**: Sends emails (confirmation resends)

**This module is required by:**
- **Communications Module**: Targets attendees for email campaigns
- **Analytics/Reporting** (future): Attendee metrics and insights

## Relationship to Registration Module

The Attendees module is **not a separate backend router**. It:
- Uses the same `registrationRouter` procedures
- Provides a different UI/UX focused on management (vs. sign-up)
- Adds filtering and export capabilities
- Focuses on organizer workflows (vs. public registration)

**Key Difference**:
- **Registration Module**: Public sign-up forms + basic organizer list
- **Attendees Module**: Advanced management dashboard for organizers

## Quick Links
- [Backend Documentation](./backend.md) - Registration router procedures
- [Frontend Documentation](./frontend.md) - AttendeeTable component
- [Data Model](./data-model.md) - Registration model reference
- [Workflows](./workflows.md) - Management workflows

## Related Files

### Backend
- `src/server/api/routers/registration.ts` - Registration router (shared)

### Frontend
- `src/app/(dashboard)/[id]/attendees/page.tsx` - Attendees page
- `src/components/registration/attendee-table.tsx` - Main table component

### Database Model
- `Registration` - Core attendee data model (shared with Registration module)

## Feature Coverage

This module provides organizer capabilities for:

- **Attendee List** (FR-016): View all registrations with filtering
- **Search Functionality**: Real-time search by name/email
- **Ticket Type Filter**: Filter by specific ticket types
- **CSV Export** (FR-018): Download attendee data
- **Email Management**:
  - Resend confirmations
  - Track email status (active/bounced/unsubscribed)
  - Update email status from webhooks
- **Registration Cancellation**: Free up ticket inventory

## Getting Started

### For Organizers

1. **Navigate to Attendees**
   - Go to event dashboard: `/(dashboard)/[eventId]`
   - Click "Attendees" tab
   - Route: `/(dashboard)/[eventId]/attendees`

2. **View Attendee List**
   - See all registrations in a table
   - Columns: Name, Email, Ticket Type, Payment Status, Email Status, Registered Date, Actions

3. **Search Attendees**
   - Type in search box to find by name or email
   - Search is debounced (500ms) to reduce API calls

4. **Filter by Ticket Type**
   - Use dropdown to show only specific ticket types
   - Helps organize attendees by access level

5. **Export Data**
   - Click "Export CSV" button
   - Download CSV file with all attendee data
   - Use for badge printing, email lists, etc.

6. **Manage Individual Attendees**
   - **Resend Confirmation**: Re-send confirmation email
   - **Cancel Registration**: Cancel and free up ticket

## Best Practices

### For Organizers
1. **Regular Monitoring**: Check attendee list regularly for bounced emails
2. **CSV Exports**: Export before event for badge printing
3. **Search Efficiently**: Use search instead of scrolling through large lists
4. **Email Status**: Monitor bounces and unsubscribes
5. **Data Privacy**: Respect attendee privacy, only export when necessary

### For Developers
1. **Debounced Search**: Always debounce search inputs (500ms standard)
2. **Pagination**: Use infinite scroll for lists >50 items
3. **Export Optimization**: Generate exports server-side
4. **Email Status**: Update via webhooks, not manual entry
5. **Authorization**: Always verify organizer ownership

## Data Privacy Considerations

**Exported Data** includes:
- Name, Email (PII - handle carefully)
- Ticket type, registration date
- Payment status (if applicable)

**Best Practices**:
- Only export when needed
- Store exports securely
- Delete after event if not needed for records
- Comply with GDPR/data protection laws
- Provide attendee opt-out mechanisms

## Integration Points

### With Registration Module
- Uses same backend procedures
- Shares `Registration` model
- Different UI focus (management vs sign-up)

### With Communications Module
- Attendees are campaign recipients
- Email status tracked and updated
- Filters applied to target specific attendees

### With Tickets Module
- Filter attendees by ticket type
- Shows ticket availability impact

## Future Enhancements

- **Check-in System**: QR code scanning at event entrance
- **Attendee Details Page**: Detailed view of individual attendee
- **Bulk Actions**: Bulk resend, bulk cancel
- **Advanced Filters**: By registration date, payment status, custom fields
- **Excel Export**: Alternative to CSV with formatting
- **Attendee Notes**: Internal organizer notes on attendees
- **Badge Printing**: Direct integration with badge printers
