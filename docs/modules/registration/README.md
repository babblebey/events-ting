# Registration Module

## Overview

The Registration module handles attendee sign-ups for events. It manages the entire registration lifecycle from public registration forms to organizer management dashboards, including email confirmations, exports, and attendee status tracking.

## Features

- **Public Registration**: Self-service registration form for attendees
- **Ticket Selection**: Choose from available ticket types
- **Email Confirmation**: Automatic confirmation emails with registration codes
- **Manual Registration**: Organizers can add attendees manually
- **Registration Management**: View, search, and filter registrations
- **CSV Export**: Download attendee data
- **Email Status Tracking**: Monitor bounces and unsubscribes
- **Cancellation**: Organizers can cancel registrations (frees up tickets)
- **Resend Confirmation**: Re-send confirmation emails if needed
- **Concurrency Control**: Prevent overbooking with database locking

## User Roles

### Public Users (Attendees)
- Register for events via public form
- Select ticket type
- Receive confirmation email with unique code
- No authentication required

### Organizers
- View all registrations for their events
- Search and filter attendee list
- Add attendees manually (bypass availability checks)
- Export registrations to CSV
- Cancel registrations
- Resend confirmation emails
- Track email delivery status

## Module Dependencies

**This module depends on:**
- Events Module (registrations belong to events)
- Tickets Module (registrations select a ticket type)
- Communications Module (sends confirmation emails)

**This module is required by:**
- Attendees Module (different view of registration data)
- Communications Module (target recipients for campaigns)

## Quick Links

- [Backend Documentation](./backend.md) - tRPC router and business logic
- [Frontend Documentation](./frontend.md) - Components and forms
- [Data Model](./data-model.md) - Registration schema
- [Workflows](./workflows.md) - Registration flows
- [Exports](./exports.md) - CSV export functionality

## Key Concepts

### Registration Code
Each registration receives a unique 8-character code:
- Used for check-in (future feature)
- Included in confirmation emails
- Stored in `customData` JSON field

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
Uses database-level locking (`SELECT FOR UPDATE`) to prevent race conditions when multiple users register simultaneously.

### Manual Registration
Organizers can add attendees manually, bypassing:
- Ticket availability checks
- Sale period restrictions
- Used for VIP registrations, comp tickets, etc.

## Related Modules

- **Events Module**: Parent module
- **Tickets Module**: Ticket availability and validation
- **Communications Module**: Confirmation emails, campaigns
- **Attendees Module**: Alternative view of registrations
