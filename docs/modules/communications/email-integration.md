# Communications Email Integration

## Resend API Setup

### Overview
Events-Ting uses [Resend](https://resend.com) for transactional and bulk email delivery. Resend provides a developer-friendly API with React Email template support.

### Configuration

#### Environment Variables

```env
# Required
RESEND_API_KEY=re_123abc...

# Optional
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Events-Ting
```

#### API Key Setup

1. Create account at [resend.com](https://resend.com)
2. Navigate to API Keys section
3. Create new API key
4. Copy key to `.env` file
5. Verify domain (for production)

### Email Service Wrapper

**Location**: `src/server/services/email.ts`

#### Send Single Email

```typescript
import { sendEmail } from '@/server/services/email';

await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to Tech Conf 2025',
  html: '<h1>Welcome!</h1><p>Thanks for registering.</p>',
  react: <RegistrationConfirmation {...props} />, // Optional React component
  tags: [
    { name: 'type', value: 'registration-confirmation' },
    { name: 'eventId', value: 'clx123...' },
  ],
});
```

#### Send Batch Emails with Retry

```typescript
import { sendBatchEmailsWithRetry } from '@/server/services/email';

const results = await sendBatchEmailsWithRetry({
  recipients: ['user1@example.com', 'user2@example.com'],
  subject: 'Event Reminder',
  html: emailBody,
  tags: [
    { name: 'campaign_id', value: 'camp_123' },
    { name: 'type', value: 'campaign' },
  ],
});

// results = [
//   { email: 'user1@example.com', success: true },
//   { email: 'user2@example.com', success: false, error: '...' },
// ]
```

### React Email Templates

**Location**: `emails/`

#### Template Structure

```tsx
// emails/registration-confirmation.tsx
import { Html, Head, Body, Container, Heading, Text } from '@react-email/components';

interface RegistrationConfirmationProps {
  attendeeName: string;
  eventName: string;
  eventDate: Date;
  ticketType: string;
  registrationCode: string;
  eventUrl: string;
}

export function RegistrationConfirmation({
  attendeeName,
  eventName,
  eventDate,
  ticketType,
  registrationCode,
  eventUrl,
}: RegistrationConfirmationProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif' }}>
        <Container>
          <Heading>Registration Confirmed!</Heading>
          <Text>Hi {attendeeName},</Text>
          <Text>
            Your registration for <strong>{eventName}</strong> is confirmed.
          </Text>
          <Text>
            <strong>Ticket Type:</strong> {ticketType}<br />
            <strong>Registration Code:</strong> {registrationCode}<br />
            <strong>Event Date:</strong> {eventDate.toLocaleDateString()}
          </Text>
          <Button href={eventUrl}>View Event Details</Button>
        </Container>
      </Body>
    </Html>
  );
}
```

#### Available Templates

1. **registration-confirmation.tsx**: Sent after registration
2. **cfp-submission-received.tsx**: CFP proposal acknowledgment
3. **cfp-accepted.tsx**: CFP acceptance notification
4. **cfp-rejected.tsx**: CFP rejection with feedback
5. **event-reminder.tsx**: Upcoming event reminder

### Email Types

#### Transactional Emails
- Registration confirmations
- CFP notifications
- Password resets (future)
- Order confirmations (future)

**Characteristics**:
- Sent immediately
- One recipient per email
- High priority
- User-triggered

#### Campaign Emails
- Event announcements
- Updates and reminders
- Newsletters

**Characteristics**:
- Sent in batches
- Multiple recipients
- Can be scheduled
- Organizer-triggered

### Delivery Tracking

#### Webhooks (Future)

Resend can send webhooks for email events:

```typescript
// Future implementation
app.post('/api/webhooks/resend', async (req, res) => {
  const event = req.body;
  
  switch (event.type) {
    case 'email.delivered':
      // Update campaign delivered count
      break;
    case 'email.bounced':
      // Update registration emailStatus to 'bounced'
      break;
    case 'email.opened':
      // Track open (future)
      break;
    case 'email.clicked':
      // Track click (future)
      break;
  }
});
```

### Rate Limits

**Resend Free Tier**:
- 100 emails/day
- 3,000 emails/month

**Resend Pro**:
- 50,000 emails/month
- Higher sending rate

### Best Practices

1. **Test in Development**: Use test email addresses
2. **Verify Domain**: Required for production
3. **Monitor Bounces**: Update `emailStatus` for hard bounces
4. **Respect Unsubscribes**: Filter out users with `emailStatus: 'unsubscribed'`
5. **Use Tags**: For tracking and filtering
6. **Handle Errors**: Implement retry logic for transient failures

### Error Handling

```typescript
try {
  await sendEmail({ to, subject, html });
} catch (error) {
  console.error('[Email] Failed to send', error);
  
  if (error.statusCode === 429) {
    // Rate limited - retry later
  } else if (error.statusCode === 400) {
    // Invalid email address
  } else {
    // Other error
  }
}
```

### Testing

#### Local Development

```bash
# View emails in terminal (no actual sending)
RESEND_API_KEY=test_key pnpm dev
```

#### Test Mode

Resend supports test API keys that don't send real emails:

```env
RESEND_API_KEY=re_test_123abc...
```

### Migration from Other Providers

If migrating from SendGrid, Mailgun, etc.:

1. Update environment variables
2. Replace email service calls
3. Convert email templates to React Email format
4. Test thoroughly in staging

### Resources

- [Resend Documentation](https://resend.com/docs)
- [React Email Documentation](https://react.email)
- [API Reference](https://resend.com/docs/api-reference)
