# Tickets Module

## Overview

The Tickets module manages ticket types and availability for events. It handles ticket creation, pricing (MVP: free tickets only), quantity tracking, and sale period management. This module works closely with the Registration module to control access to events.

## Features

- **Ticket Type Management**: Create multiple ticket tiers for an event (General, VIP, Early Bird, etc.)
- **Quantity Tracking**: Set total available tickets and track sold count
- **Sale Periods**: Configure start and end dates for ticket sales
- **Availability Logic**: Real-time calculation of available tickets
- **Price Management**: Support for pricing structure (MVP: free only)
- **Registration Stats**: Track tickets sold per type
- **Organizer Analytics**: View sales by day, revenue tracking

## User Roles

### Organizers
- Create and manage ticket types for their events
- Set quantities and sale periods
- View ticket sales statistics
- Update ticket details (with restrictions after sales begin)
- Cannot delete tickets with existing registrations

### Public Users
- View available ticket types on event pages
- See real-time availability
- Select ticket type during registration
- Cannot see unavailable or past-sale-period tickets

## Module Dependencies

**This module depends on:**
- Events Module (each ticket type belongs to an event)

**This module is required by:**
- Registration Module (registrations select a ticket type)

## Quick Links

- [Backend Documentation](./backend.md) - tRPC router and business logic
- [Frontend Documentation](./frontend.md) - Components and forms
- [Data Model](./data-model.md) - TicketType schema
- [Workflows](./workflows.md) - Ticket management flows

## Key Concepts

### MVP Limitation: Free Tickets Only
In the current MVP implementation, all tickets must be free (`price = 0`). Payment processing (Stripe/Paystack) is planned for future releases.

### Ticket Availability
A ticket is considered "available" when:
- Current date is after `saleStart` (or `saleStart` is null)
- Current date is before `saleEnd` (or `saleEnd` is null)
- `quantity - soldCount > 0`

### Sale Periods
- **saleStart**: Optional. If null, tickets go on sale immediately
- **saleEnd**: Optional. If null, tickets remain on sale indefinitely
- Use case: Early bird tickets (Jan 1 - Jan 31), Regular tickets (Feb 1 - event start)

### Quantity Management
- **quantity**: Total tickets available
- **soldCount**: Number of tickets sold (from registrations)
- **available**: Calculated as `quantity - soldCount`

### Business Rules
- Cannot decrease quantity below sold count
- Cannot change price after tickets are sold
- Cannot delete ticket type with existing registrations
- Must be event organizer to manage tickets

## Related Modules

- **Events Module**: Parent module for ticket types
- **Registration Module**: Consumes ticket availability, creates registrations
