# Registration Email Templates

## Overview

The Registration module sends automated emails at key points in the attendee journey. All templates use [React Email](https://react.email) for consistent, responsive design.

---

## Template: Registration Confirmation

**File**: `emails/registration-confirmation.tsx`  
**Trigger**: After successful registration (public or manual)  
**Recipients**: Registered attendee  
**Purpose**: Confirm registration and provide registration code

### Props

```typescript
interface RegistrationConfirmationProps {
  attendeeName: string;
  eventName: string;
  eventDate: Date;
  ticketType: string;
  registrationCode: string;
  eventUrl: string;
}
```

### Email Structure

#### Subject Line
```
Registration Confirmed: {eventName}
```

**Example**: `Registration Confirmed: Tech Conference 2025`

#### Preview Text
```
You're registered for {eventName}! 🎉
```

#### Content Sections

**1. Header**
```tsx
<Heading style={heading}>Registration Confirmed! 🎉</Heading>
```

**2. Greeting**
```tsx
<Text style={paragraph}>Hi {attendeeName},</Text>
```

**3. Confirmation Message**
```tsx
<Text style={paragraph}>
  Great news! You're all set for <strong>{eventName}</strong>.
</Text>
```

**4. Event Details Box**
```tsx
<Section style={infoBox}>
  <Text style={infoLabel}>Event:</Text>
  <Text style={infoValue}>{eventName}</Text>

  <Text style={infoLabel}>Date:</Text>
  <Text style={infoValue}>{formattedDate}</Text>

  <Text style={infoLabel}>Ticket Type:</Text>
  <Text style={infoValue}>{ticketType}</Text>

  <Text style={infoLabel}>Registration Code:</Text>
  <Text style={codeValue}>{registrationCode}</Text>
</Section>
```

**5. Call-to-Action**
```tsx
<Button style={button} href={eventUrl}>
  View Event Details
</Button>
```

**6. Important Notice**
```tsx
<Text style={paragraph}>
  Keep this email handy! You may need your registration code for check-in.
</Text>
```

**7. Footer**
```tsx
<Text style={footer}>
  If you have any questions, please don't hesitate to reach out to
  the event organizer.
</Text>

<Text style={footer}>See you at the event! 🚀</Text>
```

### Styles

```typescript
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const box = {
  padding: "0 48px",
};

const heading = {
  fontSize: "32px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#484848",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#484848",
};

const infoBox = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  padding: "24px",
  marginTop: "24px",
  marginBottom: "24px",
};

const infoLabel = {
  fontSize: "14px",
  color: "#71717a",
  marginTop: "12px",
  marginBottom: "4px",
};

const infoValue = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#18181b",
  marginTop: "0",
  marginBottom: "0",
};

const codeValue = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#2563eb",
  fontFamily: "monospace",
  letterSpacing: "2px",
  marginTop: "0",
  marginBottom: "0",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 20px",
};

const footer = {
  color: "#71717a",
  fontSize: "14px",
  lineHeight: "24px",
};

const hr = {
  borderColor: "#e5e5e5",
  margin: "32px 0",
};
```

### Date Formatting

```typescript
const formattedDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "full",
  timeStyle: "short",
}).format(new Date(eventDate));

// Output: "Monday, June 15, 2025 at 9:00 AM"
```

### Usage in Code

**Backend (Registration Router)**:
```typescript
import { RegistrationConfirmation } from "../../../../emails/registration-confirmation";
import { sendEmail } from "@/server/services/email";

// After registration creation
sendEmail({
  to: registration.email,
  subject: `Registration Confirmed: ${event.name}`,
  react: RegistrationConfirmation({
    attendeeName: registration.name,
    eventName: event.name,
    eventDate: event.startDate,
    ticketType: ticketType.name,
    registrationCode: registrationCode,
    eventUrl: `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}`,
  }),
  tags: [
    { name: "type", value: "registration-confirmation" },
    { name: "eventId", value: event.id },
  ],
}).catch((error) => {
  console.error("[Registration] Failed to send confirmation email", error);
  // Don't throw - registration is already created
});
```

### Email Service Tags

Tags for tracking and analytics:

| Tag | Value | Purpose |
|-----|-------|---------|
| `type` | `registration-confirmation` | Identify email type |
| `eventId` | CUID | Track by event |

**Uses**:
- Email delivery analytics
- Open/click tracking
- Troubleshooting delivery issues
- Event-specific metrics

---

## Template: Registration Cancellation (TODO)

**File**: Not yet created  
**Trigger**: When organizer cancels a registration  
**Recipients**: Cancelled attendee  
**Purpose**: Notify attendee of cancellation

### Proposed Structure

