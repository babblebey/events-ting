# Attendees Module

## Overview

The Attendees module manages the **actual event participants** - the people who receive tickets and attend the event. This is distinct from the Registration module which handles ticket purchases.

### Critical Distinction

**Registration Module** = Ticket purchasing (buyer data)  
**Attendees Module** = Event participation (who actually attends)

**Example Flow**:
1. Alice (buyer) purchases 5 tickets → Creates Registration
2. System creates 5 Ticket instances
3. Alice assigns tickets to: Bob, Carol, Dave, Eve, and herself
4. 5 Attendee records created → Attendees module manages them

## Key Concepts

### Attendee vs Buyer vs Ticket

| Entity | Represents | Example |
|--------|-----------|---------|
| **Registration** | Purchase transaction | Alice buys 5 tickets |
| **Ticket** | Individual ticket instance | Ticket #001, #002, #003... |
| **Attendee** | Person using a ticket | Bob, Carol, Dave, Eve, Alice |

**One Registration** (Alice's purchase)  
→ **Five Tickets** (individual instances)  
→ **Five Attendees** (the people attending)

### Attendee Data Model

```prisma
model Attendee {
  id          String  @id
  name        String  // ATTENDEE name (not buyer)
  email       String  // ATTENDEE email (not buyer)
  customData  Json?   // Registration form answers
  emailStatus String  // Bounce/unsubscribe tracking
  ticket      Ticket? // One-to-one relationship
}
```

## Features

- **Attendee List View**: All people attending event (not who purchased)
- **Real-time Search**: Find attendees by name or email
- **Ticket Type Filtering**: Filter by ticket tier
- **Email Status Tracking**: Monitor bounces and unsubscribes
- **CSV Export**: Download attendee data (with custom field answers)
- **CSV Import**: Bulk import attendees with validation
- **Resend Tickets**: Re-send ticket emails to attendees
- **Assignment Management**: View ticket assignments
- **Custom Field Data**: View attendee responses to custom questions

## User Roles

### Organizers
- View all attendees (people attending, not buyers)
- Search and filter attendee list
- Export attendee data with custom fields
- Resend ticket emails
- Monitor email delivery status
- **Full control** over attendee management

### Attendees
- Receive ticket via email (assigned by buyer)
- View their ticket details and QR code
- No direct access to attendee list
- Privacy protected

### Buyers
- Assign tickets to create attendees (Tickets module)
- Cannot directly view attendee list (privacy)
- Can only see attendees for tickets they purchased

## Module Dependencies

**This module depends on:**
- **[Tickets Module](../tickets/)**: Attendees are created via ticket assignment
- **[Events Module](../events/)**: Attendees belong to events
- **[Communications Module](../communications/)**: Email delivery to attendees

**This module is required by:**
- **Communications Module**: Target recipients for email campaigns
- **[Check-In Module](../check-in/)**: Attendee check-in at event

## Module Scope

### This Module Handles:
- ✅ Viewing who is attending the event
- ✅ Exporting attendee data (names, emails, custom fields)
- ✅ Searching and filtering attendees
- ✅ Resending ticket emails
- ✅ Monitoring email delivery status
- ✅ Importing attendees in bulk

### This Module Does NOT Handle:
- ❌ Ticket purchasing (see Registration module)
- ❌ Ticket assignment (see Tickets module)
- ❌ Buyer information management (see Registration module)
- ❌ Payment processing (see Registration module)

## Relationship to Other Modules

### vs Registration Module
- **Registration**: Who **purchased** tickets (buyer data)
- **Attendees**: Who is **attending** event (participant data)
- Often different people (group purchases)

### vs Tickets Module
- **Tickets**: Individual ticket instances (QR codes, assignment status)
- **Attendees**: The people assigned to tickets
- One ticket → One attendee (after assignment)

### Backend Implementation Note

The Attendees module uses data from the `Attendee` model, which is:
- **Created during ticket assignment** (Tickets module)
- **Managed and viewed** (Attendees module)
- **Used for communications** (Communications module)

It does NOT use the Registration model directly.

## Quick Links

- [Backend Documentation](./backend.md) - Attendee-focused procedures
- [Frontend Documentation](./frontend.md) - AttendeeTable component
- [Data Model](./data-model.md) - Attendee model schema
- [Workflows](./workflows.md) - Management workflows

## Related Files

### Backend
- `src/server/api/routers/attendees.ts` - Attendees router (if separate)
- `src/server/api/routers/registration.ts` - Shares some procedures

### Frontend
- `src/app/(dashboard)/[id]/attendees/page.tsx` - Attendees page
- `src/components/registration/attendee-table.tsx` - Main table component

### Database Model
- `Attendee` - Core attendee data model
- `Ticket` - Links attendee to purchase
- `Registration` - Buyer information (separate)

## Feature Coverage

This module provides organizer capabilities for:

- **Attendee List** (FR-016): View all attendees with filtering
- **Search Functionality**: Real-time search by name/email
- **Ticket Type Filter**: Filter by specific ticket types
- **CSV Export** (FR-018): Download attendee data
- **CSV Import** (FR-019): Bulk import attendees from CSV files
  - Multi-step wizard with validation
  - Smart field mapping with auto-suggestions
  - Duplicate detection (in-file and database)
  - Partial commit strategy for error handling
  - CSV template download
- **Email Management**:
  - Resend ticket emails
  - Track email status (active/bounced/unsubscribed)
  - Update email status from webhooks
- **Ticket Resend**: Re-send ticket to attendees

## Getting Started

### For Organizers

1. **Navigate to Attendees**
   - Go to event dashboard: `/(dashboard)/[eventId]`
   - Click "Attendees" tab
   - Route: `/(dashboard)/[eventId]/attendees`

2. **View Attendee List**
   - See all attendees in a table
   - Columns: Name, Email, Ticket Type, Email Status, Assignment Date, Actions
   - **Note**: Shows attendees, not buyers

3. **Search Attendees**
   - Type in search box to find by name or email
   - Search is debounced (500ms) to reduce API calls
   - Searches attendee information only

4. **Filter by Ticket Type**
   - Use dropdown to show only specific ticket types
   - Helps organize attendees by access level

5. **Export Attendee Data**
   - Click "Export CSV" button
   - Download CSV file with all attendee data
   - Includes custom field answers
   - Use for badge printing, catering, etc.

6. **Import Attendees**
   - Click "Import Attendees" button
   - Upload CSV file with attendee data
   - Map CSV columns to system fields
   - Validate data and handle duplicates
   - Execute import with progress feedback

7. **Manage Individual Attendees**
   - **Resend Ticket**: Re-send ticket email to attendee
   - **View Assignment**: See which buyer purchased this ticket

## Best Practices

### For Organizers
1. **Regular Monitoring**: Check attendee list regularly for email issues
2. **CSV Exports**: Export before event for operational needs
3. **Search Efficiently**: Use search instead of scrolling
4. **Email Status**: Monitor bounces and act on undeliverable emails
5. **Data Privacy**: Respect attendee privacy, export only when necessary

### For Developers
1. **Debounced Search**: Always debounce search inputs (500ms standard)
2. **Pagination**: Use infinite scroll for lists >50 items
3. **Export Optimization**: Generate exports server-side
4. **Email Status**: Update via webhooks, not manual entry
5. **Authorization**: Always verify organizer ownership

## Data Privacy Considerations

**Exported Data** includes:
- Name, Email (PII - handle carefully)
- Custom field responses (may include dietary/medical info)
- Ticket type, assignment date

**Best Practices**:
- Only export when needed
- Store exports securely
- Delete after event if not needed for records
- Comply with GDPR/data protection laws
- Provide attendee opt-out mechanisms
- Respect email preferences (unsubscribe)

## Integration Points

### With Tickets Module
- Attendee records created during ticket assignment ([see assignment workflow](../tickets/workflows.md))
- One-to-one relationship with tickets
- Attendee deleted when ticket unassigned (GDPR)

### With Communications Module
- Attendees are email campaign recipients
- Email status tracked and updated via webhooks
- Filters applied to target specific attendees
- Ticket emails sent to attendee addresses

### With Registration Module
- Different data models (Attendee vs Registration)
- Registration = buyer, Attendee = participant
- Often different people in group purchases
- Separate export functions for each

## Future Enhancements

- **Check-in System**: QR code scanning integration
- **Attendee Details Page**: Detailed view of individual attendee
- **Bulk Actions**: Bulk resend, bulk operations
- **Advanced Filters**: By assignment date, custom fields, email status
- **Excel Export**: Alternative to CSV with formatting
- **Excel Import**: Support .xlsx files in addition to CSV
- **Update Existing Records**: Update attendees via import instead of create only
- **Import API Endpoint**: Programmatic imports via REST API
- **Attendee Notes**: Internal organizer notes on attendees
- **Badge Printing**: Direct integration with badge printers
- **Communication Preferences**: Attendee-specific email preferences

## Common Scenarios

### Viewing Event Attendees

**Scenario**: Organizer wants to see who's attending

**Steps**:
1. Navigate to Attendees tab
2. View list of all attendees (not buyers)
3. See 100 attendees from 50 purchases (average 2 tickets/purchase)

### Exporting for Badge Printing

**Scenario**: Print badges for event

**Steps**:
1. Export attendee CSV (includes all attendees)
2. Get name, email, ticket type for each attendee
3. Import to badge printing software
4. Print badges

**Don't use**: Registration export (shows buyers, not attendees)

### Finding Specific Attendee

**Scenario**: Attendee calls with question

**Steps**:
1. Search by attendee name or email
2. View ticket details
3. Resend ticket if needed
4. See who purchased the ticket (buyer info)

## Troubleshooting

### Can't Find Attendee

**Problem**: Searched but attendee not found

**Common Causes**:
1. **Ticket Not Assigned**: Buyer purchased but didn't assign
2. **Different Name**: Attendee registered under different name
3. **Typo in Search**: Check spelling

**Solution**: 
- Check Tickets module for unassigned tickets
- Search by email instead of name
- Check Registration module for buyer information

### Export Missing Attendees

**Problem**: Export shows fewer people than expected

**Explanation**: 
- Registration export shows **buyers** (who purchased)
- Attendees export shows **attendees** (who's attending)
- If 10 buyers purchased 50 tickets, Registration export = 10 rows, Attendees export = 50 rows (after assignment)

**Solution**: Use Attendees module export for attendee data

### Email Not Received

**Problem**: Attendee didn't receive ticket email

**Common Causes**:
1. **Invalid Email**: Typo in email address
2. **Spam Filter**: Email in spam folder
3. **Email Status**: Marked as bounced

**Solution**:
- Check email status in attendee list
- Resend ticket email
- Verify email address with buyer

## Related Documentation

- [Registration Module](../registration/) - Ticket purchasing (buyer data)
- [Tickets Module](../tickets/) - Ticket instances and assignment
- [Communications Module](../communications/) - Email delivery
- [Data Model](./data-model.md) - Attendee schema details
- [Backend Documentation](./backend.md) - API procedures
