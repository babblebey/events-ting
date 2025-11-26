# Tickets Module

## Overview

The Tickets module manages individual ticket instances and their assignment to attendees. It serves as the **bridge between purchases (Registration) and participants (Attendees)**.

### The Three-Tier Model

```
Registration (Purchase)
    ↓ creates
Ticket Instances
    ↓ assigned to
Attendees (Participants)
```

**Example**:
1. Alice (buyer) purchases 3 tickets → 1 Registration + 3 Tickets
2. Alice assigns Ticket #1 to Bob → Creates Attendee "Bob"
3. Alice assigns Ticket #2 to Carol → Creates Attendee "Carol"
4. Ticket #3 remains unassigned → No attendee yet

## Key Concepts

### Registration → Ticket → Attendee Flow

| Step | Entity | Data | Purpose |
|------|--------|------|---------|
| 1 | **Registration** | Buyer info, quantity, payment | Purchase transaction |
| 2 | **Ticket** (×N) | Ticket numbers, QR codes | Individual instances |
| 3 | **Attendee** (×N) | Attendee info, custom fields | Event participants |

### Module Scope

This module handles:
- ✅ Creating ticket instances from purchases
- ✅ Assigning tickets to attendees
- ✅ Reassigning tickets (GDPR-compliant deletion)
- ✅ Unassigning tickets
- ✅ Generating/managing QR codes
- ✅ Tracking assignment status
- ✅ Enforcing assignment cutoffs

This module does NOT handle:
- ❌ Ticket purchasing (see Registration module)
- ❌ Listing all attendees (see Attendees module)
- ❌ Exporting attendee data (see Attendees module)
- ❌ Check-in processing (future module)

## Features

- **Ticket Instance Management**: Individual tickets created from registration purchases
- **Unique QR Codes**: Each ticket has a unique QR code for validation and check-in
- **Ticket Assignment**: Buyers can assign tickets to different attendees
- **Attendee Information**: Collect name, email, and custom registration data per ticket
- **Assignment Cutoff**: Configurable deadline for ticket assignments (event start, 1h/24h before, custom)
- **Buyer Dashboard**: Self-service interface for managing purchased tickets
- **Reassignment Support**: Change ticket assignments before cutoff (GDPR-compliant deletion of old attendee data)
- **Check-in Tracking**: Mark tickets as checked-in during event entry (deferred to future sprint)

## User Roles

### Buyers (Ticket Purchasers)
- Purchase multiple tickets in a single transaction
- Access ticket management dashboard via email link
- Assign tickets to attendees (name, email, custom fields)
- Reassign tickets before assignment cutoff
- View all tickets from their purchase
- Cannot assign tickets after cutoff time

### Attendees (Ticket Recipients)
- Receive unique ticket with QR code via email
- View individual ticket details and QR code
- Accept event terms (placeholder - full implementation deferred)
- Cannot reassign tickets (only buyer can reassign)

### Organizers
- View all tickets for their events
- See assignment status and metrics
- Configure assignment cutoff time
- Set maximum tickets per purchase
- Monitor check-in statistics (deferred to future sprint)

### Public Users
- No access to ticket instances directly
- Purchase tickets through registration flow

## Module Dependencies

**This module depends on:**
- **[Registration Module](../registration/)**: Tickets created from purchases
- **[Events Module](../events/)**: Assignment cutoff configured at event level
- **[Communications Module](../communications/)**: Send ticket emails to attendees

**This module is required by:**
- **[Attendees Module](../attendees/)**: Each ticket creates an Attendee when assigned
- **[Check-In Module](../check-in/)**: QR code scanning and check-in status tracking

**Creates data for**:
- Attendee records (via assignment)

## Quick Links

- [Backend Documentation](./backend.md) - tickets tRPC router (assign, unassign, list, QR generation)
- [Frontend Documentation](./frontend.md) - Ticket assignment components and buyer dashboard
- [Data Model](./data-model.md) - Ticket schema (instances, not types)
- [Workflows](./workflows.md) - Assignment and reassignment flows

## Key Concepts

### Ticket Instance vs Ticket Type

**Ticket Type** (defined in TicketType model):
- Template for tickets (e.g., "General Admission", "VIP Pass")
- Defines price, quantity available, sale period
- Created by organizers in event setup

**Ticket Instance** (this module):
- Individual ticket created when someone purchases
- Each ticket has unique ticket number and QR code
- Can be assigned to a specific attendee
- Tracks check-in status independently

**Example**: If Alice buys 3 "General Admission" tickets, the system creates 3 Ticket instances, all referencing the same TicketType.

### Ticket Assignment

