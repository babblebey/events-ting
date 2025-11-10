# CFP Email Templates

## Overview

The CFP module uses three React Email templates to notify speakers at different stages of the proposal lifecycle. All templates are built with `@react-email/components` and follow a consistent design system.

## Email Templates

### 1. Submission Received Confirmation

**File**: `emails/cfp-submission-received.tsx`  
**Component**: `CfpSubmissionReceived`  
**Trigger**: Immediately after proposal submission  
**Recipient**: Speaker (submitter)

**Purpose**: Confirm that the proposal has been received and will be reviewed.

**Props**:
```typescript
interface CfpSubmissionReceivedProps {
  speakerName: string;        // Speaker's full name
  eventName: string;          // Event name
  proposalTitle: string;      // Submitted proposal title
  eventUrl: string;           // Link to public event page
}
```

**Email Content**:

**Subject**: `Proposal Received: ${proposalTitle}`

**Preview Text**: `Your proposal for ${eventName} has been received! 📝`

**Body Structure**:
1. **Header**
   - Emoji: 📝
   - Heading: "Proposal Received!"
   
2. **Greeting**
   - "Hi {speakerName},"

3. **Confirmation Message**
   - Thank you for submitting
   - Event name highlighted
   
4. **Proposal Info Box** (Gray box)
   - Label: "Proposal Title:"
   - Value: {proposalTitle}

5. **Next Steps Info**
   - "We'll carefully evaluate your proposal and get back to you with a decision."
   
6. **What Happens Next** (List)
   - Our team will review all submissions
   - You'll receive an email notification about the decision
   - If accepted, we'll provide next steps for your session

7. **Call-to-Action Button** (Blue)
   - Text: "View Event Details"
   - Link: {eventUrl}

8. **Footer**
   - Thank you message
   - Contact information
   - "If you have any questions, please don't hesitate to reach out to the event organizer."

