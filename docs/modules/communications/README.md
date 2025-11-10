# Communications Module

## Overview

The Communications module enables event organizers to send email campaigns to attendees, speakers, and custom recipient lists. It provides campaign management, recipient selection, scheduling, and delivery tracking.

## Features

- **Email Campaigns**: Compose and send bulk emails
- **Recipient Selection**: Target all attendees, specific ticket types, speakers, or custom lists
- **Campaign Scheduling**: Send immediately or schedule for future
- **Delivery Tracking**: Monitor sent, delivered, bounces, opens, clicks
- **Campaign History**: View all past campaigns
- **Draft Management**: Save campaigns as drafts before sending
- **Batch Sending**: Send to large recipient lists with retry logic
- **Integration**: Uses Resend API for email delivery

## User Roles

### Organizers
- Create email campaigns
- Select recipient groups
- Schedule or send immediately
- View delivery statistics
- Access campaign history

### Recipients (Attendees/Speakers)
- Receive campaign emails
- Tracked for opens/clicks (future)
- Can unsubscribe (updates `emailStatus`)

## Module Dependencies

**This module depends on:**
- Events Module (campaigns belong to events)
- Registration Module (attendees as recipients)
- Speakers Module (speakers as recipients)
- Resend API (email delivery service)

**This module is required by:**
- All modules that send transactional emails (confirmations, notifications)

## Quick Links

- [Backend Documentation](./backend.md) - Campaign router and procedures
- [Frontend Documentation](./frontend.md) - Campaign builder UI
- [Data Model](./data-model.md) - EmailCampaign schema
- [Workflows](./workflows.md) - Campaign creation and sending
- [Email Integration](./email-integration.md) - Resend API setup

## Key Concepts

### Campaign Status
- **draft**: Being composed
- **scheduled**: Set for future sending
- **sending**: Currently being sent
- **sent**: Successfully sent
- **failed**: Sending failed

### Recipient Types
- **all_attendees**: Everyone registered for the event
- **ticket_type**: Specific ticket type holders
- **speakers**: Event speakers
- **custom**: Manual email list

### Delivery Metrics
- **totalRecipients**: How many emails to send
- **delivered**: Successfully delivered
- **bounces**: Failed deliveries
- **opens**: Email opens (future)
- **clicks**: Link clicks (future)

### Batch Sending
Sends emails in batches with retry logic to handle API rate limits and transient failures.

## Related Modules

- **Events Module**: Parent for campaigns
- **Registration Module**: Attendee recipients
- **Speakers Module**: Speaker recipients
- **External**: Resend API for email delivery