A ticket is "assigned" when the buyer provides attendee details:
- **Name**: Who will use this ticket
- **Email**: Where to send the ticket
- **Custom Data**: Event-specific questions (dietary restrictions, t-shirt size, etc.)

Assignment creates an Attendee record and links it to the Ticket.

### Assignment Cutoff

Organizers configure when ticket assignments must be completed:
- **event_start**: Can assign until event begins (default)
- **1h_before**: Must assign 1 hour before event start
- **24h_before**: Must assign 24 hours before event start
- **custom**: Organizer sets specific cutoff date/time

**After cutoff**: Tickets can still be used at check-in, but cannot be assigned/reassigned.

### Unique Ticket Numbers

Format: `TKT-{SHORT_EVENT_ID}-{RANDOM_NANOID}`

Example: `TKT-L8Z9K3-A7B2C5D8E9`

- **Readable**: Easier for support staff than UUIDs
- **Unique**: Globally unique via nanoid (21 characters)
- **Scannable**: Encoded in QR code for check-in

### QR Code Data

Each ticket has a **pre-generated QR code** stored as a PNG data URL in the `qrCodeData` field. QR codes are generated once during ticket creation and stored in the database for immediate use.

**Storage Format**: PNG data URL (~8-12KB)
```typescript
qrCodeData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQ..."
```

**QR Code Payload**: Encodes the ticket number only
```
"TKT-L8Z9K3-A7B2C5D8E9"
```

**QR Code Settings**:
- **Format**: PNG data URL
- **Size**: 400x400 pixels
- **Error correction level**: H (30% recovery for damaged codes)
- **Encoding**: Ticket number (simple string for maximum compatibility)

**Performance Benefits**:
- ✅ QR codes load instantly (no generation API call needed)
- ✅ Email sending is faster (no QR generation during send)
- ✅ Offline support (QR codes cached with page)
- ✅ Consistent across all views (web, email, mobile)

### Ticket Lifecycle

1. **Created**: Buyer completes registration → X ticket instances created
2. **Unassigned**: Ticket exists but no attendee assigned
3. **Assigned**: Buyer provides attendee details → Attendee record created
4. **Reassigned**: Buyer changes attendee → Old attendee deleted (GDPR), new created
5. **Checked-in**: Attendee scans QR at event entry (future sprint)

### Business Rules

- Buyer can assign/reassign tickets **before assignment cutoff only**
- Each ticket can only be assigned to **one attendee at a time**
- Reassignment **deletes previous attendee data** (GDPR compliance)
- Tickets **cannot be reassigned after check-in** (immutable)
- Maximum tickets per purchase is **organizer-configurable** (default: 10)
- Ticket assignment uses **optimistic locking** to prevent race conditions

## Related Modules