**Styling**:
- Primary color: Blue (#2563eb)
- Background: Light gray (#f6f9fc)
- Font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto

**Example**:
```
Subject: Proposal Received: Building Scalable APIs with tRPC

Hi Jane Doe,

Thank you for submitting your proposal to Tech Conference 2025!

┌────────────────────────────────────┐
│ Proposal Title:                    │
│ Building Scalable APIs with tRPC   │
└────────────────────────────────────┘

We'll carefully evaluate your proposal and get back to you with a decision.

What happens next?
• Our team will review all submissions
• You'll receive an email notification about the decision
• If accepted, we'll provide next steps for your session

[View Event Details]

Thank you for your interest in speaking at Tech Conference 2025!
If you have any questions, please don't hesitate to reach out to the event organizer.
```

**Technical Details**:
- Sent asynchronously via `sendEmail()` service
- Uses Resend API
- Tags: `type: cfp-submission`, `eventId: {id}`
- Error handling: Logged but doesn't fail submission

---

### 2. Proposal Accepted

**File**: `emails/cfp-accepted.tsx`  
**Component**: `CfpAccepted`  
**Trigger**: When organizer accepts a proposal  
**Recipient**: Speaker (submitter)

**Purpose**: Notify speaker of acceptance and provide next steps.

**Props**:
```typescript
interface CfpAcceptedProps {
  speakerName: string;        // Speaker's full name
  eventName: string;          // Event name
  proposalTitle: string;      // Accepted proposal title
  sessionFormat: string;      // talk, workshop, panel, lightning
  duration: number;           // Session duration in minutes
  eventUrl: string;           // Link to public event page
  eventDate?: Date;           // Event date (optional)
}
```

**Email Content**:

**Subject**: `Congratulations! Your proposal for ${eventName} has been accepted! 🎉`

**Preview Text**: `Congratulations! Your proposal for ${eventName} has been accepted! 🎉`

**Body Structure**:
1. **Header**
   - Emoji: 🎉
   - Heading: "Proposal Accepted!"
   
2. **Greeting & Congratulations**
   - "Hi {speakerName},"
   - "We're thrilled to let you know that your proposal for {eventName} has been accepted!"

3. **Accepted Proposal Box** (Green box with border)
   - Label: "✓ ACCEPTED" (green, uppercase)
   - Proposal title (large, bold)
   - Details grid:
     - **Format**: {sessionFormat} (capitalized)
     - **Duration**: {duration} minutes

4. **Event Date Info** (if provided, gray box)
   - Label: "Event Date:"
   - Value: Full formatted date

5. **Next Steps Section**
   - Bold heading: "Next Steps:"
   - Bulleted list:
     - We'll be in touch with more details about your session
     - You'll receive information about speaker preparation and logistics
     - Your speaker profile will be featured on the event website
     - We'll provide a final schedule closer to the event date

6. **Call-to-Action Button** (Blue)
   - Text: "View Event Details"
   - Link: {eventUrl}

7. **Footer**
   - Excitement message: "We're excited to have you as a speaker!"
   - Contact info
   - Closing: "See you at the event! 🚀"

**Styling**:
- Acceptance color: Green (#10b981)
- Green box background: Light green (#d1fae5)
- Button color: Blue (#2563eb)

**Example**:
```
Subject: Congratulations! Your proposal for Tech Conference 2025 has been accepted! 🎉

Hi Jane Doe,

We're thrilled to let you know that your proposal for Tech Conference 2025 has been accepted!

┌────────────────────────────────────┐
│ ✓ ACCEPTED                         │
│                                    │
│ Building Scalable APIs with tRPC   │
│                                    │
│ Format: Talk        Duration: 45 minutes
└────────────────────────────────────┘

Event Date:
Friday, January 15, 2026

Next Steps:
• We'll be in touch with more details about your session
• You'll receive information about speaker preparation and logistics
• Your speaker profile will be featured on the event website
• We'll provide a final schedule closer to the event date

[View Event Details]

We're excited to have you as a speaker at Tech Conference 2025!
See you at the event! 🚀
```

**Technical Details**:
- Sent after speaker profile is created
- Includes session format and duration for confirmation
- Tags: `type: cfp-accepted`, `eventId: {id}`

---

### 3. Proposal Rejected

**File**: `emails/cfp-rejected.tsx`  
**Component**: `CfpRejected`  
**Trigger**: When organizer rejects a proposal  
**Recipient**: Speaker (submitter)

**Purpose**: Respectfully decline proposal with optional feedback and encouragement.

**Props**:
```typescript
interface CfpRejectedProps {
  speakerName: string;        // Speaker's full name
  eventName: string;          // Event name
  proposalTitle: string;      // Rejected proposal title
  reviewNotes?: string;       // Optional organizer feedback
  eventUrl: string;           // Link to public event page
}
```

**Email Content**:

**Subject**: `Update on your proposal for ${eventName}`

**Preview Text**: `Update on your proposal for ${eventName}`

**Body Structure**:
1. **Header**
   - Heading: "Proposal Update" (neutral, not "Rejected")
   
2. **Greeting & Thanks**
   - "Hi {speakerName},"
   - "Thank you for submitting your proposal to {eventName}."
   - "We appreciate the time and effort you put into your submission."

3. **Proposal Info Box** (Gray box)
   - Label: "Proposal Title:"
   - Value: {proposalTitle}

4. **Decision Message** (Respectful)
   - "After careful consideration, we've decided not to move forward with your proposal for this event."
   - "This was a difficult decision as we received many high-quality submissions."

5. **Feedback Box** (if reviewNotes provided, yellow/amber box)
   - Label: "Reviewer Feedback:" (brown text)
   - Content: {reviewNotes} (pre-wrap, multi-line)
   - Styled to stand out but not negatively

6. **Encouragement Section**
   - "We encourage you to:"
   - Bulleted list:
     - Consider submitting to future events
     - Use any feedback to refine your proposal
     - Stay connected with our community

7. **Call-to-Action Button** (Gray, not blue)
   - Text: "View Event Details"
   - Link: {eventUrl}

8. **Footer**
   - Positive closing: "Thank you again for your interest in {eventName}."
   - "We hope to see your submissions at future events!"
   - "Best regards, The {eventName} Team"

**Styling**:
- Feedback box: Amber/yellow background (#fef3c7)
- Button color: Gray (#6b7280) - subdued
- Overall tone: Respectful and encouraging

**Example Without Feedback**:
```
Subject: Update on your proposal for Tech Conference 2025

Hi Jane Doe,

Thank you for submitting your proposal to Tech Conference 2025.
We appreciate the time and effort you put into your submission.

┌────────────────────────────────────┐
│ Proposal Title:                    │
│ Building Scalable APIs with tRPC   │
└────────────────────────────────────┘

After careful consideration, we've decided not to move forward with 
your proposal for this event. This was a difficult decision as we 
received many high-quality submissions.

We encourage you to:
• Consider submitting to future events
• Use any feedback to refine your proposal
• Stay connected with our community

[View Event Details]

Thank you again for your interest in Tech Conference 2025.
We hope to see your submissions at future events!

Best regards,
The Tech Conference 2025 Team
```

**Example With Feedback**:
```
Subject: Update on your proposal for Tech Conference 2025

[... same as above until decision message ...]

┌────────────────────────────────────┐
│ Reviewer Feedback:                 │
│                                    │
│ Thank you for your submission.     │
│ While the topic is interesting,    │
│ we're focusing on more advanced    │
│ technical content this year. We    │
│ encourage you to apply again next  │
│ year with a deeper dive into the   │
│ implementation.                    │
└────────────────────────────────────┘

[... rest of email ...]
```

**Technical Details**:
- ReviewNotes optional but recommended
- Tone is deliberately respectful and encouraging
- Tags: `type: cfp-rejected`, `eventId: {id}`

---

## Email Service Integration

### Sending Mechanism

All emails are sent via the `sendEmail()` service from `@/server/services/email`:

```typescript
await sendEmail({
  to: speakerEmail,
  subject: "...",
  react: CfpSubmissionReceived({ ... }),
  tags: [
    { name: "type", value: "cfp-submission" },
    { name: "eventId", value: eventId }
  ]
});
```

### Resend Configuration

- **Provider**: Resend (via API)
- **From Address**: Configured in environment variables
- **Reply-To**: Can be set per event
- **Tracking**: Opens and clicks tracked via Resend

### Email Tags

Used for filtering and analytics in Resend dashboard:

| Email Type | Type Tag | EventId Tag |
|------------|----------|-------------|
| Submission Received | `cfp-submission` | `{eventId}` |
| Proposal Accepted | `cfp-accepted` | `{eventId}` |
| Proposal Rejected | `cfp-rejected` | `{eventId}` |

---

## Error Handling

### Submission Confirmation Email
```typescript
sendEmail({...}).catch((error) => {
  // Log error but don't fail the submission
  console.error("[CFP] Failed to send confirmation email:", error);
});
```

- **Failure Mode**: Logged only, doesn't block submission
- **Reason**: Submission success is more important than email delivery
- **Recovery**: Organizer can manually notify speaker if needed

### Acceptance/Rejection Emails
```typescript
await sendEmail({...}); // Awaited, but errors logged
```

- **Failure Mode**: Logged, mutation still succeeds
- **Reason**: Speaker profile already created, can manually notify
- **Recovery**: Organizer should be notified of email failure

---

## Testing Emails

### Development
```bash
# Use Resend test mode
RESEND_API_KEY=re_test_...
```

### Preview
React Email provides preview functionality:
```bash
npm run email:dev
# Opens preview at http://localhost:3000
```

### Production
- Use real Resend API key
- Verify domain ownership
- Test with real email addresses

---

## Design Principles

1. **Clarity**: Clear subject lines and preview text
2. **Professionalism**: Consistent branding and tone
3. **Actionability**: Clear next steps and CTAs
4. **Accessibility**: Plain text fallback, semantic HTML
5. **Mobile-Friendly**: Responsive design for all devices
6. **Respect**: Especially important for rejection emails

---

## Customization

### Per-Event Customization (Future)
- Custom email templates per event
- Organizer branding
- Custom footer messages

### Current Limitations
- Single template set for all events
- No HTML customization in UI
- Standard Resend sender

---

## Email Analytics

### Tracked Metrics (via Resend)
- Delivery rate
- Open rate
- Click rate (on buttons)
- Bounce rate

### Viewing Analytics
- Resend dashboard
- Filter by tags (`type`, `eventId`)
- Track speaker engagement

---

## Best Practices

### For Organizers
1. **Timely Responses**: Send acceptance/rejection within reasonable time
2. **Constructive Feedback**: Always include helpful notes in rejections
3. **Clear Guidelines**: Set expectations in CFP guidelines
4. **Professional Tone**: Maintain respectful communication

### For Developers
1. **Test Templates**: Preview all variations before deploying
2. **Error Handling**: Log failures, don't block operations
3. **Async Sending**: Send emails asynchronously to avoid blocking
4. **Track Delivery**: Monitor email analytics for issues

---

## Related Documentation

- [Backend Documentation](./backend.md) - Email sending in tRPC procedures
- [Workflows](./workflows.md) - When emails are triggered
- [Communications Module](../communications/email-integration.md) - Email service details