**Subject Line**:
```
Registration Cancelled: {eventName}
```

**Props**:
```typescript
interface RegistrationCancellationProps {
  attendeeName: string;
  eventName: string;
  eventDate: Date;
  reason?: string;
  organizerEmail: string;
}
```

**Content**:
- Cancellation confirmation
- Reason (if provided)
- Refund information (if applicable)
- Contact info for questions
- Apology and next steps

**Implementation Status**: ⚠️ Currently using basic HTML template

**Current Code**:
```typescript
await sendEmail({
  to: registration.email,
  subject: `Registration Cancelled: ${registration.event.name}`,
  html: `
    <h1>Registration Cancelled</h1>
    <p>Dear ${registration.name},</p>
    <p>Your registration for ${registration.event.name} has been cancelled.</p>
    ${input.reason ? `<p>Reason: ${input.reason}</p>` : ""}
    <p>If you have any questions, please contact the event organizer.</p>
  `,
  tags: [
    { name: "type", value: "registration-cancelled" },
    { name: "eventId", value: registration.eventId },
  ],
});
```

**TODO**:
- [ ] Create React Email template
- [ ] Add proper styling
- [ ] Include refund information section
- [ ] Add organizer contact details
- [ ] Test email rendering

---

## Email Testing

### Development Preview

React Email provides a development preview server:

```bash
npm run email:dev
```

**Access**: `http://localhost:3000`

**Features**:
- Live preview of all templates
- Hot reload on changes
- Multiple viewport sizes
- Dark mode testing

### Send Test Emails

**Script**: `scripts/validate-email-templates.tsx`

```bash
npm run test:emails
```

**What it does**:
- Validates all email templates
- Checks for missing props
- Sends test emails (optional)
- Validates HTML structure

### Manual Testing

```typescript
import { render } from "@react-email/render";
import { RegistrationConfirmation } from "../emails/registration-confirmation";

// Render to HTML
const html = render(
  RegistrationConfirmation({
    attendeeName: "John Doe",
    eventName: "Tech Conf 2025",
    eventDate: new Date("2025-06-15T09:00:00Z"),
    ticketType: "General Admission",
    registrationCode: "AB12CD34EF56GH78",
    eventUrl: "https://example.com/events/tech-conf-2025",
  })
);

console.log(html);
```

---

## Email Deliverability

### Best Practices

**1. Sender Configuration**:
- Use verified domain
- Set up SPF, DKIM, DMARC records
- Use consistent "From" address
- Include reply-to address

**2. Content Guidelines**:
- Clear subject line (no spammy words)
- Plain text alternative included
- Reasonable image-to-text ratio
- Unsubscribe link (required)

**3. Engagement**:
- Send only to opted-in recipients
- Remove bounced emails promptly
- Honor unsubscribe requests immediately
- Monitor spam complaints

### Tracking Email Status

**Webhook Updates**:
```typescript
// registration.updateEmailStatus procedure
api.registration.updateEmailStatus.mutate({
  email: "user@example.com",
  status: "bounced" | "unsubscribed"
});
```

**Status Values**:
- **active**: Normal, can receive emails
- **bounced**: Hard bounce, don't send
- **unsubscribed**: Opted out, don't send

**Integration**: Email service provider webhooks update status automatically

---

## Email Service Configuration

### Resend (Current)

**Setup**:
```env
RESEND_API_KEY=re_***
EMAIL_FROM="Events-Ting <noreply@example.com>"
```

**Service**: `src/server/services/email.ts`

```typescript
import { Resend } from "resend";
import { type ReactElement } from "react";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  react,
  html,
  tags,
}: {
  to: string | string[];
  subject: string;
  react?: ReactElement;
  html?: string;
  tags?: Array<{ name: string; value: string }>;
}) {
  return await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject,
    react,
    html,
    tags,
  });
}
```

### Alternative Providers

**SendGrid**:
- Swap Resend client for SendGrid
- Update email service implementation
- Configure webhooks for status updates

**Mailgun**:
- Similar integration pattern
- Update service layer
- Configure SMTP or API

**Postmark**:
- Excellent deliverability
- Transaction email focus
- Easy React Email integration

---

## Localization (Future)

### Multi-language Support

**Props Addition**:
```typescript
interface RegistrationConfirmationProps {
  // ... existing props
  locale?: string; // 'en' | 'es' | 'fr' | etc.
}
```

**Content Translation**:
```typescript
const messages = {
  en: {
    heading: "Registration Confirmed! 🎉",
    greeting: "Hi",
    confirmation: "Great news! You're all set for",
  },
  es: {
    heading: "¡Registro Confirmado! 🎉",
    greeting: "Hola",
    confirmation: "¡Buenas noticias! Estás listo para",
  },
};

const t = messages[locale || 'en'];
```

