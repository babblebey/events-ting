# Registration Module

## Overview

The Registration module handles ticket purchase transactions for events. It manages the checkout process where buyers purchase one or multiple tickets, which can then be assigned to different attendees.

### Key Concepts

- **Registration** = Purchase transaction (buyer information, payment details)
- **Buyer** = Person who purchases tickets (stored in Registration)
- **Ticket** = Individual ticket instance created from purchase
- **Attendee** = Person who receives/uses a ticket (separate entity)

### Typical Flow

1. Buyer visits event page and selects ticket type + quantity
2. Buyer completes purchase → Creates Registration record
3. System creates X Ticket instances (where X = quantity purchased)
4. Buyer assigns each ticket to an attendee (can be themselves or others)
5. Each assigned ticket creates/links to an Attendee record
6. Attendee receives ticket email with QR code for check-in

## Features

- **Public Purchase Flow**: Self-service ticket purchase for buyers
- **Multi-Ticket Support**: Buy multiple tickets in single transaction
- **Quantity Selection**: Choose number of tickets to purchase
- **Email Confirmation**: Buyer receives confirmation with ticket management link
- **Manual Purchase**: Organizers can create purchases on behalf of buyers
- **Purchase Management**: View, search, and filter purchase transactions
- **CSV Export**: Download buyer data (not attendee data - see Attendees module)
- **Purchase Cancellation**: Cancel entire purchase (frees all associated tickets)
- **Resend Confirmation**: Re-send purchase confirmation emails
- **Concurrency Control**: Prevent overbooking with database locking

## User Roles

### Buyers (Ticket Purchasers)
- Purchase one or multiple tickets via public form
- Select ticket type and quantity
- Receive confirmation email with purchase details
- Access ticket management dashboard to assign tickets
- Can assign tickets to themselves or others
- No authentication required for purchase

### Organizers
- View all purchases for their events
- Search and filter buyer list
- Manually create purchases (bypass availability checks)
- Export purchase data to CSV
- Cancel purchases
- Resend purchase confirmation emails
- Monitor payment status

### Important Distinction
⚠️ **Buyers are NOT the same as Attendees**
- Registration stores buyer information (who paid)
- Attendees are managed in Tickets module (who attends)
- One buyer can purchase tickets for multiple attendees

## Module Dependencies

**This module depends on:**
- **Events Module**: Purchases belong to events
- **Tickets Module**: Defines ticket types available for purchase
- **Communications Module**: Sends purchase confirmation emails

**This module is required by:**
- **Tickets Module**: Creates ticket instances from purchases
- **Attendees Module**: Buyer data used for assignment notifications
- **Dashboard Module**: Purchase metrics and statistics

**Important**: This module handles the PURCHASE transaction. For:
- Ticket assignment → See [Tickets Module](../tickets/)
- Attendee management → See [Attendees Module](../attendees/)
- Attendee data export → See [Attendees Module](../attendees/)

## Quick Links

- [Backend Documentation](./backend.md) - tRPC router, procedures, and business logic
- [Frontend Documentation](./frontend.md) - Components, pages, and forms
- [Data Model](./data-model.md) - Registration schema and relationships
- [Workflows](./workflows.md) - Step-by-step registration flows
- [Email Templates](./email-templates.md) - Confirmation and notification emails
- [Exports](./exports.md) - CSV export functionality

## Key Concepts

### Purchase Transaction
Each purchase creates:
- One Registration record (buyer information)
- X Ticket instances (where X = quantity purchased)
- Unique ticket numbers and QR codes for each ticket

### Ticket Management Link
Buyers receive a link to manage purchased tickets:
- View all tickets from their purchase
- Assign each ticket to an attendee
- Track assignment status

### Email Status
- **active**: Can receive emails
- **bounced**: Email delivery failed
- **unsubscribed**: User opted out

### Payment Status
MVP values (future-ready for payments):
- **free**: Free ticket (MVP default)
- **pending**: Payment initiated
- **paid**: Payment completed
- **failed**: Payment failed
- **refunded**: Payment refunded

### Concurrency Handling
Uses database-level locking (`SELECT FOR UPDATE`) to prevent race conditions when multiple users purchase simultaneously.

### Manual Purchase
Organizers can add purchases manually, bypassing:
- Ticket availability checks
- Sale period restrictions
- Used for VIP registrations, comp tickets, etc.

## Related Modules

- **[Events Module](../events/)** - Parent module, all purchases belong to events
- **[Tickets Module](../tickets/)** - Ticket instances created from purchases, assignment workflow
- **[Communications Module](../communications/)** - Email confirmation and campaigns
- **[Attendees Module](../attendees/)** - Manages attendee records created via ticket assignment