- **[Events Module](../events/)**: Event configuration (assignment cutoff, max tickets per purchase)
- **[Registration Module](../registration/)**: Ticket instance creation during purchase, buyer information  
- **[Attendees Module](../attendees/)**: Individual attendee records linked to tickets
- **[Communications Module](../communications/)**: Send ticket notifications to attendees\n\n## Related Files\n\n### Backend\n- `src/server/api/routers/tickets.ts` - Tickets tRPC router (list, assign, unassign, QR generation)\n- `src/lib/tickets/generate-ticket-number.ts` - Unique ticket number generation\n- `src/lib/qr-code/generator.ts` - QR code generation utilities\n\n### Frontend\n- `src/app/(public)/events/[slug]/registrations/[registrationId]/page.tsx` - Buyer ticket dashboard\n- `src/app/events/[slug]/tickets/[ticketId]/page.tsx` - Individual ticket view (attendee)\n- `src/components/tickets/ticket-card.tsx` - Ticket display component\n- `src/components/tickets/assignment-modal.tsx` - Assignment modal with custom fields\n- `src/components/tickets/qr-code-display.tsx` - QR code viewer\n\n### Database Models\n- `Ticket` - Individual ticket instances\n- `Attendee` - Attendee records (linked from Ticket)\n- `Registration` - Buyer purchase record (parent of tickets)\n- `Event` - Assignment cutoff configuration\n\n### Email Templates\n- `emails/ticket-assigned.tsx` - Sent to attendee when ticket assigned\n- `emails/ticket-reassigned.tsx` - Sent to new attendee on reassignment\n- `emails/registration-confirmation.tsx` - Sent to buyer referencing ticket assignments\n\n## Feature Coverage\n\nThis module implements:\n\n- **FR-001**: Multiple ticket purchase (buyer buys X tickets → X ticket instances created)\n- **FR-002**: Individual ticket assignment (buyer assigns each to different person)\n- **FR-003**: Unique QR codes (each ticket has unique QR, encodes ticketId+eventId)\n- **FR-004**: Assignment cutoff enforcement (UI display - validation deferred)\n- **FR-005**: Ticket reassignment (deletes old attendee, creates new - GDPR compliant)\n- **FR-006**: Buyer dashboard (self-service ticket management via email link)\n- **FR-007**: Attendee ticket view (individual ticket page with QR code)\n- **FR-018**: Buyer permission confirmation (placeholder checkbox - full implementation deferred)\n- **FR-019**: Attendee terms acceptance (placeholder - full implementation deferred)\n\n**Deferred to future sprint**:\n- **FR-008**: Check-in tracking (QR scan at event entry)\n- **FR-009**: Real-time check-in metrics\n\n## Getting Started\n\n### For Buyers\n\n1. **Purchase Tickets**\n   - Go to event page: `/events/[slug]`\n   - Click \"Register\" and select quantity\n   - Complete purchase → Receive confirmation email\n\n2. **Access Ticket Dashboard**\n   - Open registration confirmation email\n   - Click \"Manage Tickets\" link\n   - Route: `/events/[slug]/registrations/[registrationId]`\n\n3. **Assign Tickets**\n   - View list of purchased tickets (assigned/unassigned status)\n   - Click \"Assign Ticket\" on unassigned ticket\n   - Fill out attendee details (name, email, custom fields)\n   - Submit → Attendee receives ticket via email\n\n4. **Reassign Tickets** (before cutoff)\n   - Click \"Reassign\" on assigned ticket\n   - Enter new attendee details\n   - Old attendee data deleted, new attendee created\n   - New attendee receives ticket email\n\n### For Attendees\n\n1. **Receive Ticket Email**\n   - Buyer assigns ticket → Email sent to attendee\n   - Email contains ticket number and QR code\n\n2. **View Ticket**\n   - Click \"View Ticket\" link in email\n   - Route: `/events/[slug]/tickets/[ticketId]`\n   - See event details, QR code, personal information\n\n3. **Save QR Code**\n   - Download QR code image or add to mobile wallet\n   - Use for check-in at event (future sprint)\n\n### For Organizers\n\n1. **Configure Assignment Settings**\n   - Go to event settings: `/(dashboard)/events/[eventId]/settings`\n   - Set assignment cutoff type (event start, 1h/24h before, custom)\n   - Set max tickets per purchase (default: 10)\n\n2. **Monitor Ticket Status**\n   - View ticket assignment metrics on event dashboard\n   - See unassigned vs assigned ticket counts\n   - Track assignment progress as event approaches\n\n3. **Custom Registration Fields**\n   - Define custom fields in event settings (dietary restrictions, t-shirt size, etc.)\n   - Fields appear in assignment form\n   - Responses stored in Attendee.customData\n\n## Best Practices\n\n### For Buyers\n1. **Assign Early**: Don't wait until cutoff time\n2. **Double-Check Emails**: Verify attendee email addresses to prevent delivery issues\n3. **Communicate Cutoff**: Inform group members of assignment deadline\n4. **Save Confirmation**: Keep purchase confirmation email for ticket management link\n\n### For Organizers\n1. **Set Reasonable Cutoff**: Give buyers enough time to assign (24h recommended for large events)\n2. **Remind Buyers**: Send reminder emails about unassigned tickets as cutoff approaches\n3. **Test Custom Fields**: Preview assignment form before event goes live\n4. **Monitor Assignment Rate**: Track % of tickets assigned, follow up with buyers if low\n\n### For Developers\n1. **Optimistic Locking**: Always pass `expectedUpdatedAt` to prevent race conditions\n2. **Email Validation**: Use soft warnings for invalid emails, not hard errors\n3. **GDPR Compliance**: Ensure reassignment deletes old attendee data\n4. **QR Code Optimization**: Cache generated QR codes to reduce server load\n5. **Mobile-First**: Ticket view must work perfectly on mobile devices\n\n## Data Privacy Considerations\n\n**Attendee Data** includes:\n- Name, Email (PII - handle carefully)\n- Custom field responses (may include dietary/medical info)\n\n**Best Practices**:\n- **Reassignment Deletes Old Data**: Previous attendee info removed (GDPR)\n- **Attendee Access Control**: Only buyer and organizer can view ticket details\n- **Email Encryption**: Use TLS for all email communications\n- **Data Retention**: Define retention policy for past events\n- **Unsubscribe**: Provide opt-out for event communications\n\n## Integration Points\n\n### With Registration Module\n- Registration completion creates ticket instances ([see workflow](../registration/workflows.md#workflow-1-public-attendee-registration))\n- Ticket quantity based on registration quantity field\n- All tickets initially unassigned\n\n### With Attendees Module\n- Ticket assignment creates Attendee record ([see data model](../attendees/data-model.md))\n- One-to-one relationship (Ticket ↔ Attendee)\n- Attendee deletion cascades on reassignment\n\n### With Communications Module\n- Ticket assignment triggers email to attendee\n- Email templates use ticket and attendee data\n- Resend integration tracks delivery status ([see email setup](../../deployment/email-setup.md))\n\n## Common Scenarios\n\n### Group Event Registration\n\n**Scenario**: Company buys 10 tickets for team event\n\n1. **Purchase**: Admin buys 10 tickets in one transaction\n2. **Assignment**: Admin assigns each ticket to team member\n   - Ticket 1 → Alice (alice@company.com)\n   - Ticket 2 → Bob (bob@company.com)\n   - ...\n   - Ticket 10 → Jane (jane@company.com)\n3. **Delivery**: Each team member receives individual ticket via email\n4. **Check-in**: Each scans their unique QR code at event (future)\n\n### Last-Minute Changes\n\n**Scenario**: Attendee can't make event, buyer reassigns\n\n1. **Original Assignment**: Ticket assigned to Alice\n2. **Change Request**: Alice tells buyer she can't attend\n3. **Reassignment**: Buyer reassigns ticket to Bob\n   - Alice's attendee record **deleted** (GDPR)\n   - New attendee record created for Bob\n   - Bob receives ticket email\n4. **Cutoff Enforcement**: Reassignment blocked after cutoff time\n\n### Partial Assignment\n\n**Scenario**: Buyer purchases 5 tickets but only assigns 3\n\n1. **Purchase**: 5 tickets created\n2. **Assignment**: Tickets 1-3 assigned to attendees\n3. **Unassigned**: Tickets 4-5 remain unassigned\n4. **Warning**: System displays \"2 unassigned tickets\" reminder\n5. **Cutoff**: After cutoff, tickets 4-5 remain unassigned (valid but no attendee data)\n\n**Note**: Currently no enforcement - unassigned tickets remain valid. Future enhancement may require all assignments.\n\n## Troubleshooting\n\n### Ticket Assignment Fails\n\n**Symptoms**: Assignment form submits but returns error\n\n**Common Causes**:\n1. **Assignment Cutoff Passed**: Check event cutoff time\n2. **Invalid Email**: Verify attendee email format\n3. **Custom Field Validation**: Check required custom fields are filled\n4. **Optimistic Lock Failure**: Ticket was modified concurrently, refresh and retry\n\n**Resolution**: Display clear error message, allow retry\n\n### QR Code Not Generating\n\n**Symptoms**: Ticket page loads but QR code doesn't appear\n\n**Common Causes**:\n1. **Missing qrCodeData**: Ticket missing QR code data field\n2. **Generator Failure**: QR code library error\n3. **Client-Side Error**: JavaScript error in browser\n\n**Resolution**: Check server logs, verify qrcode library installed\n\n### Email Not Received\n\n**Symptoms**: Ticket assigned but attendee didn't receive email\n\n**Common Causes**:\n1. **Invalid Email**: Typo in email address\n2. **Spam Filter**: Email filtered to spam folder\n3. **Resend Failure**: Email delivery service error\n\n**Resolution**: Check email status in attendees list, resend if needed\n\n## Performance Considerations\n\n**QR Code Generation**:\n- Generate on-demand (not stored as image)\n- Cache generated QR codes in memory (5-minute TTL)\n- Use SVG format for smaller payload\n\n**Database Queries**:\n- Index on `ticketNumber` for quick lookup\n- Composite index on `eventId + isAssigned` for filtering\n- Composite index on `eventId + isCheckedIn` for metrics (future)\n\n**Optimistic Locking**:\n- Use `updatedAt` timestamp to detect concurrent edits\n- Refresh on conflict, don't auto-retry (user confirms)\n\n**Core Web Vitals Targets**:\n- **Ticket View Page**: LCP < 2.5s (QR code loads fast)\n- **Assignment Form**: FID < 100ms (form interactions smooth)\n- **Buyer Dashboard**: CLS < 0.1 (stable layout with loading states)\n\n## Future Enhancements\n\n- **Check-in System**: QR code scanning at event entrance (deferred sprint)\n- **Real-time Metrics**: Live check-in dashboard for organizers\n- **Assignment Reminders**: Automated emails to buyers with unassigned tickets\n- **Mobile Wallet Integration**: Add to Apple Wallet / Google Pay\n- **Bulk Assignment**: CSV upload for large group events\n- **Ticket Transfers**: Allow attendees to transfer tickets to others\n- **Refund Support**: Individual ticket refunds (vs full registration)\n- **Wait List**: Assign tickets from waitlist when unassigned tickets exist