**Date Formatting**:
```typescript
const formattedDate = new Intl.DateTimeFormat(locale, {
  dateStyle: "full",
  timeStyle: "short",
}).format(new Date(eventDate));
```

---

## Accessibility

### Email Accessibility

**1. Semantic HTML**:
```tsx
<Heading as="h1">...</Heading>  // Not just <div> with styles
<Button>...</Button>            // Proper button element
```

**2. Alt Text**:
```tsx
<Img src="logo.png" alt="Company Logo" />
```

**3. Color Contrast**:
- Text: `#484848` on `#ffffff` (WCAG AA compliant)
- Links: `#2563eb` (sufficient contrast)
- Buttons: `#ffffff` on `#2563eb` (strong contrast)

**4. Plain Text Alternative**:
React Email automatically generates plain text version

**5. Screen Reader Testing**:
- Test with email clients' accessibility features
- Ensure logical reading order
- Provide clear link text

---

## Analytics & Tracking

### Email Metrics

**Track via Email Service**:
- **Sent**: Total emails sent
- **Delivered**: Successfully delivered
- **Opened**: Email opened (pixel tracking)
- **Clicked**: Links clicked
- **Bounced**: Hard/soft bounces
- **Spam Reported**: Marked as spam

**Event-Specific Metrics**:
```typescript
tags: [
  { name: "type", value: "registration-confirmation" },
  { name: "eventId", value: event.id },
]
```

**Queries**:
- Open rate by event
- Click-through rate to event page
- Bounce rate per event
- Unsubscribe rate

### Future: In-App Analytics

**Database Schema** (proposed):
```prisma
model EmailLog {
  id          String   @id @default(cuid())
  eventId     String
  recipientEmail String
  template    String   // 'registration-confirmation'
  sentAt      DateTime @default(now())
  opened      Boolean  @default(false)
  openedAt    DateTime?
  clicked     Boolean  @default(false)
  clickedAt   DateTime?
  status      String   // 'sent' | 'delivered' | 'bounced'
}
```

---

## Troubleshooting

### Common Issues

**Email Not Received**:
1. Check spam/junk folder
2. Verify email address spelling
3. Check email status in database
4. Review email service logs
5. Resend via organizer dashboard

**Email Looks Broken**:
- Test in multiple email clients
- Check HTML rendering
- Validate CSS (inline only)
- Test responsive breakpoints

**High Bounce Rate**:
- Validate email format on input
- Clean email list regularly
- Remove invalid addresses
- Check DNS configuration

**Unsubscribe Not Working**:
- Verify webhook configuration
- Check database updates
- Test unsubscribe link
- Monitor webhook logs

---

## Related Files

### Email Templates
- `emails/registration-confirmation.tsx` - Confirmation template
- `emails/registration-cancellation.tsx` - TODO: Cancellation template

### Backend
- `src/server/services/email.ts` - Email service
- `src/server/api/routers/registration.ts` - Email triggers

### Scripts
- `scripts/validate-email-templates.tsx` - Template validation

### Configuration
- `.env` - Email service credentials

---

## Future Email Templates

### Event Reminder (24 hours before)
**Purpose**: Remind attendees about upcoming event  
**Trigger**: Scheduled 24 hours before event start  
**Content**:
- Event reminder
- Registration code reminder
- Date/time/location
- What to bring
- Last-minute updates

### Post-Event Thank You
**Purpose**: Thank attendees and gather feedback  
**Trigger**: 24 hours after event ends  
**Content**:
- Thank you message
- Event highlights
- Feedback survey link
- Photos/videos (if available)
- Future event announcements

### Ticket Transfer Notification
**Purpose**: Notify when ticket transferred  
**Trigger**: Ticket transferred to another attendee  
**Content**:
- Transfer confirmation
- New registration details
- QR code update
- Contact info

### Waitlist Notification
**Purpose**: Alert when ticket becomes available  
**Trigger**: Cancellation opens spot on waitlist  
**Content**:
- Ticket availability notice
- Time-limited claim window
- Registration link
- Urgency messaging

---

## Best Practices Summary

✅ **Do**:
- Use React Email for consistency
- Test in multiple email clients
- Include plain text alternative
- Track email metrics
- Handle failures gracefully
- Provide unsubscribe option
- Use clear subject lines
- Include contact information

❌ **Don't**:
- Use embedded images excessively
- Send without user consent
- Ignore bounce/unsubscribe
- Use spammy language
- Forget mobile optimization
- Block registration on email failure
- Send too frequently
