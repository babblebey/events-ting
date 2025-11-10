# Email Setup with Resend

This guide covers setting up email functionality for Events-Ting using [Resend](https://resend.com), including account creation, domain verification, and testing.

---

## Overview

Events-Ting uses **Resend** for transactional and bulk email sending:

### Email Types
- **Transactional Emails**:
  - Registration confirmation
  - CFP submission received
  - CFP acceptance/rejection
  
- **Bulk Emails**:
  - Email campaigns to attendees
  - Event announcements
  - Schedule updates

### Why Resend?

✅ Developer-friendly API  
✅ React Email template support  
✅ 100 emails/day free tier  
✅ Simple domain verification  
✅ Excellent deliverability  
✅ Built-in analytics  

---

## Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Click "Start Building" or "Sign Up"
3. Sign up with email or GitHub
4. Confirm your email address

**Free Tier Limits**:
- 100 emails per day
- 3,000 emails per month
- 1 verified domain
- Basic analytics

**Paid Plans**: Start at $20/month for 50,000 emails

---

## Step 2: Get API Key

### Development API Key

1. Log in to Resend Dashboard
2. Navigate to **API Keys** section
3. Click "Create API Key"
4. Configure:
   - **Name**: `events-ting-dev`
   - **Permission**: Full Access (or Send access only)
   - **Domain**: All Domains
5. Copy the generated key (starts with `re_`)

**Add to `.env`**:
```bash
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

⚠️ **Important**: Save the key immediately - it's only shown once!

---

### Production API Key

Create a separate API key for production:

1. Create another API key named `events-ting-production`
2. Add to Vercel environment variables (see Step 5)

**Security**: Never use the same API key for dev and production.

---

## Step 3: Test Email Sending (Development)

Without domain verification, Resend only sends to your account email.

### Quick Test

1. Start your development server:
   ```bash
   pnpm dev
   ```

2. Create a test event and ticket type

3. Register for the event with **your Resend account email**

4. Check your inbox for registration confirmation

**Expected email**: "Registration Confirmation - [Event Name]"

---

### Test All Email Templates

```bash
# Navigate to email template preview (if available)
# Or trigger each email type:

# 1. Registration confirmation
- Register for any event

# 2. CFP submission received
- Submit a CFP proposal

# 3. CFP acceptance
- Review and accept a CFP submission

# 4. CFP rejection
- Review and reject a CFP submission

# 5. Email campaign
- Create and send a campaign
```

---

## Step 4: Domain Verification (Production)

To send emails from your domain (e.g., `noreply@yourdomain.com`), verify your domain.

### Add Your Domain

1. In Resend Dashboard → **Domains**
2. Click "Add Domain"
3. Enter your domain: `yourdomain.com`
4. Click "Add"

---

### Configure DNS Records

Resend provides DNS records to add to your domain registrar:

#### SPF Record
```
Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all
```

#### DKIM Records (3 records)
```
Type: TXT
Name: resend._domainkey
Value: [provided by Resend]

Type: TXT
Name: resend2._domainkey
Value: [provided by Resend]

Type: TXT  
Name: resend3._domainkey
Value: [provided by Resend]
```

---

### Add DNS Records to Your Registrar

#### Cloudflare
1. Go to DNS settings for your domain
2. Click "Add record"
3. Add each record with the exact values from Resend
4. Save

#### Namecheap
1. Advanced DNS tab
2. Add New Record
3. Choose TXT Record
4. Paste values from Resend

#### GoDaddy
1. DNS Management
2. Add TXT records
3. Use `@` for root domain records

---

### Verify Domain

1. After adding DNS records, return to Resend Dashboard
2. Click "Verify Domain" button
3. Wait for verification (can take 24-48 hours)

**Verification Status**:
- ⏳ Pending
- ✅ Verified
- ❌ Failed (check DNS records)

---

## Step 5: Configure Production Emails

### Update Email Sender

Once domain is verified, update the "from" address in your email templates.

**Location**: `emails/*.tsx`

**Before** (development):
```typescript
from: 'onboarding@resend.dev'
```

**After** (production):
```typescript
from: 'noreply@yourdomain.com'
// or
from: 'events@yourdomain.com'
```

---

### Add API Key to Vercel

1. Go to Vercel Dashboard
2. Select your project
3. Settings → Environment Variables
4. Add new variable:
   - **Key**: `RESEND_API_KEY`
   - **Value**: `re_production_key_xxxx`
   - **Environments**: Production, Preview
5. Redeploy

---

## Email Templates

Events-Ting uses **React Email** for beautiful, responsive emails.

### Template Files

```
emails/
├── registration-confirmation.tsx   # Sent after registration
├── cfp-submission-received.tsx     # CFP submitted
├── cfp-accepted.tsx                # CFP accepted
├── cfp-rejected.tsx                # CFP rejected
└── event-reminder.tsx              # Event reminder (future)
```

---

### Customize Templates

Edit React Email components:

```tsx
// emails/registration-confirmation.tsx
import { Html, Head, Body, Container, Text } from '@react-email/components';

export default function RegistrationConfirmation({ 
  attendeeName, 
  eventName, 
  ticketType 
}) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Text>Hi {attendeeName},</Text>
          <Text>
            You're registered for {eventName}!
          </Text>
          <Text>Ticket: {ticketType}</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

---

### Preview Templates

```bash
# Install React Email CLI (optional)
pnpm add -D @react-email/cli

# Preview all email templates
pnpm email dev
```

Open `http://localhost:3001` to see all templates.

---

## Sending Emails in Code

### Transactional Email

**Location**: `src/server/api/routers/registration.ts`

```typescript
import { Resend } from 'resend';
import RegistrationConfirmation from '@/emails/registration-confirmation';

const resend = new Resend(process.env.RESEND_API_KEY);

// Send registration confirmation
await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: registration.email,
  subject: `Registration Confirmation - ${event.name}`,
  react: RegistrationConfirmation({
    attendeeName: registration.name,
    eventName: event.name,
    ticketType: ticketType.name,
  }),
});
```

---

### Bulk Email (Campaign)

**Location**: `src/server/api/routers/communication.ts`

```typescript
// Send to multiple recipients
const recipients = await ctx.db.registration.findMany({
  where: { eventId, emailStatus: 'VERIFIED' },
  select: { email: true, name: true },
});

for (const recipient of recipients) {
  await resend.emails.send({
    from: 'events@yourdomain.com',
    to: recipient.email,
    subject: campaign.subject,
    html: campaign.htmlContent,
  });
}
```

**Note**: For large campaigns, consider using batch API or background jobs.

---

## Testing Email Delivery

### Test in Development

**Limitation**: Emails only sent to your Resend account email.

```bash
# 1. Set your email as test recipient
RESEND_TEST_EMAIL="your-email@example.com"

# 2. Register with your email
# 3. Check inbox
```

---

### Test in Production

After domain verification:

1. Deploy to production
2. Register a test user
3. Check spam folder if not received
4. Check Resend Dashboard → Logs for delivery status

---

## Monitoring & Analytics

### Resend Dashboard

View email performance:
1. Log in to Resend Dashboard
2. Navigate to **Emails** or **Logs**

**Metrics**:
- Total sent
- Delivered
- Bounced
- Opened (if tracking enabled)
- Clicked (if tracking enabled)

---

### Enable Open/Click Tracking

In Resend Dashboard → Settings:
1. Enable "Track Opens"
2. Enable "Track Clicks"

**Privacy Note**: Inform users if tracking is enabled (GDPR compliance).

---

## Troubleshooting

### "API key is invalid"

**Cause**: Incorrect or missing `RESEND_API_KEY`  
**Solution**:
1. Verify key in Resend Dashboard → API Keys
2. Ensure no extra spaces in `.env` file
3. Restart dev server after updating `.env`

---

### "Email not received" (Development)

**Cause**: Email sent to non-account email  
**Solution**:
- Without domain verification, only your Resend account email receives emails
- Use your Resend signup email for testing

---

### "Email not received" (Production)

**Causes**:
1. Domain not verified
2. Email in spam folder
3. Rate limit exceeded

**Solutions**:
1. Verify domain status in Resend Dashboard
2. Check spam/junk folder
3. Check Resend Logs for delivery errors
4. Verify DNS records are correct

---

### "Domain verification failed"

**Cause**: DNS records not propagated or incorrect  
**Solution**:
1. Double-check DNS records match exactly (no extra spaces)
2. Wait 24-48 hours for DNS propagation
3. Use [DNS Checker](https://dnschecker.org) to verify records
4. Try verifying again in Resend Dashboard

---

### "Rate limit exceeded"

**Cause**: Exceeded free tier limits (100/day, 3,000/month)  
**Solution**:
1. Upgrade to paid plan
2. Implement email queuing to spread sends over time
3. Batch campaign sends

---

### Emails going to spam

**Causes**:
- Domain not verified
- Missing SPF/DKIM records
- Poor email content (too many links, spammy words)

**Solutions**:
1. Complete domain verification
2. Verify all DNS records are added
3. Improve email content
4. Use plain text alternative
5. Avoid spam trigger words
6. Include unsubscribe link

---

## Best Practices

### ✅ DO
- Verify your domain before production launch
- Use separate API keys for dev and production
- Include plain text version of emails
- Add unsubscribe link in bulk emails
- Monitor delivery rates in Resend Dashboard
- Handle email errors gracefully (retry logic)
- Test all email templates before launch

### ❌ DON'T
- Share API keys in version control
- Send bulk emails without permission (GDPR/CAN-SPAM)
- Use development API key in production
- Send emails synchronously in critical paths (use background jobs)
- Ignore bounce/complaint rates

---

## Email Compliance

### GDPR (Europe)
- ✅ Obtain consent before sending marketing emails
- ✅ Provide easy unsubscribe mechanism
- ✅ Allow users to delete their data
- ✅ Store consent records

### CAN-SPAM (USA)
- ✅ Include physical mailing address
- ✅ Clear "From" name and email
- ✅ Accurate subject lines
- ✅ Honor unsubscribe requests within 10 days

**Events-Ting Implementation**:
- `emailStatus` field in Registration model (VERIFIED, BOUNCED, UNSUBSCRIBED)
- Unsubscribe link in campaign emails
- Email preference management (future)

---

## Related Documentation

- [Environment Variables](./environment-variables.md) - Configure RESEND_API_KEY
- [Communications Module](../modules/communications/README.md) - Email campaigns
- [Registration Module](../modules/registration/README.md) - Registration emails
- [CFP Module](../modules/cfp/README.md) - CFP notification emails
